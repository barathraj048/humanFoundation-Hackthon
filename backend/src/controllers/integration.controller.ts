import { Request, Response, NextFunction } from 'express';
import { Resend } from 'resend';
import { google } from 'googleapis';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// POST /api/integrations/email/test
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
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 32px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
          <div style="text-align:center; margin-bottom: 24px;">
            <div style="background: #ecfdf5; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">✅</div>
          </div>
          <h2 style="color: #111827; text-align: center; margin: 0 0 8px;">Email connected successfully!</h2>
          <p style="color: #6b7280; text-align: center; font-size: 14px; margin: 0 0 24px;">Your Resend integration is working. Automated emails will be sent from your workspace.</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; font-size: 13px; color: #6b7280; text-align: center;">
            Workspace: <strong style="color: #111827;">${workspace?.businessName}</strong>
          </div>
        </div>
      `,
    });

    if (result.error) {
      return errorResponse(res, `Email test failed: ${result.error.message}`, 400);
    }

    return successResponse(res, {
      success: true,
      message: `Test email sent to ${testTo}`,
      emailId: result.data?.id,
    });
  } catch (err: any) {
    return errorResponse(res, `Email test failed: ${err.message}`, 400);
  }
}

// GET /api/integrations/google/auth-url
export async function getGoogleAuthUrl(req: Request, res: Response, next: NextFunction) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return errorResponse(res, 'Google Calendar integration not configured', 501);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.user!.workspaceId,
    });

    return successResponse(res, { url });
  } catch (err) { next(err); }
}

// GET /api/integrations/google/callback
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

    // Get primary calendar ID
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calList = await calendar.calendarList.list();
    const primary = calList.data.items?.find(c => c.primary)?.id || 'primary';

    await prisma.integration.upsert({
      where: { workspaceId_type: { workspaceId: workspaceId as string, type: 'CALENDAR' } },
      update: {
        provider: 'google',
        config: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          calendarId: primary,
        },
        isActive: true,
      },
      create: {
        workspaceId: workspaceId as string,
        type: 'CALENDAR',
        provider: 'google',
        config: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          calendarId: primary,
        },
      },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?success=calendar_connected`);
  } catch (err) {
    next(err);
  }
}

// GET /api/integrations/status
export async function getIntegrationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const integrations = await prisma.integration.findMany({
      where: { workspaceId: req.user!.workspaceId },
      select: {
        type: true,
        provider: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const status: Record<string, any> = {
      email: { connected: false },
      calendar: { connected: false },
      sms: { connected: false },
    };

    integrations.forEach(i => {
      const key = i.type.toLowerCase();
      status[key] = {
        connected: i.isActive,
        provider: i.provider,
        connectedAt: i.createdAt,
      };
    });

    return successResponse(res, status);
  } catch (err) { next(err); }
}

// DELETE /api/integrations/:type
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
