import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerMasterPreviewPanel } from "./CustomerMasterPreviewPanel";
import type { CustomerMasterPreview } from "../lib/api";

const preview: CustomerMasterPreview = {
  previewOnly: true,
  applyAvailable: true,
  strictV2: true,
  recordsToChange: 1,
  workbookSha256: "sha",
  planFingerprint: "fingerprint",
  summary: {
    totalRows: 1,
    unchanged: 0,
    detailCorrections: 1,
    adminCodeChanges: 0,
    proposedArchives: 0,
    proposedRestores: 0,
    missingCustomerIds: 0,
    invalidRows: 0,
    conflicts: 0,
    blocked: 0,
  },
  missingCustomers: [],
  rows: [
    {
      rowNumber: 2,
      customerId: "customer-id",
      customerName: "Petter",
      outcome: "proposed",
      messages: [],
      changes: [
        {
          field: "customerName",
          label: "Customer Name",
          before: "Petter",
          after: "Peter",
        },
      ],
      currentStatus: "Active",
      proposedStatus: "Active",
      archiveImpact: null,
    },
  ],
  recipients: {
    summary: {
      totalRows: 1,
      additions: 1,
      updates: 0,
      deactivations: 0,
      unchanged: 0,
      invalid: 0,
      conflicts: 0,
    },
    rows: [
      {
        rowNumber: 2,
        customerId: "quantum-id",
        customerName: "Quantum Foods",
        recipientId: null,
        recipientName: "Erich",
        outcome: "proposed",
        action: "add",
        messages: [],
        changes: [
          {
            field: "email",
            label: "Email Address",
            before: "",
            after: "erich@lmwfinance.co.za",
          },
          { field: "checklist", label: "Checklist", before: "", after: "Yes" },
          {
            field: "service_due",
            label: "Service Due",
            before: "",
            after: "Yes",
          },
          { field: "active", label: "Active", before: "", after: "Yes" },
        ],
      },
    ],
  },
};
const render = (data = preview, applying = false) =>
  renderToStaticMarkup(
    createElement(CustomerMasterPreviewPanel, {
      preview: data,
      applying,
      applyResult: null,
      onApply: async () => {},
      onClose: () => {},
    }),
  );
describe("Customer Master combined preview", () => {
  it("separates actual customer differences from the exact recipient proposal before applying", () => {
    const html = render();
    for (const text of [
      "Customer changes",
      "Petter",
      "Peter",
      "Add recipient",
      "Erich",
      "Quantum Foods",
      "erich@lmwfinance.co.za",
      "Checklist",
      "Service Due",
      "Yes",
      "quantum-id",
      "Notification Recipients row 2",
    ])
      expect(html).toContain(text);
  });
  it("blocks the V2 apply control and explains invalid imports", () => {
    const html = render({ ...preview, applyAvailable: false });
    expect(html).toMatch(
      /button[^>]*disabled=""[^>]*>Approve and Apply Changes/,
    );
    expect(html).toContain("Correct every invalid");
  });
  it("does not allow closing an import that is applying", () => {
    expect(render(preview, true)).toMatch(/button[^>]*disabled=""[^>]*>Close/);
  });
  it("keeps legacy customer previews usable without a recipient section", () => {
    const { recipients: _recipients, strictV2: _strict, ...legacy } = preview;
    expect(render(legacy)).not.toContain('aria-label="Recipient changes"');
  });
  it('shows original/current/proposed conflict values and explicit choices without selecting an overwrite',()=>{
    const data:CustomerMasterPreview={...preview,applyAvailable:false,rows:[{...preview.rows[0],outcome:'conflict',fieldConflicts:[{field:'customerName',label:'Customer Name',original:'Original name',current:'ARS name',proposed:'Excel name',requiresReview:true,reason:'Both changed'}]}]};
    const html=renderToStaticMarkup(createElement(CustomerMasterPreviewPanel,{preview:data,applying:false,applyResult:null,onApply:async()=>{},onClose:()=>{},onResolve:async()=>{}}));
    for(const text of ['Original name','ARS name','Excel name','Keep ARS value','Use Excel value','Select a resolution'])expect(html).toContain(text);
    expect(html).toMatch(/option value="" selected=""/);
  });
  it('shows resolved Keep ARS fields in the attention view even when no customer write remains',()=>{
    const data:CustomerMasterPreview={...preview,recordsToChange:0,rows:[{...preview.rows[0],outcome:'unchanged',changes:[],fieldConflicts:[{field:'customerName',label:'Customer Name',original:null,current:'ARS name',proposed:'Excel name',resolution:'keep',requiresReview:false,reason:'Reviewed'}]}]};
    const html=render(data);expect(html).toContain('Original: Unavailable');expect(html).toContain('Resolved');expect(html).toContain('ARS name');
  });
  it('offers the updated working-copy download after successful confirmation',()=>{
    const html=renderToStaticMarkup(createElement(CustomerMasterPreviewPanel,{preview,applying:false,applyResult:{recordsChanged:1,alreadyApplied:false,approvalId:'approved',mode:'ordered',appliedCustomerIds:['customer-id'],preview},onApply:async()=>{},onClose:()=>{},onWorkingCopy:async()=>{}}));
    expect(html).toContain('Download updated working workbook');
  });
});
