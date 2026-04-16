const AUTH_COOKIE_NAME = "relay_auth";

function parseCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== "string") return {};

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const idx = part.indexOf("=");
      if (idx <= 0) return acc;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

module.exports = {
  AUTH_COOKIE_NAME,
  parseCookies,
};