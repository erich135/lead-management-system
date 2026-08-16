/**
 * Digital version of the Air Rotory Services "Loan and Rental Request"
 * sheet (OS007-35, Revision 0). Field names and option lists are taken
 * from the printed template so a completed digital form can be checked
 * against the paper original.
 */

export const LOAN_RENTAL_FORM_VERSION = 'OS007-35-REV0';

export interface LoanRentalOption {
  value: string;
  label: string;
}

/** Daily application tick options from the printed request sheet. */
export const LOAN_RENTAL_DAILY_APPLICATION_OPTIONS: LoanRentalOption[] = [
  { value: '9h_5d', label: '9H/5D' },
  { value: '9h_7d', label: '9H/7D' },
  { value: '24h_5d', label: '24H/5D' },
  { value: '24h_7d', label: '24H/7D' },
  { value: '8h_5d', label: '8H/5D' },
  { value: '8h_7d', label: '8H/7D' },
  { value: '12h_5d', label: '12H/5D' },
  { value: '12h_7d', label: '12H/7D' },
];

/** Yes / No answers used for site-specific tick questions. */
export const LOAN_RENTAL_YES_NO_OPTIONS: LoanRentalOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export interface LoanRentalUnitLine {
  id: string;
  unitDescription: string;
  qty: string;
  rentalDuration: string;
  unitSize: string;
  assetNumber: string;
}

export interface LoanRentalAuxiliaryLine {
  id: string;
  description: string;
  qty: string;
  size: string;
  assetNumber: string;
}

export interface LoanRentalHeader {
  documentNumber: string;
  effectiveFrom: string;
  revisionNumber: string;
  requestBy: string;
  quoteDoneBy: string;
  dateQuoteDone: string;
}

export interface LoanRentalCustomer {
  customer: string;
  clientOrderNumber: string;
  deliveryNote: string;
  jobQuoteRefNumber: string;
  repCode: string;
  branch: string;
  contactNumber: string;
  customerName: string;
  emailAddress: string;
}

export interface LoanRentalRequestDetails {
  durationOfRental: string;
  dailyApplication: string[];
  unitSize: string;
  unitVoltage: string;
}

export interface LoanRentalSiteSpecifics {
  loadingOffLoadingFacilities: string;
  forkliftAvailability: string;
  craneTruckAccessibility: string;
  siteSupplyVoltage: string;
  unitSafetyRequirements: string;
  vesselPressureTestCertificate: string;
  unitServiceRecords: string;
  additionalComments: string;
}

export interface LoanRentalOffice {
  requestCompletedBy: string;
  dateCompleted: string;
  approvedBy: string;
  dateApproved: string;
  procurementBookInDate: string;
  bookedInBy: string;
  procurementDate: string;
  quotedDeliveryTime: string;
  dateOrderReceived: string;
  deliveryNoteDate: string;
  signatureDataUrl: string | null;
  signedAt: string;
}

export interface LoanRentalFormData {
  version: string;
  header: LoanRentalHeader;
  customer: LoanRentalCustomer;
  request: LoanRentalRequestDetails;
  units: LoanRentalUnitLine[];
  auxiliaries: LoanRentalAuxiliaryLine[];
  site: LoanRentalSiteSpecifics;
  notes: string;
  office: LoanRentalOffice;
}

/**
 * Generates a stable identifier for a dynamic table row.
 */
export function createLoanRentalLineId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates an empty unit row for the request sheet.
 */
export function createLoanRentalUnitLine(): LoanRentalUnitLine {
  return {
    id: createLoanRentalLineId('unit'),
    unitDescription: '',
    qty: '',
    rentalDuration: '',
    unitSize: '',
    assetNumber: '',
  };
}

/**
 * Creates an empty auxiliary equipment row.
 */
export function createLoanRentalAuxiliaryLine(): LoanRentalAuxiliaryLine {
  return {
    id: createLoanRentalLineId('aux'),
    description: '',
    qty: '',
    size: '',
    assetNumber: '',
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
 * Creates a blank Loan & Rental request form with one empty unit and
 * auxiliary row, matching OS007-35 defaults.
 */
export function createEmptyLoanRentalForm(): LoanRentalFormData {
  const today = todayInputDate();

  return {
    version: LOAN_RENTAL_FORM_VERSION,
    header: {
      documentNumber: 'OS007-35',
      effectiveFrom: today,
      revisionNumber: '0',
      requestBy: '',
      quoteDoneBy: '',
      dateQuoteDone: '',
    },
    customer: {
      customer: '',
      clientOrderNumber: '',
      deliveryNote: '',
      jobQuoteRefNumber: '',
      repCode: '',
      branch: '',
      contactNumber: '',
      customerName: '',
      emailAddress: '',
    },
    request: {
      durationOfRental: '',
      dailyApplication: [],
      unitSize: '',
      unitVoltage: '',
    },
    units: [createLoanRentalUnitLine()],
    auxiliaries: [createLoanRentalAuxiliaryLine()],
    site: {
      loadingOffLoadingFacilities: '',
      forkliftAvailability: '',
      craneTruckAccessibility: '',
      siteSupplyVoltage: '',
      unitSafetyRequirements: '',
      vesselPressureTestCertificate: '',
      unitServiceRecords: '',
      additionalComments: '',
    },
    notes: '',
    office: {
      requestCompletedBy: '',
      dateCompleted: '',
      approvedBy: '',
      dateApproved: '',
      procurementBookInDate: '',
      bookedInBy: '',
      procurementDate: '',
      quotedDeliveryTime: '',
      dateOrderReceived: '',
      deliveryNoteDate: '',
      signatureDataUrl: null,
      signedAt: '',
    },
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
function toOptionArray(value: unknown, options: LoanRentalOption[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set(options.map((option) => option.value));
  return value.filter((entry): entry is string => typeof entry === 'string' && allowed.has(entry));
}

/**
 * Rehydrates a stored or partial Loan & Rental form into the current shape.
 */
export function normalizeLoanRentalForm(
  raw?: Partial<LoanRentalFormData> | null,
): LoanRentalFormData {
  const empty = createEmptyLoanRentalForm();
  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  const units = Array.isArray(raw.units)
    ? raw.units.map((line) => ({
        id: toFormString(line?.id) || createLoanRentalLineId('unit'),
        unitDescription: toFormString(line?.unitDescription),
        qty: toFormString(line?.qty),
        rentalDuration: toFormString(line?.rentalDuration),
        unitSize: toFormString(line?.unitSize),
        assetNumber: toFormString(line?.assetNumber),
      }))
    : [];

  const auxiliaries = Array.isArray(raw.auxiliaries)
    ? raw.auxiliaries.map((line) => ({
        id: toFormString(line?.id) || createLoanRentalLineId('aux'),
        description: toFormString(line?.description),
        qty: toFormString(line?.qty),
        size: toFormString(line?.size),
        assetNumber: toFormString(line?.assetNumber),
      }))
    : [];

  return {
    version: toFormString(raw.version) || LOAN_RENTAL_FORM_VERSION,
    header: {
      documentNumber: toFormString(raw.header?.documentNumber) || empty.header.documentNumber,
      effectiveFrom: toFormString(raw.header?.effectiveFrom) || empty.header.effectiveFrom,
      revisionNumber: toFormString(raw.header?.revisionNumber) || empty.header.revisionNumber,
      requestBy: toFormString(raw.header?.requestBy),
      quoteDoneBy: toFormString(raw.header?.quoteDoneBy),
      dateQuoteDone: toFormString(raw.header?.dateQuoteDone),
    },
    customer: {
      customer: toFormString(raw.customer?.customer),
      clientOrderNumber: toFormString(raw.customer?.clientOrderNumber),
      deliveryNote: toFormString(raw.customer?.deliveryNote),
      jobQuoteRefNumber: toFormString(raw.customer?.jobQuoteRefNumber),
      repCode: toFormString(raw.customer?.repCode),
      branch: toFormString(raw.customer?.branch),
      contactNumber: toFormString(raw.customer?.contactNumber),
      customerName: toFormString(raw.customer?.customerName),
      emailAddress: toFormString(raw.customer?.emailAddress),
    },
    request: {
      durationOfRental: toFormString(raw.request?.durationOfRental),
      dailyApplication: toOptionArray(
        raw.request?.dailyApplication,
        LOAN_RENTAL_DAILY_APPLICATION_OPTIONS,
      ),
      unitSize: toFormString(raw.request?.unitSize),
      unitVoltage: toFormString(raw.request?.unitVoltage),
    },
    units: units.length > 0 ? units : empty.units,
    auxiliaries: auxiliaries.length > 0 ? auxiliaries : empty.auxiliaries,
    site: {
      loadingOffLoadingFacilities: toFormString(raw.site?.loadingOffLoadingFacilities),
      forkliftAvailability: toFormString(raw.site?.forkliftAvailability),
      craneTruckAccessibility: toFormString(raw.site?.craneTruckAccessibility),
      siteSupplyVoltage: toFormString(raw.site?.siteSupplyVoltage),
      unitSafetyRequirements: toFormString(raw.site?.unitSafetyRequirements),
      vesselPressureTestCertificate: toFormString(raw.site?.vesselPressureTestCertificate),
      unitServiceRecords: toFormString(raw.site?.unitServiceRecords),
      additionalComments: toFormString(raw.site?.additionalComments),
    },
    notes: toFormString(raw.notes),
    office: {
      requestCompletedBy: toFormString(raw.office?.requestCompletedBy),
      dateCompleted: toFormString(raw.office?.dateCompleted),
      approvedBy: toFormString(raw.office?.approvedBy),
      dateApproved: toFormString(raw.office?.dateApproved),
      procurementBookInDate: toFormString(raw.office?.procurementBookInDate),
      bookedInBy: toFormString(raw.office?.bookedInBy),
      procurementDate: toFormString(raw.office?.procurementDate),
      quotedDeliveryTime: toFormString(raw.office?.quotedDeliveryTime),
      dateOrderReceived: toFormString(raw.office?.dateOrderReceived),
      deliveryNoteDate: toFormString(raw.office?.deliveryNoteDate),
      signatureDataUrl:
        typeof raw.office?.signatureDataUrl === 'string' ? raw.office.signatureDataUrl : null,
      signedAt: toFormString(raw.office?.signedAt),
    },
  };
}

interface LoanRentalPrefillSource {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  repCode?: string;
  repName?: string;
  branchName?: string;
}

/**
 * Prefills customer and request-by fields from the linked CRM appointment.
 * Existing captured values are never overwritten.
 */
export function prefillLoanRentalForm(
  form: LoanRentalFormData,
  source: LoanRentalPrefillSource,
): LoanRentalFormData {
  return {
    ...form,
    header: {
      ...form.header,
      requestBy: form.header.requestBy || source.repName || '',
    },
    customer: {
      ...form.customer,
      customer: form.customer.customer || source.companyName || '',
      customerName: form.customer.customerName || source.contactPerson || '',
      contactNumber: form.customer.contactNumber || source.contactPhone || '',
      emailAddress: form.customer.emailAddress || source.contactEmail || '',
      repCode: form.customer.repCode || source.repCode || '',
      branch: form.customer.branch || source.branchName || '',
    },
    office: {
      ...form.office,
      requestCompletedBy: form.office.requestCompletedBy || source.repName || '',
    },
  };
}

/**
 * Counts how many of the key Loan & Rental fields the rep has captured.
 */
export function getLoanRentalFormProgress(form: LoanRentalFormData): {
  filled: number;
  total: number;
} {
  const textValues = [
    form.customer.customer,
    form.customer.contactNumber,
    form.customer.customerName,
    form.request.durationOfRental,
    form.request.unitSize,
    form.request.unitVoltage,
    form.header.requestBy,
    form.office.requestCompletedBy,
  ];

  const groupValues = [
    form.request.dailyApplication.length > 0 ? 'set' : '',
    form.units.some((line) => line.unitDescription || line.qty) ? 'set' : '',
    form.site.additionalComments || form.site.siteSupplyVoltage ? 'set' : '',
  ];

  const all = [...textValues, ...groupValues];
  return {
    filled: all.filter((value) => value.trim().length > 0).length,
    total: all.length,
  };
}

export interface LoanRentalSummaryRow {
  label: string;
  value: string;
}

export interface LoanRentalSummarySection {
  title: string;
  rows: LoanRentalSummaryRow[];
}

/**
 * Resolves selected option values back to their printed labels.
 */
function labelsFor(values: string[], options: LoanRentalOption[]): string {
  return values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label))
    .join(', ');
}

/**
 * Flattens a completed Loan & Rental form into printable History sections.
 */
export function summarizeLoanRentalForm(form: LoanRentalFormData): LoanRentalSummarySection[] {
  const sections: LoanRentalSummarySection[] = [
    {
      title: 'Request Header',
      rows: [
        { label: 'Document number', value: form.header.documentNumber },
        { label: 'Effective from', value: form.header.effectiveFrom },
        { label: 'Revision number', value: form.header.revisionNumber },
        { label: 'Request by', value: form.header.requestBy },
        { label: 'Quote done by', value: form.header.quoteDoneBy },
        { label: 'Date quote done', value: form.header.dateQuoteDone },
      ],
    },
    {
      title: 'Customer',
      rows: [
        { label: 'Customer', value: form.customer.customer },
        { label: 'Client order number', value: form.customer.clientOrderNumber },
        { label: 'Delivery note', value: form.customer.deliveryNote },
        { label: 'Job / quote / ref number', value: form.customer.jobQuoteRefNumber },
        { label: 'Rep code', value: form.customer.repCode },
        { label: 'Branch', value: form.customer.branch },
        { label: 'Customer contact no', value: form.customer.contactNumber },
        { label: 'Customer name', value: form.customer.customerName },
        { label: 'Customer email address', value: form.customer.emailAddress },
      ],
    },
    {
      title: 'Request Details',
      rows: [
        { label: 'Duration of rental', value: form.request.durationOfRental },
        {
          label: 'Daily application',
          value: labelsFor(form.request.dailyApplication, LOAN_RENTAL_DAILY_APPLICATION_OPTIONS),
        },
        { label: 'Unit size', value: form.request.unitSize },
        { label: 'Unit voltage', value: form.request.unitVoltage },
      ],
    },
    {
      title: 'Site Specifics',
      rows: [
        {
          label: 'Loading / off loading facilities',
          value: labelsFor([form.site.loadingOffLoadingFacilities], LOAN_RENTAL_YES_NO_OPTIONS),
        },
        {
          label: 'Forklift availability',
          value: labelsFor([form.site.forkliftAvailability], LOAN_RENTAL_YES_NO_OPTIONS),
        },
        {
          label: 'Crane truck accessibility',
          value: labelsFor([form.site.craneTruckAccessibility], LOAN_RENTAL_YES_NO_OPTIONS),
        },
        { label: 'Site supply voltage', value: form.site.siteSupplyVoltage },
        { label: 'Unit safety requirements', value: form.site.unitSafetyRequirements },
        {
          label: 'Vessel pressure test certificate',
          value: labelsFor([form.site.vesselPressureTestCertificate], LOAN_RENTAL_YES_NO_OPTIONS),
        },
        {
          label: 'Unit service records',
          value: labelsFor([form.site.unitServiceRecords], LOAN_RENTAL_YES_NO_OPTIONS),
        },
        { label: 'Additional comments', value: form.site.additionalComments },
      ],
    },
    {
      title: 'Notes',
      rows: [{ label: 'Notes', value: form.notes }],
    },
    {
      title: 'Office Use',
      rows: [
        { label: 'Request completed by', value: form.office.requestCompletedBy },
        { label: 'Date completed', value: form.office.dateCompleted },
        { label: 'Approved by', value: form.office.approvedBy },
        { label: 'Date approved', value: form.office.dateApproved },
        { label: 'Procurement book in date', value: form.office.procurementBookInDate },
        { label: 'Booked in by', value: form.office.bookedInBy },
        { label: 'Procurement date', value: form.office.procurementDate },
        { label: 'Quoted delivery time', value: form.office.quotedDeliveryTime },
        { label: 'Date order received', value: form.office.dateOrderReceived },
        { label: 'Delivery note date', value: form.office.deliveryNoteDate },
        { label: 'Signature', value: form.office.signatureDataUrl ? 'Captured' : '' },
      ],
    },
  ];

  const unitRows = form.units
    .filter((line) => line.unitDescription || line.qty || line.assetNumber)
    .map((line, index) => ({
      label: `Unit ${index + 1}`,
      value: [
        line.unitDescription,
        line.qty && `Qty ${line.qty}`,
        line.rentalDuration,
        line.unitSize,
        line.assetNumber && `Asset ${line.assetNumber}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  if (unitRows.length > 0) {
    sections.splice(3, 0, { title: 'Units', rows: unitRows });
  }

  const auxRows = form.auxiliaries
    .filter((line) => line.description || line.qty || line.assetNumber)
    .map((line, index) => ({
      label: `Auxiliary ${index + 1}`,
      value: [
        line.description,
        line.qty && `Qty ${line.qty}`,
        line.size,
        line.assetNumber && `Asset ${line.assetNumber}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }));

  if (auxRows.length > 0) {
    sections.splice(unitRows.length > 0 ? 4 : 3, 0, {
      title: 'Auxiliary Equipment',
      rows: auxRows,
    });
  }

  return sections
    .map((section) => ({
      title: section.title,
      rows: section.rows.filter((row) => row.value.trim().length > 0),
    }))
    .filter((section) => section.rows.length > 0);
}
