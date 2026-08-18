/**
 * Choosing the tariff the proposal is costed on.
 *
 * A rep is asked one plain question — how the tariff arrived — and then
 * narrowed down a cascade of the register's own choices. They never type a
 * supply authority, a voltage category or a transmission zone, because those
 * are the register's words and a rep guessing at them costs a proposal on a
 * tariff the customer is not on.
 *
 * "Not available yet" is a first-class answer. It says out loud which figures
 * cannot be given until a bill arrives, rather than letting the proposal print
 * a rand saving nobody can support.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Receipt, Search } from 'lucide-react';

import {
  searchTariffLibrary,
  tariffLibraryFacet,
  type TariffLibraryQuery,
} from '../wizardApi';
import {
  TARIFF_CASCADE,
  TARIFF_DEPENDENT_FIGURES,
  TARIFF_ROUTE_OPTIONS,
  cascadeQuestion,
  nextCascadeStep,
  tariffDetailLines,
  tariffRateLines,
  tariffResultLine,
  tariffSnapshotLine,
  type TariffCascadeChoices,
} from '../tariffSelection';
import type {
  WizardTariffFacetField,
  WizardTariffFacetValue,
  WizardTariffRecord,
  WizardTariffRoute,
  WizardTariffSnapshot,
} from '../wizardTypes';

type FacetState = Partial<Record<WizardTariffFacetField, WizardTariffFacetValue[]>>;

export function TariffPicker({
  snapshot,
  route,
  disabled,
  onChoose,
  onUnavailable,
  onClear,
}: {
  snapshot: WizardTariffSnapshot | null;
  route: WizardTariffRoute | null;
  disabled: boolean;
  onChoose: (
    record: WizardTariffRecord,
    route: WizardTariffRoute,
  ) => void;
  onUnavailable: () => void;
  onClear: () => void;
}) {
  const [chosenRoute, setChosenRoute] = useState<WizardTariffRoute | null>(route);
  const [choices, setChoices] = useState<TariffCascadeChoices>({});
  const [facets, setFacets] = useState<FacetState>({});
  const [records, setRecords] = useState<WizardTariffRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState('');
  const [preview, setPreview] = useState<WizardTariffRecord | null>(null);

  const searching =
    chosenRoute === 'searched_tariff_library' ||
    chosenRoute === 'customer_bill_supplied' ||
    chosenRoute === 'previously_confirmed_for_customer';

  const query: TariffLibraryQuery = { ...choices, search: search.trim() || undefined };
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!searching) return;
    let live = true;
    setLoading(true);
    setProblem('');
    const timer = setTimeout(() => {
      const step = nextCascadeStep(choices, facets);
      const wanted: WizardTariffFacetField[] =
        step === null ? [] : [step];
      Promise.all([
        searchTariffLibrary({ ...query, limit: 25 }),
        ...wanted.map(field =>
          tariffLibraryFacet(field, query).then(
            values => [field, values] as const,
          ),
        ),
      ])
        .then(([found, ...facetResults]) => {
          if (!live) return;
          setRecords(found);
          if (facetResults.length > 0)
            setFacets(held => {
              const next = { ...held };
              for (const [field, values] of facetResults as (readonly [
                WizardTariffFacetField,
                WizardTariffFacetValue[],
              ])[])
                next[field] = values;
              return next;
            });
        })
        .catch(() => {
          if (live) setProblem('The tariff library could not be read.');
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // The cascade is keyed on the narrowing itself: a new choice is a new query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, searching]);

  if (snapshot !== null)
    return (
      <ChosenTariff
        snapshot={snapshot}
        disabled={disabled}
        onClear={() => {
          setChosenRoute(null);
          setChoices({});
          setPreview(null);
          onClear();
        }}
      />
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <Receipt className="h-4 w-4 text-ars-primary" />
        Electricity tariff
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        The rate the site actually pays. Choosing the published determination
        fills the supplier, category, voltage, zone, rates and effective dates,
        and records the document they came from.
      </p>

      <p className="mt-2 text-xs font-medium text-slate-700">
        How will the electricity tariff be supplied?
      </p>
      <div className="mt-1.5 space-y-1">
        {TARIFF_ROUTE_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              setChosenRoute(option.id);
              setPreview(null);
              if (option.id === 'not_available_yet') onUnavailable();
            }}
            className={`flex w-full items-start justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
              chosenRoute === option.id
                ? 'border-ars-primary bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            <span className="min-w-0">
              <span className="block font-medium text-slate-800">
                {option.label}
              </span>
              <span className="block text-[11px] text-slate-500">
                {option.detail}
              </span>
            </span>
            {chosenRoute === option.id ? (
              <Check className="h-4 w-4 shrink-0 text-ars-primary" />
            ) : null}
          </button>
        ))}
      </div>

      {chosenRoute === 'not_available_yet' ? (
        <UnavailableNotice />
      ) : null}

      {searching ? (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <Cascade
            choices={choices}
            facets={facets}
            disabled={disabled}
            onChoose={(field, value) =>
              setChoices(held => ({ ...held, [field]: value }))
            }
            onUndo={field =>
              setChoices(held => {
                const next = { ...held };
                delete next[field];
                return next;
              })
            }
          />

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              disabled={disabled}
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Tariff name or code — for example Megaflex"
              className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-8 text-sm disabled:bg-slate-100"
            />
            {loading ? (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
            ) : null}
          </div>

          {problem === '' ? null : (
            <p className="mt-1.5 text-xs text-amber-700">{problem}</p>
          )}
          {!loading && records.length === 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Nothing in the library matches those choices yet. Widen the
              narrowing above, or record the tariff as not available yet.
            </p>
          ) : null}

          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {records.map(record => (
              <li key={record.recordId}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setPreview(record)}
                  className={`flex w-full items-start justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                    preview?.recordId === record.recordId
                      ? 'border-ars-primary bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  } disabled:opacity-50`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800">
                      {tariffResultLine(record)}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {record.summary}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {preview === null ? null : (
            <TariffConfirmation
              record={preview}
              disabled={disabled}
              onConfirm={() =>
                onChoose(preview, chosenRoute ?? 'searched_tariff_library')
              }
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function Cascade({
  choices,
  facets,
  disabled,
  onChoose,
  onUndo,
}: {
  choices: TariffCascadeChoices;
  facets: FacetState;
  disabled: boolean;
  onChoose: (field: WizardTariffFacetField, value: string) => void;
  onUndo: (field: WizardTariffFacetField) => void;
}) {
  const step = nextCascadeStep(choices, facets);
  return (
    <>
      {TARIFF_CASCADE.filter(entry => choices[entry.field] !== undefined).map(
        entry => (
          <p
            key={entry.field}
            className="flex items-center justify-between gap-2 text-[11px] text-slate-600"
          >
            <span>
              <span className="text-slate-400">{entry.label}: </span>
              {choices[entry.field]}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onUndo(entry.field)}
              className="text-[11px] font-medium text-ars-primary hover:underline disabled:opacity-50"
            >
              Change
            </button>
          </p>
        ),
      )}
      {step === null ? null : (
        <div className="mt-1.5">
          <p className="text-xs font-medium text-slate-700">
            {cascadeQuestion(step)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(facets[step] ?? []).map(value => (
              <button
                key={value.value}
                type="button"
                disabled={disabled}
                onClick={() => onChoose(step, value.value)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {value.value}
                <span className="text-slate-400">{value.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** What the register printed, shown before the rep commits to it. */
function TariffConfirmation({
  record,
  disabled,
  onConfirm,
}: {
  record: WizardTariffRecord;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const rates = tariffRateLines(record.periods);
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
      <p className="text-xs font-medium text-slate-700">
        Confirm this is the tariff on the customer’s bill
      </p>
      <dl className="mt-1.5 space-y-0.5">
        {tariffDetailLines(record).map(line => (
          <div key={line.label} className="flex gap-2 text-[11px]">
            <dt className="w-36 shrink-0 text-slate-500">{line.label}</dt>
            <dd className="min-w-0 text-slate-700">{line.value}</dd>
          </div>
        ))}
      </dl>
      {rates.length === 0 ? (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-700">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          This determination publishes no energy rate, so the electricity cost
          cannot be calculated from it.
        </p>
      ) : (
        <dl className="mt-1.5 space-y-0.5 border-t border-slate-200 pt-1.5">
          {rates.map(line => (
            <div key={line.label} className="flex gap-2 text-[11px]">
              <dt className="w-36 shrink-0 text-slate-500">{line.label}</dt>
              <dd className="min-w-0 text-slate-700">{line.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className="mt-2 inline-flex items-center gap-1 rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
      >
        <Check className="h-3 w-3" />
        Cost this proposal on this tariff
      </button>
    </div>
  );
}

function ChosenTariff({
  snapshot,
  disabled,
  onClear,
}: {
  snapshot: WizardTariffSnapshot;
  disabled: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <Receipt className="h-4 w-4 text-ars-primary" />
        Electricity tariff
      </p>
      <p className="mt-1 text-xs font-medium text-slate-700">
        {tariffSnapshotLine(snapshot)}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {snapshot.source.sourceTitle}
        {snapshot.source.sourceDate === null
          ? ''
          : ` · ${snapshot.source.sourceDate}`}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        This proposal keeps these rates even after a new determination is
        published, so the figures it was sent with go on adding up.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className="mt-1.5 text-[11px] font-medium text-ars-primary hover:underline disabled:opacity-50"
      >
        Choose a different tariff
      </button>
    </div>
  );
}

function UnavailableNotice() {
  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
      <p className="flex items-start gap-1 text-[11px] font-medium text-amber-800">
        <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
        The proposal will carry on without a tariff.
      </p>
      <p className="mt-0.5 text-[11px] text-amber-800">
        These figures stay unavailable until a tariff is confirmed:{' '}
        {TARIFF_DEPENDENT_FIGURES.join(', ')}. Everything measured and every
        engineering comparison is unaffected.
      </p>
    </div>
  );
}
