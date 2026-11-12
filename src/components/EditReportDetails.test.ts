import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { OfficeReportValues } from '../lib/api';
import { officeReportCorrectionCommit } from './EditReportDetails';

const dialogSource = readFileSync(fileURLToPath(new URL('./EditReportDetails.tsx', import.meta.url)), 'utf8');

const effective: OfficeReportValues = {
  make: 'Atlas Copco',
  model: 'GA11',
  assetNumber: 'U-14',
  serialNumber: 'SN-100',
  currentLocation: 'Plant 2',
  contactPerson: 'Leana',
  contactNumber: '0820000000',
};

describe('office report correction save gate', () => {
  it('rejects a whitespace-only reason and does not request a save', () => {
    for (const reason of ['', ' ', '   ', '\n', '\t', ' \n\t ']) {
      const commit = officeReportCorrectionCommit(effective, { ...effective, model: 'GA15' }, reason);
      expect(commit).toEqual({ requested: false, error: 'A reason for the correction is required.' });
    }
  });

  it('rejects a save when no report-detail field changed and does not request a save', () => {
    const commit = officeReportCorrectionCommit(effective, { ...effective }, '  Corrected from the plate  ');
    expect(commit).toEqual({ requested: false, error: 'No report details changed.' });
  });

  it('checks the reason before the unchanged-field message', () => {
    const commit = officeReportCorrectionCommit(effective, { ...effective }, '   ');
    expect(commit).toEqual({ requested: false, error: 'A reason for the correction is required.' });
  });

  it('submits only the changed fields and the trimmed reason', async () => {
    const commit = officeReportCorrectionCommit(effective, { ...effective, serialNumber: ' SN-200 ' }, '  Plate checked  ');
    expect(commit).toEqual({
      requested: true,
      changed: { serialNumber: ' SN-200 ' },
      reason: 'Plate checked',
    });
    const persist = vi.fn(async () => ({ revision: 2 }));
    if (!commit.requested) throw new Error('expected a request');
    await persist('job-card', 'report-1', 1, commit.changed, commit.reason);
    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith('job-card', 'report-1', 1, { serialNumber: ' SN-200 ' }, 'Plate checked');
  });

  it('does not call the save function for a no-op or a whitespace reason', async () => {
    const persist = vi.fn(async () => ({ revision: 2 }));
    for (const commit of [
      officeReportCorrectionCommit(effective, { ...effective }, 'A real reason'),
      officeReportCorrectionCommit(effective, { ...effective, model: 'GA15' }, '   '),
    ]) {
      if (commit.requested) await persist('inspection', 'report-1', 0, commit.changed, commit.reason);
    }
    expect(persist).not.toHaveBeenCalled();
  });

  it('returns from the dialog before calling the API when the commit is refused', () => {
    const save = dialogSource.slice(dialogSource.indexOf('async function save()'), dialogSource.indexOf('return <div'));
    const refuse = save.indexOf('if (!commit.requested) { setError(commit.error); return; }');
    const request = save.indexOf('saveOfficeReportDetails(');
    expect(dialogSource).toContain('<form noValidate');
    expect(refuse).toBeGreaterThan(-1);
    expect(request).toBeGreaterThan(refuse);
    expect(save).toContain('details.revision, commit.changed, commit.reason');
    expect(save).toContain('setValues(updated.effective)');
  });

  it('keeps a previously corrected value editable', () => {
    const corrected: OfficeReportValues = { ...effective, model: 'GA15' };
    expect(officeReportCorrectionCommit(corrected, { ...corrected }, 'No further change')).toEqual({
      requested: false,
      error: 'No report details changed.',
    });
    expect(officeReportCorrectionCommit(corrected, { ...corrected, model: 'GA22' }, 'Model corrected again')).toEqual({
      requested: true,
      changed: { model: 'GA22' },
      reason: 'Model corrected again',
    });
  });
});
