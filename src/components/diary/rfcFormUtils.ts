/**
 * Digital version of the Air Rotory Services "Internal Request For Costing"
 * sheet (ISO_RFC-010, Revision 7). Field names, sections and option lists are
 * taken directly from the printed template so a completed digital form can be
 * checked line-for-line against the paper original.
 */

export const RFC_FORM_VERSION = 'ISO_RFC-010-REV7';

export interface RfcOption {
  value: string;
  label: string;
}

/** Section A purchase basis: what kind of unit the customer wants quoted. */
export const RFC_PURCHASE_OPTIONS: RfcOption[] = [
  { value: 'new_unit', label: 'New Unit' },
  { value: 'pre_owned_unit', label: 'Pre-owned Unit' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'parts_only', label: 'Part/s only' },
];

/** Delivery and site logistics requested on both Section A and Section B. */
export const RFC_LOGISTICS_OPTIONS: RfcOption[] = [
  { value: 'collection', label: 'Collection' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'installation', label: 'Installation' },
  { value: 'commissioning', label: 'Commissioning' },
];

/** Section B "Description of work required" tick list. */
export const RFC_WORK_REQUIRED_OPTIONS: RfcOption[] = [
  { value: 'complete_strip_quote', label: 'Complete Strip and Quote' },
  { value: 'air_end_strip_quote', label: 'Air-end Strip and Quote' },
  { value: 'main_motor_strip_quote', label: 'Main Motor Strip and Quote' },
  { value: 'main_motor_service_rewind', label: 'Main Motor Service and/or Rewind' },
  { value: 'fan_motor_strip_quote', label: 'Fan Motor/s Strip and Quote' },
  { value: 'fan_motor_service_rewind', label: 'Fan Motor/s Service and/or Rewind' },
  { value: 'coolers_chemical_cleaning', label: 'Coolers Chemical Cleaning' },
  { value: 'contactor_repair_replace', label: 'Contactor Repair and replace' },
  { value: 'panel_repair_replace', label: 'Panel Repair and replace' },
  { value: 'transformer_repair_replace', label: 'Transformer Repair and replace' },
  { value: 'controller_repair_replace', label: 'Controller Repair and replace' },
];

/** Service scope choices for the "Minor / Separator / Major / Overhaul" line. */
export const RFC_SERVICE_SCOPE_OPTIONS: RfcOption[] = [
  { value: 'minor_service', label: 'Minor Service' },
  { value: 'separator_service', label: 'Separator Service' },
  { value: 'major_service', label: 'Major Service' },
  { value: 'overhaul', label: 'Overhaul' },
];

/** Yes / No answer used for the air receiver and service contract questions. */
export const RFC_YES_NO_OPTIONS: RfcOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export interface RfcPartLine {
  id: string;
  qty: string;
  pastelPartNumber: string;
  partDescription: string;
  /** Cross reference replacement marker: [R] | [OEM] | C-Protect [CP]. */
  crossReference: string;
  pricePreviouslyQuoted: string;
  previousQuoteNumber: string;
  /** Date previously quoted, captured as YYYY-MM-DD. */
  datePreviouslyQuoted: string;
}

export interface RfcCustomerDetails {
  pastelAccountNumber: string;
  companyName: string;
  physicalAddress: string;
  postalAddress: string;
  customerRfqNumber: string;
  jobNumber: string;
  repCode: string;
  serviceContract: string;
  telephone: string;
  fax: string;
  email: string;
  contactPerson: string;
}

export interface RfcSectionA {
  purchaseOptions: string[];
  make: string;
  application: string;
  kva: string;
  kw: string;
  amps: string;
  operatingVoltage: string;
  capacity: string;
  otherRequirements: string;
  logistics: string[];
  requiredCapacityFlow: string;
  requiredOperatingPressure: string;
  requiredAirQuality: string;
  hasAirReceiverOrPiping: string;
  recommendedUnitBy: string;
}

export interface RfcSectionB {
  unitType: string;
  make: string;
  model: string;
  serialNumber: string;
  plantNumber: string;
  hourMeter: string;
  application: string;
  logistics: string[];
  workRequired: string[];
  serviceScope: string;
  isBreakdown: boolean;
  rsrNumber: string;
  breakdownDate: string;
}

export interface RfcLabourAndTravel {
  normalTimeHours: string;
  overtimeHours: string;
  doubleTimeHours: string;
  travelHours: string;
  kilometres: string;
}

export interface RfcOfficeDetails {
  rfcDoneBy: string;
  rfcDate: string;
  branchName: string;
  queriesContactPerson: string;
  queriesContactNumber: string;
}

export interface RfcCustomerAcknowledgement {
  customerName: string;
  signatureDataUrl: string | null;
  signedAt: string;
}

export interface RfcFormData {
  version: string;
  customer: RfcCustomerDetails;
  sectionA: RfcSectionA;
  sectionB: RfcSectionB;
  parts: RfcPartLine[];
  labour: RfcLabourAndTravel;
  additionalComments: string;
  office: RfcOfficeDetails;
  acknowledgement: RfcCustomerAcknowledgement;
}

/**
 * Generates a stable identifier for a parts table row.
 */
export function createRfcPartId(): string {
  return `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates an empty parts table row.
 */
export function createRfcPartLine(): RfcPartLine {
  return {
    id: createRfcPartId(),
    qty: '',
    pastelPartNumber: '',
    partDescription: '',
    crossReference: '',
    pricePreviouslyQuoted: '',
    previousQuoteNumber: '',
    datePreviouslyQuoted: '',
  };
}

/**
 * Creates a blank RFC form with a single empty parts row and today's RFC date.
 */
export function createEmptyRfcForm(): RfcFormData {
  const today = new Date();
  const rfcDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  return {
    version: RFC_FORM_VERSION,
    customer: {
      pastelAccountNumber: '',
      companyName: '',
      physicalAddress: '',
      postalAddress: '',
      customerRfqNumber: '',
      jobNumber: '',
      repCode: '',
      serviceContract: '',
      telephone: '',
      fax: '',
      email: '',
      contactPerson: '',
    },
    sectionA: {
      purchaseOptions: [],
      make: '',
      application: '',
      kva: '',
      kw: '',
      amps: '',
      operatingVoltage: '',
      capacity: '',
      otherRequirements: '',
      logistics: [],
      requiredCapacityFlow: '',
      requiredOperatingPressure: '',
      requiredAirQuality: '',
      hasAirReceiverOrPiping: '',
      recommendedUnitBy: '',
    },
    sectionB: {
      unitType: '',
      make: '',
      model: '',
      serialNumber: '',
      plantNumber: '',
      hourMeter: '',
      application: '',
      logistics: [],
      workRequired: [],
      serviceScope: '',
      isBreakdown: false,
      rsrNumber: '',
      breakdownDate: '',
    },
    parts: [createRfcPartLine()],
    labour: {
      normalTimeHours: '',
      overtimeHours: '',
      doubleTimeHours: '',
      travelHours: '',
      kilometres: '',
    },
    additionalComments: '',
    office: {
      rfcDoneBy: '',
      rfcDate,
      branchName: '',
      queriesContactPerson: '',
      queriesContactNumber: '',
    },
    acknowledgement: {
      customerName: '',
      signatureDataUrl: null,
      signedAt: '',
    },
  };
}

/**
 * Coerces an unknown value to a trimmed-safe string for form hydration.
 */
function toFormString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

/**
 * Coerces an unknown value to a string array of selected option values.
 */
function toOptionArray(value: unknown, options: RfcOption[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set(options.map((option) => option.value));
  return value.filter((entry): entry is string => typeof entry === 'string' && allowed.has(entry));
}

/**
 * Rehydrates a stored or partially saved RFC form into the current shape so
 * older saved visits never break the workspace.
 */
export function normalizeRfcForm(raw?: Partial<RfcFormData> | null): RfcFormData {
  const empty = createEmptyRfcForm();
  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  const parts = Array.isArray(raw.parts)
    ? raw.parts.map((part) => ({
        id: toFormString(part?.id) || createRfcPartId(),
        qty: toFormString(part?.qty),
        pastelPartNumber: toFormString(part?.pastelPartNumber),
        partDescription: toFormString(part?.partDescription),
        crossReference: toFormString(part?.crossReference),
        pricePreviouslyQuoted: toFormString(part?.pricePreviouslyQuoted),
        previousQuoteNumber: toFormString(part?.previousQuoteNumber),
        datePreviouslyQuoted: toFormString(part?.datePreviouslyQuoted),
      }))
    : [];

  return {
    version: toFormString(raw.version) || RFC_FORM_VERSION,
    customer: {
      pastelAccountNumber: toFormString(raw.customer?.pastelAccountNumber),
      companyName: toFormString(raw.customer?.companyName),
      physicalAddress: toFormString(raw.customer?.physicalAddress),
      postalAddress: toFormString(raw.customer?.postalAddress),
      customerRfqNumber: toFormString(raw.customer?.customerRfqNumber),
      jobNumber: toFormString(raw.customer?.jobNumber),
      repCode: toFormString(raw.customer?.repCode),
      serviceContract: toFormString(raw.customer?.serviceContract),
      telephone: toFormString(raw.customer?.telephone),
      fax: toFormString(raw.customer?.fax),
      email: toFormString(raw.customer?.email),
      contactPerson: toFormString(raw.customer?.contactPerson),
    },
    sectionA: {
      purchaseOptions: toOptionArray(raw.sectionA?.purchaseOptions, RFC_PURCHASE_OPTIONS),
      make: toFormString(raw.sectionA?.make),
      application: toFormString(raw.sectionA?.application),
      kva: toFormString(raw.sectionA?.kva),
      kw: toFormString(raw.sectionA?.kw),
      amps: toFormString(raw.sectionA?.amps),
      operatingVoltage: toFormString(raw.sectionA?.operatingVoltage),
      capacity: toFormString(raw.sectionA?.capacity),
      otherRequirements: toFormString(raw.sectionA?.otherRequirements),
      logistics: toOptionArray(raw.sectionA?.logistics, RFC_LOGISTICS_OPTIONS),
      requiredCapacityFlow: toFormString(raw.sectionA?.requiredCapacityFlow),
      requiredOperatingPressure: toFormString(raw.sectionA?.requiredOperatingPressure),
      requiredAirQuality: toFormString(raw.sectionA?.requiredAirQuality),
      hasAirReceiverOrPiping: toFormString(raw.sectionA?.hasAirReceiverOrPiping),
      recommendedUnitBy: toFormString(raw.sectionA?.recommendedUnitBy),
    },
    sectionB: {
      unitType: toFormString(raw.sectionB?.unitType),
      make: toFormString(raw.sectionB?.make),
      model: toFormString(raw.sectionB?.model),
      serialNumber: toFormString(raw.sectionB?.serialNumber),
      plantNumber: toFormString(raw.sectionB?.plantNumber),
      hourMeter: toFormString(raw.sectionB?.hourMeter),
      application: toFormString(raw.sectionB?.application),
      logistics: toOptionArray(raw.sectionB?.logistics, RFC_LOGISTICS_OPTIONS),
      workRequired: toOptionArray(raw.sectionB?.workRequired, RFC_WORK_REQUIRED_OPTIONS),
      serviceScope: toFormString(raw.sectionB?.serviceScope),
      isBreakdown: Boolean(raw.sectionB?.isBreakdown),
      rsrNumber: toFormString(raw.sectionB?.rsrNumber),
      breakdownDate: toFormString(raw.sectionB?.breakdownDate),
    },
    parts: parts.length > 0 ? parts : empty.parts,
    labour: {
      normalTimeHours: toFormString(raw.labour?.normalTimeHours),
      overtimeHours: toFormString(raw.labour?.overtimeHours),
      doubleTimeHours: toFormString(raw.labour?.doubleTimeHours),
      travelHours: toFormString(raw.labour?.travelHours),
      kilometres: toFormString(raw.labour?.kilometres),
    },
    additionalComments: toFormString(raw.additionalComments),
    office: {
      rfcDoneBy: toFormString(raw.office?.rfcDoneBy),
      rfcDate: toFormString(raw.office?.rfcDate) || empty.office.rfcDate,
      branchName: toFormString(raw.office?.branchName),
      queriesContactPerson: toFormString(raw.office?.queriesContactPerson),
      queriesContactNumber: toFormString(raw.office?.queriesContactNumber),
    },
    acknowledgement: {
      customerName: toFormString(raw.acknowledgement?.customerName),
      signatureDataUrl:
        typeof raw.acknowledgement?.signatureDataUrl === 'string'
          ? raw.acknowledgement.signatureDataUrl
          : null,
      signedAt: toFormString(raw.acknowledgement?.signedAt),
    },
  };
}

interface RfcPrefillSource {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  repCode?: string;
  repName?: string;
  location?: string;
}

/**
 * Fills the customer block from the linked appointment so the rep never
 * retypes details the CRM already holds. Existing input is never overwritten.
 */
export function prefillRfcForm(form: RfcFormData, source: RfcPrefillSource): RfcFormData {
  return {
    ...form,
    customer: {
      ...form.customer,
      companyName: form.customer.companyName || source.companyName || '',
      contactPerson: form.customer.contactPerson || source.contactPerson || '',
      telephone: form.customer.telephone || source.contactPhone || '',
      email: form.customer.email || source.contactEmail || '',
      physicalAddress:
        form.customer.physicalAddress || source.contactAddress || source.location || '',
      repCode: form.customer.repCode || source.repCode || '',
    },
    office: {
      ...form.office,
      rfcDoneBy: form.office.rfcDoneBy || source.repName || '',
    },
  };
}

/**
 * Counts how many of the important RFC fields the rep has captured.
 */
export function getRfcFormProgress(form: RfcFormData): { filled: number; total: number } {
  const missing = getRfcMissingFields(form);
  const total = 9;
  return {
    filled: total - missing.length,
    total,
  };
}

/**
 * Lists the important RFC fields that are still empty (matches backend submit validation).
 */
export function getRfcMissingFields(form: RfcFormData): string[] {
  const missingFields: string[] = [];

  if (!form.customer.companyName.trim()) missingFields.push('Customer company name');
  if (!form.customer.contactPerson.trim()) missingFields.push('Customer contact person');
  if (!form.customer.telephone.trim()) missingFields.push('Customer telephone');
  if (!form.customer.physicalAddress.trim()) missingFields.push('Customer physical address');
  if (!form.office.rfcDoneBy.trim()) missingFields.push('RFC done by');
  if (!form.acknowledgement.customerName.trim()) missingFields.push('Customer acknowledgement name');

  const hasSectionA =
    form.sectionA.purchaseOptions.length > 0 ||
    Boolean(form.sectionA.make.trim()) ||
    Boolean(form.sectionA.kw.trim());
  if (!hasSectionA) missingFields.push('Section A purchase / unit details');

  const hasSectionB =
    form.sectionB.workRequired.length > 0 ||
    Boolean(form.sectionB.make.trim()) ||
    Boolean(form.sectionB.serialNumber.trim());
  if (!hasSectionB) missingFields.push('Section B work / unit details');

  const hasParts = form.parts.some(
    (part) => part.partDescription.trim() || part.pastelPartNumber.trim(),
  );
  if (!hasParts) missingFields.push('At least one part line');

  return missingFields;
}

/**
 * Returns whether the rep has captured anything on the RFC form yet.
 */
export function isRfcFormStarted(form?: RfcFormData | null): boolean {
  if (!form) {
    return false;
  }

  return getRfcFormProgress(form).filled > 0;
}

export interface RfcSummaryRow {
  label: string;
  value: string;
}

export interface RfcSummarySection {
  title: string;
  rows: RfcSummaryRow[];
}

/**
 * Resolves selected option values back to their printed template labels.
 */
function labelsFor(values: string[], options: RfcOption[]): string {
  return values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label))
    .join(', ');
}

/**
 * Flattens a completed RFC form into printable label/value sections, skipping
 * anything the rep left blank. Used by the History visit record.
 */
export function summarizeRfcForm(form: RfcFormData): RfcSummarySection[] {
  const sections: RfcSummarySection[] = [
    {
      title: 'Customer Details',
      rows: [
        { label: 'Pastel account number', value: form.customer.pastelAccountNumber },
        { label: 'Company name', value: form.customer.companyName },
        { label: 'Physical address', value: form.customer.physicalAddress },
        { label: 'Postal address', value: form.customer.postalAddress },
        { label: 'Customer RFQ number', value: form.customer.customerRfqNumber },
        { label: 'Job number', value: form.customer.jobNumber },
        { label: 'Rep code', value: form.customer.repCode },
        {
          label: 'Service contract',
          value: labelsFor([form.customer.serviceContract], RFC_YES_NO_OPTIONS),
        },
        { label: 'Telephone', value: form.customer.telephone },
        { label: 'Fax', value: form.customer.fax },
        { label: 'E-mail', value: form.customer.email },
        { label: 'Contact person', value: form.customer.contactPerson },
      ],
    },
    {
      title: 'Section A — Purchase',
      rows: [
        { label: 'Purchase type', value: labelsFor(form.sectionA.purchaseOptions, RFC_PURCHASE_OPTIONS) },
        { label: 'Make preference', value: form.sectionA.make },
        { label: 'Application', value: form.sectionA.application },
        { label: 'kVa', value: form.sectionA.kva },
        { label: 'kW', value: form.sectionA.kw },
        { label: 'Amps', value: form.sectionA.amps },
        { label: 'Operating voltage', value: form.sectionA.operatingVoltage },
        { label: 'Capacity', value: form.sectionA.capacity },
        { label: 'Logistics required', value: labelsFor(form.sectionA.logistics, RFC_LOGISTICS_OPTIONS) },
        { label: 'Capacity / flow required', value: form.sectionA.requiredCapacityFlow },
        { label: 'Operating pressure at point of use', value: form.sectionA.requiredOperatingPressure },
        { label: 'Air quality required', value: form.sectionA.requiredAirQuality },
        {
          label: 'Air receiver / piping of sufficient capacity',
          value: labelsFor([form.sectionA.hasAirReceiverOrPiping], RFC_YES_NO_OPTIONS),
        },
        { label: 'Recommended unit given by / size', value: form.sectionA.recommendedUnitBy },
        { label: 'Other requirements or notes', value: form.sectionA.otherRequirements },
      ],
    },
    {
      title: 'Section B — Work To Be Done',
      rows: [
        { label: 'Type', value: form.sectionB.unitType },
        { label: 'Make', value: form.sectionB.make },
        { label: 'Model', value: form.sectionB.model },
        { label: 'Serial number', value: form.sectionB.serialNumber },
        { label: 'Plant number', value: form.sectionB.plantNumber },
        { label: 'Hour meter', value: form.sectionB.hourMeter },
        { label: 'Application', value: form.sectionB.application },
        { label: 'Logistics required', value: labelsFor(form.sectionB.logistics, RFC_LOGISTICS_OPTIONS) },
        {
          label: 'Description of work required',
          value: labelsFor(form.sectionB.workRequired, RFC_WORK_REQUIRED_OPTIONS),
        },
        {
          label: 'Service scope',
          value: labelsFor([form.sectionB.serviceScope], RFC_SERVICE_SCOPE_OPTIONS),
        },
        { label: 'Breakdown', value: form.sectionB.isBreakdown ? 'Yes' : '' },
        { label: 'RSR number', value: form.sectionB.rsrNumber },
        { label: 'Breakdown date', value: form.sectionB.breakdownDate },
      ],
    },
    {
      title: 'Labour & Traveling',
      rows: [
        { label: 'Labour hours (normal time)', value: form.labour.normalTimeHours },
        { label: 'Labour hours (overtime)', value: form.labour.overtimeHours },
        { label: 'Labour hours (double time)', value: form.labour.doubleTimeHours },
        { label: 'Travel hours (to & from site)', value: form.labour.travelHours },
        { label: "Km's (to & from site)", value: form.labour.kilometres },
      ],
    },
    {
      title: 'Additional Comments',
      rows: [{ label: 'Comments', value: form.additionalComments }],
    },
    {
      title: 'For Office Use',
      rows: [
        { label: 'RFC done by', value: form.office.rfcDoneBy },
        { label: 'RFC date', value: form.office.rfcDate },
        { label: 'Branch name', value: form.office.branchName },
        { label: 'Queries — contact person', value: form.office.queriesContactPerson },
        { label: 'Queries — contact number', value: form.office.queriesContactNumber },
      ],
    },
    {
      title: 'Customer Acknowledgement',
      rows: [
        { label: 'Customer name', value: form.acknowledgement.customerName },
        { label: 'Signed at', value: form.acknowledgement.signedAt },
        { label: 'Signature', value: form.acknowledgement.signatureDataUrl ? 'Captured' : '' },
      ],
    },
  ];

  const partRows = form.parts
    .filter((part) => part.partDescription || part.pastelPartNumber || part.qty)
    .map((part, index) => ({
      label: `Line ${index + 1}`,
      value: [
        part.qty && `Qty ${part.qty}`,
        part.pastelPartNumber,
        part.partDescription,
        part.crossReference,
        part.pricePreviouslyQuoted && `Prev. price ${part.pricePreviouslyQuoted}`,
        part.previousQuoteNumber && `Quote ${part.previousQuoteNumber}`,
        part.datePreviouslyQuoted,
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  if (partRows.length > 0) {
    sections.splice(3, 0, { title: 'Parts', rows: partRows });
  }

  return sections
    .map((section) => ({
      title: section.title,
      rows: section.rows.filter((row) => row.value.trim().length > 0),
    }))
    .filter((section) => section.rows.length > 0);
}
