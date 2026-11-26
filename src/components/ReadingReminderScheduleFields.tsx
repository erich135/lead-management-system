import type { ReadingScheduleDraft, ReadingScheduleMode } from '../lib/readingReminderSchedule';

export function ReadingReminderScheduleFields({ value, onChange }: {
  value: ReadingScheduleDraft; onChange: (value: ReadingScheduleDraft) => void;
}) {
  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  return <div className="space-y-2">
    <label htmlFor="machine-reading-schedule" className="block text-xs font-semibold text-slate-500 uppercase">Reading reminder schedule</label>
    <select id="machine-reading-schedule" className={inputClass} value={value.mode}
      onChange={e => onChange({ ...value, mode: e.target.value as ReadingScheduleMode })}>
      <option value="month-end">Last calendar day of every month</option>
      <option value="last-working-day">Last working day of every month</option>
      <option value="day-of-month">Specific day of every month</option>
      <option value="interval">Every X days after a successful reading</option>
    </select>
    {value.mode === 'interval' && <div>
      <label htmlFor="machine-reading-interval" className="block text-xs text-slate-500 mb-1">Number of days</label>
      <input id="machine-reading-interval" type="number" min={1} step={1} className={inputClass}
        value={value.intervalDays} onChange={e => onChange({ ...value, intervalDays: e.target.value })} />
    </div>}
    {value.mode === 'day-of-month' && <div>
      <label htmlFor="machine-reading-month-day" className="block text-xs text-slate-500 mb-1">Day of month (1–31)</label>
      <input id="machine-reading-month-day" type="number" min={1} max={31} step={1} className={inputClass}
        value={value.dayOfMonth} onChange={e => onChange({ ...value, dayOfMonth: e.target.value })} />
      <p className="text-xs text-slate-500 mt-1">If the month is shorter, use its final calendar day.</p>
    </div>}
    <p className="text-xs text-slate-500">Reminders are checked daily at 08:00 South African time. Working days exclude weekends and South African public holidays.</p>
    <p className="text-xs text-slate-500">Calendar changes start at the next scheduled date. An outstanding request keeps its five-day follow-up and ten-day escalation.</p>
    {value.mode === 'interval' && <p className="text-xs text-slate-500">The interval starts from the last genuine saved reading. With no previous reading, the first eligible run requests one.</p>}
  </div>;
}
