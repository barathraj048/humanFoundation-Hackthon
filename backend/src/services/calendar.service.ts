import { google } from 'googleapis';
import prisma from '../config/prisma';
import { addMinutes } from 'date-fns';

export async function getCalendarClient(workspaceId: string) {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_type: { workspaceId, type: 'CALENDAR' } },
  });

  if (!integration || !integration.isActive) return null;

  const config = integration.config as {
    accessToken?: string;
    refreshToken?: string;
    calendarId?: string;
  };

  if (!config.accessToken) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
  });

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    calendarId: config.calendarId || 'primary',
  };
}

export async function createCalendarEvent(
  workspaceId: string,
  booking: {
    id: string;
    scheduledAt: Date;
    durationMinutes: number;
    contact: { name: string; email?: string | null };
    serviceType: { name: string };
    location?: string | null;
    notes?: string | null;
  }
): Promise<string | null> {
  const client = await getCalendarClient(workspaceId);
  if (!client) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { businessName: true, timezone: true },
  });

  try {
    const event = await client.calendar.events.insert({
      calendarId: client.calendarId,
      requestBody: {
        summary: `${booking.serviceType.name} - ${booking.contact.name}`,
        description: booking.notes || undefined,
        location: booking.location || undefined,
        start: {
          dateTime: booking.scheduledAt.toISOString(),
          timeZone: workspace?.timezone || 'UTC',
        },
        end: {
          dateTime: addMinutes(booking.scheduledAt, booking.durationMinutes).toISOString(),
          timeZone: workspace?.timezone || 'UTC',
        },
        attendees: booking.contact.email
          ? [{ email: booking.contact.email, displayName: booking.contact.name }]
          : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    });

    return event.data.id || null;
  } catch (error) {
    console.error('Calendar event creation failed:', error);
    return null;
  }
}

export async function deleteCalendarEvent(
  workspaceId: string,
  eventId: string
): Promise<void> {
  const client = await getCalendarClient(workspaceId);
  if (!client) return;

  try {
    await client.calendar.events.delete({
      calendarId: client.calendarId,
      eventId,
    });
  } catch (error) {
    console.error('Calendar event deletion failed:', error);
  }
}
