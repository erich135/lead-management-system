/**
 * WhatsApp reading-reminder enabled flag.
 *
 * Historic machines may omit the field. Only a genuinely missing value
 * defaults to enabled. An explicit `false` must never be coerced through
 * truthy/falsy fallbacks such as `value || true` or `!!value`.
 */
export function copyWhatsAppRemindersEnabled(
  machine: { whatsAppRemindersEnabled?: boolean | null },
): boolean | undefined {
  if (machine.whatsAppRemindersEnabled === false) return false;
  if (machine.whatsAppRemindersEnabled === true) return true;
  return undefined;
}

/** Checkbox / export display: missing legacy values appear enabled. */
export function remindersToggleChecked(value: boolean | undefined | null): boolean {
  return value !== false;
}

export function buildMachineEditFormReminders(
  machine: { whatsAppRemindersEnabled?: boolean | null },
): { whatsAppRemindersEnabled?: boolean } {
  const copied = copyWhatsAppRemindersEnabled(machine);
  if (copied === false) return { whatsAppRemindersEnabled: false };
  if (copied === true) return { whatsAppRemindersEnabled: true };
  return {};
}

/**
 * JSON POST body after spreading the edit form. `undefined` keys are omitted,
 * so a historic missing field is not materialised as `true` on save.
 */
export function remindersEnabledSavePayload(
  editForm: { whatsAppRemindersEnabled?: boolean },
): boolean | undefined {
  const serialised = JSON.parse(JSON.stringify(editForm)) as {
    whatsAppRemindersEnabled?: boolean;
  };
  return serialised.whatsAppRemindersEnabled;
}

export function reopenEditAfterSave(
  original: { whatsAppRemindersEnabled?: boolean | null },
  savedMachine: { whatsAppRemindersEnabled?: boolean | null },
): { whatsAppRemindersEnabled?: boolean } {
  void original;
  return buildMachineEditFormReminders(savedMachine);
}
