import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const featureRoot = path.join(frontendRoot, 'src', 'features', 'salesProposalTool');
const converted = new Set([
  'proposedConfigurationValidity.test.ts',
  'publishedPackageInput.test.ts',
  'currentMachinePerformance.test.ts',
  'salesProposalPersistence.test.ts',
  'sitePerformancePresentation.test.ts',
  'noAuditOperatingPresentation.test.ts',
  'specSheetConfirm.test.ts',
]);

function listLegacyTests(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listLegacyTests(full);
    if (!name.endsWith('.test.ts') || converted.has(name)) return [];
    return [full];
  });
}

const files = listLegacyTests(featureRoot);
if (files.length === 0) {
  console.error('No legacy Sales Proposal Tool tests found.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--test', '--experimental-strip-types', ...files],
  { stdio: 'inherit', cwd: frontendRoot },
);

process.exit(result.status ?? 1);
