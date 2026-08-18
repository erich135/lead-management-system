import type {
  ProposalEvaluation,
  ProposalField,
  ProposalPackage,
} from './proposalLocalTypes';

const DERIVED_FIELD_KEYS = [
  'nature',
  'evidenceStatus',
  'confidenceStatus',
  'approval',
  'calculationEffect',
  'validationStatus',
  'valueVerificationStatus',
  'requiredForOutputs',
  'requiredEvidence',
] as const satisfies readonly (keyof ProposalField)[];

export interface EvaluationRequestIdentity {
  sequence: number;
  proposalRecordId: string;
  workingFingerprint: string;
}

export interface FocusRequest {
  fieldId: string;
  token: number;
}

export function proposalWorkingFingerprint(proposal: ProposalPackage): string {
  const fieldWorkingState = (field: ProposalField) => ({
    id: field.id,
    name: field.name,
    description: field.description,
    questionnaireReference: field.questionnaireReference,
    value: field.value,
    unit: field.unit,
    source: field.source,
    notes: field.notes,
    provisionalAcknowledgement: field.provisionalAcknowledgement,
  });
  const { inputs, engineeringSettings, ...packageState } = proposal;
  return JSON.stringify({
    ...packageState,
    inputs: inputs.map(fieldWorkingState),
    engineeringSettings: engineeringSettings.map(fieldWorkingState),
  });
}

export function nextEvaluationRequest(
  priorSequence: number,
  proposal: ProposalPackage,
): EvaluationRequestIdentity {
  return {
    sequence: priorSequence + 1,
    proposalRecordId: proposal.proposalRecordId,
    workingFingerprint: proposalWorkingFingerprint(proposal),
  };
}

export function mayApplyEvaluation(
  active: EvaluationRequestIdentity,
  responseIdentity: EvaluationRequestIdentity,
  currentProposal: ProposalPackage,
): boolean {
  return (
    active.sequence === responseIdentity.sequence &&
    active.proposalRecordId === responseIdentity.proposalRecordId &&
    active.workingFingerprint === responseIdentity.workingFingerprint &&
    currentProposal.proposalRecordId === responseIdentity.proposalRecordId &&
    proposalWorkingFingerprint(currentProposal) ===
      responseIdentity.workingFingerprint
  );
}

function overlayDerivedFields(
  working: ProposalField[],
  evaluated: ProposalField[],
): ProposalField[] {
  const evaluatedById = new Map(evaluated.map(field => [field.id, field]));
  return working.map(field => {
    const source = evaluatedById.get(field.id);
    if (!source) return field;
    const result = { ...field };
    for (const key of DERIVED_FIELD_KEYS) {
      Object.assign(result, { [key]: source[key] });
    }
    return result;
  });
}

export function overlayDerivedEvaluation(
  working: ProposalPackage,
  evaluation: ProposalEvaluation | null,
): ProposalPackage {
  if (
    !evaluation ||
    evaluation.package.proposalRecordId !== working.proposalRecordId
  )
    return working;
  return {
    ...working,
    inputs: overlayDerivedFields(
      working.inputs,
      evaluation.package.inputs,
    ),
    engineeringSettings: overlayDerivedFields(
      working.engineeringSettings,
      evaluation.package.engineeringSettings,
    ),
  };
}

export function nextFocusRequest(
  priorToken: number,
  fieldId: string,
): FocusRequest {
  return { fieldId, token: priorToken + 1 };
}
