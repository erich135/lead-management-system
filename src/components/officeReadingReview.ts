import {
  QUANTUM_CHECKLIST_QUESTIONS,
  type QuantumChecklistAnswer,
} from "./quantumChecklist";

export interface StoredChecklistItem {
  id: string;
  prompt: string;
  answer: QuantumChecklistAnswer | string;
  explanation?: string;
}

export interface StoredReadingChecklist {
  questionnaire?: string;
  items?: StoredChecklistItem[];
  operatorName?: string;
  outOfCommission?: boolean;
  outOfCommissionReason?: string;
}

export interface ChecklistReviewItem {
  id: string;
  prompt: string;
  answer: string;
  explanation?: string;
}

export interface ChecklistReview {
  operatorName: string;
  outOfCommission: boolean;
  outOfCommissionReason?: string;
  notOkCount: number;
  items: ChecklistReviewItem[];
}

const questionOrder = new Map<string, number>(
  QUANTUM_CHECKLIST_QUESTIONS.map((question, index) => [question.id, index]),
);

/** Read-only view of a stored checklist. Missing checklists stay hidden. */
export function checklistReview(
  checklist: StoredReadingChecklist | null | undefined,
): ChecklistReview | null {
  if (!checklist || !Array.isArray(checklist.items) || checklist.items.length === 0) {
    return null;
  }

  const items = checklist.items
    .filter((item) => item && typeof item.id === "string" && typeof item.prompt === "string")
    .map((item) => {
      const answer = item.answer === "not-ok" ? "not-ok" : item.answer === "ok" ? "ok" : String(item.answer ?? "");
      const explanation =
        answer === "not-ok" && typeof item.explanation === "string" && item.explanation.trim() !== ""
          ? item.explanation.trim()
          : undefined;
      return { id: item.id, prompt: item.prompt, answer, explanation };
    })
    .sort((left, right) => (questionOrder.get(left.id) ?? 999) - (questionOrder.get(right.id) ?? 999));

  if (items.length === 0) return null;

  const outOfCommission = checklist.outOfCommission === true;
  const reason =
    outOfCommission &&
    typeof checklist.outOfCommissionReason === "string" &&
    checklist.outOfCommissionReason.trim() !== ""
      ? checklist.outOfCommissionReason.trim()
      : undefined;

  return {
    operatorName: typeof checklist.operatorName === "string" ? checklist.operatorName.trim() : "",
    outOfCommission,
    outOfCommissionReason: reason,
    notOkCount: items.filter((item) => item.answer === "not-ok").length,
    items,
  };
}

/** Not OK answers are the exception the verifier needs to see immediately. */
export function checklistDetailsStartOpen(review: ChecklistReview): boolean {
  return review.notOkCount > 0;
}

export interface ChecklistReportDocument {
  reference: string;
  customerName: string;
  machineLabel: string;
  serialNumber: string;
  assetNumber?: string;
  submittedHours: number;
  approvedHours: number;
  submittedAt: string;
  operatorName: string;
  items: ChecklistReviewItem[];
  outOfCommission: boolean;
  outOfCommissionReason?: string;
  approvedBy: string;
  approvedAt: string;
  verificationNote?: string;
}

/**
 * Report view of an approved reading. Questions come from the stored snapshot.
 * A partial or pending checklist does not produce a report.
 */
export function checklistReportDocument(submission: {
  _id: string;
  status: string;
  submittedHours: number;
  approvedHours?: number | null;
  submittedAt: string;
  verifiedAt?: string;
  verificationNote?: string;
  verifiedBy?: { firstName?: string; lastName?: string } | null;
  checklist?: StoredReadingChecklist | null;
  machine?: {
    make?: string;
    model?: string;
    serialNumber?: string;
    assetNumber?: string | null;
    customer?: { name?: string } | null;
    cashCustomer?: string | null;
  } | null;
}): ChecklistReportDocument | null {
  if (submission.status !== "approved") return null;
  const stored = submission.checklist?.items;
  if (!Array.isArray(stored) || stored.length === 0) return null;
  const complete = stored.every((item) =>
    Boolean(item?.id)
    && typeof item.prompt === "string"
    && item.prompt.trim() !== ""
    && (item.answer === "ok" || item.answer === "not-ok"),
  );
  if (!complete) return null;
  const items = stored.map((item) => {
    const answer = item.answer === "not-ok" ? "not-ok" : "ok";
    const explanation = answer === "not-ok" && typeof item.explanation === "string" && item.explanation.trim() !== ""
      ? item.explanation.trim()
      : undefined;
    return { id: item.id, prompt: item.prompt.trim(), answer, explanation };
  });
  const machine = submission.machine;
  const outOfCommission = submission.checklist?.outOfCommission === true;
  const reason = typeof submission.checklist?.outOfCommissionReason === "string"
    ? submission.checklist.outOfCommissionReason.trim()
    : "";
  return {
    reference: `ARS-${submission._id.slice(-6).toUpperCase()}`,
    customerName: machine?.customer?.name || machine?.cashCustomer || "Customer not recorded",
    machineLabel: [machine?.make, machine?.model].filter(Boolean).join(" ") || "Machine not recorded",
    serialNumber: machine?.serialNumber || "Not recorded",
    assetNumber: machine?.assetNumber || undefined,
    submittedHours: submission.submittedHours,
    approvedHours: typeof submission.approvedHours === "number" ? submission.approvedHours : submission.submittedHours,
    submittedAt: submission.submittedAt,
    operatorName: submission.checklist?.operatorName?.trim() || "Not recorded",
    items,
    outOfCommission,
    outOfCommissionReason: outOfCommission && reason ? reason : undefined,
    approvedBy: [submission.verifiedBy?.firstName, submission.verifiedBy?.lastName].filter(Boolean).join(" ") || "Not recorded",
    approvedAt: submission.verifiedAt || "",
    verificationNote: submission.verificationNote?.trim() || undefined,
  };
}

/** The approved value is shown separately only when Office corrected it. */
export function correctedApprovedHours(submission: {
  status: string;
  submittedHours: number;
  approvedHours?: number | null;
}): number | null {
  if (submission.status !== "approved") return null;
  if (typeof submission.approvedHours !== "number") return null;
  if (submission.approvedHours === submission.submittedHours) return null;
  return submission.approvedHours;
}
