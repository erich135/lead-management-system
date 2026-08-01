import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  HardDrive,
  Info,
  LockKeyhole,
  LogOut,
  Server,
  ShieldCheck,
  Table2,
  Upload,
  Wind,
  XCircle,
} from 'lucide-react';
import type {
  BouwaLocalAnalysis,
  DisabledCapability,
  EngineeringSetting,
  LocalHealth,
  MeasuredDemandFigureMetadata,
  MeasuredDemandProfile,
  PeriodSummary,
  RawStatistics,
  ScientificCalculationProvenance,
  ScientificFigureMetadata,
  ScientificUncertainty,
  Trend,
} from '../loggerLocalTypes';
import type { LocalSession, ProposalMode } from '../proposalLocalTypes';
import { ProposalReadinessWorkspace } from '../components/ProposalReadinessWorkspace';
import { LocalIdentityLogin } from '../components/LocalIdentityLogin';
import { BouwaAuditIntakePanel } from '../components/BouwaAuditIntakePanel';

type SummaryTab = 'hourly' | 'daily' | 'isoWeekly';
const BOUWA_LOCAL_MAX_CSV_BYTES_FALLBACK = 20 * 1024 * 1024;

const number = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-ZA', { maximumFractionDigits: digits });

const bytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${number(value / 1024, 1)} KiB`;
  return `${number(value / (1024 * 1024), 2)} MiB`;
};

const dateTime = (value: string | null) =>
  value ? new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value)) : 'Unavailable';

const cardTones = {
  slate: 'border-slate-200 bg-white',
  blue: 'border-blue-200 bg-blue-50/60',
  amber: 'border-amber-200 bg-amber-50/60',
  green: 'border-emerald-200 bg-emerald-50/60',
};

type CardTone = keyof typeof cardTones;

function Metric({
  label,
  value,
  detail,
  tone = 'slate',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: CardTone;
}) {
  return (
    <div className={`rounded-xl border p-4 ${cardTones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-ars-primary">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function TrendChart({ trend }: { trend: Trend }) {
  const geometry = useMemo(() => {
    if (!trend.points.length) return null;
    const values = trend.points.map(point => point.value);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = maximum - minimum || 1;
    const polyline = trend.points.map((point, index) => {
      const x = trend.points.length === 1 ? 500 : (index / (trend.points.length - 1)) * 1000;
      const y = 210 - ((point.value - minimum) / range) * 180;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    return { minimum, maximum, polyline };
  }, [trend]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-slate-900">{trend.channelId} trend</p>
          <p className="text-xs text-slate-500">
            {number(trend.sourcePointCount, 0)} valid source observations
            {trend.sampled ? ' · extrema-preserving display sample' : ' · all points shown'}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Raw {trend.unit}
        </span>
      </div>
      {geometry ? (
        <>
          <svg
            className="mt-4 h-56 w-full overflow-visible"
            viewBox="0 0 1000 240"
            role="img"
            aria-label={`${trend.channelId} raw observation trend`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`fill-${trend.channelId}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={trend.channelId === 'flow' ? '#0969a9' : '#f7c12b'} stopOpacity="0.24" />
                <stop offset="100%" stopColor={trend.channelId === 'flow' ? '#0969a9' : '#f7c12b'} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 90, 150, 210].map(y => (
              <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <polygon
              points={`0,210 ${geometry.polyline} 1000,210`}
              fill={`url(#fill-${trend.channelId})`}
            />
            <polyline
              points={geometry.polyline}
              fill="none"
              stroke={trend.channelId === 'flow' ? '#0969a9' : '#d89b00'}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Min {number(geometry.minimum)} {trend.unit}</span>
            <span>Max {number(geometry.maximum)} {trend.unit}</span>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
          No valid {trend.channelId} observations are available.
        </div>
      )}
    </div>
  );
}

function RawStatisticCard({ item }: { item: RawStatistics }) {
  const icon = item.channelId === 'flow' ? <Wind className="h-5 w-5" /> : <Gauge className="h-5 w-5" />;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ars-primary">
          {icon}
          <h3 className="font-semibold capitalize text-slate-900">Raw {item.channelId}</h3>
        </div>
        <span className="text-xs font-medium text-slate-500">{item.unit}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ['Minimum', item.minimum],
          ['Average', item.average],
          ['Maximum', item.maximum],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{number(value as number | null)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">{number(item.sampleCount, 0)} valid-timestamp parsed values; no engineering basis conversion.</p>
    </div>
  );
}

function channel(period: PeriodSummary, id: 'flow' | 'pressure') {
  return period.channels.find(item => item.channelId === id);
}

function PeriodTable({ periods }: { periods: PeriodSummary[] }) {
  const visible = periods.slice(0, 250);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Local period</th>
              <th className="px-4 py-3">Coverage</th>
              <th className="px-4 py-3">Flow avg</th>
              <th className="px-4 py-3">Pressure avg</th>
              <th className="px-4 py-3">Quality</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.map(period => {
              const flow = channel(period, 'flow');
              const pressure = channel(period, 'pressure');
              return (
                <tr key={`${period.periodType}-${period.periodStart}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="font-medium text-slate-800">{period.localPeriodLabel.replace('T', ' ')}</p>
                    <div className="mt-1 flex gap-1">
                      {period.isPartial && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">Partial</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{number(period.coveragePercent, 3)}%</p>
                    <p className="text-xs text-slate-500">Required {period.coverageRequiredPercent}%</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {number(flow?.average)} {flow?.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {number(pressure?.average)} {pressure?.unit}
                  </td>
                  <td className="px-4 py-3">
                    {period.eligibleForConfirmedSummary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Coverage passed
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> Technical only
                        </span>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                          {period.hasUnsupportedGap ? 'Gap exceeds 15 seconds. ' : ''}
                          {period.coveragePercent < period.coverageRequiredPercent ? 'Coverage is below 100%.' : ''}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!visible.length && <p className="p-8 text-center text-sm text-slate-500">No periods are available.</p>}
      {periods.length > visible.length && (
        <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Showing the first {visible.length} of {periods.length} periods. The downloaded validation report contains the dataset-level summary.
        </p>
      )}
    </div>
  );
}

function SettingRow({ setting }: { setting: EngineeringSetting }) {
  const confirmed = setting.validationStatus === 'confirmed';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ars-primary">{setting.question}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{setting.id.replace(/_/g, ' ')}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
          confirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {setting.validationStatus.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        {confirmed ? setting.originalAnswer : setting.blockingReason}
      </p>
      {!confirmed && setting.requiredEvidence.length > 0 && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Required: {setting.requiredEvidence.join('; ')}
        </p>
      )}
    </div>
  );
}

function DisabledCard({ capability }: { capability: DisabledCapability }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">{capability.label}</h3>
        <span className="ml-auto rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">DISABLED</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{capability.reason}</p>
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Required · {capability.sourceQuestions.join(', ')}
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-900">{capability.requiredAnswerOrEvidence}</p>
      </div>
    </div>
  );
}

const MEASURED_DEMAND_UNAVAILABLE_LABEL = 'Unavailable';

const measuredNumber = (value: number, digits: number) =>
  value.toLocaleString('en-ZA', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const measuredUnit = (unit: string) => unit.replace('m3', 'm³');

const provenanceLabels: Record<ScientificCalculationProvenance, string> = {
  exact_mathematics: 'Exact calculation',
  established_engineering: 'Established engineering',
  manufacturer_specification: 'Manufacturer-derived',
  approved_assumption: 'Approved assumption',
  business_input: 'Business input',
  user_input: 'User input',
};

const uncertaintyLabels: Record<ScientificUncertainty, string> = {
  measured: 'Measured',
  derived_exact: 'Exact calculation',
  derived_manufacturer: 'Manufacturer-derived',
  estimated: 'Estimated',
  estimated_from_short_record: 'Estimated from short record',
  unavailable: 'Unavailable',
};

const confidenceLabels: Record<MeasuredDemandProfile['confidence'], string> = {
  measured: 'Measured',
  estimated_from_short_record: 'Estimated from short record',
  insufficient: 'Insufficient',
};

const measuredDemandFigureLabels: Array<[keyof MeasuredDemandFigureMetadata, string]> = [
  ['supportedDurationSeconds', 'Supported duration'],
  ['deliveredVolumeM3', 'Delivered volume'],
  ['meteredVolumeM3', 'Metered volume'],
  ['volumeBalanceClosure', 'Volume-balance closure'],
  ['meanFlowM3PerMin', 'Mean flow'],
  ['flowP50M3PerMin', 'Flow P50'],
  ['flowP90M3PerMin', 'Flow P90'],
  ['peakMeanFlowWindowMinutes', 'Peak rolling-mean window'],
  ['peakMeanFlowM3PerMin', 'Peak rolling mean flow'],
  ['flowingDurationSeconds', 'Flowing duration'],
  ['nonFlowingDurationSeconds', 'Non-flowing duration'],
  ['flowingFraction', 'Flowing fraction'],
  ['meanFlowWhileFlowingM3PerMin', 'Mean flow while flowing'],
  ['meanPressureBarG', 'Mean pressure'],
  ['meanPressureWhileFlowingBarG', 'Mean pressure while flowing'],
  ['lowFlowCutOffM3PerMin', 'Configured low-flow cut-off'],
  ['observedMinimumNonZeroFlowM3PerMin', 'Observed minimum positive flow'],
  ['annualisationFactor', 'Annualisation factor'],
  ['recordDurationDays', 'Record duration'],
];

function ScientificFigure({
  label,
  value,
  digits,
  metadata,
  tone = 'slate',
}: {
  label: string;
  value: number | null;
  digits: number;
  metadata: ScientificFigureMetadata;
  tone?: CardTone;
}) {
  return (
    <div className={`rounded-xl border p-4 ${cardTones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">
        {value === null
          ? MEASURED_DEMAND_UNAVAILABLE_LABEL
          : `${measuredNumber(value, digits)} ${measuredUnit(metadata.unit)}`}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {uncertaintyLabels[metadata.uncertainty]} · {provenanceLabels[metadata.provenance]} · {metadata.calculationId}
      </p>
      {value === null && (
        <p className="mt-1 text-xs leading-5 text-slate-500">{metadata.reason}</p>
      )}
    </div>
  );
}

function CutOffStatusCard({ measuredDemand }: { measuredDemand: MeasuredDemandProfile }) {
  const confirmed = measuredDemand.lowFlowCutOffStatus === 'cut_off_confirmed';
  const cutOff = measuredDemand.figureMetadata.lowFlowCutOffM3PerMin;
  return (
    <div className={`rounded-xl border p-4 text-sm ${confirmed ? cardTones.green : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start gap-3">
        {confirmed
          ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          : <Info className="mt-0.5 h-5 w-5 shrink-0 text-ars-primary" />}
        <div>
          <p className={`font-semibold ${confirmed ? 'text-emerald-800' : 'text-blue-900'}`}>
            {confirmed ? 'Cutoff confirmed' : 'Cutoff not confirmed'}
          </p>
          <p className="mt-1 leading-6 text-slate-700">
            {confirmed
              ? `Flowing and non-flowing time is classified against the configured low-flow cut-off of ${
                  measuredDemand.lowFlowCutOffM3PerMin === null
                    ? MEASURED_DEMAND_UNAVAILABLE_LABEL
                    : `${measuredNumber(measuredDemand.lowFlowCutOffM3PerMin, 3)} ${measuredUnit(cutOff.unit)}`
                }.`
              : 'Flowing and non-flowing classification is provisional until the low-flow cut-off is confirmed. The observed minimum positive flow shown below is a logger observation, not an engineering setting.'}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">{cutOff.reason}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {measuredDemand.runtimeFigureMetadata.flowingDurationSeconds.reason}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Reported zero flow is labelled “{measuredDemand.reportedZeroFlowLabel}”.
          </p>
        </div>
      </div>
    </div>
  );
}

function MeasuredDemandTechnicalTable({ figureMetadata }: { figureMetadata: MeasuredDemandFigureMetadata }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
      <div className="max-h-[32rem] overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Figure</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Provenance</th>
              <th className="px-4 py-3">Uncertainty</th>
              <th className="px-4 py-3">Calculation</th>
              <th className="px-4 py-3">Numeric uncertainty</th>
              <th className="px-4 py-3">Backend reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {measuredDemandFigureLabels.map(([key, label]) => {
              const metadata = figureMetadata[key];
              return (
                <tr key={key} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{label}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{metadata.unit}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{metadata.provenance}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{metadata.uncertainty}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{metadata.calculationId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                    {metadata.numericUncertainty === null
                      ? 'Not defined'
                      : `± ${measuredNumber(metadata.numericUncertainty.plusMinus, 3)} ${measuredUnit(metadata.numericUncertainty.unit)} · ${metadata.numericUncertainty.basis.replace(/_/g, ' ')}`}
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-slate-600">{metadata.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MeasuredDemandSection({ measuredDemand }: { measuredDemand: MeasuredDemandProfile }) {
  const figures = measuredDemand.figureMetadata;
  const peak = measuredDemand.peakMeanFlowM3PerMin[0] ?? null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SectionTitle
        icon={<Gauge className="h-5 w-5" />}
        title="Measured demand"
        subtitle="Scientifically derived from the uploaded logger record by the approved backend model. Every figure keeps its backend unit, provenance and uncertainty; nothing is recalculated in the browser."
      />

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Primary measured figures</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScientificFigure label="Delivered volume" value={measuredDemand.deliveredVolumeM3} digits={0} metadata={figures.deliveredVolumeM3} tone="blue" />
        <ScientificFigure label="Metered volume" value={measuredDemand.meteredVolumeM3} digits={0} metadata={figures.meteredVolumeM3} />
        <ScientificFigure label="Volume-balance closure" value={measuredDemand.volumeBalanceClosure} digits={6} metadata={figures.volumeBalanceClosure} />
        <ScientificFigure label="Supported duration" value={measuredDemand.supportedDurationSeconds} digits={3} metadata={figures.supportedDurationSeconds} />
        <ScientificFigure label="Mean flow" value={measuredDemand.meanFlowM3PerMin} digits={3} metadata={figures.meanFlowM3PerMin} tone="blue" />
        <ScientificFigure label="Flow P50" value={measuredDemand.flowP50M3PerMin} digits={3} metadata={figures.flowP50M3PerMin} />
        <ScientificFigure label="Flow P90" value={measuredDemand.flowP90M3PerMin} digits={3} metadata={figures.flowP90M3PerMin} />
        <ScientificFigure
          label="Peak rolling mean flow"
          value={peak === null ? null : peak.value}
          digits={3}
          metadata={figures.peakMeanFlowM3PerMin}
        />
        <ScientificFigure label="Mean pressure" value={measuredDemand.meanPressureBarG} digits={3} metadata={figures.meanPressureBarG} />
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Peak rolling mean flow by window</p>
        {measuredDemand.peakMeanFlowM3PerMin.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {MEASURED_DEMAND_UNAVAILABLE_LABEL} · {figures.peakMeanFlowM3PerMin.reason}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {measuredDemand.peakMeanFlowM3PerMin.map(item => (
              <span key={item.windowMinutes} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                <strong>{measuredNumber(item.windowMinutes, 0)} {measuredUnit(figures.peakMeanFlowWindowMinutes.unit)}</strong>
                {' · '}
                {measuredNumber(item.value, 3)} {measuredUnit(figures.peakMeanFlowM3PerMin.unit)}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Flowing and cut-off behaviour</p>
      <div className="mt-3">
        <CutOffStatusCard measuredDemand={measuredDemand} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScientificFigure label="Flowing duration" value={measuredDemand.flowingDurationSeconds} digits={3} metadata={figures.flowingDurationSeconds} />
        <ScientificFigure label="Non-flowing duration" value={measuredDemand.nonFlowingDurationSeconds} digits={3} metadata={figures.nonFlowingDurationSeconds} />
        <ScientificFigure label="Flowing fraction" value={measuredDemand.flowingFraction} digits={6} metadata={figures.flowingFraction} />
        <ScientificFigure label="Mean flow while flowing" value={measuredDemand.meanFlowWhileFlowingM3PerMin} digits={3} metadata={figures.meanFlowWhileFlowingM3PerMin} />
        <ScientificFigure label="Mean pressure while flowing" value={measuredDemand.meanPressureWhileFlowingBarG} digits={3} metadata={figures.meanPressureWhileFlowingBarG} />
        <ScientificFigure
          label="Configured low-flow cut-off"
          value={measuredDemand.lowFlowCutOffM3PerMin}
          digits={3}
          metadata={figures.lowFlowCutOffM3PerMin}
        />
        <ScientificFigure
          label="Observed minimum positive flow"
          value={measuredDemand.observedMinimumNonZeroFlowM3PerMin}
          digits={3}
          metadata={figures.observedMinimumNonZeroFlowM3PerMin}
        />
        <Metric
          label="Reported zero flow"
          value={measuredDemand.reportedZeroFlowLabel}
          detail="A reported zero flow observation means below cut-off, not proven zero consumption."
        />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Record and scientific details</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScientificFigure label="Record duration" value={measuredDemand.recordDurationDays} digits={3} metadata={figures.recordDurationDays} />
        <Metric
          label="Coverage confidence"
          value={confidenceLabels[measuredDemand.confidence]}
          detail="Backend confidence classification for this measured-demand profile."
          tone={measuredDemand.confidence === 'measured' ? 'green' : 'amber'}
        />
        <ScientificFigure label="Annualisation factor" value={measuredDemand.annualisationFactor} digits={8} metadata={figures.annualisationFactor} />
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Analysed source</p>
        <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-[11rem_1fr] sm:gap-x-4">
          <dt className="font-semibold">Source filename</dt>
          <dd className="break-all font-mono text-slate-800">{measuredDemand.source.sourceFilename}</dd>
          <dt className="mt-1 font-semibold sm:mt-0">Source SHA-256</dt>
          <dd className="break-all font-mono text-slate-800" title={measuredDemand.source.sourceSha256}>
            {measuredDemand.source.sourceSha256}
          </dd>
        </dl>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Figure provenance and calculation identifiers</p>
      <MeasuredDemandTechnicalTable figureMetadata={figures} />
    </section>
  );
}

export function BouwaLoggerLocalApp() {
  const [health, setHealth] = useState<LocalHealth | null>(null);
  const [serviceError, setServiceError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<BouwaLocalAnalysis | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [summaryTab, setSummaryTab] = useState<SummaryTab>('hourly');
  const [proposalMode, setProposalMode] = useState<ProposalMode>('logger_analysis');
  const [session, setSession] = useState<LocalSession | null>(null);
  const [proposalContext, setProposalContext] = useState<{
    proposalRecordId: string;
    proposalId: string;
    settingsVersion: number;
  } | null>(null);
  const handleSessionExpired = useCallback(() => {
    setSession(null);
    setProposalContext(null);
    setAnalysis(null);
  }, []);
  const handleProposalContextChange = useCallback(
    (value: {
      proposalRecordId: string;
      proposalId: string;
      settingsVersion: number;
    } | null) => {
      setProposalContext(value);
    },
    [],
  );

  useEffect(() => {
    let current = true;
    fetch('/api/bouwa-local/health')
      .then(async response => {
        if (!response.ok) throw new Error('Local parser service is not ready.');
        return response.json() as Promise<LocalHealth>;
      })
      .then(value => {
        if (current) {
          setHealth(value);
          setServiceError('');
        }
      })
      .catch(() => {
        if (current) setServiceError('Start the local Bouwa parser service on 127.0.0.1:4310, then refresh this page.');
      });
    return () => { current = false; };
  }, []);

  async function analyse() {
    if (!selectedFile || !session || !proposalContext) {
      setError('Select an untouched DS400 semicolon CSV export first.');
      return;
    }
    setBusy(true);
    setError('');
    setAnalysis(null);
    try {
      const response = await fetch('/api/bouwa-local/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `Bearer ${session.token}`,
          'X-Bouwa-Filename': encodeURIComponent(selectedFile.name),
          'X-Bouwa-Proposal-Record-Id': proposalContext.proposalRecordId,
          'X-Bouwa-Proposal-Id': proposalContext.proposalId,
          'X-Bouwa-Settings-Version': String(
            proposalContext.settingsVersion + 1,
          ),
        },
        body: selectedFile,
      });
      const payload = await response.json() as BouwaLocalAnalysis | { error?: string };
      if (response.status === 401) {
        setSession(null);
        throw new Error('The local session expired. Sign in again.');
      }
      if (!response.ok) throw new Error('error' in payload ? payload.error : 'The file was rejected.');
      setAnalysis(payload as BouwaLocalAnalysis);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The file could not be analysed.');
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!analysis) return;
    const blob = new Blob([analysis.validationReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stem = analysis.inputFile.filename.replace(/\.csv$/i, '');
    anchor.href = url;
    anchor.download = `${stem}-bouwa-technical-validation.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const periods = analysis?.summaries[summaryTab] ?? [];
  const flowPressureStats = analysis?.rawStatistics.filter(item => item.channelId === 'flow' || item.channelId === 'pressure') ?? [];

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ars-primary text-white">
              <Wind className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ars-primary">Bouwa</p>
              <h1 className="text-lg font-semibold text-slate-900">Proposal readiness workspace</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
              <HardDrive className="h-3.5 w-3.5" /> Memory only
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Localhost
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${
              health ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <Server className="h-3.5 w-3.5" /> {health ? 'Parser ready' : 'Parser offline'}
            </span>
            {session && (
              <>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                  {session.identity.displayName} · {session.identity.role.replace(/_/g, ' ')}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch('/api/bouwa-local/auth/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${session.token}` },
                      });
                    } catch {
                      setServiceError(
                        'The browser discarded the local session; the server token will expire automatically.',
                      );
                    } finally {
                      setSession(null);
                      setAnalysis(null);
                      setProposalContext(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7 lg:px-8">
        {!session ? (
          <LocalIdentityLogin onAuthenticated={setSession} />
        ) : (
          <>
        <ProposalReadinessWorkspace
          mode={proposalMode}
          onModeChange={next => {
            setProposalMode(next);
            if (next !== 'logger_analysis') {
              setSelectedFile(null);
              setAnalysis(null);
              setError('');
            }
          }}
          loggerAnalysis={analysis}
          session={session}
          onSessionExpired={handleSessionExpired}
          onProposalContextChange={handleProposalContextChange}
        />

        {proposalMode === 'logger_analysis' && (
          <>
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b3555] via-[#0a5488] to-[#0969a9] text-white shadow-lg">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                Approved DS400 parser · engineering-safe output
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight">
                Validate an untouched logger export without production infrastructure.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
                The selected file stays on this computer, is parsed in memory through the canonical Phase 4E parser,
                and is never written to MongoDB or uploaded to a cloud service.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LockKeyhole className="h-4 w-4" /> Engineering guardrails
              </div>
              <p className="mt-2 text-xs leading-6 text-blue-100">
                Flow and pressure trends are raw observations. Event thresholds, FAD/reference conversions,
                savings, sizing, severity, and pricing remain disabled until the questionnaire blockers are resolved.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={<Upload className="h-5 w-5" />}
            title="Select a DS400 export"
            subtitle="Accepted profile: UTF-8, semicolon-delimited DS400V2 export with the approved headers and channels."
          />
          {serviceError && (
            <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{serviceError}</p>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <label className="group flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-ars-primary hover:bg-blue-50/40">
              <div className="rounded-xl bg-white p-3 text-ars-primary shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {selectedFile?.name ?? 'Choose an untouched .csv file'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedFile
                    ? `${bytes(selectedFile.size)} · ready for local analysis`
                    : `No external upload · maximum ${bytes(health?.maximumCsvBytes ?? BOUWA_LOCAL_MAX_CSV_BYTES_FALLBACK)}`}
                </p>
              </div>
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={event => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setAnalysis(null);
                  setError('');
                }}
              />
            </label>
            <button
              type="button"
              onClick={analyse}
              disabled={!selectedFile || !health || !proposalContext || busy}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-ars-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#07588e] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Activity className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} />
              {busy ? 'Parsing and validating…' : 'Analyse locally'}
            </button>
          </div>
          {error && (
            <div role="alert" aria-live="assertive" className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">File rejected safely</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}
        </section>

        {proposalContext && (
          <BouwaAuditIntakePanel
            session={session}
            proposalRecordId={proposalContext.proposalRecordId}
            parsedSourceToken={analysis ? analysis.inputFile.sha256 : null}
            onSessionExpired={handleSessionExpired}
          />
        )}
          </>
        )}

        {proposalMode === 'logger_analysis' && analysis && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <SectionTitle
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Dataset overview"
                  subtitle={`${analysis.inputFile.filename} · SHA-256 ${analysis.inputFile.sha256.slice(0, 16)}…`}
                />
                <button
                  type="button"
                  onClick={downloadReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-ars-primary px-4 py-2.5 text-sm font-semibold text-ars-primary transition hover:bg-blue-50"
                >
                  <Download className="h-4 w-4" /> Download validation report
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Format" value="DS400V2 semicolon" detail={analysis.dataset.detectedFormat} tone="blue" />
                <Metric label="Rows" value={number(analysis.dataset.rowCount, 0)} detail={`${analysis.dataset.validRowCount} valid · ${analysis.dataset.invalidRowCount} invalid`} />
                <Metric label="Time range" value={`${dateTime(analysis.dataset.firstTimestamp)}`} detail={`to ${dateTime(analysis.dataset.lastTimestamp)}`} />
                <Metric label="Timezone" value={analysis.dataset.timezone} detail="Confirmed questionnaire C1" tone="green" />
                <Metric label="Coverage" value={`${number(analysis.dataset.overallCoveragePercent, 4)}%`} detail="100% required for grouped summaries" tone={analysis.dataset.overallCoveragePercent >= 100 ? 'green' : 'amber'} />
                <Metric label="Missing duration" value={`${number(analysis.dataset.missingDurationSeconds, 0)} s`} detail={`${analysis.dataset.missingSampleCount} estimated missing samples`} tone={analysis.dataset.missingDurationSeconds ? 'amber' : 'green'} />
                <Metric label="Observed intervals" value={analysis.dataset.observedIntervals.map(item => `${number(item.seconds, 3)}s`).join(', ') || '—'} detail="Confirmed intended interval: 15 seconds" />
                <Metric label="Source order" value={analysis.dataset.sourceOrder.replace(/_/g, ' ')} detail={`${analysis.dataset.outOfOrderSampleCount} conflicting transitions`} />
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detected channels</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.dataset.channels.map(item => (
                    <span key={item.id} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      <strong className="capitalize">{item.id.replace(/_/g, ' ')}</strong>
                      {item.rawUnit ? ` · ${item.rawUnit}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Data-quality validation"
                subtitle="Warnings preserve the affected observations. No missing interval is interpolated or silently removed."
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Invalid timestamps" value={number(analysis.dataQuality.invalidTimestampRows, 0)} tone={analysis.dataQuality.invalidTimestampRows ? 'amber' : 'green'} />
                <Metric label="Invalid numbers" value={number(analysis.dataQuality.invalidNumericValues, 0)} tone={analysis.dataQuality.invalidNumericValues ? 'amber' : 'green'} />
                <Metric label="Duplicate rows" value={number(analysis.dataQuality.duplicateTimestampRows, 0)} tone={analysis.dataQuality.duplicateTimestampRows ? 'amber' : 'green'} />
                <Metric label="Unexpected intervals" value={number(analysis.dataset.unexpectedIntervalCount, 0)} tone={analysis.dataset.unexpectedIntervalCount ? 'amber' : 'green'} />
                <Metric label="Unsupported gaps" value={number(analysis.dataQuality.dataGapCount, 0)} tone={analysis.dataQuality.dataGapCount ? 'amber' : 'green'} />
              </div>
              <div className="mt-4 grid gap-2">
                {analysis.dataQuality.warnings.map(warning => (
                  <div key={warning} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {warning}
                  </div>
                ))}
              </div>
            </section>

            <MeasuredDemandSection measuredDemand={analysis.measuredDemand} />

            <section>
              <SectionTitle
                icon={<Activity className="h-5 w-5" />}
                title="Raw observation output"
                subtitle="Statistics use all valid-timestamp parsed observations in the source unit. Charts are visual traces, not engineering event classifications."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {flowPressureStats.map(item => <RawStatisticCard key={item.channelId} item={item} />)}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {analysis.trends.map(trend => <TrendChart key={trend.channelId} trend={trend} />)}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle
                icon={<Table2 className="h-5 w-5" />}
                title="Confirmed civil-time groupings"
                subtitle="Periods are grouped in Africa/Johannesburg. Partial periods are labelled; 100% coverage and no gap over 15 seconds are required to pass."
              />
              <div role="tablist" aria-label="Logger summary period" className="mb-4 flex flex-wrap gap-2">
                {([
                  ['hourly', 'Hourly', analysis.summaries.hourly.length],
                  ['daily', 'Daily', analysis.summaries.daily.length],
                  ['isoWeekly', 'ISO week', analysis.summaries.isoWeekly.length],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    id={`logger-summary-tab-${key}`}
                    type="button"
                    role="tab"
                    aria-selected={summaryTab === key}
                    aria-controls="logger-summary-panel"
                    tabIndex={summaryTab === key ? 0 : -1}
                    onClick={() => setSummaryTab(key)}
                    onKeyDown={event => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      const tabs = Array.from(
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
                      );
                      const currentIndex = tabs.indexOf(event.currentTarget);
                      const nextIndex = event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                      tabs[nextIndex]?.focus();
                      tabs[nextIndex]?.click();
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      summaryTab === key ? 'bg-ars-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label} <span className="ml-1 opacity-70">({count})</span>
                  </button>
                ))}
              </div>
              <div
                id="logger-summary-panel"
                role="tabpanel"
                aria-labelledby={`logger-summary-tab-${summaryTab}`}
              >
                <PeriodTable periods={periods} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle
                icon={<Clock3 className="h-5 w-5" />}
                title="Engineering settings intake"
                subtitle={`${analysis.application.engineeringSettingsVersion} · only confirmed settings shown in green were used.`}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Confirmed and used
                  </div>
                  <div className="grid gap-3">
                    {analysis.engineeringSettings.confirmedUsed.map(setting => <SettingRow key={setting.id} setting={setting} />)}
                  </div>
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Blocked or not used
                  </div>
                  <div className="grid max-h-[46rem] gap-3 overflow-y-auto pr-1">
                    {analysis.engineeringSettings.blockedNotUsed.map(setting => <SettingRow key={setting.id} setting={setting} />)}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle
                icon={<LockKeyhole className="h-5 w-5" />}
                title="Unsupported engineering functions"
                subtitle="Each function stays visibly disabled until its exact questionnaire answer and evidence requirement is satisfied."
              />
              <div className="grid gap-3 lg:grid-cols-2">
                {analysis.disabledCapabilities.map(capability => <DisabledCard key={capability.id} capability={capability} />)}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ars-primary" />
                <div>
                  <p className="font-semibold">Technical validation only</p>
                  <p className="mt-1 leading-6 text-blue-900">
                    No compressor sizing, energy-savings, proposal pricing, FAD/reference-condition conversion,
                    unsupported engineering event, combined-event, or severity conclusion was produced.
                  </p>
                  <p className="mt-2 text-xs text-blue-800">
                    Parser {analysis.application.parserVersion} · Settings {analysis.application.engineeringSettingsVersion} · App {analysis.application.version}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}
