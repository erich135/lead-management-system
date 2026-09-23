import {
  extractSignatureDataUrl,
  presentSalesRequestForm,
} from '../utils/salesRequestFormPresentation';

interface SalesRequestFormPresentationProps {
  requestType?: string;
  formData?: unknown;
}

/**
 * Read-only RFQ form: labelled sections matching the on-screen / PDF layout.
 */
export function SalesRequestFormPresentation({
  requestType = '',
  formData,
}: SalesRequestFormPresentationProps) {
  let sections: ReturnType<typeof presentSalesRequestForm> = [];
  let signature: string | null = null;
  try {
    sections = presentSalesRequestForm(requestType, formData);
    signature = extractSignatureDataUrl(formData);
  } catch {
    return <p className="text-sm text-rose-700">This form could not be displayed.</p>;
  }

  if (sections.length === 0 && !signature) {
    return <p className="text-sm text-slate-500">No form values were captured.</p>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            {section.title}
          </h4>
          <dl className="grid gap-2 sm:grid-cols-[180px_1fr]">
            {section.rows.map((row) => (
              <div key={`${section.title}-${row.label}`} className="contents">
                <dt className="text-xs font-semibold uppercase text-slate-500">{row.label}</dt>
                <dd className="whitespace-pre-wrap break-words text-sm text-slate-900">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {signature ? (
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            Customer signature
          </h4>
          <img src={signature} alt="Customer signature" className="max-h-40 max-w-full" />
        </section>
      ) : null}
    </div>
  );
}
