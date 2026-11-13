export interface CustomerTradingName {
  alias: string;
  normalized?: string;
  addedBy?: string;
  addedAt?: string;
}

export function normalizeCustomerAlias(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function matchingTradingName(
  customer: { aliases?: CustomerTradingName[] },
  search: string,
): string | undefined {
  const normalized = normalizeCustomerAlias(search);
  if (!normalized) return undefined;
  return customer.aliases?.find((alias) => (alias.normalized || normalizeCustomerAlias(alias.alias)).includes(normalized))?.alias;
}

export function customerSearchLabel(customer: { name: string; matchedAlias?: string }): string {
  return customer.matchedAlias ? `${customer.name} — ${customer.matchedAlias}` : customer.name;
}

export function customerMatchesAliasSearch(
  customer: { name: string; aliases?: CustomerTradingName[] },
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  if (customer.name.toLowerCase().includes(term)) return true;
  return Boolean(matchingTradingName(customer, search));
}
