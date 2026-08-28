import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildMachineEditFormReminders,
  copyWhatsAppRemindersEnabled,
  remindersEnabledSavePayload,
  remindersToggleChecked,
  reopenEditAfterSave,
} from './machineWhatsAppReminders.ts';

const machinesSource = readFileSync(
  fileURLToPath(new URL('../components/Machines.tsx', import.meta.url)),
  'utf8',
);

test('explicit false is copied into the edit form and the toggle stays off', () => {
  const form = buildMachineEditFormReminders({ whatsAppRemindersEnabled: false });
  assert.equal(copyWhatsAppRemindersEnabled({ whatsAppRemindersEnabled: false }), false);
  assert.equal(form.whatsAppRemindersEnabled, false);
  assert.equal(remindersToggleChecked(form.whatsAppRemindersEnabled), false);
  assert.notEqual(false || true, form.whatsAppRemindersEnabled);
});

test('explicit true is copied into the edit form and the toggle stays on', () => {
  const form = buildMachineEditFormReminders({ whatsAppRemindersEnabled: true });
  assert.equal(copyWhatsAppRemindersEnabled({ whatsAppRemindersEnabled: true }), true);
  assert.equal(form.whatsAppRemindersEnabled, true);
  assert.equal(remindersToggleChecked(form.whatsAppRemindersEnabled), true);
});

test('a missing legacy value defaults to enabled without writing false', () => {
  const form = buildMachineEditFormReminders({});
  assert.equal(copyWhatsAppRemindersEnabled({}), undefined);
  assert.equal('whatsAppRemindersEnabled' in form, false);
  assert.equal(remindersToggleChecked(form.whatsAppRemindersEnabled), true);
  assert.equal(remindersEnabledSavePayload(form), undefined);
});

test('false survives edit, save and reopen', () => {
  const original = { whatsAppRemindersEnabled: false as const };
  const editForm = buildMachineEditFormReminders(original);
  assert.equal(editForm.whatsAppRemindersEnabled, false);

  const payload = remindersEnabledSavePayload(editForm);
  assert.equal(payload, false);

  const savedMachine = { whatsAppRemindersEnabled: payload };
  const reopened = reopenEditAfterSave(original, savedMachine);
  assert.equal(reopened.whatsAppRemindersEnabled, false);
  assert.equal(remindersToggleChecked(reopened.whatsAppRemindersEnabled), false);

  const afterReload = buildMachineEditFormReminders({ whatsAppRemindersEnabled: false });
  assert.equal(afterReload.whatsAppRemindersEnabled, false);
  assert.equal(remindersToggleChecked(afterReload.whatsAppRemindersEnabled), false);

  const toggledOn = { ...editForm, whatsAppRemindersEnabled: true };
  assert.equal(remindersEnabledSavePayload(toggledOn), true);
  const reopenedOn = buildMachineEditFormReminders({ whatsAppRemindersEnabled: true });
  assert.equal(reopenedOn.whatsAppRemindersEnabled, true);
});

test('handleEdit copies whatsAppRemindersEnabled from the machine without a truthy fallback', () => {
  assert.match(
    machinesSource,
    /whatsAppRemindersEnabled:\s*copyWhatsAppRemindersEnabled\(machine\)/,
  );
  assert.doesNotMatch(
    machinesSource,
    /whatsAppRemindersEnabled:\s*machine\.whatsAppRemindersEnabled\s*\|\|/,
  );
  assert.doesNotMatch(
    machinesSource,
    /whatsAppRemindersEnabled:\s*!!/,
  );
});
