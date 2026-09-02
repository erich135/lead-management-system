import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { emptyProposedDraft } from './equipmentState';
import {
  buildSalesProposalSavePayload,
  persistSalesProposalEditor,
  PREVIEW_SAVE_FAILED_MESSAGE,
  saveThenPreviewCustomerProposal,
  type SalesProposalEditorState,
} from './salesProposalPersistence';
import { EMPTY_COMMERCIAL_OFFER, EMPTY_OPERATING_ASSUMPTIONS, EMPTY_SITE, type SalesProposal } from './types';
import { DEFAULT_AIR_AUDIT_SCOPE } from './airAuditScope';
import { proposalRequiresRevision } from './customerProposalPresentation';

const bouwaSpec = {
  recordId: 'lib-sc-rs37a',
  manufacturer: 'Bouwa',
  model: 'SC-RS37A',
  modelVariant: null,
  ratedPressureBarG: 7,
  ratedAirflowM3PerMin: 6.4,
  packageInputPowerKw: 37,
  motorShaftPowerKw: null,
  controlType: null,
  sourceTitle: 'Bouwa SC-RS37A datasheet',
  sourceFileName: null,
};

function editorState(
  overrides: Partial<SalesProposalEditorState> = {},
): SalesProposalEditorState {
  return {
    customerId: 'cust-1',
    site: { ...EMPTY_SITE, name: 'John Thompson' },
    currentEquipment: [],
    proposed: {
      ...emptyProposedDraft(),
      selectedSpec: bouwaSpec,
      specLibraryRecordId: bouwaSpec.recordId,
      manufacturer: bouwaSpec.manufacturer,
      model: bouwaSpec.model,
      quantity: 1,
      changingSpec: false,
    },
    electricityBasis: {
      type: 'flat_rate',
      flatRateRandPerKwh: 2.5,
      tariffRecordId: null,
      suppliedCurrentAmount: null,
      suppliedCurrentPeriod: null,
    },
    operatingAssumptions: EMPTY_OPERATING_ASSUMPTIONS,
    commercialOffer: {
      ...EMPTY_COMMERCIAL_OFFER,
      type: 'purchase',
      purchase: {
        ...EMPTY_COMMERCIAL_OFFER.purchase,
        equipmentPrice: 850000,
        installation: 45000,
      },
    },
    airAuditScope: DEFAULT_AIR_AUDIT_SCOPE,
    ...overrides,
  };
}

function savedProposal(
  overrides: Partial<SalesProposal> & {
    requiresRevision?: boolean;
  } = {},
): SalesProposal {
  const requiresRevision = overrides.requiresRevision ?? false;
  return {
    id: 'prop-1',
    customerProposal: {
      requiresRevision,
      recommendation: 'ARS recommends the selected BOUWA solution.',
    },
    ...overrides,
  } as SalesProposal;
}

describe('save-before-preview customer proposal freshness', () => {
  it('includes the edited electricity rate, proposed configuration, operating assumptions and commercial value in the save payload', () => {
    const payload = buildSalesProposalSavePayload(
      editorState({
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
        proposed: {
          ...emptyProposedDraft(),
          selectedSpec: bouwaSpec,
          specLibraryRecordId: bouwaSpec.recordId,
          manufacturer: bouwaSpec.manufacturer,
          model: bouwaSpec.model,
          quantity: 2,
          changingSpec: false,
        },
        commercialOffer: {
          ...EMPTY_COMMERCIAL_OFFER,
          type: 'purchase',
          purchase: {
            ...EMPTY_COMMERCIAL_OFFER.purchase,
            equipmentPrice: 910000,
          },
        },
      }),
    );

    expect(payload.electricityBasis.flatRateRandPerKwh).toBe(2.5);
    expect(payload.operatingAssumptions.annualOperatingHours).toBe(4000);
    expect(payload.operatingAssumptions.averageLoadPercent).toBe(70);
    expect(payload.proposedEquipment[0]?.model).toBe('SC-RS37A');
    expect(payload.proposedEquipment[0]?.quantity).toBe(2);
    expect(payload.commercialOffer.purchase.equipmentPrice).toBe(910000);
    expect(payload.customerId).toBe('cust-1');
    expect(payload.site.name).toBe('John Thompson');
  });

  it('invokes the canonical save before opening preview, and only after success', async () => {
    const events: string[] = [];
    const save = vi.fn(async () => {
      events.push('save');
      return savedProposal();
    });

    const result = await saveThenPreviewCustomerProposal({
      proposalId: 'prop-1',
      state: editorState(),
      save,
    });
    if (result.kind === 'open') events.push(result.kind);

    expect(save).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['save', 'open']);
    expect(result).toMatchObject({
      kind: 'open',
      path: '/sales-proposal-tool/prop-1/proposal',
    });
  });

  it('blocks navigation and shows a clear error when save fails', async () => {
    const save = vi.fn(async () => {
      throw new Error('network failure');
    });

    const result = await saveThenPreviewCustomerProposal({
      proposalId: 'prop-1',
      state: editorState(),
      save,
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      kind: 'blocked',
      error: PREVIEW_SAVE_FAILED_MESSAGE,
    });
    expect(result.kind).not.toBe('open');
  });

  it('uses requiresRevision from the newly saved proposal, not recommendation prose', async () => {
    const save = vi.fn(async (_id: string, body) => {
      const requiresRevision = (body.proposedEquipment[0]?.quantity ?? 0) > 1;
      return savedProposal({
        customerProposal: {
          requiresRevision,
          recommendation:
            'Proposed configuration requires revision before savings and payback can be relied on.',
        } as SalesProposal['customerProposal'],
      });
    });

    const valid = await saveThenPreviewCustomerProposal({
      proposalId: 'prop-1',
      state: editorState(),
      save,
    });
    expect(valid.kind).toBe('open');
    if (valid.kind !== 'open' || !valid.proposal.customerProposal) return;
    expect(proposalRequiresRevision(valid.proposal.customerProposal)).toBe(false);

    const invalid = await saveThenPreviewCustomerProposal({
      proposalId: 'prop-1',
      state: editorState({
        proposed: {
          ...emptyProposedDraft(),
          selectedSpec: bouwaSpec,
          specLibraryRecordId: bouwaSpec.recordId,
          manufacturer: bouwaSpec.manufacturer,
          model: bouwaSpec.model,
          quantity: 3,
          changingSpec: false,
        },
      }),
      save,
    });
    expect(invalid.kind).toBe('open');
    if (invalid.kind !== 'open' || !invalid.proposal.customerProposal) return;
    expect(proposalRequiresRevision(invalid.proposal.customerProposal)).toBe(true);
  });

  it('uses one persistSalesProposalEditor routine for Save and Preview', async () => {
    const save = vi.fn(async () => savedProposal());
    const state = editorState();

    const persisted = await persistSalesProposalEditor({
      proposalId: 'prop-1',
      state,
      save,
    });
    const previewed = await saveThenPreviewCustomerProposal({
      proposalId: 'prop-1',
      state,
      save,
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0]).toEqual(save.mock.calls[1]);
    expect(persisted.id).toBe('prop-1');
    expect(previewed.kind).toBe('open');

    const editor = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages/SalesProposalEditorPage.tsx'),
      'utf8',
    );
    expect(editor).toMatch(/persistSalesProposalEditor/);
    expect(editor).toMatch(/saveThenPreviewCustomerProposal/);
    expect(editor).toMatch(/PREVIEW_SAVE_FAILED_MESSAGE/);
    expect(editor).not.toMatch(/to=\{salesProposalPreviewPath/);
    expect(editor).not.toMatch(/test\(doc\.recommendation\)/);
  });
});
