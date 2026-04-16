const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const logger = require("../lib/logger");
const retention = require("../config/retention");

const router = express.Router();

function parseLimit(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

async function getMembership(conversationId, userId) {
  return prisma.conversationMember.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    select: { id: true, role: true },
  });
}

async function isMember(conversationId, userId) {
  const row = await getMembership(conversationId, userId);
  return Boolean(row?.id);
}

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 30, 100);
    const cursor = typeof req.query.cursor === "string" && req.query.cursor.trim() ? req.query.cursor : null;

    const memberships = await prisma.conversationMember.findMany({
      where: { userId: req.user.id },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: { id: true, username: true, email: true } } } },
            messages: {
              include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasMore = memberships.length > limit;
    const slicedMemberships = hasMore ? memberships.slice(0, limit) : memberships;
    const conversations = slicedMemberships.map((m) => ({
      id: m.conversation.id,
      name: m.conversation.name,
      isGroup: m.conversation.isGroup,
      ownerId: m.conversation.ownerId,
      members: m.conversation.members.map((member) => member.user),
      lastMessage: m.conversation.messages[0] || null,
      updatedAt: m.conversation.updatedAt,
    }));

    return res.json({
      conversations,
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? slicedMemberships[slicedMemberships.length - 1].id : null,
      },
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/conversations/direct", authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId || typeof targetUserId !== "string" || targetUserId === req.user.id) {
      return res.status(400).json({ error: "Invalid target user" });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });

    if (!target) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const candidates = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        members: { some: { userId: req.user.id } },
      },
      include: { members: { select: { userId: true } } },
    });

    let conversation = candidates.find((c) => {
      if (c.members.length !== 2) return false;
      const ids = c.members.map((m) => m.userId);
      return ids.includes(req.user.id) && ids.includes(targetUserId);
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          members: { create: [{ userId: req.user.id }, { userId: targetUserId }] },
        },
      });
    }

    return res.status(201).json({ conversation });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.post("/conversations/room", authMiddleware, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    const uniqueMembers = [...new Set([req.user.id, ...memberIds])].filter((id) => typeof id === "string" && id);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Room name is required" });
    }

    const members = await prisma.user.findMany({
      where: { id: { in: uniqueMembers } },
      select: { id: true },
    });
    if (members.length !== uniqueMembers.length) {
      return res.status(400).json({ error: "One or more member IDs are invalid" });
    }

    const room = await prisma.conversation.create({
      data: {
        name: name.trim().slice(0, 60),
        isGroup: true,
        ownerId: req.user.id,
        members: {
          create: uniqueMembers.map((userId) => ({
            userId,
            role: userId === req.user.id ? "owner" : "member",
          })),
        },
      },
    });

    return res.status(201).json({ conversation: room });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to create room" });
  }
});

router.post("/conversations/:conversationId/invite", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { targetUserId } = req.body;

    const membership = await getMembership(conversationId, req.user.id);
    if (!membership) return res.status(403).json({ error: "Forbidden" });

    const convo = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { isGroup: true } });
    if (!convo?.isGroup) return res.status(400).json({ error: "Invites are only available for group rooms" });

    if (!["owner", "admin"].includes(membership.role)) {
      return res.status(403).json({ error: "Only room admins can invite members" });
    }

    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ error: "Invalid target user" });
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: "Target user not found" });

    const exists = await prisma.conversationMember.findUnique({
      where: { userId_conversationId: { userId: targetUserId, conversationId } },
      select: { id: true },
    });

    if (!exists) {
      await prisma.conversationMember.create({ data: { userId: targetUserId, conversationId } });
    }

    logger.info("chat.member.invited", { actorUserId: req.user.id, targetUserId, conversationId });

    return res.json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to invite user" });
  }
});

router.delete("/conversations/:conversationId", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const membership = await getMembership(conversationId, req.user.id);
    if (!membership) return res.status(403).json({ error: "Forbidden" });

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { isGroup: true, ownerId: true },
    });
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    if (convo.isGroup && convo.ownerId !== req.user.id && membership.role !== "admin") {
      return res.status(403).json({ error: "Only room owner or admin can delete group chats" });
    }

    await prisma.conversation.delete({ where: { id: conversationId } });
    logger.warn("chat.conversation.deleted", { actorUserId: req.user.id, conversationId });
    return res.json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseLimit(req.query.limit, 50, 200);
    const cursor = typeof req.query.cursor === "string" && req.query.cursor.trim() ? req.query.cursor : null;
    const canRead = await isMember(conversationId, req.user.id);

    if (!canRead) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: {
          gt: new Date(Date.now() - retention.messageRetentionDays * 24 * 60 * 60 * 1000),
        },
      },
      include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;
    const normalized = [...page].reverse();

    return res.json({
      messages: normalized,
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? page[page.length - 1].id : null,
      },
    });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = "text", meta = null, clientMessageId } = req.body;

    if (!(await isMember(conversationId, req.user.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Message content required" });
    }

    if (clientMessageId && typeof clientMessageId !== "string") {
      return res.status(400).json({ error: "Invalid client message id" });
    }

    if (clientMessageId) {
      const existing = await prisma.message.findFirst({
        where: {
          senderId: req.user.id,
          clientMessageId,
        },
        include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
      });
      if (existing) return res.status(200).json({ message: existing, deduplicated: true });
    }

    const message = await prisma.message.create({
      data: {
        content: String(content),
        type,
        meta,
        clientMessageId: clientMessageId || null,
        senderId: req.user.id,
        conversationId,
      },
      include: { sender: { select: { id: true, username: true, name: true, email: true, avatarUrl: true } } },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    logger.info("chat.message.created", { userId: req.user.id, conversationId, messageId: message.id });
    return res.status(201).json({ message });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to send message" });
  }
});

router.delete("/conversations/:conversationId/messages/:messageId", authMiddleware, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const membership = await getMembership(conversationId, req.user.id);
    if (!membership) return res.status(403).json({ error: "Forbidden" });

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) {
      return res.status(404).json({ error: "Message not found" });
    }

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { ownerId: true, isGroup: true },
    });
    const canModerate = convo?.isGroup && (convo.ownerId === req.user.id || membership.role === "admin");
    if (message.senderId !== req.user.id && !canModerate) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.message.delete({ where: { id: messageId } });
    logger.warn("chat.message.deleted", { actorUserId: req.user.id, conversationId, messageId });
    return res.json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;
