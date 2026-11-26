import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ReadingReminderScheduleFields } from '../components/ReadingReminderScheduleFields';
import { readingScheduleDraftForMachine, readingScheduleEditPayload, readingScheduleLabel } from './readingReminderSchedule';
describe('reading schedule edit/payload and controls',()=>{
  it('keeps each existing legacy interval without converting or restamping on an ordinary save',()=>{
    for(const days of [1,30,60,90]){const machine={readingFrequencyDays:days};const draft=readingScheduleDraftForMachine(machine);
      expect(draft.mode).toBe('interval');expect(draft.intervalDays).toBe(String(days));expect(readingScheduleEditPayload(draft,machine)).toEqual({});}
  });
  it('uses 30 for new interval choices and preserves explicit schedules on unrelated saves',()=>{
    expect(readingScheduleDraftForMachine().intervalDays).toBe('30');
    const machine={readingFrequencyDays:60,readingReminderSchedule:{mode:'day-of-month' as const,dayOfMonth:31,configuredAt:'2026-11-01T00:00:00Z'}};
    expect(readingScheduleEditPayload(readingScheduleDraftForMachine(machine),machine)).toEqual({});
  });
  it('sends only selected fields and never the server configuration timestamp',()=>{
    const base=readingScheduleDraftForMachine({readingFrequencyDays:60});
    expect(readingScheduleEditPayload({...base,mode:'month-end'},{})).toEqual({readingReminderSchedule:{mode:'month-end'}});
    expect(readingScheduleEditPayload({...base,mode:'last-working-day'},{})).toEqual({readingReminderSchedule:{mode:'last-working-day'}});
    expect(readingScheduleEditPayload({...base,mode:'day-of-month',dayOfMonth:'31'},{})).toEqual({readingReminderSchedule:{mode:'day-of-month',dayOfMonth:31}});
    expect(readingScheduleEditPayload({...base,intervalDays:'12'},{})).toEqual({readingFrequencyDays:12,readingReminderSchedule:{mode:'interval',intervalDays:12}});
  });
  for(const value of ['','0','-1','1.5','abc'])it(`does not replace invalid day counts ${value} with 30`,()=>{
    expect(()=>readingScheduleEditPayload({...readingScheduleDraftForMachine(),intervalDays:value},{readingFrequencyDays:60})).toThrow();
  });
  for(const value of ['0','32','29.5',''])it(`validates day-of-month ${value}`,()=>{
    expect(()=>readingScheduleEditPayload({...readingScheduleDraftForMachine(),mode:'day-of-month',dayOfMonth:value},{})).toThrow();
  });
  it('labels all modes and renders four accessible choices with conditional inputs',()=>{
    for(const mode of ['interval','month-end','last-working-day','day-of-month'] as const){
      const machine={readingReminderSchedule:{mode,dayOfMonth:31}},draft=readingScheduleDraftForMachine(machine);
      const html=renderToStaticMarkup(createElement(ReadingReminderScheduleFields,{value:draft,onChange:()=>undefined}));
      expect(html.match(/<option /g)).toHaveLength(4);expect(html).toContain('machine-reading-schedule');expect(html).toContain('08:00 South African time');
      expect(html.includes('id="machine-reading-interval"')).toBe(mode==='interval');
      expect(html.includes('id="machine-reading-month-day"')).toBe(mode==='day-of-month');
      expect(readingScheduleLabel(machine)).not.toBe('');
    }
  });
});
