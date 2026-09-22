import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { searchSpecLibrary } from '../api';
import { specDisplayName, hasUsableSourceBacked, sourceBackedLabel, specLibraryResultCopy, effectivePackageInput, effectiveRatedAirflow, effectiveRatedPressure, effectiveMotorShaft } from '../specDisplay';
import { LIBRARY_ADDED_STATUS, LIBRARY_USING_STATUS } from '../confirmSpecSheet';
import { specPickerSearchIsOpen } from '../specPickerSearch';
import { SEARCH_MENU_PANEL, searchMenuWrapClass } from '../searchOverlay';
import { useDismissibleSearchMenu } from '../useDismissibleSearchMenu';
import type { ElectricalPowerKind, PublicMachineSpec, SourceBackedSpec } from '../types';
import type { PublishedFlowReference } from '../publishedFlowReference';
import { resolvePackageInputKw } from '../electricalPowerInput';
import { SpecSheetCapture } from './SpecSheetCapture';
import { PublishedRatingFields } from './PublishedRatingFields';

interface SpecPickerProps {
  proposalId: string;
  label: string;
  placeholder: string;
  scope: 'all' | 'bouwa';
  searchHint?: string;
  selectedSpec: PublicMachineSpec | null;
  sourceBacked: SourceBackedSpec | null;
  changingSpec: boolean;
  capturingSheet: boolean;
  onSelect: (spec: PublicMachineSpec) => void;
  onChangeSpecification: () => void;
  onCapture: () => void;
  onCancelCapture: () => void;
  onApplySource: (values: SourceBackedSpec) => void;
  onConfirmedSource: (result: {
    spec: PublicMachineSpec;
    sourceBacked: SourceBackedSpec;
    created: boolean;
  }) => void;
  onPatchSource: (values: SourceBackedSpec) => void;
  electricalPowerKind?: ElectricalPowerKind | null;
  onElectricalPowerKindChange?: (kind: ElectricalPowerKind) => void;
  flowReference?: PublishedFlowReference | null;
  onFlowReferenceChange?: (next: PublishedFlowReference) => void;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
}

function formatResult(spec: PublicMachineSpec): { title: string; detail: string; source: string | null } {
  const copy = specLibraryResultCopy(spec);
  return { title: copy.title, detail: copy.ratings, source: copy.source };
}

export function SpecPicker({
  proposalId,
  label,
  placeholder,
  scope,
  searchHint = '',
  selectedSpec,
  sourceBacked,
  changingSpec,
  capturingSheet,
  onSelect,
  onChangeSpecification,
  onCapture,
  onCancelCapture,
  onApplySource,
  onConfirmedSource,
  onPatchSource,
  electricalPowerKind = null,
  onElectricalPowerKindChange,
  flowReference = null,
  onFlowReferenceChange,
  advancedOpen = false,
  onAdvancedOpenChange,
}: SpecPickerProps) {
  const [query, setQuery] = useState(searchHint);
  const [results, setResults] = useState<PublicMachineSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { menuOpen, menuRef, openMenu, closeMenu } = useDismissibleSearchMenu();

  useEffect(() => {
    setQuery(searchHint);
  }, [searchHint]);

  const searchOpen = specPickerSearchIsOpen({
    changingSpec,
    capturingSheet,
    selectedSpec,
    sourceBacked,
  });

  useEffect(() => {
    if (!searchOpen) {
      setResults([]);
      return;
    }
    if (!menuOpen) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchSpecLibrary(query, scope)
        .then((specs) => {
          if (!cancelled) {
            setResults(specs);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setResults([]);
            setError(err instanceof Error ? err.message : 'Could not search the Machine Spec Library.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, scope, searchOpen, menuOpen]);

  const missingPower =
    resolvePackageInputKw({
      storedKind: electricalPowerKind,
      packageInputPowerKw: effectivePackageInput(selectedSpec, sourceBacked).value,
      motorShaftPowerKw: effectiveMotorShaft(selectedSpec, sourceBacked).value,
    }).packageInputKw === null;
  const missingAirflow = effectiveRatedAirflow(selectedSpec, sourceBacked).value === null;
  const missingPressure = effectiveRatedPressure(selectedSpec, sourceBacked).value === null;

  if (capturingSheet) {
    return (
      <SpecSheetCapture
        proposalId={proposalId}
        target="proposed"
        initialManufacturer={selectedSpec?.manufacturer || searchHint.split(' ')[0] || ''}
        initialModel={selectedSpec?.model || ''}
        onCancel={onCancelCapture}
        onApply={onApplySource}
        onConfirmed={onConfirmedSource}
      />
    );
  }

  if (selectedSpec && !changingSpec) {
    const formatted = formatResult(selectedSpec);
    return (
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#383838]/70">{label}</p>
        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-medium text-[#383838]">{formatted.title}</p>
          {formatted.detail && <p className="text-xs text-slate-600">{formatted.detail}</p>}
          {formatted.source && <p className="mt-1 text-xs text-slate-500">Source: {formatted.source}</p>}
          {sourceBacked?.sourceFileId && (
            <p className="mt-1 text-xs text-slate-500">{LIBRARY_ADDED_STATUS}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{LIBRARY_USING_STATUS}</p>
        </div>
        <dl className="mt-3 space-y-2">
          <PublishedRatingFields
            library={selectedSpec}
            source={sourceBacked}
            identity={{
              manufacturer: selectedSpec.manufacturer,
              model: selectedSpec.model,
              modelVariant: selectedSpec.modelVariant,
            }}
            electricalPowerKind={electricalPowerKind}
            onSourceChange={onPatchSource}
            onElectricalPowerKindChange={onElectricalPowerKindChange}
            flowReference={flowReference}
            onFlowReferenceChange={onFlowReferenceChange}
            advancedOpen={advancedOpen}
            onAdvancedOpenChange={onAdvancedOpenChange}
          />
        </dl>
        {(missingPower || missingAirflow || missingPressure) && (
          <p className="mt-2 text-xs text-slate-600">
            Enter the missing published ratings, or{' '}
            <button type="button" className="font-medium text-[#0969a9] underline" onClick={onCapture}>
              add from a specification sheet
            </button>
            .
          </p>
        )}
        <button
          type="button"
          onClick={onChangeSpecification}
          className="mt-2 text-xs font-medium text-[#0969a9] underline"
        >
          Change specification
        </button>
      </div>
    );
  }

  if (hasUsableSourceBacked(sourceBacked) && !changingSpec) {
    return (
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#383838]/70">{label}</p>
        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-medium text-[#383838]">
            {specDisplayName({
              manufacturer: sourceBacked?.manufacturer,
              model: sourceBacked?.model,
              modelVariant: sourceBacked?.modelVariant,
            })}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {sourceBackedLabel(sourceBacked)}
          </p>
          <p className="text-xs text-slate-500">These values are not published Machine Spec Library data.</p>
        </div>
        <button
          type="button"
          onClick={onChangeSpecification}
          className="mt-2 text-xs font-medium text-[#0969a9] underline"
        >
          Change specification
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-visible">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#383838]/70">{label}</p>
      <div ref={menuRef} className={searchMenuWrapClass(menuOpen)}>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            openMenu();
          }}
          onClick={openMenu}
          onFocus={openMenu}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeMenu();
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-expanded={menuOpen}
          className="w-full rounded-[8px] border border-slate-300 py-2 pl-9 pr-9 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
        )}
        {menuOpen && (
        <div className={SEARCH_MENU_PANEL}>
          {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}
          {loading && results.length === 0 && (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching the Machine Spec Library…
            </p>
          )}
          {!loading && results.length === 0 && query.trim() !== '' && (
            <p className="px-3 py-2 text-sm text-slate-600">No matching machine found.</p>
          )}
          {results.length > 0 && (
            <ul>
              {results.map((spec) => {
                const formatted = formatResult(spec);
                return (
                  <li key={spec.recordId}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => {
                        closeMenu();
                        onSelect(spec);
                      }}
                    >
                      <p className="text-sm font-medium text-[#383838]">{formatted.title}</p>
                      {formatted.detail && <p className="text-xs text-slate-600">{formatted.detail}</p>}
                      {formatted.source && <p className="text-xs text-slate-500">Source: {formatted.source}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-600">
        Can&apos;t find the machine?{' '}
        <button type="button" className="font-medium text-[#0969a9] underline" onClick={onCapture}>
          Add from specification sheet
        </button>
      </div>
      {sourceBacked?.sourceFileName && (
        <p className="mt-1 text-xs text-slate-500">
          Source-backed values supplied from: {sourceBacked.sourceFileName}
        </p>
      )}
    </div>
  );
}
