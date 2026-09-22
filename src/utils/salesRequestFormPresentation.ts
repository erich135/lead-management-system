export interface FormPresentationRow {
  label: string;
  value: string;
}

export interface FormPresentationSection {
  title: string;
  rows: FormPresentationRow[];
}

const RFC_PURCHASE: Record<string, string> = {
  new_unit: "New Unit",
  pre_owned_unit: "Pre-owned Unit",
  diesel: "Diesel",
  electric: "Electric",
  parts_only: "Part/s only",
};

const RFC_LOGISTICS: Record<string, string> = {
  collection: "Collection",
  delivery: "Delivery",
  installation: "Installation",
  commissioning: "Commissioning",
};

const RFC_WORK: Record<string, string> = {
  complete_strip_quote: "Complete Strip and Quote",
  air_end_strip_quote: "Air-end Strip and Quote",
  main_motor_strip_quote: "Main Motor Strip and Quote",
  main_motor_service_rewind: "Main Motor Service and/or Rewind",
  fan_motor_strip_quote: "Fan Motor/s Strip and Quote",
  fan_motor_service_rewind: "Fan Motor/s Service and/or Rewind",
  coolers_chemical_cleaning: "Coolers Chemical Cleaning",
  contactor_repair_replace: "Contactor Repair and replace",
  panel_repair_replace: "Panel Repair and replace",
  transformer_repair_replace: "Transformer Repair and replace",
  controller_repair_replace: "Controller Repair and replace",
};

export const RFC_SERVICE_SCOPE_LABELS: Record<string, string> = {
  minor_service: "Minor Service",
  separator_service: "Separator Service",
  major_service: "Major Service",
  overhaul: "Overhaul",
};

const YES_NO: Record<string, string> = { yes: "Yes", no: "No" };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return value;
}

function labelsFor(values: unknown, map: Record<string, string>): string {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  return list
    .map((item) => {
      const key = String(item || "");
      return map[key] || (key && !map[key] ? key : "");
    })
    .filter(Boolean)
    .join(", ");
}

function row(label: string, value: unknown): FormPresentationRow | null {
  const rendered = text(value).trim();
  if (!rendered) return null;
  return { label, value: text(value) };
}

function section(
  title: string,
  rows: Array<FormPresentationRow | null>,
): FormPresentationSection | null {
  const filled = rows.filter((item): item is FormPresentationRow => Boolean(item));
  if (filled.length === 0) return null;
  return { title, rows: filled };
}

function presentRfc(formData: Record<string, unknown>): FormPresentationSection[] {
  const customer = asRecord(formData.customer);
  const sectionA = asRecord(formData.sectionA);
  const sectionB = asRecord(formData.sectionB);
  const labour = asRecord(formData.labour);
  const office = asRecord(formData.office);
  const acknowledgement = asRecord(formData.acknowledgement);
  const parts = Array.isArray(formData.parts) ? formData.parts : [];

  const partRows = parts
    .map((part, index) => {
      const rowData = asRecord(part);
      const value = [
        text(rowData.qty) && `Qty ${text(rowData.qty)}`,
        text(rowData.pastelPartNumber),
        text(rowData.partDescription),
        text(rowData.crossReference),
        text(rowData.pricePreviouslyQuoted) &&
          `Prev. price ${text(rowData.pricePreviouslyQuoted)}`,
        text(rowData.previousQuoteNumber) && `Quote ${text(rowData.previousQuoteNumber)}`,
        text(rowData.datePreviouslyQuoted),
      ]
        .filter(Boolean)
        .join(" · ");
      return value ? row(`Line ${index + 1}`, value) : null;
    })
    .filter(Boolean);

  return [
    section("Customer Details", [
      row("Company name", customer.companyName),
      row("Physical address", customer.physicalAddress),
      row("Postal address", customer.postalAddress),
      row("Customer RFQ number", customer.customerRfqNumber),
      row("Rep code", customer.repCode),
      row("Service contract", labelsFor([customer.serviceContract], YES_NO)),
      row("Telephone", customer.telephone),
      row("Fax", customer.fax),
      row("E-mail", customer.email),
      row("Contact person", customer.contactPerson),
    ]),
    section("Section A — Purchase", [
      row("Purchase type", labelsFor(sectionA.purchaseOptions, RFC_PURCHASE)),
      row("Make preference", sectionA.make),
      row("Application", sectionA.application),
      row("kVa", sectionA.kva),
      row("kW", sectionA.kw),
      row("Amps", sectionA.amps),
      row("Operating voltage", sectionA.operatingVoltage),
      row("Capacity", sectionA.capacity),
      row("Logistics required", labelsFor(sectionA.logistics, RFC_LOGISTICS)),
      row("Capacity / flow required", sectionA.requiredCapacityFlow),
      row("Operating pressure at point of use", sectionA.requiredOperatingPressure),
      row("Air quality required", sectionA.requiredAirQuality),
      row(
        "Air receiver / piping of sufficient capacity",
        labelsFor([sectionA.hasAirReceiverOrPiping], YES_NO),
      ),
      row("Recommended unit given by / size", sectionA.recommendedUnitBy),
      row("Other requirements or notes", sectionA.otherRequirements),
    ]),
    section("Section B — Work To Be Done", [
      row("Type", sectionB.unitType),
      row("Make", sectionB.make),
      row("Model", sectionB.model),
      row("Serial number", sectionB.serialNumber),
      row("Plant number", sectionB.plantNumber),
      row("Hour meter", sectionB.hourMeter),
      row("Application", sectionB.application),
      row("Logistics required", labelsFor(sectionB.logistics, RFC_LOGISTICS)),
      row("Description of work required", labelsFor(sectionB.workRequired, RFC_WORK)),
      row("Service scope", labelsFor([sectionB.serviceScope], RFC_SERVICE_SCOPE_LABELS)),
      row("Breakdown", sectionB.isBreakdown === true ? "Yes" : ""),
      row("RSR number", sectionB.rsrNumber),
      row("Breakdown date", sectionB.breakdownDate),
    ]),
    partRows.length
      ? { title: "Parts", rows: partRows as FormPresentationRow[] }
      : null,
    section("Labour & Traveling", [
      row("Labour hours (normal time)", labour.normalTimeHours),
      row("Labour hours (overtime)", labour.overtimeHours),
      row("Labour hours (double time)", labour.doubleTimeHours),
      row("Travel hours (to & from site)", labour.travelHours),
      row("Km's (to & from site)", labour.kilometres),
    ]),
    section("Additional Comments", [row("Comments", formData.additionalComments)]),
    section("For Office Use", [
      row("RFC done by", office.rfcDoneBy),
      row("RFC date", office.rfcDate),
      row("Branch name", office.branchName),
      row("Queries — contact person", office.queriesContactPerson),
      row("Queries — contact number", office.queriesContactNumber),
    ]),
    section("Customer Acknowledgement", [
      row("Customer name", acknowledgement.customerName),
      row("Signed at", acknowledgement.signedAt),
      row(
        "Signature",
        text(acknowledgement.signatureDataUrl) ? "Captured" : "",
      ),
    ]),
  ].filter((item): item is FormPresentationSection => Boolean(item));
}

function presentLoanRental(formData: Record<string, unknown>): FormPresentationSection[] {
  const header = asRecord(formData.header);
  const customer = asRecord(formData.customer);
  const request = asRecord(formData.request);
  const site = asRecord(formData.site);
  const office = asRecord(formData.office);
  return [
    section("Request Header", [
      row("Document number", header.documentNumber),
      row("Request by", header.requestBy),
      row("Quote done by", header.quoteDoneBy),
      row("Date quote done", header.dateQuoteDone),
    ]),
    section("Customer", [
      row("Customer", customer.customer),
      row("Rep code", customer.repCode),
      row("Branch", customer.branch),
      row("Customer contact no", customer.contactNumber),
      row("Customer name", customer.customerName),
      row("Customer email address", customer.emailAddress),
    ]),
    section("Request Details", [
      row("Duration of rental", request.durationOfRental),
      row("Unit size", request.unitSize),
      row("Unit voltage", request.unitVoltage),
    ]),
    section("Site Specifics", [
      row("Site supply voltage", site.siteSupplyVoltage),
      row("Unit safety requirements", site.unitSafetyRequirements),
      row("Additional comments", site.additionalComments),
    ]),
    section("Office", [
      row("Request completed by", office.requestCompletedBy),
    ]),
  ].filter((item): item is FormPresentationSection => Boolean(item));
}

function presentNewService(formData: Record<string, unknown>): FormPresentationSection[] {
  return [
    section("Request Details", [
      row("Document number", formData.documentNumber),
      row("Requested by", formData.requestedBy),
      row("Quote done by", formData.quoteDoneBy),
      row("Rep code", formData.repCode),
    ]),
    section("Customer & Contract", [
      row("Customer", formData.customer),
      row("Customer contact no", formData.customerContactNo),
      row("Customer email", formData.customerEmail),
      row("Duration of contract", formData.durationOfContract),
    ]),
    section("Comments", [row("Additional comments", formData.additionalComments)]),
  ].filter((item): item is FormPresentationSection => Boolean(item));
}

function formatDynamicValue(value: unknown, options?: Array<{ value?: string; label?: string }>): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const key = String(item ?? "");
        const match = options?.find((option) => option.value === key);
        return match?.label || key;
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const raw = text(value);
  const match = options?.find((option) => option.value === raw);
  return match?.label || raw;
}

function presentDynamicSnapshot(formData: Record<string, unknown>): FormPresentationSection[] {
  const snapshot = asRecord(formData.formSchemaSnapshot);
  const values = asRecord(formData.values);
  const fields = Array.isArray(snapshot.fields) ? snapshot.fields : [];
  const elements = Array.isArray(snapshot.elements) ? snapshot.elements : [];
  const title =
    text(formData.formTemplateName) ||
    text(snapshot.name) ||
    text(snapshot.title) ||
    "Form";

  const rows: FormPresentationRow[] = [];
  if (fields.length > 0) {
    for (const field of fields) {
      const item = asRecord(field);
      if (item.enabled === false) continue;
      const id = String(item.id || item.key || "");
      const label = text(item.label) || id;
      const options = Array.isArray(item.options)
        ? (item.options as Array<{ value?: string; label?: string }>)
        : undefined;
      const rendered = formatDynamicValue(values[id] ?? values[String(item.key || "")], options);
      const next = row(label, rendered);
      if (next) rows.push(next);
    }
  } else {
    for (const element of elements) {
      const item = asRecord(element);
      if (item.enabled === false) continue;
      const type = text(item.type);
      if (["heading", "paragraph", "divider", "spacer", "button", "logo", "image"].includes(type)) {
        continue;
      }
      const id = String(item.id || item.key || "");
      const label = text(item.label) || id;
      const options = Array.isArray(item.options)
        ? (item.options as Array<{ value?: string; label?: string }>)
        : undefined;
      const next = row(label, formatDynamicValue(values[id], options));
      if (next) rows.push(next);
    }
  }

  if (rows.length === 0) return [];
  return [{ title, rows }];
}

function presentGeneric(formData: Record<string, unknown>): FormPresentationSection[] {
  const rows: FormPresentationRow[] = [];
  for (const [key, value] of Object.entries(formData)) {
    if (key === "signatureDataUrl" || key === "formSchemaSnapshot") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = presentGeneric(asRecord(value));
      for (const sectionRow of nested) {
        rows.push(
          ...sectionRow.rows.map((item) => ({
            label: `${humanize(key)} — ${item.label}`,
            value: item.value,
          })),
        );
      }
      continue;
    }
    const next = row(humanize(key), Array.isArray(value) ? value.join(", ") : value);
    if (next) rows.push(next);
  }
  return rows.length ? [{ title: "Form content", rows }] : [];
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Turns stored RFQ form data into labelled sections for screen and PDF.
 * Uses the captured template snapshot for dynamic forms so old RFQs stay readable.
 */
export function presentSalesRequestForm(
  requestType: string,
  formData: unknown,
): FormPresentationSection[] {
  const data = asRecord(formData);
  if (data.formSchemaSnapshot || data.values) {
    const dynamic = presentDynamicSnapshot(data);
    if (dynamic.length) return dynamic;
  }
  if (requestType === "rfc" || data.sectionA || data.sectionB) {
    const rfc = presentRfc(data);
    if (rfc.length) return rfc;
  }
  if (
    requestType === "loan" ||
    requestType === "rental" ||
    requestType === "loan_rental"
  ) {
    const loan = presentLoanRental(data);
    if (loan.length) return loan;
  }
  if (requestType === "rfc_new_service_level") {
    const sla = presentNewService(data);
    if (sla.length) return sla;
  }
  return presentGeneric(data);
}

export function extractSignatureDataUrl(formData: unknown): string | null {
  const acknowledgement = asRecord(asRecord(formData).acknowledgement);
  const signature = text(acknowledgement.signatureDataUrl);
  return signature.startsWith("data:image/") ? signature : null;
}

/**
 * Service-scope label copied onto Job Description, e.g. "Minor Service".
 */
export function extractServiceScopeLabel(formData: unknown): string | null {
  const sectionB = asRecord(asRecord(formData).sectionB);
  const raw = text(sectionB.serviceScope).trim();
  if (!raw) return null;
  return RFC_SERVICE_SCOPE_LABELS[raw] || raw.replace(/[_-]+/g, " ");
}

/**
 * Other requirements / notes copied onto Job Feedback, with line breaks kept.
 */
export function extractJobFeedbackNotes(formData: unknown): string {
  const data = asRecord(formData);
  const sectionA = asRecord(data.sectionA);
  const site = asRecord(data.site);
  const parts = [
    text(sectionA.otherRequirements),
    text(data.additionalComments),
    text(site.additionalComments),
  ]
    .map((item) => item.replace(/\r\n/g, "\n"))
    .filter((item) => item.trim().length > 0);
  return parts.join("\n\n");
}
