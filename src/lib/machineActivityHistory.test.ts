import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import {
  buildCanonicalMachineHistoryEndpoint,
  canonicalHistoryMachineId,
  isCurrentMachineHistoryRequest,
  machineHistoryProvenanceText,
  mergeMachineHistoryPages,
} from './machineActivityHistory.ts';

test('builds the canonical-history request with one selected section and pagination', () => {
  assert.equal(
    buildCanonicalMachineHistoryEndpoint('machine id', 'activities', 2, 25),
    '/api/machines/machine%20id/canonical-history?section=activities&page=2&limit=25',
  );
});

test('unwraps the real canonical-history backend envelope through apiRequest', async () => {
  const history = {
    requestedMachineId: 'retired-machine',
    canonicalMachineId: 'canonical-machine',
    resolvedFromRetired: true,
    groupIdentities: [],
    section: 'activities' as const,
    records: [{
      id: 'activity-1',
      type: 'activity',
      occurredAt: '2026-07-27T00:00:00.000Z',
      record: { action: 'repair' },
      provenance: { machineIds: ['retired-machine'] },
    }],
    pagination: { page: 1, limit: 25, total: 1, hasMore: false },
  };
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
  });
  globalThis.fetch = (async () => new Response(JSON.stringify({ success: true, data: history }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });

  try {
    const api = await server.ssrLoadModule('/src/lib/api.ts') as typeof import('./api.ts');
    const result = await api.getCanonicalMachineHistory('retired-machine', { section: 'activities', page: 1, limit: 25 });
    const legacyResponse = result as unknown as { data?: { records: unknown[] } };

    assert.deepEqual(result, history);
    assert.deepEqual(result.records, history.records);
    assert.equal(legacyResponse.data, undefined);
    assert.throws(() => legacyResponse.data!.records, TypeError);
  } finally {
    await server.close();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage });
  }
});

test('preserves backend order while merging pages without duplicate record IDs', () => {
  const firstPage = [{ id: 'newest' }, { id: 'shared' }];
  const secondPage = [{ id: 'shared' }, { id: 'older' }];
  assert.deepEqual(
    mergeMachineHistoryPages(firstPage, secondPage, false),
    [{ id: 'newest' }, { id: 'shared' }, { id: 'older' }],
  );
});

test('replaces section state when the viewed machine or active section changes', () => {
  assert.deepEqual(
    mergeMachineHistoryPages([{ id: 'old-machine-activity' }], [{ id: 'new-machine-job' }], true),
    [{ id: 'new-machine-job' }],
  );
});

test('accepts only the newest machine-history request result', () => {
  assert.equal(isCurrentMachineHistoryRequest(4, 4), true);
  assert.equal(isCurrentMachineHistoryRequest(3, 4), false);
});

test('uses the confirmed canonical target and user-facing provenance labels', () => {
  assert.equal(canonicalHistoryMachineId('retired', 'canonical'), 'canonical');
  assert.equal(canonicalHistoryMachineId('canonical'), 'canonical');
  assert.equal(
    machineHistoryProvenanceText(
      ['retired'],
      [{ _id: 'retired', make: 'Atlas', model: 'Copco', assetNumber: 'A-100' }],
    ),
    'Originally recorded against Atlas Copco (A-100).',
  );
  assert.equal(machineHistoryProvenanceText(undefined, []), null);
});
