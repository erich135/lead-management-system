/**
 * Phase 3 local print check: hour readings on the 5 forms, using the print view's real renderer choice.
 * Local verification only. No app, no database.
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
import { FIXED_JOB_CARD_TEMPLATES } from "../../ars-app-backend/src/data/fixedJobCardTemplates";
import { addHourReadingFields } from "../../ars-app-backend/src/domain/jobCards/hourReadings";

const root = process.env.PHASE1_FRONTEND_ROOT || path.resolve(__dirname, "..");
const expr = fs.readFileSync(path.join(root, "src/components/FixedJobCardPrintView.tsx"), "utf8").match(/const layoutKey = ([^;]+);/)?.[1];
if (!expr) throw new Error("layout expression not found");
const layoutOf = new Function("template", `return ${expr};`) as (t: { layoutKey?: string; templateKey?: string }) => string;

type T = { name: string; templateKey?: string; layoutKey?: string; reportPrefix?: string; sections: any[] };
function render(t: T, values: any[]): { renderer: string; html: string } {
  const resolver = createFixedJobCardFieldResolver(values as never[], { jobNumber: "TEST-P3" }, undefined, "MCC000099");
  const header = getJobCardReportHeader();
  const lk = layoutOf(t);
  if (lk === "mechanical_checklist") return { renderer: "Mechanical", html: renderToStaticMarkup(<MechanicalChecklistReportDocument sections={t.sections as never[]} resolver={resolver} header={header} reportNumber="MCC000099" />) };
  if (lk === "repair_status_report") return { renderer: "RSR", html: renderToStaticMarkup(<RepairStatusReportDocument sections={t.sections as never[]} resolver={resolver} header={header} reportNumber="RSR000099" />) };
  return { renderer: "Generic", html: renderToStaticMarkup(<GenericSectionReportDocument templateName={t.name} sections={t.sections as never[]} resolver={resolver} header={header} reportNumber="RSR000099" />) };
}
const results: string[] = [];
let failed = 0;
function check(label: string, ok: boolean) { results.push(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed++; }
const pages = (h: string) => (h.match(/class="job-card-report"/g) || []).length;

const byKey = (k: string) => FIXED_JOB_CARD_TEMPLATES.find((t: any) => t.templateKey === k) as unknown as T;
const mobile: T = { name: "TEST Mobile Units stand-in", reportPrefix: "MCC", sections: [
  { id: "mu_details", title: "Unit Details", type: "fields", fields: [{ id: "mu_unit", label: "Unit", type: "text" }] },
  { id: "note_s", title: "Notes", type: "fields", fields: [{ id: "note", label: "Notes", type: "textarea" }] } ] };
const forms: [string, T, string, string, string | null, string][] = [
  ["mechanical_checklist", byKey("mechanical_checklist"), "mc_hours", "mc_load_hours", "mc_next_service_hours", "Mechanical"],
  ["repair_status_report", byKey("repair_status_report"), "rsr_running_hrs", "rsr_load_hours", null, "RSR"],
  ["generator_b_service", byKey("generator_b_service"), "gen_hours", "gen_load_hours", "gen_next_service_hours", "Generic"],
  ["dryer_sla", byKey("dryer_sla"), "dry_running_hours", "dry_load_hours", "dry_next_service_hours", "Generic"],
  ["mobile_units", mobile, "", "mu_load_hours", "mu_next_service_hours", "Generic"],
];
for (const [form, v1, cur, load, next, expectRenderer] of forms) {
  const v2: T = { ...v1, layoutKey: form === "mobile_units" ? "generic" : form, sections: addHourReadingFields(form as never, v1.sections as never) as any[] };
  const vals: any[] = [{ fieldId: load, type: "number", value: "8750" }];
  if (cur) vals.push({ fieldId: cur, type: "machineField", value: "12500" });
  if (next) vals.push({ fieldId: next, type: "number", value: "13000" });
  const r = render(v2, vals);
  check(`${form}: renderer ${r.renderer}`, r.renderer === expectRenderer);
  check(`${form}: Load Hours label + 8750`, r.html.includes("Load Hours") && r.html.includes("8750"));
  if (cur) check(`${form}: current 12500`, r.html.includes("12500"));
  if (next) check(`${form}: Next Service Hours 13000`, r.html.includes("Next Service Hours") && r.html.includes("13000"));
  check(`${form}: single report page`, pages(r.html) === 1);
  const blank = render(v2, cur ? [{ fieldId: cur, type: "machineField", value: "12500" }] : []);
  check(`${form}: blank load renders no 8750/0 value`, !blank.html.includes("8750") && !/jcr-field-value">0</.test(blank.html));
  const old = render({ ...v1, layoutKey: form === "mobile_units" ? undefined : form }, cur ? [{ fieldId: cur, type: "machineField", value: "12500" }] : []);
  check(`${form}: v1 print has no Load Hours field`, !old.html.includes(load));
  check(`${form}: v1 renderer unchanged`, old.renderer === expectRenderer);
  if (form === "mechanical_checklist") {
    const table = r.html.split('<table class="jcr-block">').find((t) => t.includes("Load Hours")) || "";
    const rows = (table.split("</table>")[0].match(/<tr/g) || []).length;
    check(`mechanical header stays 2 rows (got ${rows})`, rows === 2);
  }
  if (form === "dryer_sla") {
    check("dryer v2 label Current Hours", r.html.includes("Current Hours") && !r.html.includes("Running / Load Hours"));
    check("dryer v1 keeps Running / Load Hours", old.html.includes("Running / Load Hours"));
  }
  fs.writeFileSync(path.join(process.env.PHASE3_OUT || ".", `phase3-${form}.html`), r.html);
}
console.log(results.join("\n"));
console.log(`${results.length - failed}/${results.length} PASS`);
if (failed) process.exit(1);