import { z } from 'zod';

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(3, 'Business name must be at least 3 characters'),
  fullName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── WORKSPACE ────────────────────────────────────────────────────────────────
export const updateWorkspaceSchema = z.object({
  businessName: z.string().min(3).optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
});

// ─── SERVICE TYPE ─────────────────────────────────────────────────────────────
export const serviceTypeSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(5, 'Minimum 5 minutes').max(480),
  location: z.string().optional(),
});

// ─── AVAILABILITY ─────────────────────────────────────────────────────────────
export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
});

export const availabilitySchema = z.array(availabilityRuleSchema).min(1);

// ─── BOOKING ──────────────────────────────────────────────────────────────────
export const createBookingSchema = z.object({
  serviceTypeId: z.string().uuid('Invalid service type'),
  scheduledAt: z.string().datetime('Invalid datetime'),
  contact: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
  location: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']),
});

// ─── CONTACT ──────────────────────────────────────────────────────────────────
export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'BOOKED', 'COMPLETED']),
});

// ─── MESSAGE ──────────────────────────────────────────────────────────────────
export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
  channel: z.enum(['EMAIL', 'SMS', 'SYSTEM']).optional(),
});

// ─── FORM ─────────────────────────────────────────────────────────────────────
export const createFormTemplateSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  type: z.enum(['CONTACT', 'INTAKE', 'AGREEMENT']).optional(),
  fields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'date']),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
});

// ─── INVENTORY ────────────────────────────────────────────────────────────────
export const createInventorySchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().min(0),
  threshold: z.number().int().min(0),
  unit: z.string().optional(),
  vendorEmail: z.string().email().optional().or(z.literal('')),
});

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0).optional(),
  threshold: z.number().int().min(0).optional(),
  vendorEmail: z.string().email().optional().or(z.literal('')),
});

// ─── INTEGRATION ─────────────────────────────────────────────────────────────
export const upsertIntegrationSchema = z.object({
  type: z.enum(['EMAIL', 'SMS', 'CALENDAR']),
  provider: z.string(),
  config: z.record(z.unknown()),
});

// ─── STAFF INVITE ─────────────────────────────────────────────────────────────
export const inviteStaffSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  fullName: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
});
