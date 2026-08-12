/**
 * Shared helpers for the Representative mobile-browser experience.
 * Runs entirely in the website — not a native mobile framework.
 */

import type { PlannerAppointment } from '../components/diary/DiaryDayAppointmentCard';

/**
 * Returns true when the authenticated user is a sales Representative.
 */
export function isRepUser(user?: { role?: { name?: string } } | null): boolean {
  return user?.role?.name?.toLowerCase() === 'rep';
}

/**
 * Time-of-day greeting for the Home screen.
 */
export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Builds a Google Maps navigation URL for an appointment location.
 */
export function buildNavigateUrl(appointment: PlannerAppointment): string | null {
  const coords = appointment.geoLocation?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const [lng, lat] = coords;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  }

  const address =
    appointment.location ||
    appointment.salesLead?.contactAddress ||
    appointment.salesLead?.companyName;
  if (!address?.trim()) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
}

/**
 * Normalizes a phone number for tel: links.
 */
export function buildTelUrl(phone?: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return null;
  return `tel:${digits}`;
}

/**
 * Formats appointment time for large mobile cards.
 */
export function formatMobileTime(time?: string): string {
  if (!time) return 'TBC';
  if (/am|pm/i.test(time)) return time;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Local midnight helper.
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Adds whole days without mutating the original date.
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export type MobileRepTab =
  | 'home'
  | 'sales_leads'
  | 'planner'
  | 'jobs'
  | 'history'
  | 'profile'
  | 'activities'
  | 'machines';
