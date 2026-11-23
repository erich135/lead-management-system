import type { Activity } from './api';

export function activityActorLabel(activity: Pick<Activity, 'actor' | 'userId'>): string {
  if (activity.actor?.name) return activity.actor.name + (activity.actor.email ? ` (${activity.actor.email})` : '');
  const user = activity.userId;
  if (user && typeof user === 'object') {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || `User ID: ${user._id}`;
  }
  const id = activity.actor?.id || user;
  return id ? `User ID: ${id}` : 'System';
}

export function formatActivityTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date) + ' SAST';
}
