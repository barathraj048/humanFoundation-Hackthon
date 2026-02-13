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
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(json({ limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅  CareOps API → http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
