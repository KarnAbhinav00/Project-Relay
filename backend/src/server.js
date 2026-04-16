const http = require("http");
const { Server } = require("socket.io");
const next = require("next");
const { parse } = require("url");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const frontendPath = path.resolve(__dirname, "../../frontend");
const app = next({ dir: frontendPath, dev, quiet: dev });
const handle = app.getRequestHandler();
const expressApp = require("./app");

const env = require("./config/env");
const prisma = require("./lib/prisma");
const createSocketHandlers = require("./socket");
const embedFrontend = process.env.RELAY_EMBED_FRONTEND === "true" || !dev;

async function prepareFrontend() {
  if (!embedFrontend) return;
  await app.prepare();
}

// Prepare Next.js then start server
prepareFrontend().then(() => {
  const server = http.createServer((req, res) => {
    if (!embedFrontend) {
      expressApp(req, res);
      return;
    }

    const parsedUrl = parse(req.url, true);

    // API routes - let Express handle them
    if (parsedUrl.pathname.startsWith("/api/") || parsedUrl.pathname.startsWith("/socket.io/")) {
      expressApp(req, res);
      return;
    }

    // Let Next.js handle all other routes (including SPA fallback)
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true,
    }
  });

  // Set io on the server for socket handlers
  server.io = io;
  createSocketHandlers(io);

  // Use process.env.PORT for Render compatibility
  const PORT = process.env.PORT || env.port || 5000;

  server.listen(PORT, "0.0.0.0", (err) => {
    if (err) throw err;
    console.log(`> Project Relay ready on http://localhost:${PORT}`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
    if (dev && !embedFrontend) {
      console.log("> API-only dev mode: run frontend separately with `npm run dev:frontend`.");
      console.log("> To embed frontend in backend dev, set RELAY_EMBED_FRONTEND=true.");
    }
  });

  async function shutdown() {
    io.close();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
