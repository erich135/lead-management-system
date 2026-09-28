import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  engineeringAcceptanceKey,
  showsAcceptConfigurationButton,
  showsRevokeAcceptance,
} from './configurationAcceptance';
import type { AirAuditScope } from './airAuditScope';
import type { ProposedEquipment } from './types';

const scope: AirAuditScope = { type: 'site_header', currentEquipmentId: null };

function machine(overrides: Partial<ProposedEquipment> = {}): ProposedEquipment {
  return {
    specLibraryRecordId: 'svc-rs37a-ii',
    quantity: 1,
    manufacturer: 'Bouwa',
    model: 'SVC-RS37A-II',
    sourceBacked: {
      manufacturer: 'Bouwa',
      model: 'SVC-RS37A-II',
      modelVariant: null,
      ratedPressureBarG: 8.5,
      ratedAirflowM3PerMin: 7.4,
      packageInputPowerKw: 37,
      motorShaftPowerKw: null,
      controlType: 'variable_speed_drive',
      sourceFileName: null,
      sourceFileId: null,
      sourceSha256: null,
    },
    ...overrides,
  };
}

function keyFor(overrides: {
  proposed?: ProposedEquipment[];
  airAuditSha256?: string | null;
} = {}) {
  return engineeringAcceptanceKey({
    airAuditSha256: overrides.airAuditSha256 === undefined ? 'audit-a' : overrides.airAuditSha256,
    airAuditScope: scope,
    hasAirAudit: true,
    altitudeMetres: 1400,
    intakeAirTemperatureC: 25,
    proposed: overrides.proposed ?? [machine()],
  });
}

describe('configuration acceptance controls', () => {
  it('shows acceptance only after a failed check, and revoke only after it is accepted', () => {
    expect(showsAcceptConfigurationButton(false, false)).toBe(false);
    expect(showsAcceptConfigurationButton(true, false)).toBe(true);
    expect(showsAcceptConfigurationButton(true, true)).toBe(false);
    expect(showsRevokeAcceptance(true, true)).toBe(true);
    expect(showsRevokeAcceptance(false, true)).toBe(false);
  });

  it('changes the acceptance key when the machine, specification, or Air Audit changes', () => {
    const original = keyFor();
    expect(keyFor()).toBe(original);
    expect(keyFor({ proposed: [machine({ specLibraryRecordId: 'other' })] })).not.toBe(original);
    expect(
      keyFor({
        proposed: [
          machine({
            sourceBacked: {
              ...machine().sourceBacked!,
              ratedAirflowM3PerMin: 1.8,
              ratedPressureBarG: 7,
              packageInputPowerKw: 30,
            },
          }),
        ],
      }),
    ).not.toBe(original);
    expect(keyFor({ proposed: [machine({ quantity: 2 })] })).not.toBe(original);
    expect(keyFor({ airAuditSha256: 'audit-b' })).not.toBe(original);
    expect(keyFor({ airAuditSha256: null })).not.toBe(original);
  });

  it('keeps warnings and the acceptance wording in the customer proposal', () => {
    const preview = fs.readFileSync(
      path.resolve(__dirname, 'pages/CustomerProposalPreviewPage.tsx'),
      'utf8',
    );
    expect(preview).toContain('doc.configurationAcceptance');
    expect(preview).toContain('doc.configurationAcceptance.statement');
    expect(preview).toContain('doc.warnings.map');
    expect(preview).toContain('Accepted by:');
  });
});
