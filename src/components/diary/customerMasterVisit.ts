/**
 * Customer-master autofill and the save-time update choice for a site visit.
 * The visit keeps its own snapshot. The customer record changes only when the rep asks.
 */

export interface CustomerMasterRecord {
  _id?: string;
  name?: string | null;
  address?: string | null;
  defaultContactPerson?: string | null;
  phone?: string | null;
  defaultWhatsAppNumber?: string | null;
  email?: string | null;
}

export interface CustomerMasterDetails {
  companyName: string;
  address: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
}

export type CustomerContactField = 'address' | 'contactPerson' | 'contactNumber' | 'email';

/** Undefined means the visit form does not contain that field. */
export type CapturedCustomerContact = Partial<Record<CustomerContactField, string>>;

export type CustomerMasterChoice = 'update' | 'visit-only';

/**
 * Collapses whitespace so spacing alone is not treated as a customer change.
 */
export function normalizeVisitText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Email comparison matches the customer schema, which stores addresses in lowercase.
 */
export function normalizeVisitEmail(value: unknown): string {
  return normalizeVisitText(value).toLowerCase();
}

/**
 * Maps the existing customer document onto the visit contact fields.
 */
export function customerMasterFromRecord(
  customer: CustomerMasterRecord | null | undefined,
): CustomerMasterDetails {
  const phone = normalizeVisitText(customer?.phone);
  const whatsApp = normalizeVisitText(customer?.defaultWhatsAppNumber);
  return {
    companyName: normalizeVisitText(customer?.name),
    address: normalizeVisitText(customer?.address),
    contactPerson: normalizeVisitText(customer?.defaultContactPerson),
    contactNumber: phone || whatsApp,
    email: normalizeVisitEmail(customer?.email),
  };
}

/**
 * Finds the customer whose name matches exactly. Partial names are not used.
 */
export function findExactCustomer<T extends { name?: string | null }>(
  customers: T[],
  companyName: string,
): T | null {
  const wanted = normalizeVisitText(companyName).toLowerCase();
  if (!wanted) return null;
  return (
    customers.find((customer) => normalizeVisitText(customer.name).toLowerCase() === wanted) ||
    null
  );
}

/**
 * Returns the contact fields on this visit that differ from the customer master.
 * Fields the form does not contain are ignored, so a missing address cannot wipe the profile.
 */
export function changedCustomerMasterFields(
  captured: CapturedCustomerContact,
  master: CustomerMasterDetails,
): CustomerContactField[] {
  const fields: CustomerContactField[] = [
    'address',
    'contactPerson',
    'contactNumber',
    'email',
  ];
  return fields.filter((field) => {
    if (captured[field] === undefined) return false;
    const current = field === 'email' ? normalizeVisitEmail(captured[field]) : normalizeVisitText(captured[field]);
    const saved = field === 'email' ? normalizeVisitEmail(master[field]) : normalizeVisitText(master[field]);
    return current !== saved;
  });
}

/**
 * Payload for the existing customer update. Only fields present on the visit are sent.
 */
export function customerMasterUpdatePayload(
  captured: CapturedCustomerContact,
): {
  address?: string;
  defaultContactPerson?: string;
  phone?: string;
  email?: string;
} {
  const payload: {
    address?: string;
    defaultContactPerson?: string;
    phone?: string;
    email?: string;
  } = {};
  if (captured.address !== undefined) payload.address = normalizeVisitText(captured.address);
  if (captured.contactPerson !== undefined) {
    payload.defaultContactPerson = normalizeVisitText(captured.contactPerson);
  }
  if (captured.contactNumber !== undefined) payload.phone = normalizeVisitText(captured.contactNumber);
  if (captured.email !== undefined) payload.email = normalizeVisitEmail(captured.email);
  return payload;
}

/**
 * Location written onto a newly selected customer. An empty address clears the previous customer.
 */
export function locationForSelectedCustomer(address?: string | null): string {
  return normalizeVisitText(address);
}
