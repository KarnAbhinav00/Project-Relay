const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const { signToken } = require("../lib/jwt");
const logger = require("../lib/logger");
const env = require("../config/env");
const { AUTH_COOKIE_NAME } = require("../lib/cookies");

const router = express.Router();
const loginAttempts = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function isLocked(email) {
  const row = loginAttempts.get(email);
  if (!row) return false;
  if (Date.now() > row.lockedUntil) {
    loginAttempts.delete(email);
    return false;
  }
  return true;
}

function markLoginFailure(email) {
  const current = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  const nextCount = current.count + 1;
  const lockSeconds = Math.min(300, Math.pow(2, Math.min(nextCount, 8)));
  loginAttempts.set(email, { count: nextCount, lockedUntil: Date.now() + lockSeconds * 1000 });
}

function clearLoginFailures(email) {
  loginAttempts.delete(email);
}

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    const cleanEmail = normalizeEmail(email);
    const cleanUsername = String(username || "").trim();

    if (!cleanUsername || !cleanEmail || !isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Invalid registration payload" });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: cleanUsername }, { email: cleanEmail }] },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username: cleanUsername, name: name || cleanUsername, email: cleanEmail, passwordHash },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
    });

    logger.info("auth.register.success", { userId: user.id, email: user.email });

    const token = signToken(user.id);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return res.status(201).json({ token, user });
  } catch (_error) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: "Invalid login payload" });
    }

    if (isLocked(cleanEmail)) {
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      markLoginFailure(cleanEmail);
      logger.warn("auth.login.failure", { email: cleanEmail, reason: "user_not_found" });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      markLoginFailure(cleanEmail);
      logger.warn("auth.login.failure", { email: cleanEmail, reason: "bad_password" });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    clearLoginFailures(cleanEmail);
    logger.info("auth.login.success", { userId: user.id, email: cleanEmail });

    const token = signToken(user.id);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl },
    });
  } catch (_error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    path: "/",
  });
  return res.json({ success: true });
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, username, bio, avatarUrl } = req.body;
    const cleanUsername = typeof username === "string" ? username.trim().slice(0, 30) : undefined;

    const taken = cleanUsername
      ? await prisma.user.findFirst({
          where: { OR: [{ username: cleanUsername }] },
          select: { id: true },
        })
      : null;

    if (taken && taken.id !== req.user.id) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(typeof name === "string" && name.trim() ? { name: name.trim().slice(0, 60) } : {}),
        ...(cleanUsername ? { username: cleanUsername } : {}),
        ...(typeof bio === "string" ? { bio: bio.trim().slice(0, 180) } : {}),
        ...(typeof avatarUrl === "string" && avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
      },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
    });

    logger.info("auth.profile.updated", { userId: req.user.id });

    return res.json({ user: updated });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

router.put("/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !isStrongEnoughPassword(newPassword)) {
      return res.status(400).json({ error: "Invalid password payload" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    logger.info("auth.password.updated", { userId: req.user.id });
    return res.json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to update password" });
  }
});

module.exports = router;
