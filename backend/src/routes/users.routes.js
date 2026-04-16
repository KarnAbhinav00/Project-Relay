const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const search = (req.query.search || "").toString().trim();

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: search
          ? [
              { username: { contains: search } },
              { email: { contains: search } },
            ]
          : undefined,
      },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
      orderBy: { username: "asc" },
      take: 25,
    });

    return res.json({ users });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;
