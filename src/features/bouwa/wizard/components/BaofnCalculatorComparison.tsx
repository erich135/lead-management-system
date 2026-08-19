import type {
  WizardCagiTechnicalReferenceExhibit,
  WizardExistingPerformanceSensitivity,
  WizardProposalDetailedSection,
  WizardSalesSavingsComparison,
  WizardSourceCalculatorComparison,
  WizardSourceCalculatorFinding,
} from '../wizardTypes';

const FINDING_LABEL: Record<WizardSourceCalculatorFinding, string> = {
  matched: 'Matched',
  close_match: 'Close match',
  differs: 'Differs',
  accepted_preliminary: 'Accepted',
  accepted_datasheet: 'Datasheet listing',
  estimated: 'Estimated',
  indicative: 'Indicative',
  conflict: 'Conflict',
  unsupported_at_8_bar: 'Conflict',
  not_supported: 'Not calculated',
  impossible: 'Invalid',
  unusable: 'Unusable',
};

const FINDING_CLASS: Record<WizardSourceCalculatorFinding, string> = {
  matched: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  close_match: 'bg-teal-50 text-teal-800 border-teal-200',
  differs: 'bg-amber-50 text-amber-900 border-amber-200',
  accepted_preliminary: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  accepted_datasheet: 'bg-sky-50 text-sky-900 border-sky-200',
  estimated: 'bg-sky-50 text-sky-900 border-sky-200',
  indicative: 'bg-sky-50 text-sky-900 border-sky-200',
  conflict: 'bg-amber-50 text-amber-900 border-amber-200',
  unsupported_at_8_bar: 'bg-amber-50 text-amber-900 border-amber-200',
  not_supported: 'bg-slate-50 text-slate-700 border-slate-200',
  impossible: 'bg-rose-50 text-rose-800 border-rose-200',
  unusable: 'bg-rose-50 text-rose-800 border-rose-200',
};

const EXECUTIVE_BASIS_ITEMS = [
  'Flow per compressor',
  'Operating pressure',
  'Power / kW',
];

function rands(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const formatted = `R${Math.abs(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return value < 0 ? `−${formatted}` : formatted;
}

function flow(value: number): string {
  return `${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m³/min`;
}

function SavingsBanner({
  savings,
  compact,
}: {
  savings: WizardSalesSavingsComparison;
  compact: boolean;
}) {
  const proxy = savings.illustrativeListedPower ?? null;
  const corrected = savings.correctedSavingEstablished === true;
  return (
    <div
      className={
        compact
          ? 'mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]'
          : 'mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'
      }
    >
      <div className={compact ? '' : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          BAOFN claim
        </div>
        <div className="font-medium text-slate-900">{savings.claimedText ?? 'Not stated'}</div>
      </div>
      <div className={compact ? '' : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          BOUWA calculation
        </div>
        <div className="font-medium text-slate-900">
          {savings.bouwaAssessment ??
            (corrected && savings.bouwaSavingPercent !== null
              ? `${savings.bouwaSavingPercent.toFixed(2)}%`
              : 'Not technically reproducible from the supplied BAOFN data.')}
        </div>
      </div>
      <div className={compact ? '' : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Difference
        </div>
        <div className="font-medium text-slate-900">
          {corrected && savings.differencePercentagePoints !== null
            ? `${savings.differencePercentagePoints.toFixed(2)} percentage points`
            : 'Corrected electricity saving cannot be technically established from the supplied existing-machine electrical data.'}
        </div>
      </div>
      <div className={compact ? '' : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {proxy ? 'Illustrative listed-power impact' : 'Estimated annual / 5-year impact'}
        </div>
        <div className="font-medium text-slate-900">
          {proxy
            ? `${rands(proxy.annualDifferenceRand)}/year · ${rands(proxy.fiveYearDifferenceRand)}`
            : `${rands(savings.estimatedAnnualSavingRand)}/year${
                savings.estimatedFiveYearSavingRand === null
                  ? ''
                  : ` · ${rands(savings.estimatedFiveYearSavingRand)}`
              }`}
        </div>
      </div>
      <p className={`col-span-full text-slate-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {savings.finding}
      </p>
      {proxy ? (
        <p className={`col-span-full text-slate-500 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
          {proxy.label}. {proxy.classification}. {proxy.limitation} This is not a corrected
          electricity saving and is not measured package input.
        </p>
      ) : null}
    </div>
  );
}

export function ExistingPerformanceSensitivityTable({
  sensitivity,
}: {
  sensitivity: WizardExistingPerformanceSensitivity;
}) {
  return (
    <div className="mt-2">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-gray-300 text-left text-gray-500">
            <th className="py-1.5 pr-2 font-semibold uppercase tracking-wide">Scenario</th>
            <th className="py-1.5 text-right font-semibold uppercase tracking-wide">
              Estimated existing FAD
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-1.5 pr-2 font-medium text-black">Current listed FAD</td>
            <td className="py-1.5 text-right font-medium text-black">
              {flow(sensitivity.nameplateFlowM3PerMin)}
            </td>
          </tr>
          {sensitivity.scenarios.map(scenario => (
            <tr
              key={scenario.id}
              className={`align-top border-b border-gray-200 ${
                scenario.percent === sensitivity.defaultPercent ? 'bg-amber-50/60' : ''
              }`}
            >
              <td className="py-1.5 pr-2 font-medium text-black">
                {scenario.percent}% — {scenario.label}
                <div className="text-[9px] font-normal text-gray-500">
                  Probable existing-machine performance (estimate)
                </div>
              </td>
              <td className="py-1.5 text-right font-medium text-black">
                {flow(scenario.estimatedExistingFlowM3PerMin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExistingPerformanceSensitivitySection({
  section,
  sensitivity,
}: {
  section: WizardProposalDetailedSection;
  sensitivity: WizardExistingPerformanceSensitivity | null | undefined;
}) {
  return (
    <section data-proposal-section={section.id} className="break-inside-avoid">
      <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
        {section.title}
      </h2>
      {sensitivity ? <ExistingPerformanceSensitivityTable sensitivity={sensitivity} /> : null}
      {section.statements.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-gray-700">
          {section.statements
            .filter(
              statement =>
                !statement.startsWith('95% —') &&
                !statement.startsWith('90% —') &&
                !statement.startsWith('85% —'),
            )
            .map((statement, index) => (
              <li key={`${statement}-${index}`}>{statement}</li>
            ))}
        </ul>
      )}
    </section>
  );
}

export function CagiReferenceTable({
  exhibit,
}: {
  exhibit: WizardCagiTechnicalReferenceExhibit;
}) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-gray-300 text-left text-gray-500">
            <th className="py-1.5 pr-2 font-semibold uppercase tracking-wide">Reference model</th>
            <th className="py-1.5 pr-2 font-semibold uppercase tracking-wide">Pressure</th>
            <th className="py-1.5 pr-2 text-right font-semibold uppercase tracking-wide">
              Max FAD
            </th>
            <th className="py-1.5 pr-2 text-right font-semibold uppercase tracking-wide">
              Total input
            </th>
            <th className="py-1.5 font-semibold uppercase tracking-wide">Notes</th>
          </tr>
        </thead>
        <tbody>
          {exhibit.rows.map(row => (
            <tr key={row.model} className="align-top border-b border-gray-200">
              <td className="py-1.5 pr-2 font-medium text-black">
                {row.model}
                <div className="text-[9px] font-normal text-gray-500">
                  {row.control}; motor {row.motorHp}
                </div>
              </td>
              <td className="py-1.5 pr-2 text-black">
                {row.pressurePsig} psig / approx. {row.pressureBarApprox} bar
              </td>
              <td className="py-1.5 pr-2 text-right text-black">
                {row.maxFadAcfm.toLocaleString('en-ZA')} acfm
                <div>{flow(row.maxFadM3PerMin)}</div>
              </td>
              <td className="py-1.5 pr-2 text-right text-black">
                {row.totalInputKw === null ? 'Not supplied' : `${row.totalInputKw.toFixed(1)} kW`}
              </td>
              <td className="py-1.5 text-gray-600">{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CagiReferenceSection({
  section,
  exhibit,
}: {
  section: WizardProposalDetailedSection;
  exhibit: WizardCagiTechnicalReferenceExhibit | null | undefined;
}) {
  return (
    <section data-proposal-section={section.id} className="break-inside-avoid">
      <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
        {section.title}
      </h2>
      {exhibit ? <CagiReferenceTable exhibit={exhibit} /> : null}
      <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-gray-700">
        {(exhibit?.statements ?? section.statements.filter(statement => !statement.includes(':')))
          .slice(0, 3)
          .map((statement, index) => (
            <li key={`${statement}-${index}`}>{statement}</li>
          ))}
      </ul>
    </section>
  );
}

function ComparisonTable({
  rows,
  compact,
}: {
  rows: WizardSourceCalculatorComparison['rows'];
  compact: boolean;
}) {
  return (
    <div className={compact ? 'mt-1 overflow-x-auto' : 'mt-2 overflow-x-auto'}>
      <table className={`w-full ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-1 pr-2 font-medium">Comparison</th>
            <th className="py-1 pr-2 font-medium">BAOFN claim</th>
            <th className="py-1 pr-2 font-medium">BOUWA technical basis</th>
            <th className="py-1 pr-2 font-medium">Difference</th>
            <th className="py-1 pr-2 font-medium">Finding</th>
            {!compact && <th className="py-1 font-medium">Remark</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.item} className="align-top border-b border-slate-100">
              <td className="py-1.5 pr-2 font-medium text-slate-800">{row.item}</td>
              <td className="py-1.5 pr-2 text-slate-800">{row.baofnClaim}</td>
              <td className="py-1.5 pr-2 text-slate-800">{row.bouwaResult}</td>
              <td className="py-1.5 pr-2 text-slate-800">{row.difference ?? '—'}</td>
              <td className="py-1.5 pr-2">
                <span
                  className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${FINDING_CLASS[row.finding] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}
                >
                  {FINDING_LABEL[row.finding] ?? row.finding}
                </span>
              </td>
              {!compact && <td className="py-1.5 text-slate-600">{row.remark}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BaofnCalculatorComparison({
  comparison,
  compact = false,
}: {
  comparison: WizardSourceCalculatorComparison | undefined;
  compact?: boolean;
}) {
  if (comparison === undefined || comparison.rows.length === 0) return null;
  const clientRows = comparison.rows.filter(row => row.clientFacing);
  const basisRows = EXECUTIVE_BASIS_ITEMS.map(item =>
    clientRows.find(row => row.item === item),
  ).filter((row): row is NonNullable<typeof row> => row !== undefined);
  const rows = compact ? basisRows : clientRows;
  return (
    <section className={compact ? 'break-inside-avoid' : 'rounded-xl border border-slate-200 bg-white p-3'}>
      <h2
        className={
          compact
            ? 'mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading'
            : 'text-sm font-semibold text-slate-800'
        }
      >
        {compact ? '1. Executive comparison' : 'BAOFN vs BOUWA'}
      </h2>
      {comparison.savingsComparison !== undefined && (
        <div className={compact ? 'mt-2' : 'mt-3'}>
          <SavingsBanner savings={comparison.savingsComparison} compact={compact} />
        </div>
      )}
      {compact && (
        <h3 className="mb-1 mt-3 border-b border-gray-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
          2. BAOFN claim vs BOUWA technical basis
        </h3>
      )}
      {!compact && (
        <p className="mt-0.5 text-[11px] text-slate-500">
          Working compressed-air rate R{comparison.selectedWorkingRateRandPerM3.toFixed(2)}/m³.
          Source values are accepted unless they conflict with the supplied technical specification.
        </p>
      )}
      <ComparisonTable rows={rows} compact={compact} />
    </section>
  );
}
