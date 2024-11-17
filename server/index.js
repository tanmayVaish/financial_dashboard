const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');

const { createClient } = require('redis');

const redisPublisher = createClient();
const redisSubscriber = createClient();

(async () => {
  await redisPublisher.connect();
  await redisSubscriber.connect();
})();


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
  try {
    // Total transaction count
    const totalVolume = await prisma.transaction.count();

    // Average transaction amount
    const averageAmount = await prisma.transaction.aggregate({
      _avg: { amount: true }
    });

    // Transaction count by status
    const statusCount = await prisma.transaction.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    // Current day totals
    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0); // Start of the day
    const nextDay = new Date(currentDay);
    nextDay.setDate(nextDay.getDate() + 1); // Start of the next day

    const dailyVolume = await prisma.transaction.count({
      where: {
        createdAt: {
          gte: currentDay,
          lt: nextDay
        }
      }
    });

    const dailyTotalAmount = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: currentDay,
          lt: nextDay
        }
      }
    });

    // Current month totals
    const startOfMonth = new Date(currentDay.getFullYear(), currentDay.getMonth(), 1); // First day of the month
    const startOfNextMonth = new Date(currentDay.getFullYear(), currentDay.getMonth() + 1, 1); // First day of the next month

    const monthlyVolume = await prisma.transaction.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: startOfNextMonth
        }
      }
    });

    const monthlyTotalAmount = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: startOfNextMonth
        }
      }
    });

    // Last 30 days' volume and total amount
    const last30DaysCount = [];
    const last30DaysAmount = [];
    
    for (let i = 0; i < 30; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const startOfDay = new Date(day);
      startOfDay.setHours(0, 0, 0, 0); // Start of the day
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 59, 999); // End of the day

      const dailyCount = await prisma.transaction.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      const dailySum = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      last30DaysCount.push(
        dailyCount
      );

      last30DaysAmount.push(
        dailySum._sum.amount || 0
      );

    }

    // Response with all calculated metrics
    res.json({
      totalVolume,
      averageAmount: averageAmount._avg.amount || 0,
      statusCount,
      dailyVolume,
      dailyTotalAmount: dailyTotalAmount._sum.amount || 0,
      monthlyVolume,
      monthlyTotalAmount: monthlyTotalAmount._sum.amount || 0,
      last30DaysCount,
      last30DaysAmount
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  // Handle Redis subscription
  const handleTransactionUpdate = (message) => {
    res.write(`data: ${message}\n\n`);
  };

  redisSubscriber.subscribe('transactions', (message) => {
    handleTransactionUpdate(message);
  });

  req.on('close', () => {
    console.log('Client disconnected');
    redisSubscriber.unsubscribe('transactions');
    res.end();
  });
});


app.post('/transactions', authenticateToken, async (req, res) => {
  const { type, amount, status, payeeId, recipientId } = req.body;

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

    // Publish the new transaction to Redis
    await redisPublisher.publish('transactions', JSON.stringify(transaction));

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