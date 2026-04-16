const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const env = require("./config/env");
const prisma = require("./lib/prisma");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

// Security: Rate Limiting (Firewall 1)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts, please try again later." },
});

function isLocalDevOrigin(origin) {
  try {
    const url = new URL(origin);
    const isLocalHost = ["localhost", "127.0.0.1"].includes(url.hostname);
    return isLocalHost && ["http:", "https:"].includes(url.protocol);
  } catch (_error) {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    const normalizedOrigin = env.normalizeOrigin(origin);
    const trusted = !origin
      || env.allowedOrigins.includes(normalizedOrigin)
      || (!env.isProduction && isLocalDevOrigin(normalizedOrigin));

    if (trusted) {
      callback(null, true);
    } else {
      callback(new Error("CORS origin denied"));
    }
  },
  credentials: true,
};

// Security: Helmet with strict CSP (Firewall 2)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
});

app.use(morgan(":method :url :status :response-time ms req_id=:req[x-request-id]"));
app.use(express.json({ limit: "10kb" })); // Limit body size (Firewall 3)
app.use(limiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "project-relay-backend" });
});

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ready" });
  } catch (_error) {
    return res.status(503).json({ status: "not_ready" });
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

module.exports = app;
