import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse } from '../utils/response';
import { startOfDay, endOfDay, subDays, addHours } from 'date-fns';

// GET /api/dashboard/overview
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
      pendingForms,
      overdueForms,
      completedForms,
      lowStockItems,
      criticalStockItems,
      recentAlerts,
    ] = await Promise.all([
      // Today's bookings total
      prisma.booking.count({
        where: {
          workspaceId,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Completed today
      prisma.booking.count({
        where: {
          workspaceId,
          status: 'COMPLETED',
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // No-shows today
      prisma.booking.count({
        where: {
          workspaceId,
          status: 'NO_SHOW',
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Upcoming bookings (next 7 days)
      prisma.booking.findMany({
        where: {
          workspaceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledAt: { gte: today },
        },
        include: {
          contact: { select: { id: true, name: true, email: true } },
          serviceType: { select: { id: true, name: true, durationMinutes: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),

      // New leads today
      prisma.contact.count({
        where: {
          workspaceId,
          status: 'NEW',
          createdAt: { gte: todayStart },
        },
      }),

      // Total active leads
      prisma.contact.count({
        where: {
          workspaceId,
          status: { in: ['NEW', 'CONTACTED'] },
        },
      }),

      // Unanswered (NEW status older than 24h)
      prisma.contact.count({
        where: {
          workspaceId,
          status: 'NEW',
          createdAt: { lte: subDays(today, 1) },
        },
      }),

      // Pending forms
      prisma.formSubmission.count({
        where: { workspaceId, status: 'PENDING' },
      }),

      // Overdue forms (pending > 3 days)
      prisma.formSubmission.count({
        where: {
          workspaceId,
          status: 'PENDING',
          createdAt: { lte: subDays(today, 3) },
        },
      }),

      // Forms completed today
      prisma.formSubmission.count({
        where: {
          workspaceId,
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
      }),

      // Low stock items (quantity > 0 but <= threshold)
      prisma.inventoryItem.count({
        where: {
          workspaceId,
          quantity: { gt: 0 },
          // We'll do the comparison in app code since Prisma doesn't support column comparisons
        },
      }).then(async () => {
        const items = await prisma.inventoryItem.findMany({
          where: { workspaceId },
          select: { quantity: true, threshold: true },
        });
        return items.filter(i => i.quantity > 0 && i.quantity <= i.threshold).length;
      }),

      // Critical (out of stock)
      prisma.inventoryItem.count({
        where: { workspaceId, quantity: 0 },
      }),

      // Build alerts from the data
      Promise.resolve([]),
    ]);

    // Build smart alerts array
    const alerts = [];

    if (criticalStockItems > 0) {
      alerts.push({
        type: 'inventory_critical',
        message: `${criticalStockItems} item${criticalStockItems > 1 ? 's' : ''} out of stock`,
        link: '/dashboard/inventory',
        severity: 'critical',
      });
    }

    if (lowStockItems > 0) {
      alerts.push({
        type: 'inventory_low',
        message: `${lowStockItems} item${lowStockItems > 1 ? 's' : ''} running low`,
        link: '/dashboard/inventory',
        severity: 'warning',
      });
    }

    if (overdueForms > 0) {
      alerts.push({
        type: 'forms_overdue',
        message: `${overdueForms} form${overdueForms > 1 ? 's' : ''} overdue (3+ days)`,
        link: '/dashboard/forms',
        severity: 'warning',
      });
    }

    if (unansweredLeads > 0) {
      alerts.push({
        type: 'leads_unanswered',
        message: `${unansweredLeads} lead${unansweredLeads > 1 ? 's' : ''} unanswered for 24h+`,
        link: '/dashboard/contacts',
        severity: 'warning',
      });
    }

    // Check no-shows today
    if (noShowToday > 0) {
      alerts.push({
        type: 'no_show',
        message: `${noShowToday} no-show${noShowToday > 1 ? 's' : ''} today`,
        link: '/dashboard/bookings',
        severity: 'info',
      });
    }

    const response = {
      todayBookings: {
        total: todayBookings,
        completed: completedToday,
        upcoming: upcomingBookings.length,
        noShow: noShowToday,
      },
      leads: {
        newToday: newLeadsToday,
        unanswered: unansweredLeads,
        totalActive: totalActiveLeads,
      },
      forms: {
        pending: pendingForms,
        overdue: overdueForms,
        completedToday: completedForms,
      },
      inventory: {
        lowStock: lowStockItems,
        criticalStock: criticalStockItems,
      },
      alerts,
      upcomingBookings,
    };

    return successResponse(res, response);
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/analytics
export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user!.workspaceId;
    const { range = '7' } = req.query;
    const days = parseInt(range as string) || 7;

    const since = subDays(new Date(), days);

    const [bookings, contacts, bookingsByStatus] = await Promise.all([
      prisma.booking.findMany({
        where: {
          workspaceId,
          createdAt: { gte: since },
        },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      prisma.contact.findMany({
        where: {
          workspaceId,
          createdAt: { gte: since },
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      prisma.booking.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { id: true },
      }),
    ]);

    // Build daily trend
    const trendMap = new Map<string, { bookings: number; leads: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, { bookings: 0, leads: 0 });
    }

    bookings.forEach(b => {
      const key = b.createdAt.toISOString().split('T')[0];
      const entry = trendMap.get(key);
      if (entry) entry.bookings++;
    });

    contacts.forEach(c => {
      const key = c.createdAt.toISOString().split('T')[0];
      const entry = trendMap.get(key);
      if (entry) entry.leads++;
    });

    const bookingTrend = Array.from(trendMap.entries()).map(([date, v]) => ({
      date,
      ...v,
    }));

    // Bookings by hour
    const hourMap = new Map<number, number>();
    for (let h = 8; h <= 18; h++) hourMap.set(h, 0);
    bookings.forEach(b => {
      const h = b.scheduledAt.getHours();
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    });
    const bookingsByHour = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`,
      count,
    }));

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    bookingsByStatus.forEach(s => {
      statusBreakdown[s.status] = s._count.id;
    });

    const totalBookings = bookings.length;
    const totalContacts = contacts.length;
    const completedBookings = statusBreakdown['COMPLETED'] || 0;
    const noShowBookings = statusBreakdown['NO_SHOW'] || 0;

    return successResponse(res, {
      conversionRate: totalContacts > 0
        ? Math.round((totalBookings / totalContacts) * 100)
        : 0,
      noShowRate: totalBookings > 0
        ? Math.round((noShowBookings / totalBookings) * 100)
        : 0,
      bookingTrend,
      bookingsByHour,
      statusBreakdown,
      totalBookings,
      totalContacts,
    });
  } catch (err) {
    next(err);
  }
}
