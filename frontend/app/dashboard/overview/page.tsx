import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse } from '../utils/response';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user!.workspaceId;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const [
      todayBookings,
      completedToday,
      noShowToday,
      upcomingBookings,
      newLeadsToday,
      totalActiveLeads,
      unansweredLeads,
    ] = await Promise.all([
      prisma.booking.count({ where: { workspaceId, scheduledAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.booking.count({ where: { workspaceId, status: 'COMPLETED', scheduledAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.booking.count({ where: { workspaceId, status: 'NO_SHOW', scheduledAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.booking.findMany({
        where: { workspaceId, status: { in: ['PENDING', 'CONFIRMED'] }, scheduledAt: { gte: today } },
        include: {
          contact: { select: { id: true, name: true, email: true } },
          serviceType: { select: { id: true, name: true, durationMinutes: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      prisma.contact.count({ where: { workspaceId, status: 'NEW', createdAt: { gte: todayStart } } }),
      prisma.contact.count({ where: { workspaceId, status: { in: ['NEW', 'CONTACTED'] } } }),
      prisma.contact.count({ where: { workspaceId, status: 'NEW', createdAt: { lte: subDays(today, 1) } } }),
    ]);

    const [pendingForms, overdueForms, completedForms] = await Promise.all([
      prisma.formSubmission.count({ where: { workspace: { id: workspaceId }, status: 'PENDING' } }),
      prisma.formSubmission.count({ where: { workspace: { id: workspaceId }, status: 'PENDING', createdAt: { lte: subDays(today, 3) } } }),
      prisma.formSubmission.count({ where: { workspace: { id: workspaceId }, status: 'COMPLETED', completedAt: { gte: todayStart } } }),
    ]);

    const allItems = await prisma.inventoryItem.findMany({
      where: { workspaceId },
      select: { quantity: true, threshold: true },
    });
    const criticalStockItems = allItems.filter(i => i.quantity === 0).length;
    const lowStockItems = allItems.filter(i => i.quantity > 0 && i.quantity <= i.threshold).length;

    const alerts: any[] = [];
    if (criticalStockItems > 0) alerts.push({ type: 'inventory_critical', message: `${criticalStockItems} item${criticalStockItems > 1 ? 's' : ''} out of stock`, link: '/dashboard/inventory', severity: 'critical' });
    if (lowStockItems > 0) alerts.push({ type: 'inventory_low', message: `${lowStockItems} item${lowStockItems > 1 ? 's' : ''} running low`, link: '/dashboard/inventory', severity: 'warning' });
    if (overdueForms > 0) alerts.push({ type: 'forms_overdue', message: `${overdueForms} form${overdueForms > 1 ? 's' : ''} overdue (3+ days)`, link: '/dashboard/forms', severity: 'warning' });
    if (unansweredLeads > 0) alerts.push({ type: 'leads_unanswered', message: `${unansweredLeads} lead${unansweredLeads > 1 ? 's' : ''} unanswered 24h+`, link: '/dashboard/contacts', severity: 'warning' });
    if (noShowToday > 0) alerts.push({ type: 'no_show', message: `${noShowToday} no-show${noShowToday > 1 ? 's' : ''} today`, link: '/dashboard/bookings', severity: 'info' });

    return successResponse(res, {
      todayBookings: { total: todayBookings, completed: completedToday, upcoming: upcomingBookings.length, noShow: noShowToday },
      leads: { newToday: newLeadsToday, unanswered: unansweredLeads, totalActive: totalActiveLeads },
      forms: { pending: pendingForms, overdue: overdueForms, completedToday: completedForms },
      inventory: { lowStock: lowStockItems, criticalStock: criticalStockItems },
      alerts,
      upcomingBookings,
    });
  } catch (err) { next(err); }
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user!.workspaceId;
    const { range = '7' } = req.query;
    const days = parseInt(range as string) || 7;
    const since = subDays(new Date(), days);

    const [bookings, contacts, bookingsByStatus] = await Promise.all([
      prisma.booking.findMany({
        where: { workspaceId, createdAt: { gte: since } },
        select: { id: true, scheduledAt: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.contact.findMany({
        where: { workspaceId, createdAt: { gte: since } },
        select: { id: true, createdAt: true },
      }),
      prisma.booking.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { id: true },
      }),
    ]);

    const trendMap = new Map<string, { bookings: number; leads: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      trendMap.set(d.toISOString().split('T')[0], { bookings: 0, leads: 0 });
    }
    bookings.forEach(b => { const k = b.createdAt.toISOString().split('T')[0]; const e = trendMap.get(k); if (e) e.bookings++; });
    contacts.forEach(c => { const k = c.createdAt.toISOString().split('T')[0]; const e = trendMap.get(k); if (e) e.leads++; });

    const bookingTrend = Array.from(trendMap.entries()).map(([date, v]) => ({ date, ...v }));

    const hourMap = new Map<number, number>();
    for (let h = 8; h <= 18; h++) hourMap.set(h, 0);
    bookings.forEach(b => { const h = b.scheduledAt.getHours(); hourMap.set(h, (hourMap.get(h) || 0) + 1); });
    const bookingsByHour = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`, count,
    }));

    const statusBreakdown: Record<string, number> = {};
    bookingsByStatus.forEach(s => { statusBreakdown[s.status] = s._count.id; });

    return successResponse(res, {
      conversionRate: contacts.length > 0 ? Math.round((bookings.length / contacts.length) * 100) : 0,
      noShowRate: bookings.length > 0 ? Math.round(((statusBreakdown['NO_SHOW'] || 0) / bookings.length) * 100) : 0,
      bookingTrend,
      bookingsByHour,
      statusBreakdown,
      totalBookings: bookings.length,
      totalContacts: contacts.length,
    });
  } catch (err) { next(err); }
}

// Booking trend — uses BOTH scheduledAt and createdAt to catch all bookings
export async function getBookingTrend(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user!.workspaceId;
    const now = new Date();

    // Always use ISO string splitting for keys — consistent on any server timezone
    const toKey = (d: Date) => d.toISOString().split('T')[0];

    // Build 7-day window
    const dayMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      dayMap.set(toKey(subDays(now, i)), 0);
    }

    const sevenDaysAgo = subDays(startOfDay(now), 6);

    // Fetch bookings — match on EITHER createdAt OR scheduledAt in last 7 days
    const bookings = await prisma.booking.findMany({
      where: {
        workspaceId,
        OR: [
          { createdAt:   { gte: sevenDaysAgo } },
          { scheduledAt: { gte: sevenDaysAgo } },
        ],
      },
      select: { createdAt: true, scheduledAt: true, status: true },
    });

    bookings.forEach(b => {
      // Prefer createdAt key (when booking was made) — more reliable for trend
      // Fall back to scheduledAt if createdAt is outside window
      const createdKey   = toKey(b.createdAt);
      const scheduledKey = toKey(b.scheduledAt);
      const key = dayMap.has(createdKey) ? createdKey : scheduledKey;
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
      }
    });

    const trend = Array.from(dayMap.entries()).map(([date, total]) => ({
      date,
      // +T12:00:00 avoids midnight UTC rolling back a day in some locales
      label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      }),
      total,
    }));

    // Today hourly
    const todayBookings = await prisma.booking.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      select: { createdAt: true },
    });

    const hourMap = new Map<number, number>();
    for (let h = 6; h <= 22; h++) hourMap.set(h, 0);
    todayBookings.forEach(b => {
      const h = b.createdAt.getHours();
      if (hourMap.has(h)) hourMap.set(h, (hourMap.get(h) || 0) + 1);
    });

    const todayHourly = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour: `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}${hour >= 12 ? 'pm' : 'am'}`,
      count,
    }));

    const totalToday = dayMap.get(toKey(now)) ?? 0;

    return successResponse(res, { trend, todayHourly, totalToday });
  } catch (err) { next(err); }
}