/**
 * Digital version of the Air Rotory Services "Request For Costing – New Service
 * Level Agreement" sheet (OS007-47). Only the field-critical sections are kept
 * so a sales rep can complete it quickly during a meeting.
 */

export const NEW_SERVICE_LEVEL_FORM_VERSION = 'OS007-47-REV00';

export interface NewServiceLevelOption {
  value: string;
  label: string;
}

/** Unit type tick options from the printed request sheet. */
export const NEW_SERVICE_LEVEL_UNIT_TYPE_OPTIONS: NewServiceLevelOption[] = [
  { value: 'compressor', label: 'Compressor' },
  { value: 'dryer', label: 'Dryer' },
  { value: 'generator', label: 'Generator' },
];

/** Yes / No answers for refurbs included. */
export const NEW_SERVICE_LEVEL_YES_NO_OPTIONS: NewServiceLevelOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export interface NewServiceLevelUnitLine {
  id: string;
  makeAndModel: string;
  yearModel: string;
  voltage: string;
  oilType: string;
  runningHours: string;
  serviceIntervals: string;
}

export interface NewServiceLevelFormData {
  version: string;
  documentNumber: string;
  revisionNumber: string;
  requestedBy: string;
  quoteDoneBy: string;
  dateQuoteDone: string;
  repCode: string;
  customer: string;
  customerContactNo: string;
  customerEmail: string;
  durationOfContract: string;
  refurbsIncluded: string;
  unitTypes: string[];
  unitQty: string;
  units: NewServiceLevelUnitLine[];
  siteSpecifics: string;
  additionalComments: string;
  notes: string;
  requestCompletedBy: string;
  dateCompleted: string;
  customerApprovalName: string;
  customerApprovalDate: string;
  customerApprovalDesignation: string;
  signatureDataUrl: string | null;
  signedAt: string;
}

/**
 * Generates a stable identifier for a unit table row.
 */
export function createNewServiceLevelUnitId(): string {
  return `nsl-unit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates an empty unit line for the service level agreement sheet.
 */
export function createNewServiceLevelUnitLine(): NewServiceLevelUnitLine {
  return {
    id: createNewServiceLevelUnitId(),
    makeAndModel: '',
    yearModel: '',
    voltage: '',
    oilType: '',
    runningHours: '',
    serviceIntervals: '',
  };
}

/**
 * Formats today's date as YYYY-MM-DD for date inputs.
 */
function todayInputDate(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Creates a blank New Service Level form with one empty unit row.
 */
export function createEmptyNewServiceLevelForm(): NewServiceLevelFormData {
  return {
    version: NEW_SERVICE_LEVEL_FORM_VERSION,
    documentNumber: 'OS007-47',
    revisionNumber: '00',
    requestedBy: '',
    quoteDoneBy: '',
    dateQuoteDone: '',
    repCode: '',
    customer: '',
    customerContactNo: '',
    customerEmail: '',
    durationOfContract: '',
    refurbsIncluded: '',
    unitTypes: [],
    unitQty: '',
    units: [createNewServiceLevelUnitLine()],
    siteSpecifics: '',
    additionalComments: '',
    notes: '',
    requestCompletedBy: '',
    dateCompleted: todayInputDate(),
    customerApprovalName: '',
    customerApprovalDate: '',
    customerApprovalDesignation: '',
    signatureDataUrl: null,
    signedAt: '',
  };
}

/**
 * Coerces an unknown value to a safe form string.
 */
function toFormString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

/**
 * Coerces an unknown value to a list of allowed option values.
 */
function toOptionArray(value: unknown, options: NewServiceLevelOption[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set(options.map((option) => option.value));
  return value.filter((entry): entry is string => typeof entry === 'string' && allowed.has(entry));
}

/**
 * Rehydrates a stored or partial New Service Level form into the current shape.
 */
export function normalizeNewServiceLevelForm(
  raw?: Partial<NewServiceLevelFormData> | null,
): NewServiceLevelFormData {
  const empty = createEmptyNewServiceLevelForm();
  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  const units = Array.isArray(raw.units)
    ? raw.units.map((line) => ({
        id: toFormString(line?.id) || createNewServiceLevelUnitId(),
        makeAndModel: toFormString(line?.makeAndModel),
        yearModel: toFormString(line?.yearModel),
        voltage: toFormString(line?.voltage),
        oilType: toFormString(line?.oilType),
        runningHours: toFormString(line?.runningHours),
        serviceIntervals: toFormString(line?.serviceIntervals),
      }))
    : [];

  return {
    version: toFormString(raw.version) || NEW_SERVICE_LEVEL_FORM_VERSION,
    documentNumber: toFormString(raw.documentNumber) || empty.documentNumber,
    revisionNumber: toFormString(raw.revisionNumber) || empty.revisionNumber,
    requestedBy: toFormString(raw.requestedBy),
    quoteDoneBy: toFormString(raw.quoteDoneBy),
    dateQuoteDone: toFormString(raw.dateQuoteDone),
    repCode: toFormString(raw.repCode),
    customer: toFormString(raw.customer),
    customerContactNo: toFormString(raw.customerContactNo),
    customerEmail: toFormString(raw.customerEmail),
    durationOfContract: toFormString(raw.durationOfContract),
    refurbsIncluded: toFormString(raw.refurbsIncluded),
    unitTypes: toOptionArray(raw.unitTypes, NEW_SERVICE_LEVEL_UNIT_TYPE_OPTIONS),
    unitQty: toFormString(raw.unitQty),
    units: units.length > 0 ? units : empty.units,
    siteSpecifics: toFormString(raw.siteSpecifics),
    additionalComments: toFormString(raw.additionalComments),
    notes: toFormString(raw.notes),
    requestCompletedBy: toFormString(raw.requestCompletedBy),
    dateCompleted: toFormString(raw.dateCompleted) || empty.dateCompleted,
    customerApprovalName: toFormString(raw.customerApprovalName),
    customerApprovalDate: toFormString(raw.customerApprovalDate),
    customerApprovalDesignation: toFormString(raw.customerApprovalDesignation),
    signatureDataUrl: typeof raw.signatureDataUrl === 'string' ? raw.signatureDataUrl : null,
    signedAt: toFormString(raw.signedAt),
  };
}

interface NewServiceLevelPrefillSource {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  repCode?: string;
  repName?: string;
}

/**
 * Prefills customer and request-by fields from the linked CRM appointment.
 * Existing captured values are never overwritten.
 */
export function prefillNewServiceLevelForm(
  form: NewServiceLevelFormData,
  source: NewServiceLevelPrefillSource,
): NewServiceLevelFormData {
  return {
    ...form,
    requestedBy: form.requestedBy || source.repName || '',
    repCode: form.repCode || source.repCode || '',
    customer: form.customer || source.companyName || '',
    customerContactNo: form.customerContactNo || source.contactPhone || '',
    customerEmail: form.customerEmail || source.contactEmail || '',
    requestCompletedBy: form.requestCompletedBy || source.repName || '',
    customerApprovalName: form.customerApprovalName || source.contactPerson || '',
  };
}

/**
 * Counts how many of the key New Service Level fields the rep has captured.
 */
export function getNewServiceLevelFormProgress(form: NewServiceLevelFormData): {
  filled: number;
  total: number;
} {
  const values = [
    form.requestedBy,
    form.customer,
    form.customerContactNo,
    form.durationOfContract,
    form.refurbsIncluded,
    form.unitTypes.length > 0 ? 'set' : '',
    form.units.some((line) => line.makeAndModel) ? 'set' : '',
    form.requestCompletedBy,
    form.customerApprovalName,
  ];

  return {
    filled: values.filter((value) => value.trim().length > 0).length,
    total: values.length,
  };
}

export interface NewServiceLevelSummaryRow {
  label: string;
  value: string;
}

export interface NewServiceLevelSummarySection {
  title: string;
  rows: NewServiceLevelSummaryRow[];
}

/**
 * Resolves selected option values back to their printed labels.
 */
function labelsFor(values: string[], options: NewServiceLevelOption[]): string {
  return values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label))
    .join(', ');
}

/**
 * Flattens a completed New Service Level form into printable History sections.
 */
export function summarizeNewServiceLevelForm(
  form: NewServiceLevelFormData,
): NewServiceLevelSummarySection[] {
  const sections: NewServiceLevelSummarySection[] = [
    {
      title: 'Request Details',
      rows: [
        { label: 'Document number', value: form.documentNumber },
        { label: 'Revision number', value: form.revisionNumber },
        { label: 'Requested by', value: form.requestedBy },
        { label: 'Quote done by', value: form.quoteDoneBy },
        { label: 'Date quote done', value: form.dateQuoteDone },
        { label: 'Rep code', value: form.repCode },
      ],
    },
    {
      title: 'Customer & Contract',
      rows: [
        { label: 'Customer', value: form.customer },
        { label: 'Customer contact no', value: form.customerContactNo },
        { label: 'Customer email', value: form.customerEmail },
        { label: 'Duration of contract', value: form.durationOfContract },
        {
          label: 'Refurbs included',
          value: labelsFor([form.refurbsIncluded], NEW_SERVICE_LEVEL_YES_NO_OPTIONS),
        },
        {
          label: 'Unit type',
          value: labelsFor(form.unitTypes, NEW_SERVICE_LEVEL_UNIT_TYPE_OPTIONS),
        },
        { label: 'Qty', value: form.unitQty },
      ],
    },
    {
      title: 'Site & Comments',
      rows: [
        { label: 'Site specifics', value: form.siteSpecifics },
        { label: 'Additional comments', value: form.additionalComments },
        { label: 'Notes', value: form.notes },
      ],
    },
    {
      title: 'Completion & Approval',
      rows: [
        { label: 'Request completed by', value: form.requestCompletedBy },
        { label: 'Date completed', value: form.dateCompleted },
        { label: 'Customer approval name', value: form.customerApprovalName },
        { label: 'Customer approval date', value: form.customerApprovalDate },
        { label: 'Designation', value: form.customerApprovalDesignation },
        { label: 'Signature', value: form.signatureDataUrl ? 'Captured' : '' },
      ],
    },
  ];

  const unitRows = form.units
    .filter((line) => line.makeAndModel || line.yearModel || line.voltage)
    .map((line, index) => ({
      label: `Unit ${index + 1}`,
      value: [
        line.makeAndModel,
        line.yearModel && `Year ${line.yearModel}`,
        line.voltage,
        line.oilType,
        line.runningHours && `Hours ${line.runningHours}`,
        line.serviceIntervals,
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  if (unitRows.length > 0) {
    sections.splice(2, 0, { title: 'Units', rows: unitRows });
  }

  return sections
    .map((section) => ({
      title: section.title,
      rows: section.rows.filter((row) => row.value.trim().length > 0),
    }))
    .filter((section) => section.rows.length > 0);
}
