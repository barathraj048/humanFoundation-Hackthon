import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatBookingDate(date: string | Date): string {
  return format(new Date(date), 'EEEE, MMMM d');
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'h:mm a');
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'badge-yellow',
    CONFIRMED: 'badge-blue',
    COMPLETED: 'badge-green',
    NO_SHOW: 'badge-red',
    CANCELLED: 'badge-gray',
    NEW: 'badge-blue',
    CONTACTED: 'badge-purple',
    BOOKED: 'badge-green',
    ACTIVE: 'badge-blue',
    PAUSED: 'badge-yellow',
    CLOSED: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export const TAG_COLORS: Record<string, string> = {
  'New Lead': 'badge-blue',
  'Booking Confirmed': 'badge-green',
  'Form Pending': 'badge-yellow',
  'At Risk': 'badge-red',
};
