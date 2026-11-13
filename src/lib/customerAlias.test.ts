import { describe, expect, it } from 'vitest';
import {
  customerMatchesAliasSearch,
  customerSearchLabel,
  matchingTradingName,
  normalizeCustomerAlias,
} from './customerAlias';

const customer = {
  name: 'Main Street t/a Twinsaver',
  aliases: [{ alias: 'Twin Saver', normalized: 'twinsaver' }],
};

describe('office customer trading names', () => {
  it('matches Twin Saver and Twinsaver to the same trading name', () => {
    expect(normalizeCustomerAlias('Twin Saver')).toBe('twinsaver');
    expect(normalizeCustomerAlias('Twinsaver')).toBe(normalizeCustomerAlias('twin-saver'));
    expect(matchingTradingName(customer, 'Twinsaver')).toBe('Twin Saver');
    expect(customerMatchesAliasSearch(customer, 'Twin Saver')).toBe(true);
    expect(customerSearchLabel({ name: customer.name, matchedAlias: 'Twin Saver' })).toBe('Main Street t/a Twinsaver — Twin Saver');
  });

  it('still matches the registered name and leaves an empty search unfiltered', () => {
    expect(customerMatchesAliasSearch(customer, 'Main Street')).toBe(true);
    expect(customerMatchesAliasSearch(customer, '')).toBe(true);
    expect(customerSearchLabel({ name: customer.name })).toBe(customer.name);
  });
});
