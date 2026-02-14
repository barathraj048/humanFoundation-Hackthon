export type Role = 'OWNER' | 'STAFF';
export type ContactStatus = 'NEW' | 'CONTACTED' | 'BOOKED' | 'COMPLETED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export type Channel = 'EMAIL' | 'SMS' | 'SYSTEM';
export type Direction = 'INBOUND' | 'OUTBOUND';
export type SenderType = 'CONTACT' | 'STAFF' | 'SYSTEM';
export type Severity = 'info' | 'warning' | 'critical';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: Role;
  workspaceId: string;
}

export interface Workspace {
  id: string;
  slug: string;
  businessName: string;
  address?: string;
  timezone: string;
  contactEmail?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  location?: string;
  isActive: boolean;
}

export interface Booking {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  location?: string;
  notes?: string;
  contact: Contact;
  serviceType: ServiceType;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: Direction;
  senderType: SenderType;
  senderId?: string;
  content: string;
  isAutomated: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  channel: Channel;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  automationPaused: boolean;
  tags: string[];
  lastMessageAt?: string;
  contact: Contact;
  unreadCount?: number;
  lastMessage?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  unit?: string;
  vendorEmail?: string;
  updatedAt: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  type: 'CONTACT' | 'INTAKE' | 'AGREEMENT';
  isActive: boolean;
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
  completedAt?: string;
  contact: Contact;
  formTemplate: FormTemplate;
  booking?: Booking;
}

export interface DashboardAlert {
  type: string;
  message: string;
  link: string;
  severity: Severity;
}

export interface DashboardStats {
  todayBookings: {
    total: number;
    completed: number;
    upcoming: number;
    noShow: number;
  };
  leads: {
    newToday: number;
    unanswered: number;
    totalActive: number;
  };
  forms: {
    pending: number;
    overdue: number;
    completedToday: number;
  };
  inventory: {
    lowStock: number;
    criticalStock: number;
  };
  alerts: DashboardAlert[];
  upcomingBookings: Booking[];
}

export interface AnalyticsData {
  conversionRate: number;
  noShowRate: number;
  bookingTrend: { date: string; bookings: number }[];
  bookingsByHour: { hour: string; count: number }[];
  totalBookings: number;
  totalContacts: number;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    total?: number;
  };
}
