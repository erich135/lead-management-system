import assert from 'node:assert/strict';
import {
  mayApplyEvaluation,
  nextEvaluationRequest,
  nextFocusRequest,
  overlayDerivedEvaluation,
  proposalWorkingFingerprint,
} from '../src/features/bouwa/proposalEditorState.ts';
import type {
  ProposalEvaluation,
  ProposalField,
  ProposalPackage,
} from '../src/features/bouwa/proposalLocalTypes.ts';

function proposal(
  proposalRecordId: string,
  value: string,
  nature: ProposalField['nature'] = 'manual',
): ProposalPackage {
  const field = {
    id: 'field-a',
    value,
    nature,
    evidenceStatus: 'unavailable',
    confidenceStatus: 'unknown',
    approval: { status: 'draft' },
    calculationEffect: 'test',
    validationStatus: 'provisional',
    valueVerificationStatus: 'unverified',
    requiredForOutputs: [],
    requiredEvidence: [],
  } as unknown as ProposalField;
  return {
    proposalRecordId,
    inputs: [field],
    engineeringSettings: [],
  } as unknown as ProposalPackage;
}

const recordA = 'proposal_AAAAAAAAAAAAAAAAAAAAAAAA';
const working = proposal(recordA, 'newest local value');
const evaluatedPackage = proposal(recordA, 'stale response value', 'measured');
const evaluation = {
  package: evaluatedPackage,
} as unknown as ProposalEvaluation;
const visible = overlayDerivedEvaluation(working, evaluation);
assert.equal(visible.inputs[0].value, 'newest local value');
assert.equal(visible.inputs[0].nature, 'measured');
assert.equal(
  proposalWorkingFingerprint(proposal(recordA, 'same', 'manual')),
  proposalWorkingFingerprint(proposal(recordA, 'same', 'measured')),
);

const first = nextEvaluationRequest(0, proposal(recordA, 'first'));
const secondProposal = proposal(recordA, 'second');
const second = nextEvaluationRequest(first.sequence, secondProposal);
assert.equal(mayApplyEvaluation(second, first, secondProposal), false);
assert.equal(mayApplyEvaluation(second, second, secondProposal), true);
assert.equal(
  mayApplyEvaluation(second, second, proposal(recordA, 'edited again')),
  false,
);
assert.equal(
  mayApplyEvaluation(
    second,
    second,
    proposal('proposal_BBBBBBBBBBBBBBBBBBBBBBBB', 'second'),
  ),
  false,
);

const firstFocus = nextFocusRequest(0, 'field-a');
const repeatedFocus = nextFocusRequest(firstFocus.token, 'field-a');
assert.equal(firstFocus.fieldId, repeatedFocus.fieldId);
assert.notEqual(firstFocus.token, repeatedFocus.token);

process.stdout.write(
  'Bouwa proposal editor sequencing, controlled-value overlay, and repeat-focus checks passed.\n',
);
