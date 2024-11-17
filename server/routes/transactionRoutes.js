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
    page = 1,
    limit = 10,
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
    const transactions = await prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      include: { payee: true, recipient: true },
    });
    res.json(transactions);
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
  try {
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
      last30DaysData,
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
      prisma.transaction.findMany({
        where: { createdAt: { gte: last30DaysStart, lt: nextDay } },
        select: { createdAt: true, amount: true },
      }),
    ]);

    res.json({
      totalVolume,
      averageAmount: averageAmount._avg.amount || 0,
      statusCount,
      dailyVolume,
      dailyTotalAmount: dailyTotalAmount._sum.amount || 0,
      monthlyVolume,
      monthlyTotalAmount: monthlyTotalAmount._sum.amount || 0,
      last30DaysData,
    });
  } catch (error) {
    logger.error("Error fetching transaction summary", { error });
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
