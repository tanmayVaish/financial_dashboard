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
  exposedHeaders: ['Authorization'], 
}));
app.use(express.json());

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });
  res.json(user);
});

// User login with enhanced token security
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Invalid credentials');
  }

  const uniqueKey = crypto.randomBytes(32).toString('hex');
  const token = jwt.sign(
    {
      userId: user.id,
      uniqueKey,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
      audience: 'your-app-name',
      issuer: 'your-company-name',
      subject: user.id.toString(),
    }
  );

  // Send token via Authorization header
  res.setHeader('Authorization', `Bearer ${token}`);
  res.json({ message: 'Login successful' });
});

// Fetch paginated transactions
app.get('/transactions', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, type, status, startDate, endDate , id} = req.query;
  const where = {};

  if (id) where.id = parseInt(id);
  if (type) where.type = type;
  if (status) where.status = status;
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    skip: (page - 1) * limit,
    take: parseInt(limit),
  });

  res.json(transactions);
});

// Retrieve specific transaction by ID
app.get('/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(id) },
  });

  if (!transaction) return res.status(404).send('Transaction not found');
  res.json(transaction);
});

// Provide aggregated metrics
app.get('/summary', authenticateToken, async (req, res) => {
  const totalVolume = await prisma.transaction.aggregate({
    _sum: { amount: true },
  });

  const averageAmount = await prisma.transaction.aggregate({
    _avg: { amount: true },
  });

  const statusCount = await prisma.transaction.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  res.json({
    totalVolume: totalVolume._sum.amount,
    averageAmount: averageAmount._avg.amount,
    statusCount,
  });
});

// Fetch latest transactions (simplified for demonstration)
app.get('/recent-transactions', authenticateToken, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json(transactions);
});

// Server-side implementation of SSE (in index.js)
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Listen for new transactions and send updates via SSE
  const sendTransactionUpdate = async () => {
    const latestTransaction = await prisma.transaction.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    res.write(`data: ${JSON.stringify(latestTransaction)}\n\n`);
  };

  // Call sendTransactionUpdate whenever there's a new transaction
  const transactionListener = async () => {
    sendTransactionUpdate();
  };

  transactionListener(); // Initial send

  // Clean up when client disconnects
  req.on('close', () => {
    console.log('Client disconnected');
    res.end();
  });
});

// Create a new transaction
app.post('/transactions', authenticateToken, async (req, res) => {
  const { type, amount, status } = req.body;

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

  try {
    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        status,
        createdAt: new Date(), // Automatically set the current timestamp
        userId: req.userId, // Assuming transactions are tied to authenticated users
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
