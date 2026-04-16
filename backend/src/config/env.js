const dotenv = require("dotenv");

dotenv.config();

function normalizeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch (_error) {
    return raw.replace(/\/+$/, "");
  }
}

const fallbackOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "";
const allowedOrigins = Array.from(
  new Set(
    [...fallbackOrigins, ...rawOrigins.split(",").map(normalizeOrigin).filter(Boolean)]
  )
);

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = isProduction
  ? requireEnv("JWT_SECRET")
  : (process.env.JWT_SECRET || "dev-only-secret-change-before-production");

const sameSiteRaw = (process.env.AUTH_COOKIE_SAMESITE || (isProduction ? "none" : "lax")).toLowerCase();
const authCookieSameSite = ["lax", "strict", "none"].includes(sameSiteRaw) ? sameSiteRaw : "lax";
const authCookieSecure = isProduction || authCookieSameSite === "none";

if (isProduction && jwtSecret.includes("dev")) {
  throw new Error("JWT_SECRET must be production-grade in production environment");
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT || 5000),
  frontendUrl: normalizeOrigin(process.env.FRONTEND_URL || "http://localhost:3000"),
  jwtSecret,
  authCookieSameSite,
  authCookieSecure,
  allowedOrigins,
  normalizeOrigin,
};
