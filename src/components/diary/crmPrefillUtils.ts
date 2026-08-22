/**
 * Helpers to pull the best saved company / contact details for diary RFC prefills.
 */

export interface CrmContactLike {
  _id?: string;
  companyName?: string | null;
  name?: string | null;
  contactPerson?: string | null;
  defaultContactPerson?: string | null;
  contactPhone?: string | null;
  phone?: string | null;
  defaultWhatsAppNumber?: string | null;
  contactEmail?: string | null;
  email?: string | null;
  contactAddress?: string | null;
  address?: string | null;
  updatedAt?: string | null;
}

export interface ResolvedCrmContact {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
}

/**
 * Returns true when a phone value is usable (not blank / Pending).
 */
export function isUsableCrmPhone(phone?: string | null): boolean {
  const value = (phone || '').trim();
  if (!value) return false;
  return value.toLowerCase() !== 'pending';
}

/**
 * Returns true when contact person is a real person name, not just the company again.
 */
export function isUsableCrmContactPerson(
  contactPerson?: string | null,
  companyName?: string | null,
): boolean {
  const contact = (contactPerson || '').trim();
  if (!contact) return false;
  const company = (companyName || '').trim();
  if (!company) return true;
  return contact.toLowerCase() !== company.toLowerCase();
}

/**
 * Scores how complete a CRM record is for RFC prefill.
 */
export function scoreCrmContactRecord(
  record: CrmContactLike,
  preferredCompanyName?: string,
): number {
  const company = (record.companyName || record.name || '').trim();
  const preferred = (preferredCompanyName || '').trim().toLowerCase();
  let score = 0;

  if (preferred && company.toLowerCase() === preferred) {
    score += 20;
  } else if (
    preferred &&
    (company.toLowerCase().includes(preferred) ||
      preferred.includes(company.toLowerCase()))
  ) {
    score += 8;
  }

  if (isUsableCrmContactPerson(record.contactPerson || record.defaultContactPerson, company)) {
    score += 8;
  }
  if (
    isUsableCrmPhone(
      record.contactPhone || record.phone || record.defaultWhatsAppNumber,
    )
  ) {
    score += 10;
  }
  if ((record.contactEmail || record.email || '').trim()) {
    score += 5;
  }
  if ((record.contactAddress || record.address || '').trim()) {
    score += 3;
  }
  return score;
}

/**
 * Picks the CRM record with the richest contact details for a company.
 */
export function pickBestCrmContactRecord<T extends CrmContactLike>(
  records: T[],
  preferredCompanyName?: string,
): T | null {
  if (!records.length) return null;
  let best: T | null = null;
  let bestScore = -1;
  for (const record of records) {
    const score = scoreCrmContactRecord(record, preferredCompanyName);
    if (score > bestScore) {
      best = record;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Normalizes mixed Customer / SalesLead shapes into one CRM prefill payload.
 */
export function resolveCrmContactFields(
  record: CrmContactLike | null | undefined,
  fallbackCompanyName?: string,
): ResolvedCrmContact {
  if (!record) {
    return {
      companyName: (fallbackCompanyName || '').trim() || undefined,
    };
  }

  const companyName =
    (record.companyName || record.name || fallbackCompanyName || '').trim() ||
    undefined;
  const contactPersonRaw = (
    record.contactPerson ||
    record.defaultContactPerson ||
    ''
  ).trim();
  const contactPerson = isUsableCrmContactPerson(contactPersonRaw, companyName)
    ? contactPersonRaw
    : undefined;
  const contactPhoneRaw = (
    record.contactPhone ||
    record.phone ||
    record.defaultWhatsAppNumber ||
    ''
  ).trim();
  const contactPhone = isUsableCrmPhone(contactPhoneRaw)
    ? contactPhoneRaw
    : undefined;
  const contactEmail = (record.contactEmail || record.email || '').trim() || undefined;
  const contactAddress =
    (record.contactAddress || record.address || '').trim() || undefined;

  return {
    companyName,
    contactPerson,
    contactPhone,
    contactEmail,
    contactAddress,
  };
}

/**
 * Merges CRM sources, keeping the first usable value for each field.
 */
export function mergeCrmContactFields(
  ...sources: Array<ResolvedCrmContact | null | undefined>
): ResolvedCrmContact {
  const merged: ResolvedCrmContact = {};
  for (const source of sources) {
    if (!source) continue;
    if (!merged.companyName && source.companyName) {
      merged.companyName = source.companyName;
    }
    if (!merged.contactPerson && source.contactPerson) {
      merged.contactPerson = source.contactPerson;
    }
    if (!merged.contactPhone && source.contactPhone) {
      merged.contactPhone = source.contactPhone;
    }
    if (!merged.contactEmail && source.contactEmail) {
      merged.contactEmail = source.contactEmail;
    }
    if (!merged.contactAddress && source.contactAddress) {
      merged.contactAddress = source.contactAddress;
    }
  }
  return merged;
}
