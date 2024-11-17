const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');

require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['Authorization']
}));
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).send('JWT Token Expired');
      }
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword }
  });
  res.json(user);
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Invalid credentials');
  }

  const uniqueKey = crypto.randomBytes(32).toString('hex');
  const accessToken = jwt.sign({ userId: user.id, uniqueKey }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: user.id, uniqueKey }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id } });

  res.setHeader('Authorization', `Bearer ${accessToken}`);
  res.json({ message: 'Login successful' });
});

app.post('/refresh-token', async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) return res.status(400).send('Refresh token missing');

  const storedRefreshToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!storedRefreshToken) return res.status(401).send('Invalid refresh token');

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
    if (err) return res.status(401).send('Invalid refresh token');

    const newAccessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ accessToken: newAccessToken });
  });
});

app.get('/transactions', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, type, status, startDate, endDate, id } = req.query;
  const where = {};

  if (id) where.id = parseInt(id);
  if (type) where.type = type;
  if (status) where.status = status;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      include: {
        payee: true,
        recipient: true
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        payee: true,
        recipient: true
      }
    });

    if (!transaction) return res.status(404).send('Transaction not found');
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/summary', authenticateToken, async (req, res) => {
  const totalVolume = await prisma.transaction.aggregate({
    _sum: { amount: true }
  });

  const averageAmount = await prisma.transaction.aggregate({
    _avg: { amount: true }
  });

  const statusCount = await prisma.transaction.groupBy({
    by: ['status'],
    _count: { status: true }
  });

  res.json({
    totalVolume: totalVolume._sum.amount,
    averageAmount: averageAmount._avg.amount,
    statusCount
  });
});

app.get('/recent-transactions', authenticateToken, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  res.json(transactions);
});

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendTransactionUpdate = async () => {
    const latestTransaction = await prisma.transaction.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    res.write(`data: ${JSON.stringify(latestTransaction)}\n\n`);
  };

  const transactionListener = async () => {
    sendTransactionUpdate();
  };

  transactionListener();

  req.on('close', () => {
    console.log('Client disconnected');
    res.end();
  });
});

app.post('/transactions', authenticateToken, async (req, res) => {
  const { type, amount, status, payeeId, recipientId } = req.body;

  // Basic validation
  if (!type || !['credit', 'debit'].includes(type)) {
    return res.status(400).send('Invalid transaction type. Must be "credit" or "debit".');
  }
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).send('Invalid amount. Must be a positive number.');
  }
  if (!status || !['successful', 'pending', 'failed'].includes(status)) {
    return res.status(400).send('Invalid status. Must be "successful", "pending", or "failed".');
  }
  if (!payeeId || !recipientId) {
    return res.status(400).send('Payee and recipient are required.');
  }
  if (payeeId === recipientId) {
    return res.status(400).send('Payee and recipient cannot be the same.');
  }

  try {
    // Validate payee and recipient
    const [payee, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: payeeId } }),
      prisma.user.findUnique({ where: { id: recipientId } })
    ]);

    if (!payee || !recipient) {
      return res.status(404).send('Payee or recipient not found.');
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        status,
        createdAt: new Date(),
        payeeId,
        recipientId
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});