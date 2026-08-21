/**
 * Choosing the tariff the proposal is costed on.
 *
 * Suggested records from site location and previous proposals come first. The
 * salesperson is not dropped into the full register unless they open a search.
 * Location never proves who bills the site, so a unique remainder is the only
 * case that is filled in automatically.
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Receipt, Search } from 'lucide-react';

import {
  fetchTariffSuggestions,
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
  selectedTariffOriginLabel,
  shouldAutoApplyTariffSuggestion,
  suggestionOriginLabel,
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
  WizardTariffSuggestions,
} from '../wizardTypes';

type FacetState = Partial<Record<WizardTariffFacetField, WizardTariffFacetValue[]>>;

const SUPPLY_AUTHORITY_OPTIONS: {
  id: 'national_utility' | 'municipality' | 'not_sure';
  label: string;
}[] = [
  { id: 'national_utility', label: 'Eskom' },
  { id: 'municipality', label: 'Municipality' },
  { id: 'not_sure', label: 'Not sure' },
];

export function TariffPicker({
  draftId,
  snapshot,
  route,
  suppliedRate,
  suggestionDeclined,
  disabled,
  onChoose,
  onUnavailable,
  onClear,
  onUploadBill,
}: {
  draftId: string;
  snapshot: WizardTariffSnapshot | null;
  route: WizardTariffRoute | null;
  suppliedRate: number | null;
  suggestionDeclined: boolean;
  disabled: boolean;
  onChoose: (
    record: WizardTariffRecord,
    route: WizardTariffRoute,
    evidenceReference: string | null,
  ) => void;
  onUnavailable: () => void;
  onClear: () => void;
  onUploadBill: (file: File) => Promise<boolean>;
}) {
  const [chosenRoute, setChosenRoute] = useState<WizardTariffRoute | null>(route);
  const [choices, setChoices] = useState<TariffCascadeChoices>({});
  const [facets, setFacets] = useState<FacetState>({});
  const [records, setRecords] = useState<WizardTariffRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState('');
  const [preview, setPreview] = useState<WizardTariffRecord | null>(null);
  const [billReference, setBillReference] = useState('');
  const [uploadingBill, setUploadingBill] = useState(false);
  const [suggestions, setSuggestions] = useState<WizardTariffSuggestions | null>(
    null,
  );
  const [suggesting, setSuggesting] = useState(false);
  const [supplyAuthority, setSupplyAuthority] = useState<
    'national_utility' | 'municipality' | 'not_sure' | null
  >(null);
  const [voltageFilter, setVoltageFilter] = useState<string | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const autoApplied = useRef(false);

  const searching =
    chosenRoute === 'searched_tariff_library' ||
    chosenRoute === 'customer_bill_supplied' ||
    chosenRoute === 'previously_confirmed_for_customer' ||
    showManualSearch;

  const query: TariffLibraryQuery = { ...choices, search: search.trim() || undefined };
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (snapshot !== null) return;
    let live = true;
    setSuggesting(true);
    void fetchTariffSuggestions(draftId, {
      supplyAuthority,
      voltageCategory: voltageFilter,
    })
      .then(next => {
        if (!live) return;
        setSuggestions(next);
      })
      .catch(() => {
        if (live) setProblem('Suggested tariffs could not be read.');
      })
      .finally(() => {
        if (live) setSuggesting(false);
      });
    return () => {
      live = false;
    };
  }, [draftId, snapshot, supplyAuthority, voltageFilter]);

  useEffect(() => {
    if (disabled || snapshot !== null || suggestions === null) return;
    if (autoApplied.current) return;
    if (
      !shouldAutoApplyTariffSuggestion({
        autoSelectRecordId: suggestions.autoSelectRecordId,
        snapshot,
        suppliedRate,
        suggestionDeclined,
      })
    )
      return;
    const chosen = suggestions.candidates.find(
      candidate => candidate.recordId === suggestions.autoSelectRecordId,
    )?.record;
    const appliedRoute = suggestions.autoSelectRoute;
    if (chosen === null || chosen === undefined || appliedRoute === null) return;
    autoApplied.current = true;
    onChoose(chosen, appliedRoute, null);
  }, [
    disabled,
    snapshot,
    suggestions,
    suppliedRate,
    suggestionDeclined,
    onChoose,
  ]);

  useEffect(() => {
    if (supplyAuthority !== 'national_utility') return;
    if (suggestions === null) return;
    if (suggestions.candidates.length > 0) return;
    setShowManualSearch(true);
    setChosenRoute('searched_tariff_library');
    setChoices(held =>
      held.supplier === 'Eskom' ? held : { ...held, supplier: 'Eskom' },
    );
  }, [supplyAuthority, suggestions]);

  useEffect(() => {
    if (!searching) return;
    let live = true;
    setLoading(true);
    setProblem('');
    const timer = setTimeout(() => {
      const step = nextCascadeStep(choices, facets);
      const wanted: WizardTariffFacetField[] = step === null ? [] : [step];
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
        route={route}
        disabled={disabled}
        onClear={() => {
          autoApplied.current = true;
          setChosenRoute(null);
          setChoices({});
          setPreview(null);
          setShowManualSearch(false);
          onClear();
        }}
      />
    );

  const suggestedRecords = (suggestions?.candidates ?? []).filter(
    candidate => candidate.record !== null,
  );
  const uniqueSuggestion =
    suggestions?.autoSelectRecordId !== null &&
    suggestions?.candidates.length === 1
      ? suggestions.candidates[0]
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <Receipt className="h-4 w-4 text-ars-primary" />
        Electricity tariff
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        Suggested from the site location and any tariff this site already used.
        Location does not prove who bills the site, so a suggestion is confirmed
        before the proposal is costed on it.
      </p>

      {suggesting ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Finding likely tariffs…
        </p>
      ) : null}

      {suggestions?.basedOn.length ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Based on: {suggestions.basedOn.join(' / ')}
        </p>
      ) : null}

      {suggestions?.noConfidentMatch ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
          <p className="text-xs font-medium text-amber-900">
            No confident tariff-library match found.
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            Enter a supplied electricity rate below, search the library, or leave
            the tariff outstanding. Engineering comparisons can continue.
          </p>
        </div>
      ) : null}

      {suggestions?.needsDiscriminator === 'supply_authority' ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-700">Supply authority</p>
          <p className="text-[11px] text-slate-500">
            A site inside a municipality may still be billed by Eskom.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SUPPLY_AUTHORITY_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => setSupplyAuthority(option.id)}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                  supplyAuthority === option.id
                    ? 'border-ars-primary bg-blue-50 text-slate-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {suggestions?.needsDiscriminator === 'voltage' &&
      (suggestions.voltageOptions.length > 0) ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-700">Supply voltage</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.voltageOptions.map(value => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => setVoltageFilter(value)}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                  voltageFilter === value
                    ? 'border-ars-primary bg-blue-50 text-slate-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {uniqueSuggestion?.record ? (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2">
          <p className="text-xs font-medium text-blue-900">Suggested tariff</p>
          <p className="mt-0.5 text-xs font-medium text-slate-800">
            {tariffResultLine(uniqueSuggestion.record)}
          </p>
          <p className="text-[11px] text-blue-800">
            {suggestionOriginLabel(uniqueSuggestion.origin)}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              uniqueSuggestion.record &&
              onChoose(
                uniqueSuggestion.record,
                suggestions?.autoSelectRoute ?? 'searched_tariff_library',
                null,
              )
            }
            className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-ars-primary px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            Use this tariff
          </button>
        </div>
      ) : suggestedRecords.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-700">Suggested tariffs</p>
          <ul className="mt-1.5 space-y-1">
            {suggestedRecords.map(candidate => (
              <li key={candidate.recordId}>
                <button
                  type="button"
                  disabled={disabled || candidate.record === null}
                  onClick={() =>
                    candidate.record !== null && setPreview(candidate.record)
                  }
                  className={`flex w-full items-start justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                    preview?.recordId === candidate.recordId
                      ? 'border-ars-primary bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  } disabled:opacity-50`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800">
                      {candidate.record
                        ? tariffResultLine(candidate.record)
                        : candidate.tariffName}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {suggestionOriginLabel(candidate.origin)}
                      {candidate.reasons[0] ? ` · ${candidate.reasons[0]}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suppliedRate !== null && snapshot === null ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Estimated/manual rate currently on this proposal: R{suppliedRate.toFixed(2)}/kWh
          supplied for this proposal.
        </p>
      ) : null}

      <p className="mt-3 text-xs font-medium text-slate-700">
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
              if (option.id === 'searched_tariff_library')
                setShowManualSearch(true);
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

      {chosenRoute === 'customer_bill_supplied' ? (
        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2">
          <p className="text-[11px] font-medium text-blue-900">
            Upload the billed electricity account
          </p>
          <p className="text-[11px] text-blue-800">
            The account identifies the customer’s tariff. GPS and municipality
            boundaries are not tariff evidence.
          </p>
          <input
            type="file"
            accept=".pdf,image/*"
            disabled={disabled || uploadingBill}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file === undefined) return;
              setUploadingBill(true);
              void onUploadBill(file)
                .then(saved => {
                  if (saved) setBillReference(file.name);
                })
                .finally(() => setUploadingBill(false));
            }}
            className="mt-1.5 block w-full text-[11px] text-slate-600"
          />
          <input
            value={billReference}
            disabled={disabled}
            onChange={event => setBillReference(event.target.value)}
            placeholder="Bill or electricity-account reference"
            className="mt-1.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:bg-slate-100"
          />
        </div>
      ) : null}

      {chosenRoute === 'previously_confirmed_for_customer' ? (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
          Choose a tariff previously confirmed against this customer’s electricity
          account. Location alone does not qualify a tariff.
        </p>
      ) : null}

      {!showManualSearch && chosenRoute !== 'searched_tariff_library' ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setShowManualSearch(true);
            setChosenRoute('searched_tariff_library');
            const municipal = suggestions?.matchedSuppliers.find(
              supplier => supplier.supplierType === 'municipality',
            );
            if (municipal !== undefined && choices.supplier === undefined)
              setChoices(held => ({ ...held, supplier: municipal.name }));
          }}
          className="mt-2 text-[11px] font-medium text-ars-primary hover:underline disabled:opacity-50"
        >
          Search the tariff library
        </button>
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
              placeholder="Supplier, municipality, tariff name, code, voltage or category"
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
              narrowing above, or enter a supplied electricity rate below.
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
                onChoose(
                  preview,
                  chosenRoute === 'customer_bill_supplied' ||
                    chosenRoute === 'previously_confirmed_for_customer'
                    ? chosenRoute
                    : 'searched_tariff_library',
                  billReference.trim() || null,
                )
              }
            />
          )}
        </div>
      ) : preview === null ? null : (
        <TariffConfirmation
          record={preview}
          disabled={disabled}
          onConfirm={() =>
            onChoose(preview, 'searched_tariff_library', null)
          }
        />
      )}
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
  route,
  disabled,
  onClear,
}: {
  snapshot: WizardTariffSnapshot;
  route: WizardTariffRoute | null;
  disabled: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <Receipt className="h-4 w-4 text-ars-primary" />
        Electricity tariff
      </p>
      <p className="mt-1 text-[11px] font-medium text-ars-primary">
        {selectedTariffOriginLabel(route)}
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
        Change for this proposal
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
