/**
 * ARS-READINGS-ACCESS-001 (temporary policy).
 *
 * There is a backlog of customer-submitted machine readings, and clients
 * keep receiving WhatsApp reminders until those readings are processed.
 * Until a final authorised-user list is supplied, every *authenticated* ARS
 * user may see and act on the QR machine-reading verification workflow
 * (QR Readings nav, Verify Readings tab, submission lists, approve/edit
 * hours/reject).
 *
 * Callers only invoke this from components already gated behind
 * `ProtectedRoute`, so a falsy `user` only occurs mid-logout/mid-load.
 *
 * To restrict this later, once the final authorised-user list is supplied,
 * change the body to a real permission check, e.g.:
 *   return Boolean(user) && (isSuperAdmin || hasPermission('machines.verifyReadings'));
 * No other file needs to change — every call site imports this one function.
 */
export function canAccessMachineReadingWorkflow(user: unknown): boolean {
  return Boolean(user);
}
