import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { json } from 'express';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import bookingRoutes from './routes/booking.routes';
import contactRoutes from './routes/contact.routes';
import conversationRoutes from './routes/conversation.routes';
import dashboardRoutes from './routes/dashboard.routes';
import formRoutes from './routes/form.routes';
import inventoryRoutes from './routes/inventory.routes';
import publicRoutes from './routes/public.routes';
import integrationRoutes from './routes/integration.routes';
import automationRoutes from './routes/automation.routes';

import { errorHandler } from './middleware/error.middleware';
import { startCronJobs } from './services/cron.service';

const app = express();

// ── Render requires 0.0.0.0 binding ──────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8000', 10);
const HOST = '0.0.0.0'; // CRITICAL for Render — must bind to all interfaces

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(json({ limit: '10mb' }));

// ── Request logging in dev ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── Health check (Render pings this) ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/public', publicRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
// IMPORTANT: Must listen on HOST 0.0.0.0 for Render to detect the open port
app.listen(PORT, HOST, () => {
  console.log(`✅  CareOps API running on http://${HOST}:${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  startCronJobs();
});

export default app;