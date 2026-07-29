import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/features/bouwa/pages/BouwaLoggerLocalApp.tsx');
const workspace = read(
  'src/features/bouwa/components/ProposalReadinessWorkspace.tsx',
);
const modeSelector = read(
  'src/features/bouwa/components/proposal/ProposalModeSelector.tsx',
);
const fieldEditor = read(
  'src/features/bouwa/components/proposal/ProposalFieldEditor.tsx',
);
const login = read('src/features/bouwa/components/LocalIdentityLogin.tsx');

function requireText(source, text, label) {
  if (!source.includes(text))
    throw new Error(`${label} contract is missing '${text}'.`);
}

requireText(
  page,
  '20 * 1024 * 1024',
  'CSV fallback capability',
);
requireText(page, 'maximumCsvBytes', 'API-provided CSV capability');
requireText(page, 'MiB', 'binary CSV size label');
if (page.includes('50 MB') || page.includes('50MB'))
  throw new Error('The obsolete 50 MB CSV limit must not appear.');

for (const [source, label] of [
  [page, 'logger summary tabs'],
  [workspace, 'proposal workspace tabs'],
  [modeSelector, 'proposal mode tabs'],
]) {
  for (const contract of [
    'role="tablist"',
    'role="tab"',
    'role="tabpanel"',
    'aria-selected',
    'aria-controls',
    'tabIndex',
    'onKeyDown',
    'ArrowLeft',
    'ArrowRight',
  ])
    requireText(source, contract, label);
}

requireText(login, 'aria-live="assertive"', 'login errors');
requireText(page, 'aria-live="assertive"', 'parser errors');
requireText(workspace, "role={error ? 'alert' : 'status'}", 'workflow errors');
requireText(fieldEditor, 'setExpanded(true)', 'Fix-now expansion');
requireText(fieldEditor, '?.focus()', 'Fix-now focus');
requireText(fieldEditor, 'focusRequestToken', 'repeat Fix-now request token');
requireText(fieldEditor, 'data-proposal-editable', 'Fix-now editable control target');
requireText(workspace, 'AbortController', 'stale evaluation cancellation');
requireText(workspace, 'mayApplyEvaluation', 'evaluation sequence guard');
requireText(workspace, 'Proposal record ID · server owned', 'record identity display');
requireText(page, 'X-Bouwa-Proposal-Record-Id', 'analysis record binding');
if (
  fieldEditor.indexOf('setExpanded(true)') >
  fieldEditor.indexOf('?.focus()')
)
  throw new Error('Fix now must expand a field before focusing it.');

process.stdout.write('Bouwa local UI contracts passed.\n');
