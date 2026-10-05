import { describe, expect, it } from 'vitest';
import { managementSummaryUnavailableReasons } from './managementSummaryReadiness';

const ready = {
  customerEntry: 'existing' as const,
  customerId: 'cust-1',
  manualCompanyName: '',
  siteName: 'Bushbuckridge',
  hasCurrentMachine: true,
  hasProposedMachine: true,
  electricityRateRandPerKwh: 2.5,
  uncapturedCount: 0,
};

describe('management summary availability', () => {
  it('stays closed for an incomplete proposal', () => {
    expect(
      managementSummaryUnavailableReasons({
        ...ready,
        customerId: null,
        siteName: '',
        hasCurrentMachine: false,
        hasProposedMachine: false,
        electricityRateRandPerKwh: null,
      }),
    ).toEqual([
      'Choose a customer on Customer & Site.',
      'Add a site name on Customer & Site.',
      'Add a current machine on Current Equipment.',
      'Add a proposed machine on Proposed Equipment.',
      'Enter an electricity rate on Electricity & Tariffs.',
    ]);
  });

  it('opens for a complete proposal and still blocks an unaccepted entry', () => {
    expect(managementSummaryUnavailableReasons(ready)).toEqual([]);
    expect(managementSummaryUnavailableReasons({ ...ready, uncapturedCount: 1 })).toEqual([
      'Correct or clear the entries that were not accepted.',
    ]);
  });
});
