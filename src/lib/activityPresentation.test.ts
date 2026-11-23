import { describe, it, expect } from 'vitest';
import { activityActorLabel, formatActivityTimestamp } from './activityPresentation';

describe('Activity Log presentation', () => {
  it('shows the resolved actor and preserves System for automated events', () => {
    expect(activityActorLabel({ actor: { id: 'recorded-id', name: 'Megan Tooley', source: 'metadata.userId' } })).toBe('Megan Tooley');
    expect(activityActorLabel({})).toBe('System');
    expect(activityActorLabel({ actor: { id: 'missing-user', source: 'metadata.userId' } })).toBe('User ID: missing-user');
    expect(activityActorLabel({ userId: { _id: 'existing', firstName: 'Leana', lastName: 'Oberholzer', email: '' } })).toBe('Leana Oberholzer');
  });
  it('shows exact audit seconds in Johannesburg regardless of browser timezone', () => {
    expect(formatActivityTimestamp('2026-11-17T12:40:56.943Z')).toBe('17 Nov 2026, 14:40:56 SAST');
    expect(formatActivityTimestamp('2026-11-23T06:06:33.363Z')).toBe('23 Nov 2026, 08:06:33 SAST');
    expect(formatActivityTimestamp('invalid')).toBe('-');
  });
});
