/** Approved Quantum generator checklist. Wording and order are fixed. */
export const QUANTUM_CHECKLIST_QUESTIONS = [
  { id: "fuel-level", prompt: "Check fuel level" },
  { id: "engine-oil-level", prompt: "Check engine oil level" },
  { id: "radiator-coolant-level", prompt: "Check radiator coolant level" },
  { id: "batteries-condition", prompt: "Check batteries condition" },
  { id: "wiring-damage", prompt: "Check wiring for damage" },
  { id: "belts-damage", prompt: "Check belts for damage" },
  { id: "paper-plastics-around-unit", prompt: "Ensure no paper / plastics around unit" },
  { id: "paper-plastics-on-radiator", prompt: "Ensure no paper / plastics stuck on radiator" },
  { id: "transformer-cables", prompt: "Check electrical cables to transformer for damage" },
  { id: "electrical-switches", prompt: "Check electrical switches for damage / loose connections" },
  { id: "emergency-stop", prompt: "Check emergency stop for operation" },
] as const;

export type QuantumChecklistQuestionId = (typeof QUANTUM_CHECKLIST_QUESTIONS)[number]["id"];
export type QuantumChecklistAnswer = "ok" | "not-ok";

export interface QuantumChecklistDraftItem {
  id: QuantumChecklistQuestionId;
  answer: QuantumChecklistAnswer | "";
  explanation: string;
}

export interface QuantumChecklistDraft {
  items: QuantumChecklistDraftItem[];
  operatorName: string;
  outOfCommission: boolean | null;
  outOfCommissionReason: string;
}

export interface QuantumChecklistPayloadItem {
  id: QuantumChecklistQuestionId;
  prompt: string;
  answer: QuantumChecklistAnswer;
  explanation?: string;
}

/** Contract consumed later by ARS-009D. This package does not store it. */
export interface QuantumChecklistPayload {
  questionnaire: "quantum-generator-v1";
  machineId: string;
  items: QuantumChecklistPayloadItem[];
  operatorName: string;
  outOfCommission: boolean;
  outOfCommissionReason?: string;
}

export function emptyQuantumChecklistDraft(): QuantumChecklistDraft {
  return {
    items: QUANTUM_CHECKLIST_QUESTIONS.map((question) => ({
      id: question.id,
      answer: "",
      explanation: "",
    })),
    operatorName: "",
    outOfCommission: null,
    outOfCommissionReason: "",
  };
}

export function checklistIsEnabled(value: unknown): boolean {
  return value === true;
}

export function quantumChecklistValidationError(draft: QuantumChecklistDraft): string | null {
  for (const question of QUANTUM_CHECKLIST_QUESTIONS) {
    const item = draft.items.find((entry) => entry.id === question.id);
    if (!item || item.answer === "") return `Answer required: ${question.prompt}`;
    if (item.answer === "not-ok" && item.explanation.trim() === "") {
      return `Explain what is not OK: ${question.prompt}`;
    }
  }
  if (draft.operatorName.trim() === "") return "Operator name is required.";
  if (draft.outOfCommission === null) return "Say whether the generator is out of commission.";
  if (draft.outOfCommission && draft.outOfCommissionReason.trim() === "") {
    return "A reason is required when the generator is out of commission.";
  }
  return null;
}

export function buildQuantumChecklistPayload(
  machineId: string,
  checklistEnabled: unknown,
  draft: QuantumChecklistDraft,
): QuantumChecklistPayload | null {
  if (!checklistIsEnabled(checklistEnabled)) return null;
  if (quantumChecklistValidationError(draft)) return null;
  const items = QUANTUM_CHECKLIST_QUESTIONS.map((question) => {
    const item = draft.items.find((entry) => entry.id === question.id)!;
    const row: QuantumChecklistPayloadItem = {
      id: question.id,
      prompt: question.prompt,
      answer: item.answer as QuantumChecklistAnswer,
    };
    if (row.answer === "not-ok") row.explanation = item.explanation.trim();
    return row;
  });
  const payload: QuantumChecklistPayload = {
    questionnaire: "quantum-generator-v1",
    machineId,
    items,
    operatorName: draft.operatorName.trim(),
    outOfCommission: draft.outOfCommission === true,
  };
  if (payload.outOfCommission) payload.outOfCommissionReason = draft.outOfCommissionReason.trim();
  return payload;
}
