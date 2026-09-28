import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UPDATE_CHECK_MS,
  UPDATE_PROTOCOL,
  beginControlledReload,
  clearReloadGuard,
  isChunkLoadError,
  isQuotaError,
  migrationClientAction,
  obsoleteCacheNames,
  shouldActivateFirstInstall,
  shouldAutoActivateForMigration,
  shouldWaitForUserUpdate,
} from './appBuild.ts';

test('production update waits for the user once a controller is already running', () => {
  assert.equal(shouldWaitForUserUpdate(true, true, 'installed'), true);
  assert.equal(shouldWaitForUserUpdate(true, false, 'installed'), false);
  assert.equal(shouldWaitForUserUpdate(false, true, 'installed'), false);
  assert.equal(shouldWaitForUserUpdate(true, true, 'installing'), false);
  assert.equal(shouldActivateFirstInstall(false, 'installed'), true);
  assert.equal(shouldActivateFirstInstall(true, 'installed'), false);
});

test('update checks stay inside 30 to 60 minutes', () => {
  assert.ok(UPDATE_CHECK_MS >= 30 * 60 * 1000);
  assert.ok(UPDATE_CHECK_MS <= 60 * 60 * 1000);
});

test('obsolete caches are the ones outside the current set', () => {
  assert.deepEqual(
    obsoleteCacheNames(
      ['workbox-precache-v2-old', 'ars-images', 'workbox-precache-v2-current'],
      ['workbox-precache-v2-current', 'ars-images'],
    ),
    ['workbox-precache-v2-old'],
  );
});

test('a controller change reloads once', () => {
  const stored = new Map<string, string>();
  const storage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
    removeItem: (key: string) => {
      stored.delete(key);
    },
  };
  assert.equal(beginControlledReload(storage), true);
  assert.equal(beginControlledReload(storage), false);
  clearReloadGuard(storage);
  assert.equal(beginControlledReload(storage), true);
});

test('the first rollout activates itself and later builds wait', () => {
  assert.equal(shouldAutoActivateForMigration(null), true);
  assert.equal(shouldAutoActivateForMigration(''), true);
  assert.equal(shouldAutoActivateForMigration('0'), true);
  assert.equal(shouldAutoActivateForMigration(UPDATE_PROTOCOL), false);
});

test('a migration reload leaves the current build and unsaved work alone', () => {
  assert.equal(migrationClientAction('current', 5000, true), 'stop');
  assert.equal(migrationClientAction('hold', 90_000, true), 'stop');
  assert.equal(migrationClientAction('none', 500, true), 'wait');
  assert.equal(migrationClientAction('none', 2500, false), 'reload');
  assert.equal(migrationClientAction('none', 2500, true), 'wait');
  assert.equal(migrationClientAction('none', 60_000, true), 'reload');
});

test('stale chunk and quota errors are recognised', () => {
  assert.equal(isChunkLoadError(new Error('ChunkLoadError: Loading chunk 12 failed')), true);
  assert.equal(
    isChunkLoadError(new TypeError('Failed to fetch dynamically imported module')),
    true,
  );
  assert.equal(isChunkLoadError(new Error('Importing a module script failed')), true);
  assert.equal(isChunkLoadError(new Error('Network error')), false);
  const quota = new Error('Quota exceeded');
  quota.name = 'QuotaExceededError';
  assert.equal(isQuotaError(quota), true);
  assert.equal(isQuotaError(new Error('Quota exceeded while writing the cache')), true);
  assert.equal(isQuotaError(new Error('Not found')), false);
});
