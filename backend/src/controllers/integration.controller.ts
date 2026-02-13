import { Request, Response, NextFunction } from 'express';
import { Resend } from 'resend';
import { google } from 'googleapis';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

export async function testEmailIntegration(req: Request, res: Response, next: NextFunction) {
  try {
    const { apiKey, toEmail } = req.body;
    if (!apiKey) return errorResponse(res, 'API key is required', 400);

    const resend = new Resend(apiKey);
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.user!.workspaceId },
      select: { businessName: true, contactEmail: true },
    });
    const testTo = toEmail || workspace?.contactEmail || req.user!.email;

    const result = await resend.emails.send({
      from: 'CareOps Test <onboarding@resend.dev>',
      to: testTo,
      subject: `✅ Email Integration Test – ${workspace?.businessName || 'CareOps'}`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:32px;background:white;border-radius:16px;border:1px solid #e2e8f0;"><h2 style="color:#111827;text-align:center;">✅ Email connected!</h2><p style="color:#6b7280;text-align:center;">Your Resend integration is working correctly.</p></div>`,
    });

    if (result.error) return errorResponse(res, `Email test failed: ${result.error.message}`, 400);
    return successResponse(res, { success: true, message: `Test email sent to ${testTo}`, emailId: result.data?.id });
  } catch (err: any) {
    return errorResponse(res, `Email test failed: ${err.message}`, 400);
  }
}

export async function getGoogleAuthUrl(req: Request, res: Response, next: NextFunction) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return errorResponse(res, 'Google Calendar not configured', 501);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
      state: req.user!.workspaceId,
    });
    return successResponse(res, { url });
  } catch (err) { next(err); }
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state: workspaceId } = req.query;
    if (!code || !workspaceId) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=missing_params`);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calList = await calendar.calendarList.list();
    const primary = calList.data.items?.find(c => c.primary)?.id || 'primary';

    // Use separate workspaceId + type (not compound key) for upsert
    const existing = await prisma.integration.findFirst({
      where: { workspaceId: workspaceId as string, type: 'CALENDAR' },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          provider: 'google',
          config: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, calendarId: primary },
          isActive: true,
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          workspaceId: workspaceId as string,
          type: 'CALENDAR',
          provider: 'google',
          config: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, calendarId: primary },
        },
      });
    }

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?success=calendar_connected`);
  } catch (err) { next(err); }
}

export async function getIntegrationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const integrations = await prisma.integration.findMany({
      where: { workspaceId: req.user!.workspaceId },
      select: { type: true, provider: true, isActive: true, createdAt: true },
    });

    const status: Record<string, any> = {
      email: { connected: false },
      calendar: { connected: false },
      sms: { connected: false },
    };
    integrations.forEach(i => {
      status[i.type.toLowerCase()] = { connected: i.isActive, provider: i.provider, connectedAt: i.createdAt };
    });
    return successResponse(res, status);
  } catch (err) { next(err); }
}

export async function disconnectIntegration(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type.toUpperCase() as 'EMAIL' | 'SMS' | 'CALENDAR';
    await prisma.integration.updateMany({
      where: { workspaceId: req.user!.workspaceId, type },
      data: { isActive: false },
    });
    return successResponse(res, { message: `${type} integration disconnected` });
  } catch (err) { next(err); }
}
