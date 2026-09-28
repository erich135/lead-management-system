import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  VisitPhotoError,
  isVisitPhotoFile,
  shouldCompressVisitPhoto,
  visitPhotoRejection,
  visitPhotoStorageMessage,
} from './visitPhotoPicker.ts';

const workspace = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'DiaryVisitWorkspace.tsx'),
  'utf8',
);

test('the visit photo input does not force the Android camera', () => {
  assert.doesNotMatch(workspace, /capture=/);
  assert.match(workspace, /accept="image\/\*"/);
  assert.match(workspace, /multiple/);
  assert.match(workspace, /openVisitPhotoPicker/);
  assert.doesNotMatch(workspace, /photoInputRef[\s\S]{0,240}className="hidden"/);
});

test('jpeg and png are accepted and a document is refused', () => {
  assert.equal(isVisitPhotoFile({ type: 'image/jpeg', name: 'site.jpg' }), true);
  assert.equal(isVisitPhotoFile({ type: 'image/png', name: 'site.png' }), true);
  assert.equal(isVisitPhotoFile({ type: '', name: 'site.HEIC' }), true);
  assert.equal(isVisitPhotoFile({ type: 'application/pdf', name: 'quote.pdf' }), false);
  assert.equal(
    visitPhotoRejection({ type: 'application/pdf', name: 'quote.pdf', size: 100 }),
    'That file is not a photo ARS can use. Choose a JPEG or PNG and try again.',
  );
  assert.equal(visitPhotoRejection({ type: 'image/jpeg', name: 'empty.jpg', size: 0 }), 'That photo was empty. Try again.');
  assert.match(
    visitPhotoRejection({ type: 'image/jpeg', name: 'huge.jpg', size: 13 * 1024 * 1024 }) || '',
    /too large/,
  );
  assert.equal(visitPhotoRejection({ type: 'image/png', name: 'ok.png', size: 20_000 }), null);
});

test('large and HEIC photos are reduced before they are stored', () => {
  assert.equal(shouldCompressVisitPhoto({ type: 'image/jpeg', name: 'a.jpg', size: 500_000 }), false);
  assert.equal(shouldCompressVisitPhoto({ type: 'image/jpeg', name: 'a.jpg', size: 2_000_000 }), true);
  assert.equal(shouldCompressVisitPhoto({ type: 'image/heic', name: 'a.HEIC', size: 400_000 }), true);
  assert.equal(shouldCompressVisitPhoto({ type: '', name: 'a.heif', size: 400_000 }), true);
});

test('a full photo store shows a retry message and leaves the visit in place', () => {
  const quota = new Error('Quota exceeded');
  quota.name = 'QuotaExceededError';
  assert.match(visitPhotoStorageMessage(quota) || '', /still here/);
  assert.equal(visitPhotoStorageMessage(new Error('network')), null);
  const picked = new VisitPhotoError('Photo picker is not available on this screen. Stay on the visit and try again.');
  assert.match(picked.userMessage, /Stay on the visit/);
});
