import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  canConfirmMapPin,
  confirmedPinAddress,
  GOOGLE_LOOKUP_UNAVAILABLE,
  googleLookupUserMessage,
  GOOGLE_LOOKUP_USER_MESSAGE,
  isGoogleLookupUnavailableError,
  pinFromPlaceDetails,
  pinFromReverse,
  pinFromSearchResult,
} from './googleAddressLookup.ts';

test('maps a South African Google Place selection onto pin coordinates', () => {
  const pin = pinFromPlaceDetails({
    displayName: '96 Craig Rd, Anderbolt, Boksburg, 1459, South Africa',
    lat: '-26.1968',
    lon: '28.2594',
  });
  assert.deepEqual(pin, {
    latitude: -26.1968,
    longitude: 28.2594,
    address: '96 Craig Rd, Anderbolt, Boksburg, 1459, South Africa',
  });
});

test('maps a pin search result from Google Geocoding', () => {
  const pin = pinFromSearchResult({
    display_name: '8 Tokai Rd, Freeway Park, Boksburg, 1459, South Africa',
    lat: '-26.241512',
    lon: '28.239148',
  });
  assert.equal(pin?.address.includes('Tokai'), true);
  assert.equal(pin?.address.includes('Boksburg'), true);
  assert.equal(pin?.latitude, -26.241512);
  assert.equal(pin?.longitude, 28.239148);
});

test('reverse lookup of GPS coordinates rejects coordinate-only labels', () => {
  const good = pinFromReverse({
    display_name: '8 Tokai Rd, Freeway Park, Boksburg, 1459, South Africa',
    lat: '-26.241512',
    lon: '28.239148',
  });
  assert.equal(good?.address.includes('Freeway Park'), true);
  assert.equal(
    pinFromReverse({
      display_name: '-26.241512, 28.239148',
      lat: '-26.241512',
      lon: '28.239148',
    }),
    null,
  );
});

test('Google provider failure keeps Confirm off until a typed address is available', () => {
  const noKey = Object.assign(new Error(GOOGLE_LOOKUP_UNAVAILABLE), { reason: 'no_key' });
  assert.equal(isGoogleLookupUnavailableError(noKey), true);
  assert.equal(googleLookupUserMessage(noKey), GOOGLE_LOOKUP_USER_MESSAGE);
  assert.equal(
    isGoogleLookupUnavailableError(new Error(GOOGLE_LOOKUP_UNAVAILABLE)),
    true,
  );
  assert.equal(
    canConfirmMapPin({
      pin: [-26.241512, 28.239148],
      reversing: false,
      googleAddress: null,
      typedAddress: '',
    }),
    false,
  );
  assert.equal(
    canConfirmMapPin({
      pin: [-26.241512, 28.239148],
      reversing: false,
      googleAddress: null,
      typedAddress: '8 Tokai Road, Freeway Park, Boksburg',
    }),
    true,
  );
  assert.equal(
    confirmedPinAddress(null, '8 Tokai Road, Freeway Park, Boksburg'),
    '8 Tokai Road, Freeway Park, Boksburg',
  );
  assert.equal(
    canConfirmMapPin({
      pin: [-26.1968, 28.2594],
      reversing: false,
      googleAddress: '96 Craig Rd, Anderbolt, Boksburg, 1459, South Africa',
      typedAddress: '',
    }),
    true,
  );
});

test('frontend source does not contain a Google API key', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const skip = new Set(['node_modules', 'dist', 'build', '.git']);
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs|env|json)$/.test(entry.name)) files.push(full);
    }
  }
  walk(root);

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /AIza[0-9A-Za-z_-]{20,}/, file);
    assert.doesNotMatch(text, /GOOGLE_(?:MAPS|PLACES)_API_KEY\s*=\s*['"][^'"]+['"]/, file);
  }
});
