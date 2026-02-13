import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { sendInventoryAlertEmail } from '../services/email.service';

// GET /api/inventory
export async function getInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    const where: any = { workspaceId: req.user!.workspaceId };

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return successResponse(res, items);
  } catch (err) { next(err); }
}

// GET /api/inventory/:id
export async function getInventoryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!item) return errorResponse(res, 'Item not found', 404);
    return successResponse(res, item);
  } catch (err) { next(err); }
}

// POST /api/inventory
export async function createInventoryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, quantity, threshold, unit, vendorEmail } = req.body;

    const item = await prisma.inventoryItem.create({
      data: {
        workspaceId: req.user!.workspaceId,
        name,
        quantity: quantity ?? 0,
        threshold: threshold ?? 10,
        unit: unit || null,
        vendorEmail: vendorEmail || null,
      },
    });

    return successResponse(res, item, 201);
  } catch (err) { next(err); }
}

// PUT /api/inventory/:id
export async function updateInventoryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!item) return errorResponse(res, 'Item not found', 404);

    const prevQuantity = item.quantity;

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        name: req.body.name ?? item.name,
        quantity: req.body.quantity ?? item.quantity,
        threshold: req.body.threshold ?? item.threshold,
        unit: req.body.unit !== undefined ? req.body.unit : item.unit,
        vendorEmail: req.body.vendorEmail !== undefined ? req.body.vendorEmail : item.vendorEmail,
      },
    });

    // Check if this update crossed the low-stock threshold
    const newQty = updated.quantity;
    const didDropBelowThreshold =
      prevQuantity > updated.threshold && newQty <= updated.threshold;

    if (didDropBelowThreshold && updated.vendorEmail) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: req.user!.workspaceId },
        select: { businessName: true },
      });

      // Fire-and-forget vendor alert
      sendInventoryAlertEmail(updated.vendorEmail, {
        businessName: workspace?.businessName || 'Your Business',
        items: [{
          name: updated.name,
          quantity: updated.quantity,
          threshold: updated.threshold,
          unit: updated.unit || undefined,
        }],
      }).catch(console.error);
    }

    return successResponse(res, updated);
  } catch (err) { next(err); }
}

// DELETE /api/inventory/:id
export async function deleteInventoryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!item) return errorResponse(res, 'Item not found', 404);

    await prisma.inventoryItem.delete({ where: { id: item.id } });
    return successResponse(res, { message: 'Item deleted' });
  } catch (err) { next(err); }
}

// GET /api/inventory/alerts
export async function getInventoryAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const allItems = await prisma.inventoryItem.findMany({
      where: { workspaceId: req.user!.workspaceId },
    });

    const critical = allItems.filter(i => i.quantity === 0);
    const low = allItems.filter(i => i.quantity > 0 && i.quantity <= i.threshold);

    return successResponse(res, {
      critical,
      low,
      criticalCount: critical.length,
      lowCount: low.length,
    });
  } catch (err) { next(err); }
}
