/**
 * Reasons the Management Summary stays closed.
 * These reuse the editor's existing customer, machine and electricity-rate facts.
 * They do not calculate savings or decide whether a result may be shown.
 */
export function managementSummaryUnavailableReasons(input: {
  customerEntry: 'existing' | 'manual';
  customerId: string | null;
  manualCompanyName: string;
  siteName: string | null;
  hasCurrentMachine: boolean;
  hasProposedMachine: boolean;
  activeOptionCount?: number;
  includedOptionCount?: number;
  includedOptionsMissingMachine?: number;
  electricityRateRandPerKwh: number | null;
  uncapturedCount: number;
}): string[] {
  const reasons: string[] = [];
  const customerMissing =
    input.customerEntry === 'manual'
      ? input.manualCompanyName.trim() === ''
      : !input.customerId?.trim();
  if (customerMissing) {
    reasons.push('Choose a customer on Customer & Site.');
  }
  if (!input.siteName?.trim()) {
    reasons.push('Add a site name on Customer & Site.');
  }
  if (!input.hasCurrentMachine) {
    reasons.push('Add a current machine on Current Equipment.');
  }
  if ((input.activeOptionCount ?? 1) > 1) {
    if ((input.includedOptionCount ?? 0) < 1) {
      reasons.push('Include at least one option in the report.');
    } else if ((input.includedOptionsMissingMachine ?? 0) > 0) {
      reasons.push('Each option included in the report needs a proposed machine.');
    }
  } else if (!input.hasProposedMachine) {
    reasons.push('Add a proposed machine on Proposed Equipment.');
  }
  if (input.electricityRateRandPerKwh == null) {
    reasons.push('Enter an electricity rate on Electricity & Tariffs.');
  }
  if (input.uncapturedCount > 0) {
    reasons.push('Correct or clear the entries that were not accepted.');
  }
  return reasons;
}
