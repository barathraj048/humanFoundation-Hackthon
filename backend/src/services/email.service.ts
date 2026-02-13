import { Resend } from 'resend';
import prisma from '../config/prisma';

export async function getResendClient(workspaceId: string): Promise<Resend | null> {
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, type: 'EMAIL', isActive: true },
    select: { config: true },
  });
  if (integration) {
    const config = integration.config as { apiKey?: string };
    if (config.apiKey) return new Resend(config.apiKey);
  }
  if (process.env.RESEND_API_KEY) return new Resend(process.env.RESEND_API_KEY);
  return null;
}

export async function getFromEmail(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { businessName: true },
  });
  return `${workspace?.businessName || 'CareOps'} <onboarding@resend.dev>`;
}

function welcomeTemplate(data: { contactName: string; businessName: string; bookingLink?: string }) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#f8fafc;"><div style="background:white;border-radius:16px;padding:40px;"><div style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;"><h1 style="color:white;margin:0;">Welcome to ${data.businessName}! ✨</h1></div><p style="color:#374151;">Hi ${data.contactName},</p><p style="color:#374151;">Thanks for reaching out! Our team will be in touch shortly.</p>${data.bookingLink ? `<div style="text-align:center;margin:32px 0;"><a href="${data.bookingLink}" style="background:#2563eb;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;">Book an Appointment →</a></div>` : ''}<p style="color:#6b7280;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">— The ${data.businessName} Team</p></div></div>`;
}

function bookingConfirmationTemplate(data: { contactName: string; businessName: string; serviceName: string; scheduledAt: Date; durationMinutes: number; address?: string }) {
  const dateStr = data.scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = data.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#f8fafc;"><div style="background:white;border-radius:16px;padding:40px;"><div style="text-align:center;margin-bottom:32px;"><div style="background:#ecfdf5;width:64px;height:64px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:28px;">✅</div><h1 style="color:#111827;margin:0;">Booking Confirmed!</h1></div><p style="color:#374151;">Hi ${data.contactName},</p><div style="background:#f9fafb;border-radius:12px;padding:24px;margin:24px 0;"><table style="width:100%;border-collapse:collapse;"><tr><td style="color:#6b7280;padding:8px 0;font-size:14px;width:40%">Service</td><td style="color:#111827;font-weight:600;font-size:14px;">${data.serviceName}</td></tr><tr><td style="color:#6b7280;padding:8px 0;font-size:14px;">Date</td><td style="color:#111827;font-weight:600;font-size:14px;">${dateStr}</td></tr><tr><td style="color:#6b7280;padding:8px 0;font-size:14px;">Time</td><td style="color:#111827;font-weight:600;font-size:14px;">${timeStr}</td></tr><tr><td style="color:#6b7280;padding:8px 0;font-size:14px;">Duration</td><td style="color:#111827;font-weight:600;font-size:14px;">${data.durationMinutes} minutes</td></tr>${data.address ? `<tr><td style="color:#6b7280;padding:8px 0;font-size:14px;">Location</td><td style="color:#111827;font-weight:600;font-size:14px;">${data.address}</td></tr>` : ''}</table></div><p style="color:#6b7280;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">Need to reschedule? Simply reply to this email.<br/>— The ${data.businessName} Team</p></div></div>`;
}

function bookingReminderTemplate(data: { contactName: string; businessName: string; serviceName: string; scheduledAt: Date; address?: string }) {
  const timeStr = data.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:#f8fafc;"><div style="background:white;border-radius:16px;padding:40px;"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;"><p style="color:white;margin:0;font-size:14px;opacity:.9;">REMINDER</p><h2 style="color:white;margin:4px 0 0;">Your appointment is tomorrow!</h2></div><p style="color:#374151;">Hi ${data.contactName},</p><p style="color:#374151;">Reminder: <strong>${data.serviceName}</strong> tomorrow at <strong>${timeStr}</strong>.</p>${data.address ? `<p style="color:#374151;">📍 ${data.address}</p>` : ''}<p style="color:#6b7280;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;">— The ${data.businessName} Team</p></div></div>`;
}

export async function sendWelcomeEmail(workspaceId: string, to: string, data: { contactName: string; businessName: string; bookingLink?: string }) {
  const resend = await getResendClient(workspaceId);
  if (!resend || !to) return;
  try {
    await resend.emails.send({ from: await getFromEmail(workspaceId), to, subject: `Welcome to ${data.businessName}! 👋`, html: welcomeTemplate(data) });
  } catch (err) { console.error('Email error:', err); }
}

export async function sendBookingConfirmationEmail(workspaceId: string, to: string, data: { contactName: string; businessName: string; serviceName: string; scheduledAt: Date; durationMinutes: number; address?: string }) {
  const resend = await getResendClient(workspaceId);
  if (!resend || !to) return;
  const dateStr = data.scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  try {
    await resend.emails.send({ from: await getFromEmail(workspaceId), to, subject: `Booking Confirmed: ${data.serviceName} on ${dateStr}`, html: bookingConfirmationTemplate(data) });
  } catch (err) { console.error('Email error:', err); }
}

export async function sendBookingReminderEmail(workspaceId: string, to: string, data: { contactName: string; businessName: string; serviceName: string; scheduledAt: Date; address?: string }) {
  const resend = await getResendClient(workspaceId);
  if (!resend || !to) return;
  try {
    await resend.emails.send({ from: await getFromEmail(workspaceId), to, subject: `Reminder: Your appointment tomorrow`, html: bookingReminderTemplate(data) });
  } catch (err) { console.error('Email error:', err); }
}

export async function sendInventoryAlertEmail(to: string, data: { businessName: string; items: { name: string; quantity: number; threshold: number; unit?: string }[] }) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const itemList = data.items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;">${i.name}</td><td style="padding:8px;color:${i.quantity === 0 ? '#ef4444' : '#f59e0b'};font-weight:600;">${i.quantity} ${i.unit || ''}</td><td style="padding:8px;color:#6b7280;">Threshold: ${i.threshold}</td></tr>`).join('');
  try {
    await resend.emails.send({
      from: 'CareOps Alerts <onboarding@resend.dev>',
      to,
      subject: `⚠️ Low Stock Alert - ${data.businessName}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;"><h2>⚠️ Low Stock Alert - ${data.businessName}</h2><table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;"><thead><tr style="background:#f9fafb;"><th style="padding:12px 8px;text-align:left;font-size:13px;color:#6b7280;">Item</th><th style="padding:12px 8px;text-align:left;font-size:13px;color:#6b7280;">Current Stock</th><th style="padding:12px 8px;text-align:left;font-size:13px;color:#6b7280;">Threshold</th></tr></thead><tbody>${itemList}</tbody></table></div>`,
    });
  } catch (err) { console.error('Inventory alert error:', err); }
}
