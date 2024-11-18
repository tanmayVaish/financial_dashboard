const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("redis");
const logger = require("../misc/logger");

const prisma = new PrismaClient();
const transactionRouter = express.Router();

const redisPublisher = createClient();
const redisSubscriber = createClient();

(async () => {
  try {
    await redisPublisher.connect();
    await redisSubscriber.connect();
  } catch (error) {
    logger.error("Error connecting to Redis", { error });
  }
})();

transactionRouter.get("/transactions", async (req, res) => {
  const {
    page = 1, // Default to 1 if page is not provided
    limit = 5, // Default to 10 if limit is not provided
    type,
    status,
    startDate,
    endDate,
    id,
  } = req.query;

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

  try {
    const totalCount = await prisma.transaction.count({ where }); // Total count of rows matching the filter
    const transactions = await prisma.transaction.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: { payee: true, recipient: true },
    });

    res.json({ transactions, totalCount });
  } catch (error) {
    logger.error("Error fetching transactions", {
      error,
      queryParams: req.query,
    });
    res.status(500).send("Internal Server Error");
  }
});

transactionRouter.get("/transactions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: { payee: true, recipient: true },
    });
    if (!transaction) return res.status(404).send("Transaction not found");
    res.json(transaction);
  } catch (error) {
    logger.error("Error fetching transaction by ID", {
      error,
      params: req.params,
    });
    res.status(500).send("Internal Server Error");
  }
});

transactionRouter.get("/summary", async (req, res) => {
  const cacheKey = "transaction_summary"; // Redis cache key
  try {
    // Try to get the cached data from Redis
    const cachedSummary = await redisPublisher.get(cacheKey);

    if (cachedSummary) {
      // If cache exists, return it
      return res.json(JSON.parse(cachedSummary));
    }

    // If no cache, run the database queries
    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(currentDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const startOfMonth = new Date(
      currentDay.getFullYear(),
      currentDay.getMonth(),
      1
    );
    const startOfNextMonth = new Date(
      currentDay.getFullYear(),
      currentDay.getMonth() + 1,
      1
    );
    const last30DaysStart = new Date();
    last30DaysStart.setDate(last30DaysStart.getDate() - 29);
    last30DaysStart.setHours(0, 0, 0, 0);

    const [
      totalVolume,
      averageAmount,
      statusCount,
      dailyVolume,
      dailyTotalAmount,
      monthlyVolume,
      monthlyTotalAmount,
      last30DaysTransactions,
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.aggregate({ _avg: { amount: true } }),
      prisma.transaction.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.transaction.count({
        where: { createdAt: { gte: currentDay, lt: nextDay } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: currentDay, lt: nextDay } },
      }),
      prisma.transaction.count({
        where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
      prisma.transaction.groupBy({
        by: ["createdAt"], // Group by the date (ignore time)
        _sum: { amount: true }, // Sum of amounts for each day
        _count: { id: true }, // Count of transactions for each day
        where: {
          createdAt: { gte: last30DaysStart, lt: nextDay },
        },
      }),
    ]);

    // Transform the last30DaysTransactions into amount and volume arrays
    const last30DaysAmount = new Array(30).fill(0); // Initialize with zeroes
    const last30DaysVolume = new Array(30).fill(0); // Initialize with zeroes

    last30DaysTransactions.forEach((day) => {
      // Calculate the index for the last 30 days (0 is today, 29 is 29 days ago)
      const dayIndex = Math.floor(
        (currentDay - new Date(day.createdAt).setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      );

      if (dayIndex >= 0 && dayIndex < 30) {
        last30DaysAmount[dayIndex] = day._sum.amount || 0;
        last30DaysVolume[dayIndex] = day._count.id || 0;
      }
    });

    // Create the response object
    const summary = {
      totalVolume,
      averageAmount: averageAmount._avg.amount || 0,
      statusCount,
      dailyVolume,
      dailyTotalAmount: dailyTotalAmount._sum.amount || 0,
      monthlyVolume,
      monthlyTotalAmount: monthlyTotalAmount._sum.amount || 0,
      last30DaysAmount,
      last30DaysVolume,
    };

    // Cache the result in Redis for 1 hour (3600 seconds)
    await redisPublisher.set(cacheKey, JSON.stringify(summary), {
      EX: 3600, // Set the expiry time to 1 hour (3600 seconds)
    });

    // Return the response
    res.json(summary);
  } catch (error) {
    // Log the complete error details to diagnose the issue
    logger.error("Error fetching transaction summary", {
      error: error.message, // Include the error message
      stack: error.stack, // Include stack trace for debugging
    });
    res.status(500).send("Internal Server Error");
  }
});

transactionRouter.post("/transactions", async (req, res) => {
  const { type, amount, status, payeeId, recipientId } = req.body;

  if (!type || !["credit", "debit"].includes(type))
    return res.status(400).send("Invalid transaction type.");
  if (!amount || isNaN(amount) || amount <= 0)
    return res.status(400).send("Invalid amount.");
  if (!status || !["successful", "pending", "failed"].includes(status))
    return res.status(400).send("Invalid status.");
  if (!payeeId || !recipientId)
    return res.status(400).send("Payee and recipient are required.");
  if (payeeId === recipientId)
    return res.status(400).send("Payee and recipient cannot be the same.");

  try {
    const [payee, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: payeeId } }),
      prisma.user.findUnique({ where: { id: recipientId } }),
    ]);
    if (!payee || !recipient)
      return res.status(404).send("Payee or recipient not found.");
    const transaction = await prisma.transaction.create({
      data: { type, amount, status, payeeId, recipientId },
      include: { payee: true, recipient: true },
    });
    redisPublisher.publish("transactions", JSON.stringify(transaction));
    res.json(transaction);
  } catch (error) {
    logger.error("Error creating transaction", {
      error,
      requestBody: req.body,
    });
    res.status(500).send("Internal Server Error");
  }
});

module.exports = transactionRouter;
