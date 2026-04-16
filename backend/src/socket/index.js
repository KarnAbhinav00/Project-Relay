const prisma = require("../lib/prisma");
const { verifyToken } = require("../lib/jwt");
const { AUTH_COOKIE_NAME, parseCookies } = require("../lib/cookies");

function getSocketToken(socket) {
  const bearer = socket.handshake.auth?.token;
  if (typeof bearer === "string" && bearer.trim()) return bearer.trim();

  const cookies = parseCookies(socket.handshake.headers?.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

function createSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);
      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, name: true, email: true, avatarUrl: true },
      });

      if (!user) return next(new Error("Unauthorized"));

      socket.user = user;
      return next();
    } catch (_error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("session:ready", { user: socket.user });

    socket.on("conversation:join", async ({ conversationId }, ack) => {
      try {
        const membership = await prisma.conversationMember.findUnique({
          where: { userId_conversationId: { userId: socket.user.id, conversationId } },
          select: { id: true },
        });

        if (!membership) {
          socket.emit("error:message", { message: "Forbidden" });
          if (typeof ack === "function") ack({ ok: false, error: "Forbidden" });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        socket.emit("conversation:joined", { conversationId });
        if (typeof ack === "function") ack({ ok: true, conversationId });
      } catch (_error) {
        if (typeof ack === "function") ack({ ok: false, error: "Failed to join conversation" });
      }
    });

    socket.on("message:send", async ({ conversationId, content, type = "text", meta = null, clientMessageId }, ack) => {
      try {
        const safe = (content || "").toString().trim();
        if (!safe) {
          socket.emit("error:message", { message: "Message is empty" });
          if (typeof ack === "function") ack({ ok: false, error: "Message is empty" });
          return;
        }

        const membership = await prisma.conversationMember.findUnique({
          where: { userId_conversationId: { userId: socket.user.id, conversationId } },
          select: { id: true },
        });

        if (!membership) {
          socket.emit("error:message", { message: "Forbidden" });
          if (typeof ack === "function") ack({ ok: false, error: "Forbidden" });
          return;
        }

        let message = null;
        if (typeof clientMessageId === "string" && clientMessageId.trim()) {
          message = await prisma.message.findFirst({
            where: { senderId: socket.user.id, clientMessageId },
            include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
          });
        }

        if (!message) {
          message = await prisma.message.create({
            data: {
              content: safe,
              type,
              meta,
              clientMessageId: typeof clientMessageId === "string" ? clientMessageId : null,
              senderId: socket.user.id,
              conversationId,
            },
            include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
          });
        }

        await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        io.to(`conversation:${conversationId}`).emit("message:new", message);
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (_error) {
        if (typeof ack === "function") ack({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("messages:sync", async ({ conversationId, since }, ack) => {
      try {
        const membership = await prisma.conversationMember.findUnique({
          where: { userId_conversationId: { userId: socket.user.id, conversationId } },
          select: { id: true },
        });
        if (!membership) {
          if (typeof ack === "function") ack({ ok: false, error: "Forbidden" });
          return;
        }

        const sinceDate = since ? new Date(since) : new Date(0);
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
            createdAt: { gt: sinceDate },
          },
          include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
          take: 200,
        });
        if (typeof ack === "function") ack({ ok: true, messages });
      } catch (_error) {
        if (typeof ack === "function") ack({ ok: false, error: "Failed to sync messages" });
      }
    });
  });
}

module.exports = createSocketHandlers;
