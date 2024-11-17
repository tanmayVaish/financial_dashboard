const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiter");
const { authenticateToken } = require("./middlewares/authenticateToken");

const transactionRouter = require("./routes/transactionRoutes");
const authRouter = require("./routes/authRoutes");

const { createClient } = require("redis");

const redisPublisher = createClient();
const redisSubscriber = createClient();

(async () => {
  await redisPublisher.connect();
  await redisSubscriber.connect();
})();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["Authorization"],
  })
);
app.use(express.json());

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const handleTransactionUpdate = (message) => {
    res.write(`data: ${message}\n\n`);
  };
  redisSubscriber.subscribe("transactions", (message) => {
    handleTransactionUpdate(message);
  });
  req.on("close", () => {
    redisSubscriber.unsubscribe("transactions");
    res.end();
  });
});

app.use("/api", apiLimiter, authenticateToken, transactionRouter);
app.use("/auth", authLimiter, authRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
