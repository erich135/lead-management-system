/**
 * What ARS can tell the wizard about a customer and its sites.
 *
 * The customer comes from the ARS customer register, and what is stored is the
 * identifier — the name is only what is shown.
 *
 * The site is harder, and worth being plain about: ARS has no site register.
 * What it does hold is the customer's address and the locations recorded
 * against that customer's machines, so those are what the site list offers. A
 * site that is not among them is typed, and is stored as a name with no
 * identifier, because inventing one would make a typed string look like a
 * record that exists somewhere.
 */

import type { Machine } from '../../../lib/api';

/** The questions the selectors answer, which are therefore never shown as boxes. */
export const CUSTOMER_SITE_SELECTOR_CODES = [
  'AUDIT.IDENTITY.CUSTOMER_ID',
  'AUDIT.IDENTITY.CUSTOMER_NAME',
  'AUDIT.IDENTITY.SITE_NAME',
  'AUDIT.IDENTITY.SITE_ID',
  'AUDIT.IDENTITY.PHYSICAL_ADDRESS',
];

export interface ChosenCustomer {
  customerId: string;
  customerName: string;
  address: string | null;
}

export type SiteOrigin =
  | 'customer_address'
  | 'machine_location'
  | 'typed_for_this_proposal';

export interface ChosenSite {
  siteId: string | null;
  siteName: string;
  address: string | null;
  origin: SiteOrigin;
}

/** A site the ARS record actually evidences, and where it came from. */
export interface SiteCandidate {
  siteName: string;
  address: string | null;
  origin: 'customer_address' | 'machine_location';
}

const SITE_ORIGIN_STATEMENTS: Record<SiteOrigin, string> = {
  customer_address: 'From the ARS customer address',
  machine_location: 'From a machine location on the ARS register',
  typed_for_this_proposal: 'Typed for this proposal',
};

/**
 * How a site came to be on this proposal, said plainly.
 *
 * The site is the one thing on this screen ARS cannot vouch for, so where it
 * came from is stated rather than left for a reader to assume.
 */
export function siteOriginStatement(origin: SiteOrigin): string {
  return SITE_ORIGIN_STATEMENTS[origin];
}

/**
 * What the "Site record" question is answered with.
 *
 * ARS holds no site register, so there is no identifier to link to and none is
 * invented. The question is answered "not listed" — a real answer that says the
 * record does not exist — rather than being left as an empty box that reads as
 * work somebody forgot to do.
 */
export const NO_FORMAL_SITE_RECORD = 'No formal ARS site record';

export function siteCandidates(
  customer: ChosenCustomer,
  machines: readonly Machine[],
): SiteCandidate[] {
  const found = new Map<string, SiteCandidate>();
  const address = customer.address?.trim() ?? '';
  if (address !== '')
    found.set(address.toLowerCase(), {
      siteName: address,
      address,
      origin: 'customer_address',
    });
  for (const machine of machines) {
    const location = machine.currentLocation?.trim() ?? '';
    if (location === '') continue;
    const key = location.toLowerCase();
    if (found.has(key)) continue;
    found.set(key, { siteName: location, address: null, origin: 'machine_location' });
  }
  return [...found.values()];
}
