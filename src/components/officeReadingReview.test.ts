import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QUANTUM_CHECKLIST_QUESTIONS } from "./quantumChecklist";
import { checklistDetailsStartOpen, checklistReportDocument, checklistReview, correctedApprovedHours } from "./officeReadingReview";

const stored = {
  questionnaire: "quantum-generator-v1" as const,
  operatorName: "dgdfgfd",
  outOfCommission: false,
  outOfCommissionReason: "Should not show when the generator is in service",
  items: QUANTUM_CHECKLIST_QUESTIONS.map((question) =>
    question.id === "belts-damage"
      ? { id: question.id, prompt: question.prompt, answer: "not-ok" as const, explanation: "Test" }
      : { id: question.id, prompt: question.prompt, answer: "ok" as const, explanation: "Old note" },
  ),
};

describe("office checklist review", () => {
  it("shows all 11 stored answers in the approved order", () => {
    const review = checklistReview(stored);
    expect(review?.items.map((item) => item.id)).toEqual(
      QUANTUM_CHECKLIST_QUESTIONS.map((question) => question.id),
    );
    expect(review?.items).toHaveLength(11);
  });

  it("keeps Not OK explanations and drops stale OK explanations", () => {
    const review = checklistReview(stored);
    const belts = review?.items.find((item) => item.id === "belts-damage");
    expect(belts?.answer).toBe("not-ok");
    expect(belts?.explanation).toBe("Test");
    expect(review?.notOkCount).toBe(1);
    expect(review?.items.filter((item) => item.answer === "ok").every((item) => item.explanation === undefined)).toBe(true);
  });

  it("shows the operator and keeps an out-of-commission reason only when the flag is yes", () => {
    expect(checklistReview(stored)?.operatorName).toBe("dgdfgfd");
    expect(checklistReview(stored)?.outOfCommission).toBe(false);
    expect(checklistReview(stored)?.outOfCommissionReason).toBeUndefined();
    const stopped = checklistReview({
      ...stored,
      outOfCommission: true,
      outOfCommissionReason: "No fuel delivery",
    });
    expect(stopped?.outOfCommission).toBe(true);
    expect(stopped?.outOfCommissionReason).toBe("No fuel delivery");
  });

  it("does not invent a checklist for an ordinary reading", () => {
    expect(checklistReview(undefined)).toBeNull();
    expect(checklistReview(null)).toBeNull();
    expect(checklistReview({ items: [] })).toBeNull();
  });

  it("shows a corrected approved reading without replacing the submitted value", () => {
    expect(
      correctedApprovedHours({ status: "approved", submittedHours: 1300, approvedHours: 1280 }),
    ).toBe(1280);
    expect(
      correctedApprovedHours({ status: "approved", submittedHours: 2481, approvedHours: 2481 }),
    ).toBeNull();
    expect(
      correctedApprovedHours({ status: "pending", submittedHours: 1300, approvedHours: 1280 }),
    ).toBeNull();
    expect(
      correctedApprovedHours({ status: "rejected", submittedHours: 1300 }),
    ).toBeNull();
  });

  it("keeps the verification screen on the existing approval actions", () => {
    const source = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "PendingMachineReadings.tsx"),
      "utf8",
    );
    expect(source).toContain("checklistReview(submission.checklist)");
    expect(source).toContain("Checklist");
    expect(source).not.toContain("Quantum checklist");
    expect(source).toContain("loading=\"lazy\"");
    expect(source).toContain("decoding=\"async\"");
    expect(source).toContain("approvedHours: hoursOverride");
    expect(source).not.toContain("checklist:");
    expect(source).toContain("checklistDetailsStartOpen");
    expect(source).toContain("View Report");
    expect(source).toContain("Print");
    expect(source).not.toContain("Download PDF");
  });

  it("opens the checklist when a stored answer is Not OK", () => {
    const review = checklistReview(stored);
    expect(review).toBeTruthy();
    expect(checklistDetailsStartOpen(review!)).toBe(true);
    const clear = checklistReview({
      ...stored,
      items: stored.items.map((item) => ({ ...item, answer: "ok" as const, explanation: undefined })),
    });
    expect(checklistDetailsStartOpen(clear!)).toBe(false);
  });

  it("builds the approved report from the stored questions and hides it until approval", () => {
    const submission = {
      _id: "507f1f77bcf86cd799439011",
      status: "approved" as const,
      submittedHours: 10,
      approvedHours: 12,
      submittedAt: "2026-11-01T08:00:00.000Z",
      verifiedAt: "2026-11-01T09:00:00.000Z",
      verifiedBy: { firstName: "Megan", lastName: "Tooley" },
      checklist: {
        ...stored,
        items: stored.items.map((item) => item.id === "fuel-level"
          ? { ...item, prompt: "Historical fuel question", answer: "not-ok" as const, explanation: "Low" }
          : item),
      },
      machine: { make: "Atlas", model: "QAS", serialNumber: "SN-1", customer: { name: "Quantum Test" } },
    };
    const report = checklistReportDocument(submission);
    expect(report?.items[0].prompt).toBe("Historical fuel question");
    expect(report?.reference).toBe("ARS-439011");
    expect(report?.approvedBy).toBe("Megan Tooley");
    expect(checklistReportDocument({ ...submission, status: "pending" })).toBeNull();
    expect(checklistReportDocument({ ...submission, status: "rejected" })).toBeNull();
    expect(checklistReportDocument({ ...submission, checklist: undefined })).toBeNull();
    expect(checklistReportDocument({
      ...submission,
      checklist: { items: [{ id: "fuel-level", prompt: "", answer: "ok" }] },
    })).toBeNull();
  });
});
