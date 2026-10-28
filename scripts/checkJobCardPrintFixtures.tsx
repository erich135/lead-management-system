/**
 * Renders representative filled job cards with the print view's real layout choice.
 * Local verification only. It does not start the app or touch a database.
 */
import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFixedJobCardFieldResolver } from "../src/utils/fixedJobCardFieldResolver";
import { getJobCardReportHeader } from "../src/utils/arsJobCardHeaderDefaults";
import { MechanicalChecklistReportDocument } from "../src/components/fixedJobCardReports/MechanicalChecklistReportDocument";
import { RepairStatusReportDocument } from "../src/components/fixedJobCardReports/RepairStatusReportDocument";
import { GenericSectionReportDocument } from "../src/components/fixedJobCardReports/GenericSectionReportDocument";
import type { JobCardPhotoRenderData } from "../src/utils/jobCardPhotos";

const frontendRoot = process.env.PHASE1_FRONTEND_ROOT || path.resolve(__dirname, "..");
const viewSource = fs.readFileSync(
  path.join(frontendRoot, "src/components/FixedJobCardPrintView.tsx"),
  "utf8",
);
const expression = viewSource.match(/const layoutKey = ([^;]+);/)?.[1];
if (!expression) {
  throw new Error("FixedJobCardPrintView no longer exposes the layout expression.");
}
const layoutOf = new Function("template", `return ${expression};`) as (template: {
  layoutKey?: string;
  templateKey?: string;
}) => string;

const SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function rendererName(template: { layoutKey?: string; templateKey?: string; reportPrefix?: string; name?: string }): string {
  const layoutKey = layoutOf(template);
  if (layoutKey === "mechanical_checklist") return "MechanicalChecklistReportDocument";
  if (layoutKey === "repair_status_report") return "RepairStatusReportDocument";
  return "GenericSectionReportDocument";
}

function htmlFor(template: {
  name: string;
  templateKey?: string;
  layoutKey?: string;
  reportPrefix?: string;
  sections: unknown[];
}, fieldValues: unknown[], job?: Record<string, unknown>, photos?: JobCardPhotoRenderData): string {
  const resolver = createFixedJobCardFieldResolver(fieldValues as never[], job, undefined, "MCC000041");
  const header = getJobCardReportHeader();
  const layoutKey = layoutOf(template);
  if (layoutKey === "mechanical_checklist") {
    return renderToStaticMarkup(
      <MechanicalChecklistReportDocument sections={template.sections as never[]} resolver={resolver} header={header} reportNumber="MCC000041" photos={photos} />,
    );
  }
  if (layoutKey === "repair_status_report") {
    return renderToStaticMarkup(
      <RepairStatusReportDocument sections={template.sections as never[]} resolver={resolver} header={header} reportNumber="RSR000018" photos={photos} />,
    );
  }
  return renderToStaticMarkup(
    <GenericSectionReportDocument
      templateName={template.name}
      sections={template.sections as never[]}
      resolver={resolver}
      header={header}
      reportNumber="RSR000018"
      photos={photos}
    />,
  );
}

function requireText(html: string, text: string, label: string): void {
  if (!html.includes(text)) {
    throw new Error(`${label} did not render "${text}"`);
  }
}

function refuseText(html: string, text: string, label: string): void {
  if (html.includes(text)) {
    throw new Error(`${label} unexpectedly rendered "${text}"`);
  }
}

const signatureValues = [
  { fieldId: "tech_name", type: "text", value: "Sello Paya" },
  { fieldId: "tech_sign", type: "signature", value: "Signed", signatureData: SIGNATURE },
  { fieldId: "tech_date", type: "date", value: "2026-10-21" },
];

const mechanicalSections = [
  {
    id: "mc_header",
    type: "header",
    title: "Job Information",
    fields: [{ id: "mc_client", label: "Client", type: "text" }],
  },
  {
    id: "mc_checklist",
    type: "checklist",
    title: "Inspection Checklist",
    items: [{ id: "mc_coupling", number: 1, label: "Check coupling alignment", inputType: "pass_fail" }],
  },
  {
    id: "mc_comments",
    type: "fields",
    title: "Overall Comments",
    fields: [{ id: "mc_overall_comments", label: "Overall comments", type: "textarea" }],
  },
  {
    id: "mc_signatures",
    type: "signatures",
    title: "Signatures",
    fields: [
      { id: "tech_name", label: "Technician", type: "text" },
      { id: "tech_sign", label: "Signature", type: "signature" },
      { id: "tech_date", label: "Date", type: "date" },
      { id: "client_name", label: "Client name", type: "text" },
      { id: "client_sign", label: "Client signature", type: "signature" },
      { id: "client_date", label: "Client date", type: "date" },
    ],
  },
];

const mechanicalAnswers = [
  { fieldId: "mc_client", type: "text", value: "Gold Fields" },
  { fieldId: "mc_coupling_status", type: "text", value: "pass" },
  { fieldId: "mc_coupling_comment", type: "text", value: "Coupling dry" },
  { fieldId: "mc_overall_comments", type: "textarea", value: "Ready for return" },
  ...signatureValues,
];

const repairSections = [
  {
    id: "rsr_work",
    type: "fields",
    title: "Work done",
    fields: [
      { id: "rsr_fault", label: "Comments — Work Done", type: "textarea" },
      { id: "travel_1", label: "Travel", type: "text" },
      { id: "travel_2", label: "Travel", type: "text" },
      { id: "travel_3", label: "Travel", type: "text" },
      { id: "travel_4", label: "Travel", type: "text" },
      { id: "travel_5", label: "Travel", type: "text" },
      { id: "travel_6", label: "Travel", type: "text" },
      { id: "wait_reason", label: "Reason for waiting", type: "text" },
    ],
  },
  {
    id: "rsr_signatures",
    type: "signatures",
    title: "Signatures",
    fields: [
      { id: "tech_name", label: "Technician", type: "text" },
      { id: "tech_sign", label: "Signature", type: "signature" },
      { id: "tech_date", label: "Date", type: "date" },
      { id: "client_name", label: "Client name", type: "text" },
      { id: "client_sign", label: "Client signature", type: "signature" },
      { id: "client_date", label: "Client date", type: "date" },
      { id: "manager_sign", label: "Manager signature", type: "signature" },
      { id: "manager_date", label: "Manager date", type: "date" },
    ],
  },
];

const genericSections = [
  {
    id: "notes",
    type: "fields",
    title: "Work done",
    fields: [{ id: "work_note", label: "Work done", type: "textarea" }],
  },
  {
    id: "signs",
    type: "signatures",
    title: "Signatures",
    fields: [
      { id: "tech_name", label: "Technician", type: "text" },
      { id: "tech_sign", label: "Signature", type: "signature" },
      { id: "tech_date", label: "Date", type: "date" },
    ],
  },
];

const cases: Array<{ label: string; template: Record<string, unknown>; values: unknown[]; expectRenderer: string; includes: string[]; excludes: string[] }> = [
  {
    label: "Mechanical Checklist",
    template: { name: "Mechanical Checklist on Compressors", templateKey: "mechanical_checklist", sections: mechanicalSections },
    values: mechanicalAnswers,
    expectRenderer: "MechanicalChecklistReportDocument",
    includes: ["Mechanical Checklist on Compressors", "Gold Fields", "Check coupling alignment", "Coupling dry", "Ready for return", SIGNATURE],
    excludes: [],
  },
  {
    label: "Mechanical Checklist version without templateKey",
    template: { name: "Mechanical Checklist on Compressors V2", layoutKey: "mechanical_checklist", sections: mechanicalSections },
    values: mechanicalAnswers,
    expectRenderer: "MechanicalChecklistReportDocument",
    includes: ["Mechanical Checklist on Compressors", "Gold Fields", SIGNATURE],
    excludes: [],
  },
  {
    label: "Mechanical Checklist — Mobile Units",
    template: { name: "Mechanical Checklist — Mobile Units", reportPrefix: "MCC", sections: genericSections },
    values: [{ fieldId: "work_note", type: "textarea", value: "Mobile unit filter cleaned" }, ...signatureValues],
    expectRenderer: "GenericSectionReportDocument",
    includes: ["Mechanical Checklist — Mobile Units", "Mobile unit filter cleaned", "Sello Paya", SIGNATURE],
    excludes: ["For office use only"],
  },
  {
    label: "Repair Status Report",
    template: { name: "Repair Status Report", templateKey: "repair_status_report", sections: repairSections },
    values: [{ fieldId: "rsr_fault", type: "textarea", value: "Unloader valve stuck" }, ...signatureValues],
    expectRenderer: "RepairStatusReportDocument",
    includes: ["Repair Status Report", "Unloader valve stuck", SIGNATURE],
    excludes: ["Mechanical Checklist on Compressors"],
  },
  {
    label: "Generator Service Book",
    template: { name: "Generator Service Book – B Service Checklist", templateKey: "generator_b_service", sections: genericSections },
    values: [{ fieldId: "work_note", type: "textarea", value: "Oil 15W40" }, ...signatureValues],
    expectRenderer: "GenericSectionReportDocument",
    includes: ["Generator Service Book – B Service Checklist", "Oil 15W40", SIGNATURE],
    excludes: ["Mechanical Checklist on Compressors", "For office use only"],
  },
  {
    label: "Refrigeration Dryer & Desiccant Dryers",
    template: { name: "Refrigeration Dryer & Desiccant Dryers", templateKey: "dryer_sla", sections: genericSections },
    values: [{ fieldId: "work_note", type: "textarea", value: "Dew point -40" }, ...signatureValues],
    expectRenderer: "GenericSectionReportDocument",
    includes: ["Refrigeration Dryer &amp; Desiccant Dryers", "Dew point -40", SIGNATURE],
    excludes: ["Mechanical Checklist on Compressors"],
  },
  {
    label: "Custom generic form",
    template: { name: "Site inspection", sections: genericSections },
    values: [{ fieldId: "work_note", type: "textarea", value: "Customer requested a quote" }, ...signatureValues],
    expectRenderer: "GenericSectionReportDocument",
    includes: ["Site inspection", "Customer requested a quote", SIGNATURE],
    excludes: ["Mechanical Checklist on Compressors", "Repair Status Report"],
  },
];

for (const item of cases) {
  const actual = rendererName(item.template as never);
  if (actual !== item.expectRenderer) {
    throw new Error(`${item.label} used ${actual}, expected ${item.expectRenderer}`);
  }
  const html = htmlFor(item.template as never, item.values);
  for (const text of item.includes) requireText(html, text, item.label);
  for (const text of item.excludes) refuseText(html, text, item.label);
  console.log(`PASS ${item.label} -> ${actual}`);
}

// ---------------------------------------------------------------------------------------------
// Phase 2B: photographs on the office report / printout.
// ---------------------------------------------------------------------------------------------
const PHOTO_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACwAAAAAAQABAAACAkQBADs=";

function photoIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
}

function buildReport(questions: Array<{ id: string; expected: number; received: number }>): JobCardPhotoRenderData["report"] {
  const mapped = questions.map((question) => ({
    questionId: question.id,
    expected: question.expected,
    received: question.received,
    missing: question.expected - question.received,
    photos: photoIds(question.id, question.expected).map((clientPhotoId, index) => ({
      clientPhotoId,
      received: index < question.received,
    })),
  }));
  const expectedTotal = mapped.reduce((sum, question) => sum + question.expected, 0);
  const receivedTotal = mapped.reduce((sum, question) => sum + question.received, 0);
  return {
    hasManifest: true,
    expectedTotal,
    receivedTotal,
    missingTotal: expectedTotal - receivedTotal,
    complete: expectedTotal === receivedTotal,
    questions: mapped,
  };
}

function loadedImages(report: JobCardPhotoRenderData["report"], failIds: string[] = []): JobCardPhotoRenderData["images"] {
  const images: JobCardPhotoRenderData["images"] = {};
  for (const question of report.questions) {
    for (const photo of question.photos) {
      if (!photo.received) continue;
      images[photo.clientPhotoId] = failIds.includes(photo.clientPhotoId)
        ? { status: "error" }
        : { status: "loaded", url: PHOTO_URL };
    }
  }
  return images;
}

function photoData(report: JobCardPhotoRenderData["report"], failIds: string[] = []): JobCardPhotoRenderData {
  return { report, images: loadedImages(report, failIds) };
}

function insertAt<T>(items: T[], index: number, item: T): T[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

const photoSectionBefore = {
  id: "ph_sec_before",
  type: "fields",
  title: "Before Work Photos",
  fields: [{ id: "ph_before", label: "Before work", type: "photo", required: false }],
};
const photoSectionAfter = {
  id: "ph_sec_after",
  type: "fields",
  title: "After Work Photos",
  fields: [{ id: "ph_after", label: "After work", type: "photo", required: false }],
};
const photoSectionMixed = {
  id: "ph_sec_mixed",
  type: "fields",
  title: "Site Photos",
  fields: [
    { id: "ph_site_note", label: "Site note", type: "text" },
    { id: "ph_site", label: "Site overview", type: "photo", required: false },
  ],
};

const mechanicalPhotoSections = insertAt(
  insertAt(mechanicalSections, 1, photoSectionBefore),
  mechanicalSections.length,
  photoSectionAfter,
);
const repairPhotoSections = insertAt(repairSections, repairSections.length - 1, photoSectionAfter);
const genericPhotoSections = insertAt(insertAt(genericSections, 0, photoSectionBefore), genericSections.length, photoSectionAfter);
const genericMixedSections = insertAt(genericSections, genericSections.length - 1, photoSectionMixed);

function indexOfText(html: string, text: string, label: string): number {
  const index = html.indexOf(text);
  if (index < 0) throw new Error(`${label} did not render "${text}"`);
  return index;
}

function requireOrder(html: string, first: string, second: string, label: string): void {
  if (indexOfText(html, first, label) >= indexOfText(html, second, label)) {
    throw new Error(`${label} rendered "${first}" after "${second}"`);
  }
}

function countText(html: string, text: string): number {
  return html.split(text).length - 1;
}

const photoLayouts: Array<{
  label: string;
  template: Record<string, unknown>;
  values: unknown[];
  expectRenderer: string;
  before: boolean;
}> = [
  {
    label: "Mechanical Checklist",
    template: { name: "Mechanical Checklist on Compressors", templateKey: "mechanical_checklist", sections: mechanicalPhotoSections },
    values: mechanicalAnswers,
    expectRenderer: "MechanicalChecklistReportDocument",
    before: true,
  },
  {
    label: "Repair Status Report",
    template: { name: "Repair Status Report", templateKey: "repair_status_report", sections: repairPhotoSections },
    values: [{ fieldId: "rsr_fault", type: "textarea", value: "Unloader valve stuck" }, ...signatureValues],
    expectRenderer: "RepairStatusReportDocument",
    before: false,
  },
  {
    label: "Generator (generic)",
    template: { name: "Generator Service Book - B Service Checklist", templateKey: "generator_b_service", sections: genericPhotoSections },
    values: [{ fieldId: "work_note", type: "textarea", value: "Oil 15W40" }, ...signatureValues],
    expectRenderer: "GenericSectionReportDocument",
    before: true,
  },
  {
    label: "Dryer (generic)",
    template: { name: "Refrigeration Dryer & Desiccant Dryers", templateKey: "dryer_sla", sections: genericPhotoSections },
    values: [{ fieldId: "work_note", type: "textarea", value: "Dew point -40" }, ...signatureValues],
    expectRenderer: "GenericSectionReportDocument",
    before: true,
  },
];

for (const item of photoLayouts) {
  const actual = rendererName(item.template as never);
  if (actual !== item.expectRenderer) {
    throw new Error(`${item.label} (photos) used ${actual}, expected ${item.expectRenderer}`);
  }

  // Complete set.
  const complete = buildReport([
    ...(item.before ? [{ id: "ph_before", expected: 4, received: 4 }] : []),
    { id: "ph_after", expected: 2, received: 2 },
  ]);
  const completeHtml = htmlFor(item.template as never, item.values, undefined, photoData(complete));
  if (item.before) {
    requireText(completeHtml, "Before Work Photos", `${item.label} complete`);
    requireText(completeHtml, "4 of 4 photographs received", `${item.label} complete`);
  }
  requireText(completeHtml, "After Work Photos", `${item.label} complete`);
  requireText(completeHtml, "2 of 2 photographs received", `${item.label} complete`);
  requireText(completeHtml, PHOTO_URL, `${item.label} complete`);
  refuseText(completeHtml, "incomplete", `${item.label} complete`);
  refuseText(completeHtml, "not received yet", `${item.label} complete`);
  refuseText(completeHtml, "could not be loaded", `${item.label} complete`);
  requireText(completeHtml, SIGNATURE, `${item.label} complete`);
  requireOrder(completeHtml, "After Work Photos", SIGNATURE, `${item.label} complete`);
  if (item.before) {
    requireOrder(completeHtml, "Before Work Photos", "After Work Photos", `${item.label} complete`);
    if (countText(completeHtml, PHOTO_URL) !== 6) {
      throw new Error(`${item.label} complete rendered ${countText(completeHtml, PHOTO_URL)} images, expected 6`);
    }
  } else if (countText(completeHtml, PHOTO_URL) !== 2) {
    throw new Error(`${item.label} complete rendered ${countText(completeHtml, PHOTO_URL)} images, expected 2`);
  }
  if (countText(completeHtml, ">After work<") !== 1) {
    throw new Error(`${item.label} printed the photo question label more than once`);
  }

  // Partial set: the report must say so, per question and in total.
  const partial = buildReport([
    ...(item.before ? [{ id: "ph_before", expected: 4, received: 2 }] : []),
    { id: "ph_after", expected: 2, received: 1 },
  ]);
  const partialHtml = htmlFor(item.template as never, item.values, undefined, photoData(partial));
  if (item.before) {
    requireText(partialHtml, "2 of 4 photographs received - incomplete", `${item.label} partial`);
    requireText(partialHtml, "Photographs incomplete: 3 of 6 photographs received.", `${item.label} partial`);
  } else {
    requireText(partialHtml, "Photographs incomplete: 1 of 2 photographs received.", `${item.label} partial`);
  }
  requireText(partialHtml, "1 of 2 photographs received - incomplete", `${item.label} partial`);
  requireText(partialHtml, "not received yet", `${item.label} partial`);
  requireText(partialHtml, "jcr-photo-banner", `${item.label} partial`);

  // A received photograph whose image failed to load is visible, not silently dropped.
  const failedHtml = htmlFor(
    item.template as never,
    item.values,
    undefined,
    photoData(complete, ["ph_after-1"]),
  );
  requireText(failedHtml, "could not be loaded", `${item.label} failed image`);
  requireText(failedHtml, "1 photograph could not be loaded and is not shown.", `${item.label} failed image`);

  // Still loading: the tile says so (the print button is disabled in the app while this is true).
  const pendingHtml = htmlFor(item.template as never, item.values, undefined, {
    report: complete,
    images: {},
  });
  requireText(pendingHtml, "loading...", `${item.label} pending image`);

  // No photographs at all (submission without a manifest): nothing photo-related is printed.
  const plain = htmlFor(item.template as never, item.values);
  const plainReport = htmlFor(item.template as never, item.values, undefined, {
    report: { hasManifest: false, expectedTotal: 0, receivedTotal: 0, missingTotal: 0, complete: true, questions: [] },
    images: {},
  });
  for (const html of [plain, plainReport]) {
    refuseText(html, "Before Work Photos", `${item.label} without photos`);
    refuseText(html, "After Work Photos", `${item.label} without photos`);
    refuseText(html, "jcr-photo", `${item.label} without photos`);
    refuseText(html, "photographs received", `${item.label} without photos`);
  }
  if (plain !== plainReport) {
    throw new Error(`${item.label} without a manifest does not render identically to the unchanged report`);
  }

  console.log(`PASS photos ${item.label} -> ${actual}`);
}

// Photo-only section placed straight after Job Information prints there (Mechanical + generic).
{
  const report = buildReport([
    { id: "ph_before", expected: 3, received: 3 },
    { id: "ph_after", expected: 1, received: 1 },
  ]);
  const mechanicalHtml = htmlFor(
    photoLayouts[0].template as never,
    photoLayouts[0].values,
    undefined,
    photoData(report),
  );
  requireOrder(mechanicalHtml, "Before Work Photos", "Check coupling alignment", "Mechanical photo after Job Information");
  requireOrder(mechanicalHtml, "Check coupling alignment", "After Work Photos", "Mechanical photo before sign-off");
  const genericHtml = htmlFor(
    photoLayouts[2].template as never,
    photoLayouts[2].values,
    undefined,
    photoData(report),
  );
  requireOrder(genericHtml, "Before Work Photos", "Oil 15W40", "Generic photo section first");
  requireOrder(genericHtml, "Oil 15W40", "After Work Photos", "Generic photo section last");
  console.log("PASS photo section placement (after Job Information, before sign-off)");
}

// A photo question beside ordinary answers: answers and photographs both print; a Photo
// question never prints as an empty answer cell.
{
  const template = { name: "Site inspection", sections: genericMixedSections };
  const values = [
    { fieldId: "work_note", type: "textarea", value: "Customer requested a quote" },
    { fieldId: "ph_site_note", type: "text", value: "North gate" },
    ...signatureValues,
  ];
  const report = buildReport([{ id: "ph_site", expected: 2, received: 2 }]);
  const withPhotos = htmlFor(template as never, values, undefined, photoData(report));
  requireText(withPhotos, "Site Photos", "mixed section");
  requireText(withPhotos, "North gate", "mixed section");
  requireText(withPhotos, "Site overview", "mixed section");
  requireText(withPhotos, "2 of 2 photographs received", "mixed section");
  if (countText(withPhotos, ">Site overview<") !== 1) {
    throw new Error("mixed section printed the photo question label more than once");
  }
  const withoutPhotos = htmlFor(template as never, [values[0], ...signatureValues]);
  // The ordinary question still prints as it always did; the Photo question adds nothing.
  requireText(withoutPhotos, "Site note", "mixed section without photos");
  refuseText(withoutPhotos, "Site overview", "mixed section without photos");
  refuseText(withoutPhotos, "jcr-photo", "mixed section without photos");
  console.log("PASS mixed photo/answer section");
}

// Photo questions in a fixed layout never produce an empty answer cell for the Photo question.
{
  const sections = repairSections.map((section) =>
    section.id === "rsr_work"
      ? { ...section, fields: [...section.fields, { id: "ph_work", label: "Work photos", type: "photo", required: false }] }
      : section,
  );
  const template = { name: "Repair Status Report", templateKey: "repair_status_report", sections };
  const report = buildReport([{ id: "ph_work", expected: 2, received: 1 }]);
  const html = htmlFor(template as never, [{ fieldId: "rsr_fault", type: "textarea", value: "Unloader valve stuck" }, ...signatureValues], undefined, photoData(report));
  requireText(html, "Unloader valve stuck", "repair with photo field in a fixed section");
  requireText(html, "1 of 2 photographs received - incomplete", "repair with photo field in a fixed section");
  if (countText(html, ">Work photos<") !== 1) {
    throw new Error("repair photo question label printed outside its photo block");
  }
  const noPhotos = htmlFor(template as never, [{ fieldId: "rsr_fault", type: "textarea", value: "Unloader valve stuck" }, ...signatureValues]);
  refuseText(noPhotos, ">Work photos<", "repair photo field without photographs");
  console.log("PASS repair photo question inside a fixed section");
}