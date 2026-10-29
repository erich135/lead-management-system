import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTechnicians, recordedActivities, reportingContact, technicianSummary, technicianVersion,
  type AppDeviceObservation, type TechnicianActivityRow,
} from './technicianActivity.ts';

const now = '2026-10-29T10:00:00.000Z';
const device = (nativeBuild: number | null, at = now): AppDeviceObservation => ({
  _id: String(nativeBuild), user: 'user', installationId: 'test-installation-' + nativeBuild,
  nativeBuild, nativeVersion: nativeBuild === 21 ? '1.0.5' : nativeBuild === 20 ? '1.0.4' : null,
  lastReceivedAt: at, firstReceivedAt: at, deviceModel: null, manufacturer: null, androidVersion: null,
  otaUpdateId: 'unrelated-js-update-21', otaRuntimeVersion: '1.0.5', otaChannel: 'production',
});
const row = (id: string, changes: Partial<TechnicianActivityRow> = {}): TechnicianActivityRow => ({
  id, name: id, active: true, accountIds: [id], lastLoginAt: null, lastAppLoginAt: null, lastAuditAt: null,
  assigned: 0, started: 0, outstanding: 0, submitted: 0, lastSubmission: null, lastWorkEvent: null,
  deliveryAssigned: 0, deliveryCompleted: 0, lastDeliveryAt: null, legacyDeliveryCount: 0,
  lastLegacyDeliveryReceivedAt: null, devices: [], ...changes,
});

test('seven-day summary includes the exact boundary, excludes future events, inactive records, audit and reporting-only contacts', () => {
  const rows = [
    row('login', {lastLoginAt:'2026-10-22T10:00:00Z'}),
    row('too old', {lastLoginAt:'2026-10-22T09:59:59Z'}),
    row('future', {lastLoginAt:'2026-10-30T10:00:00Z'}),
    row('audit only', {lastAuditAt:now,devices:[device(21)]}),
    row('inactive', {active:false,lastLoginAt:now,devices:[device(20)]}),
  ];
  assert.deepEqual(technicianSummary(rows,21,now),{active:4,inactive:1,recentlyActive:1,needUpdate:0,unknown:3});
});
test('latest relevant activity retains its source; delayed work uses receipt time and leaves device time intact', () => {
  const t=row('work',{lastLoginAt:'2026-10-25T00:00:00Z',lastAuditAt:'2026-10-29T09:59:00Z',
    lastWorkEvent:{receivedAt:'2026-10-29T09:00:00Z',deviceTime:'2026-09-01T00:00:00Z',action:'finish',subjectType:'job_assignment'},
    lastSubmission:{at:'2026-10-28T00:00:00Z',reportNumber:'RSR123'}});
  assert.equal(recordedActivities(t,now)[0].source,'Work event received');
  assert.equal(recordedActivities(t,now)[0].at,'2026-10-29T09:00:00Z');
  assert.equal(t.lastWorkEvent?.deviceTime,'2026-09-01T00:00:00Z');
});
test('accepted Job Cards and completed deliveries qualify consistently for recent activity', () => {
  const a=row('job',{lastSubmission:{at:now,reportNumber:'RSR1'}});
  const b=row('delivery',{lastDeliveryAt:now});
  const c=row('legacy',{lastLegacyDeliveryReceivedAt:now});
  assert.equal(technicianSummary([a,b,c],21,now).recentlyActive,3);
  assert.equal(recordedActivities(a,now)[0].source,'Job Card accepted');
  assert.equal(recordedActivities(b,now)[0].source,'Delivery completed');
});
test('native build wins over OTA identity; unknown is never counted as outdated', () => {
  const current=row('current',{devices:[device(21)]});
  const old=row('older',{devices:[device(20)]});
  const unknown=row('unknown',{devices:[device(null)]});
  assert.equal(technicianVersion(current,21,now).state,'current');
  assert.equal(technicianVersion(old,21,now).state,'outdated');
  assert.equal(technicianVersion(unknown,21,now).state,'unknown');
  assert.equal(technicianSummary([current,old,unknown,row('none')],21,now).needUpdate,1);
});
test('a recent current device cannot hide another old/stale phone or a known incomplete device', () => {
  const mixed=row('two phones',{devices:[device(21),device(20,'2026-09-01T00:00:00Z')]});
  const partial=row('partial',{devices:[device(21),device(null)]});
  assert.equal(technicianVersion(mixed,21,now).state,'outdated');
  assert.equal(technicianVersion(mixed,21,now).older.length,1);
  assert.equal(technicianVersion(mixed,21,now).known.length,2);
  assert.equal(technicianVersion(partial,21,now).state,'unknown');
  assert.equal(technicianSummary([mixed,partial],21,now).needUpdate,1);
});
test('last reporting contact is separate from activity and uses the 24-hour boundary without online claims', () => {
  assert.deepEqual(reportingContact(row('none',{lastLoginAt:now}),now),{at:null,status:'No report'});
  assert.equal(reportingContact(row('recent',{devices:[device(21,'2026-10-28T10:00:00Z')]}),now).status,'Recently contacted');
  assert.equal(reportingContact(row('stale',{devices:[device(21,'2026-10-28T09:59:59Z')]}),now).status,'Stale');
  assert.equal(reportingContact(row('future',{devices:[device(21,'2026-10-30T10:00:00Z')]}),now).status,'No report');
});
test('live search, active/version filters and deterministic sorts do not mutate the API list', () => {
  const rows=[row('b',{name:'Bêla',outstanding:4,devices:[device(20)]}),row('a',{name:'Alpha',active:false,lastLoginAt:now}),row('c',{name:'Charlie',outstanding:2,devices:[device(21)]})];
  const options={query:'',active:'all' as const,version:'all' as const,sort:'name-asc' as const,targetBuild:21,referenceAt:now};
  assert.deepEqual(filterTechnicians(rows,{...options,query:' BELA '}).map(t=>t.id),['b']);
  assert.deepEqual(filterTechnicians(rows,{...options,active:'inactive'}).map(t=>t.id),['a']);
  assert.deepEqual(filterTechnicians(rows,{...options,version:'outdated'}).map(t=>t.id),['b']);
  assert.deepEqual(filterTechnicians(rows,{...options,version:'current'}).map(t=>t.id),['c']);
  assert.deepEqual(filterTechnicians(rows,{...options,version:'unknown'}).map(t=>t.id),['a']);
  assert.deepEqual(filterTechnicians(rows,{...options,sort:'outstanding-desc'}).map(t=>t.id),['b','c','a']);
  assert.deepEqual(filterTechnicians(rows,{...options,sort:'activity-desc'}).map(t=>t.id),['a','b','c']);
  assert.deepEqual(rows.map(t=>t.id),['b','a','c']);
});
test('missing release metadata never implies build 21 or confirmed outdated', () => {
  const t=row('known native',{devices:[device(20)]});
  assert.equal(technicianVersion(t,null,now).state,'unknown');
  assert.equal(technicianSummary([t],null,now).needUpdate,0);
  assert.equal(technicianSummary([t],null,now).unknown,0,'native value remains known even if comparison target is unavailable');
});
