import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /api/conversations
export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, tag, search } = req.query;
    const where: any = { workspaceId: req.user!.workspaceId };

    if (status) where.status = status;
    if (tag) where.tags = { has: tag };

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, direction: true, createdAt: true, isAutomated: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });

    // Flatten lastMessage
    const result = conversations.map(c => ({
      ...c,
      lastMessage: c.messages[0]?.content,
      unreadCount: 0, // TODO: track read status
      messages: undefined,
    }));

    // Filter by search
    const filtered = search
      ? result.filter(c =>
          c.contact.name.toLowerCase().includes((search as string).toLowerCase()) ||
          c.contact.email?.toLowerCase().includes((search as string).toLowerCase())
        )
      : result;

    return successResponse(res, filtered);
  } catch (err) { next(err); }
}

// GET /api/conversations/:id
export async function getConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, email: true, fullName: true } } },
        },
      },
    });
    if (!conv) return errorResponse(res, 'Conversation not found', 404);
    return successResponse(res, conv);
  } catch (err) { next(err); }
}

// GET /api/conversations/:id/messages
export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(res, messages);
  } catch (err) { next(err); }
}

// POST /api/conversations/:id/messages
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { content } = req.body;

    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: 'OUTBOUND',
        senderType: 'STAFF',
        senderId: req.user!.id,
        content,
        isAutomated: false,
      },
    });

    // Pause automation + update last message
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        automationPaused: true,
        lastMessageAt: new Date(),
      },
    });

    return successResponse(res, message, 201);
  } catch (err) { next(err); }
}

// PUT /api/conversations/:id/tags
export async function updateTags(req: Request, res: Response, next: NextFunction) {
  try {
    const { tags } = req.body;
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    const updated = await prisma.conversation.update({
      where: { id: conv.id },
      data: { tags },
    });
    return successResponse(res, updated);
  } catch (err) { next(err); }
}

// PUT /api/conversations/:id/resume-automation
export async function resumeAutomation(req: Request, res: Response, next: NextFunction) {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    const updated = await prisma.conversation.update({
      where: { id: conv.id },
      data: { automationPaused: false },
    });
    return successResponse(res, updated);
  } catch (err) { next(err); }
}

// PUT /api/conversations/:id/status
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    const updated = await prisma.conversation.update({
      where: { id: conv.id },
      data: { status },
    });
    return successResponse(res, updated);
  } catch (err) { next(err); }
}
