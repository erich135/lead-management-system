import React from 'react';
import { AlertCircle, ClipboardList, FileText, Loader2, RefreshCw, Truck, Wrench } from 'lucide-react';
import {
  isGeneralVisitPlannerFormType,
  isVisitSystemPlannerFormType,
  type PublishedVisitFormMeta,
} from './visitFormSelection';

interface DiaryVisitFormChooserProps {
  forms: PublishedVisitFormMeta[];
  loading: boolean;
  error: string | null;
  selectingType: string | null;
  onRetry: () => void;
  onSelect: (type: string) => void;
}

/**
 * Icon for a published visit form card.
 */
function formIcon(type: string): React.ReactNode {
  if (type === 'loan_rental') return <Truck className="h-6 w-6" />;
  if (type === 'new_service_level') return <Wrench className="h-6 w-6" />;
  if (isGeneralVisitPlannerFormType(type)) return <ClipboardList className="h-6 w-6" />;
  return <FileText className="h-6 w-6" />;
}

/**
 * Mobile-first screen for choosing RFC, Loan and Rental, New Service Level,
 * or a published custom General Visit form after starting a generic Visit.
 */
const DiaryVisitFormChooser: React.FC<DiaryVisitFormChooserProps> = ({
  forms,
  loading,
  error,
  selectingType,
  onRetry,
  onSelect,
}) => {
  const cards = forms;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pb-6">
      <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          Which form is required?
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Choose the published form for this visit. Notes and photos open after you select one.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-10 text-sm font-medium text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#0969a9]" />
          Loading published forms…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 shadow-sm">
          <p className="flex items-start gap-2 font-medium">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-red-800 ring-1 ring-red-200"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-2.5">
          {cards.map((card) => {
            const busy = selectingType === card.type;
            return (
              <button
                key={card.type}
                type="button"
                disabled={Boolean(selectingType)}
                onClick={() => onSelect(card.type)}
                className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-[#0969a9]/40 disabled:opacity-60"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0969a9]/10 text-[#0969a9]">
                  {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : formIcon(card.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold text-slate-900">
                    {card.title || card.name}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-slate-600">
                    {card.description}
                  </span>
                  {isVisitSystemPlannerFormType(card.type) ? null : (
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      General Visit
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiaryVisitFormChooser;
