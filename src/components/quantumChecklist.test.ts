import { describe, expect, it } from "vitest";
import {
  QUANTUM_CHECKLIST_QUESTIONS,
  buildQuantumChecklistPayload,
  checklistIsEnabled,
  emptyQuantumChecklistDraft,
  quantumChecklistValidationError,
  type QuantumChecklistDraft,
} from "./quantumChecklist";

const prompts = [
  "Check fuel level",
  "Check engine oil level",
  "Check radiator coolant level",
  "Check batteries condition",
  "Check wiring for damage",
  "Check belts for damage",
  "Ensure no paper / plastics around unit",
  "Ensure no paper / plastics stuck on radiator",
  "Check electrical cables to transformer for damage",
  "Check electrical switches for damage / loose connections",
  "Check emergency stop for operation",
];

function answered(patch: Partial<QuantumChecklistDraft> = {}): QuantumChecklistDraft {
  const draft = emptyQuantumChecklistDraft();
  draft.items = draft.items.map((item) => ({ ...item, answer: "ok", explanation: "stale" }));
  draft.operatorName = "Sam Operator";
  draft.outOfCommission = false;
  draft.outOfCommissionReason = "stale reason";
  return { ...draft, ...patch, items: patch.items ?? draft.items };
}

describe("quantum generator checklist", () => {
  it("keeps the approved 11 questions in order", () => {
    expect(QUANTUM_CHECKLIST_QUESTIONS.map((question) => question.prompt)).to.deep.equal(prompts);
  });

  it("treats a missing or false machine setting as disabled and builds no payload", () => {
    expect(checklistIsEnabled(undefined)).to.equal(false);
    expect(checklistIsEnabled(null)).to.equal(false);
    expect(checklistIsEnabled(false)).to.equal(false);
    expect(buildQuantumChecklistPayload("machine-1", false, answered())).to.equal(null);
    expect(buildQuantumChecklistPayload("machine-1", undefined, answered())).to.equal(null);
  });

  it("requires every answer, a Not OK explanation, the operator, and an out-of-commission reason", () => {
    const draft = emptyQuantumChecklistDraft();
    expect(quantumChecklistValidationError(draft)).to.equal("Answer required: Check fuel level");
    draft.items[0].answer = "not-ok";
    expect(quantumChecklistValidationError(draft)).to.equal("Explain what is not OK: Check fuel level");
    draft.items = draft.items.map((item) => ({ ...item, answer: "ok" }));
    draft.items[3].answer = "not-ok";
    draft.items[3].explanation = "Terminal is swollen";
    expect(quantumChecklistValidationError(draft)).to.equal("Operator name is required.");
    draft.operatorName = "Sam Operator";
    expect(quantumChecklistValidationError(draft)).to.equal("Say whether the generator is out of commission.");
    draft.outOfCommission = true;
    expect(quantumChecklistValidationError(draft)).to.equal("A reason is required when the generator is out of commission.");
    draft.outOfCommissionReason = "No fuel delivery";
    expect(quantumChecklistValidationError(draft)).to.equal(null);
  });

  it("omits a Not OK explanation after the answer returns to OK, and omits a reason when the generator is in service", () => {
    const draft = answered();
    draft.items[0].answer = "ok";
    const payload = buildQuantumChecklistPayload("machine-1", true, draft);
    expect(payload?.items).to.have.length(11);
    expect(payload?.items[0]).to.deep.equal({
      id: "fuel-level",
      prompt: "Check fuel level",
      answer: "ok",
    });
    expect(payload?.outOfCommission).to.equal(false);
    expect(payload?.outOfCommissionReason).to.equal(undefined);
    expect(payload?.operatorName).to.equal("Sam Operator");
    expect(payload?.machineId).to.equal("machine-1");
  });
});
