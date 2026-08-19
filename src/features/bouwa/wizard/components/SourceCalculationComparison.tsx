import { AlertTriangle, GitCompareArrows } from 'lucide-react';

import type {
  WizardCalculationSnapshot,
  WizardCommercialScenarioResult,
  WizardScientificCalculationResult,
} from '../wizardTypes';

function serverFigure(result: WizardScientificCalculationResult): string {
  if (result.value === null)
    return result.messages.join(' ') || 'No accepted calculation result is available.';
  return `${result.value.toLocaleString('en-ZA', {
    maximumFractionDigits: result.unit.startsWith('R/') ? 2 : 6,
  })} ${result.unit}`;
}

function serverNumber(value: number, unit: string): string {
  return `${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} ${unit}`;
}

function ScenarioCard({ scenario }: { scenario: WizardCommercialScenarioResult }) {
  return (
    <div className={`rounded-lg border p-3 ${scenario.scenarioKind === 'source' ? 'border-blue-200 bg-blue-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">
            {scenario.scenarioKind === 'source' ? 'Source-stated scenario' : 'Independent calculation'}
          </p>
          <p className="text-[11px] text-slate-500">{scenario.scenarioId}</p>
        </div>
        {!scenario.finalChargeConfirmed && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">Hypothetical</span>
        )}
      </div>
      <dl className="mt-2 space-y-1 text-[11px]">
        {scenario.sourceStatedMonthlyTotalRand !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Source-stated monthly total</dt>
            <dd className="text-right font-medium text-slate-800">{serverNumber(scenario.sourceStatedMonthlyTotalRand, 'R/month')}</dd>
          </div>
        )}
        {scenario.sourceStatedFiveYearTotalRand !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Source-stated five-year total</dt>
            <dd className="text-right font-medium text-slate-800">{serverNumber(scenario.sourceStatedFiveYearTotalRand, 'R/5-year')}</dd>
          </div>
        )}
        {scenario.components.map(component => (
          <div key={component.componentId} className="flex justify-between gap-3">
            <dt className="text-slate-600">{component.label} · {component.payer} · {component.responsibility}{component.inputAmountRand === null ? '' : ` · ${component.inputAmountRand} ${component.inputUnit}`}</dt>
            <dd className="text-right font-medium text-slate-800">{serverFigure(component.monthlyCostRand)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-1 font-semibold">
          <dt>
            {scenario.scenarioKind === 'source'
              ? 'Included-component additive sensitivity — not an all-in total customer cost'
              : 'All-in total customer cost'}
          </dt>
          <dd className="text-right">{serverFigure(scenario.totalMonthlyCustomerCostRand)}</dd>
        </div>
        {scenario.fiveYearSchedule.map(entry => (
          <div key={entry.year} className="flex justify-between gap-3">
            <dt className="text-slate-600">Year {entry.year} customer cost</dt>
            <dd className="text-right font-medium text-slate-800">{serverFigure(entry.annualCustomerCostRand)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10px] text-slate-500">
        Reconciliation: monthly {scenario.sourceTotalReconciliation.monthly.replace(/_/g, ' ')}
        {' · '}five-year {scenario.sourceTotalReconciliation.fiveYear.replace(/_/g, ' ')}
      </p>
      {scenario.blockers.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-amber-800">
          {scenario.blockers.map(blocker => <li key={blocker} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{blocker}</li>)}
        </ul>
      )}
    </div>
  );
}

export function SourceCalculationComparison({
  snapshot,
}: {
  snapshot: WizardCalculationSnapshot;
}) {
  const source = snapshot.commercialScenarios.filter(item => item.scenarioKind === 'source');
  const independent = snapshot.commercialScenarios.filter(item => item.scenarioKind === 'independent');
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <GitCompareArrows className="h-4 w-4 text-ars-primary" /> Source vs independent
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Values below are the immutable server snapshot. Scenarios are never merged or
        recalculated in the browser.
      </p>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <div className="space-y-2">
          {source.length === 0 ? <Missing label="No source scenario supplied" /> : source.map(item => <ScenarioCard key={item.scenarioId} scenario={item} />)}
        </div>
        <div className="space-y-2">
          {independent.length === 0 ? <Missing label="No independent scenario supplied" /> : independent.map(item => <ScenarioCard key={item.scenarioId} scenario={item} />)}
        </div>
      </div>
      {snapshot.claimAssessments.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold text-slate-700">Claim classifications</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {snapshot.claimAssessments.map(claim => (
              <li key={claim.claimId} className="rounded-md bg-slate-50 px-2 py-1.5">
                <span className="font-medium text-slate-800">{claim.claim}</span>
                <span className="ml-2 text-slate-500">{claim.status}</span>
                {!claim.customerStatementPermitted && (
                  <span className="ml-2 font-medium text-rose-700">Customer statement blocked</span>
                )}
                {claim.blockers.map(blocker => <p key={blocker} className="text-amber-700">{blocker}</p>)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 break-all text-[10px] text-slate-400">
        Snapshot {snapshot.snapshotId} · configuration {snapshot.configurationSha256}
      </p>
    </section>
  );
}

function Missing({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">{label}.</p>;
}
