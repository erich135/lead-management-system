import React from 'react';
import { AlertCircle, FileText, Loader2, RefreshCw, Truck, Wrench } from 'lucide-react';
import {
  type VisitSystemPlannerFormType,
  type PublishedVisitFormMeta,
} from './visitFormSelection';

interface DiaryVisitFormChooserProps {
  forms: PublishedVisitFormMeta[];
  loading: boolean;
  error: string | null;
  selectingType: VisitSystemPlannerFormType | null;
  onRetry: () => void;
  onSelect: (type: VisitSystemPlannerFormType) => void;
}

const FORM_ICONS: Record<VisitSystemPlannerFormType, React.ReactNode> = {
  rfc: <FileText className="h-6 w-6" />,
  loan_rental: <Truck className="h-6 w-6" />,
  new_service_level: <Wrench className="h-6 w-6" />,
};

/**
 * Mobile-first screen for choosing RFC, Loan and Rental, or New Service Level
 * after starting a generic Visit. Notes/photos/submit stay hidden until a choice is made.
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
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-8 text-sm font-medium text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#0969a9]" />
          Loading published forms…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
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
            const type = card.type as VisitSystemPlannerFormType;
            const busy = selectingType === type;
            return (
              <button
                key={type}
                type="button"
                disabled={Boolean(selectingType)}
                onClick={() => onSelect(type)}
                className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-[#0969a9]/40 disabled:opacity-60"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0969a9]/10 text-[#0969a9]">
                  {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : FORM_ICONS[type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold text-slate-900">
                    {card.title || card.name}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-slate-600">
                    {card.description}
                  </span>
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
