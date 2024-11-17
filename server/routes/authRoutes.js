const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });
  res.json(user);
});

authRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send("Invalid credentials");
  }
  const uniqueKey = crypto.randomBytes(32).toString("hex");
  const accessToken = jwt.sign(
    { userId: user.id, uniqueKey },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, uniqueKey },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id },
  });
  res.setHeader("Authorization", `Bearer ${accessToken}`);
  res.json({ message: "Login successful" });
});

module.exports = authRouter;
