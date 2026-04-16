const prisma = require("../lib/prisma");
const { verifyToken } = require("../lib/jwt");
const { AUTH_COOKIE_NAME, parseCookies } = require("../lib/cookies");

function getRequestToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

async function authMiddleware(req, res, next) {
  try {
    const token = getRequestToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = authMiddleware;
