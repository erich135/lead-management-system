import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AUTHORITATIVE_SOURCE_CONFIRMATION_NOTE,
  CONFIRM_SPEC_BUTTON_LABEL,
  LIBRARY_ADDED_STATUS,
  LIBRARY_USING_STATUS,
  PROPOSAL_ONLY_LIBRARY_STATUS,
  buildSpecSheetConfirmPayload,
  confirmPayloadContainsForbiddenField,
} from './confirmSpecSheet';
import { applyConfirmedLibrarySpec, emptyProposedDraft } from './equipmentState';
import { buildSalesProposalSavePayload } from './salesProposalPersistence';
import { DEFAULT_AIR_AUDIT_SCOPE } from './airAuditScope';
import {
  EMPTY_COMMERCIAL_OFFER,
  EMPTY_OPERATING_ASSUMPTIONS,
  EMPTY_SITE,
  type PublicMachineSpec,
  type SourceBackedSpec,
} from './types';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const source: SourceBackedSpec = {
  manufacturer: 'Atlas Copco',
  model: 'ZT 160 VSD+-10.4',
  modelVariant: null,
  ratedPressureBarG: 10.34,
  ratedAirflowM3PerMin: 23.52,
  packageInputPowerKw: 176.3,
  motorShaftPowerKw: 160.03,
  controlType: 'VSD',
  sourceFileName: 'ZT160_CAGI.pdf',
  sourceFileId: 'file-atlas-10c',
  sourceSha256: 'a'.repeat(64),
};

const librarySpec: PublicMachineSpec = {
  recordId: 'lib-10c-zt160',
  manufacturer: 'Atlas Copco',
  model: 'ZT 160 VSD+-10.4',
  modelVariant: null,
  ratedPressureBarG: 10.34,
  ratedAirflowM3PerMin: 23.52,
  packageInputPowerKw: 176.3,
  motorShaftPowerKw: 160.03,
  controlType: 'variable_speed_drive',
  sourceTitle: 'ZT160_CAGI.pdf',
  sourceFileName: 'ZT160_CAGI.pdf',
};

describe('Sales Proposal Tool Step 10C confirmation UX', () => {
  it('shows a proposal-only confirmation action that sends proposal, equipment and source identity', () => {
    const capture = readFileSync(
      path.join(FEATURE_ROOT, 'components/SpecSheetCapture.tsx'),
      'utf8',
    );
    const picker = readFileSync(
      path.join(FEATURE_ROOT, 'components/SpecPicker.tsx'),
      'utf8',
    );
    const current = readFileSync(
      path.join(FEATURE_ROOT, 'components/CurrentEquipmentSection.tsx'),
      'utf8',
    );
    expect(CONFIRM_SPEC_BUTTON_LABEL).toBe(
      'Confirm specification and add to Machine Spec Library',
    );
    expect(PROPOSAL_ONLY_LIBRARY_STATUS).toBe(
      'Proposal only / not yet in Machine Spec Library',
    );
    expect(capture).toContain('CONFIRM_SPEC_BUTTON_LABEL');
    expect(capture).toContain('PROPOSAL_ONLY_LIBRARY_STATUS');
    expect(capture).toContain('AUTHORITATIVE_SOURCE_CONFIRMATION_NOTE');
    expect(capture).toContain('confirmSpecSheet(');
    expect(capture).toContain('buildSpecSheetConfirmPayload');
    expect(capture).not.toContain('addVersion');
    expect(capture).toMatch(/async function handleFile/);
    expect(capture.indexOf('onApply(')).toBeGreaterThan(
      capture.indexOf('function handleApply'),
    );
    expect(current).toContain('target="current"');
    expect(current).toContain('currentEquipmentId={row.key}');
    expect(picker).toContain('target="proposed"');
    expect(LIBRARY_USING_STATUS).toBe('Using Machine Spec Library record');
    expect(LIBRARY_ADDED_STATUS).toBe('Specification added to Machine Spec Library');
    expect(picker).toContain('LIBRARY_USING_STATUS');
    expect(picker).toContain('LIBRARY_ADDED_STATUS');
    expect(picker).toContain('These values are not published Machine Spec Library data.');

    const payload = buildSpecSheetConfirmPayload({
      target: 'current',
      currentEquipmentId: 'machine-current-10c',
      sourceFileId: source.sourceFileId as string,
      sourceFileName: source.sourceFileName as string,
      sourceSha256: source.sourceSha256,
      manufacturer: source.manufacturer as string,
      model: source.model as string,
      modelVariant: source.modelVariant,
      ratedPressureBarG: source.ratedPressureBarG,
      ratedAirflowM3PerMin: source.ratedAirflowM3PerMin,
      packageInputPowerKw: source.packageInputPowerKw,
      motorShaftPowerKw: source.motorShaftPowerKw,
      controlType: source.controlType,
    });
    expect(payload.target).toBe('current');
    expect(payload.currentEquipmentId).toBe('machine-current-10c');
    expect(payload.sourceFileId).toBe('file-atlas-10c');
    expect(payload.authoritativeSourceConfirmed).toBe(true);
    expect(confirmPayloadContainsForbiddenField(payload)).toBe(false);
    expect(payload).not.toHaveProperty('estimatedSiteAirflowM3PerMin');
    expect(payload).not.toHaveProperty('annualOperatingHours');
    expect(payload).not.toHaveProperty('averageLoadPercent');
    expect(payload).not.toHaveProperty('flatRateRandPerKwh');
    expect(payload).not.toHaveProperty('estimatedAnnualKwh');
    expect(payload).not.toHaveProperty('equipmentPrice');
  });

  it('switches editor state to the returned library record after successful confirmation', () => {
    const row = applyConfirmedLibrarySpec(
      {
        key: 'machine-current-10c',
        arsMachineId: null,
        make: '',
        model: '',
        serialNumber: '',
        specLibraryRecordId: null,
        selectedSpec: null,
        changingSpec: true,
        sourceBacked: source,
        capturingSheet: true,
      },
      librarySpec,
      source,
    );
    expect(row.specLibraryRecordId).toBe('lib-10c-zt160');
    expect(row.selectedSpec?.recordId).toBe('lib-10c-zt160');
    expect(row.sourceBacked?.sourceFileId).toBe('file-atlas-10c');
    expect(row.capturingSheet).toBe(false);
    expect(row.changingSpec).toBe(false);
    expect(row.make).toBe('Atlas Copco');
    expect(row.model).toBe('ZT 160 VSD+-10.4');
  });

  it('keeps reviewed values visible and shows the returned error when confirmation fails', () => {
    const capture = readFileSync(
      path.join(FEATURE_ROOT, 'components/SpecSheetCapture.tsx'),
      'utf8',
    );
    const confirmFn = capture.slice(
      capture.indexOf('async function handleConfirm'),
      capture.indexOf('const inputClass'),
    );
    expect(confirmFn).toContain('setError(');
    expect(confirmFn).not.toContain('setManufacturer(');
    expect(confirmFn).not.toContain('setModel(');
    expect(confirmFn).not.toContain('setSourceFileId(null)');
    expect(confirmFn).toContain('Could not add this specification to the Machine Spec Library.');
  });

  it('keeps Step 7 save-before-preview and Step 10B no-audit operating assumptions in the save payload', () => {
    const persistence = readFileSync(
      path.join(FEATURE_ROOT, 'salesProposalPersistence.ts'),
      'utf8',
    );
    const editor = readFileSync(
      path.join(FEATURE_ROOT, 'pages/SalesProposalEditorPage.tsx'),
      'utf8',
    );
    expect(persistence).toContain('saveThenPreviewCustomerProposal');
    expect(persistence).toContain('operatingAssumptions: state.operatingAssumptions');
    expect(editor).toContain('saveThenPreviewCustomerProposal');
    const payload = buildSalesProposalSavePayload({
      customerId: 'cust-1',
      site: { ...EMPTY_SITE, name: 'John Thompson' },
      currentEquipment: [],
      proposed: emptyProposedDraft(),
      electricityBasis: {
        type: 'flat_rate',
        flatRateRandPerKwh: 2.5,
        tariffRecordId: null,
        suppliedCurrentAmount: null,
        suppliedCurrentPeriod: null,
      },
      operatingAssumptions: {
        annualOperatingHours: 4000,
        averageLoadPercent: 70,
      },
      commercialOffer: EMPTY_COMMERCIAL_OFFER,
      airAuditScope: DEFAULT_AIR_AUDIT_SCOPE,
    });
    expect(payload.operatingAssumptions).toEqual({
      annualOperatingHours: 4000,
      averageLoadPercent: 70,
    });
  });
});
