export type ReadingScheduleMode = 'month-end' | 'last-working-day' | 'day-of-month' | 'interval';
export interface StoredReadingSchedule { mode: ReadingScheduleMode; dayOfMonth?: number; configuredAt?: string }
export interface ReadingScheduleMachine { readingFrequencyDays?: number; readingReminderSchedule?: StoredReadingSchedule | null }
export interface ReadingScheduleDraft { mode: ReadingScheduleMode; intervalDays: string; dayOfMonth: string }

export function readingScheduleDraftForMachine(machine: ReadingScheduleMachine = {}): ReadingScheduleDraft {
  return { mode: machine.readingReminderSchedule?.mode || 'interval',
    intervalDays: String(machine.readingFrequencyDays != null && machine.readingFrequencyDays >= 1 ? machine.readingFrequencyDays : 30),
    dayOfMonth: String(machine.readingReminderSchedule?.dayOfMonth || 1) };
}
export function readingScheduleLabel(machine: ReadingScheduleMachine): string {
  const draft = readingScheduleDraftForMachine(machine);
  if (draft.mode === 'month-end') return 'Last calendar day of every month';
  if (draft.mode === 'last-working-day') return 'Last working day of every month';
  if (draft.mode === 'day-of-month') return `Day ${draft.dayOfMonth} of every month`;
  return `Every ${draft.intervalDays} days after a successful reading`;
}
/** No schedule field at all on an unchanged edit, including legacy interval records. */
export function readingScheduleEditPayload(draft: ReadingScheduleDraft, original: ReadingScheduleMachine) {
  const before = readingScheduleDraftForMachine(original);
  const unchanged = draft.mode === before.mode && (draft.mode !== 'interval' || Number(draft.intervalDays) === Number(before.intervalDays))
    && (draft.mode !== 'day-of-month' || Number(draft.dayOfMonth) === Number(before.dayOfMonth));
  if (unchanged) return {};
  if (draft.mode === 'interval') {
    const days = Number(draft.intervalDays);
    if (!draft.intervalDays.trim() || !Number.isSafeInteger(days) || days < 1) throw new Error('Enter a positive whole number of days.');
    return { readingFrequencyDays: days, readingReminderSchedule: { mode: draft.mode, intervalDays: days } };
  }
  if (draft.mode === 'day-of-month') {
    const day = Number(draft.dayOfMonth);
    if (!draft.dayOfMonth.trim() || !Number.isInteger(day) || day < 1 || day > 31) throw new Error('Enter a day from 1 to 31.');
    return { readingReminderSchedule: { mode: draft.mode, dayOfMonth: day } };
  }
  return { readingReminderSchedule: { mode: draft.mode } };
}
