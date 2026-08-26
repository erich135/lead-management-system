import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { displayOrUnavailable, formatEstimatedRand } from './formatMeasured.ts';
import { buildCommercialOffer } from './commercialOffer.ts';

const FEATURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

test('Phase 5 frontend does not calculate commercial totals or add PDF/invoice work', () => {
  const files = listFiles(FEATURE_ROOT).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text.includes('calcPaybackYears'), false, file);
    assert.equal(text.includes('calcNetInvestment'), false, file);
    assert.equal(text.includes('calcRoiPercentPerYear'), false, file);
    assert.equal(text.includes('jspdf'), false, file);
    assert.equal(text.includes('customerPdf'), false, file);
    assert.equal(/BAOFN|Samancor/i.test(text), false, file);
    assert.equal(text.includes('Managed Air'), false, file);
  }
  const resultCard = fs.readFileSync(
    path.join(FEATURE_ROOT, 'components/CommercialResultCard.tsx'),
    'utf8',
  );
  assert.doesNotMatch(resultCard, /totalA\s*\+|totalB\s*\+|monthlyRental\s*\*\s*12/);
  assert.match(resultCard, /commercial\.copy\.currentHeadline/);
  assert.match(resultCard, /commercial\.copy\.proposedHeadline/);
  assert.match(resultCard, /commercial\.copy\.savingHeadline/);
  assert.doesNotMatch(resultCard, /SLA R0/);
});

test('commercial inputs store purchase and rental separately and blank money is not zero', () => {
  const purchase = buildCommercialOffer({
    type: 'purchase',
    currentMonthlyRental: '',
    currentAnnualSla: '',
    equipmentPrice: '850000',
    installation: '45000',
    delivery: '',
    buyBack: '80000',
    purchaseAnnualSla: '36000',
    rentalMonthly: '18500',
    rentalAnnualSla: '36000',
    rentalInstallation: '',
  });
  assert.equal(purchase.type, 'purchase');
  assert.equal(purchase.purchase.equipmentPrice, 850000);
  assert.equal(purchase.purchase.delivery, null);
  assert.equal(purchase.rental.monthlyRental, 18500);
  const rental = buildCommercialOffer({
    ...{
      type: 'rental' as const,
      currentMonthlyRental: '',
      currentAnnualSla: '',
      equipmentPrice: '850000',
      installation: '45000',
      delivery: '',
      buyBack: '80000',
      purchaseAnnualSla: '36000',
      rentalMonthly: '18500',
      rentalAnnualSla: '36000',
      rentalInstallation: '',
    },
  });
  assert.equal(rental.type, 'rental');
  assert.equal(formatEstimatedRand(null), null);
  assert.equal(displayOrUnavailable(formatEstimatedRand(null)), 'Not available');
});
