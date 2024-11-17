const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const logger = require("../misc/logger");

const prisma = new PrismaClient();
const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });
    res.json(user);
  } catch (error) {
    logger.error("Error during signup", { error, requestBody: req.body });
    res.status(500).send("Internal Server Error");
  }
});

authRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
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
  } catch (error) {
    logger.error("Error during signin", { error, requestBody: req.body });
    res.status(500).send("Internal Server Error");
  }
});

module.exports = authRouter;
