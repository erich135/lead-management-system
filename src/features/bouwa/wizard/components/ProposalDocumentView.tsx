/**
 * The proposal on the page.
 *
 * This is the only component in the wizard a customer ever sees, so it is
 * written for a reader who was not in the room: no field codes, no readiness
 * language, no step names, and every figure either stated or explained.
 *
 * It is laid out at A4 width in pixels rather than in Tailwind's responsive
 * scale, because the same element is captured for the PDF and sent to the
 * printer. What is on the screen and what arrives in the customer's inbox are
 * the same rendering, not two that have to be kept in step.
 */

import type { WizardProposalDocument } from '../wizardTypes';
import {
  addressBlock,
  investmentRows,
  longDate,
  proposalNumericFigureText,
  proposalReleaseState,
} from '../proposalDocumentPresentation';
import { ARS_DEFAULT_HEADER } from '../../../../utils/arsJobCardHeaderDefaults';
import { BaofnCalculatorComparison, CagiReferenceSection, ExistingPerformanceSensitivitySection } from './BaofnCalculatorComparison';

/** A4 at 96dpi, less a 12mm margin each side. Matches the job card reports. */
const PAGE_WIDTH_PX = 794;

const SALES_PROPOSAL_SECTION_IDS = [
  'existing_vs_proposed',
  'existing_performance_sensitivity',
  'cagi_reference',
  'electricity_tariff',
  'existing_energy_cost',
  'proposed_energy_cost',
  'component_comparison',
  'five_year',
  'savings_roi',
  'discrepancies',
  'professional_conclusion',
] as const;

interface ProposalDocumentViewProps {
  document: WizardProposalDocument;
}

function Letterhead({ reference }: { reference: string }) {
  const header = ARS_DEFAULT_HEADER;
  return (
    <div className="flex items-start justify-between gap-6 border-b-2 border-ars-primary pb-3">
      <div className="flex min-w-0 items-start gap-3">
        <img
          src="/Logo.png"
          alt=""
          className="h-14 w-auto shrink-0 object-contain"
        />
        <div className="text-[9px] leading-snug text-gray-700">
          <div className="mb-1 text-[11px] font-bold text-black">
            {header.companyName}
          </div>
          <div>Reg No: {header.registrationNumber}</div>
          <div>VAT No: {header.vatNumber}</div>
          <div>{header.city}</div>
          <div>{header.phone}</div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[9px] uppercase tracking-wide text-gray-500">
          Proposal
        </div>
        <div className="text-base font-bold text-ars-primary">{reference}</div>
      </div>
    </div>
  );
}

function SectionTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; source: string | null }[];
}) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
        {title}
      </h2>
      <table className="w-full text-[10px]">
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="align-top">
              <th
                scope="row"
                className="w-[38%] py-1 pr-3 text-left font-normal text-gray-600"
              >
                {row.label}
              </th>
              <td className="py-1 font-medium text-black">{row.value}</td>
              <td className="w-[26%] py-1 pl-3 text-right text-[9px] text-gray-500">
                {row.source ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DetailedSection({
  section,
}: {
  section: WizardProposalDocument['detailedSections'][number];
}) {
  return (
    <section
      data-proposal-section={section.id}
      className="break-inside-avoid"
    >
      <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
        {section.title}
      </h2>
      {section.figures.length > 0 && (
        <table className="w-full text-[10px]">
          <tbody>
            {section.figures.map((figure, index) => (
              <tr key={`${figure.label}-${index}`} className="align-top">
                <th scope="row" className="w-[42%] py-1 pr-3 text-left font-normal text-gray-600">
                  {figure.label}
                  {figure.hypothetical && (
                    <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-800">
                      Hypothetical
                    </span>
                  )}
                </th>
                <td className={`py-1 font-medium ${figure.available ? 'text-black' : 'text-rose-800'}`}>
                  {proposalNumericFigureText(figure)}
                </td>
                <td className="w-[24%] py-1 pl-3 text-right text-[9px] text-gray-500">
                  {figure.source ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {section.statements.length > 0 && (
        <ul className="mt-1 space-y-1 text-[10px] leading-relaxed text-gray-700">
          {section.statements.map((statement, index) => (
            <li key={`${statement}-${index}`}>{statement}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProposalDocumentView({ document }: ProposalDocumentViewProps) {
  const investment = document.investment;
  const stated = document.figures.filter(figure => figure.available);
  const release = proposalReleaseState(document);
  const salesMode = document.sourceCalculatorComparison?.cagiReference != null;
  const detailedSections = salesMode
    ? SALES_PROPOSAL_SECTION_IDS.map(id =>
        document.detailedSections.find(section => section.id === id),
      ).filter((section): section is NonNullable<typeof section> => section !== undefined)
    : document.detailedSections;

  return (
    <article
      className="bouwa-proposal-document bg-white p-10 text-black"
      style={{ width: `${PAGE_WIDTH_PX}px`, maxWidth: '100%' }}
    >
      <Letterhead reference={document.reference} />

      {!document.preliminaryNotice && document.internalOnlyNotice !== null && (
        <p className="mt-4 border-2 border-rose-500 bg-rose-50 px-3 py-2 text-[10px] font-bold leading-relaxed text-rose-900">
          {document.internalOnlyNotice}
        </p>
      )}
      {!document.preliminaryNotice && (
        <p className={`mt-2 border-l-4 px-3 py-2 text-[10px] font-semibold ${release.allowed ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-rose-500 bg-rose-50 text-rose-900'}`}>
          {release.label}{release.reason === null ? '' : ` — ${release.reason}`}
        </p>
      )}

      <header className="mt-5">
        <h1 className="text-lg font-bold text-ars-heading">
          {document.proposalTypeLabel}
        </h1>
        <div className="mt-2 flex items-start justify-between gap-6 text-[10px]">
          <div className="leading-relaxed">
            <div className="mb-0.5 text-[9px] uppercase tracking-wide text-gray-500">
              Prepared for
            </div>
            {addressBlock(document).map(line => (
              <div key={line} className="font-medium text-black">
                {line}
              </div>
            ))}
          </div>
          <div className="shrink-0 text-right leading-relaxed text-gray-600">
            <div>
              Prepared by{' '}
              <span className="font-medium text-black">
                {document.preparedByName}
              </span>
            </div>
            <div>{longDate(document.preparedAt)}</div>
            {document.version > 0 && (
              <div>
                Version {document.version}, issued{' '}
                {longDate(document.issuedAt)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* What the proposal rests on is said once. The preliminary notice and
          the evidence-level statement carry the same warning in different
          words, so a preliminary document shows the notice and every other
          document shows the statement. */}
      {document.preliminaryNotice ? (
        <p className="mt-4 border-l-4 border-ars-secondary bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
          {document.preliminaryNotice}
        </p>
      ) : (
        <p className="mt-4 text-[10px] leading-relaxed text-gray-700">
          {document.evidenceLevelStatement}
        </p>
      )}

      {document.sensitivityNotice !== null && (
        <p className="mt-2 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
          {document.sensitivityNotice}
        </p>
      )}

      <div className="mt-5">
        <BaofnCalculatorComparison
          comparison={document.sourceCalculatorComparison}
          compact
        />
      </div>

      {stated.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
            What this proposal shows
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
            {stated.map(figure => (
              <li key={figure.label} className="flex items-baseline gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ars-primary" />
                <span className="text-black">{figure.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!salesMode && (
        <div className="mt-5 space-y-5">
          {document.sections.map(section => (
            <SectionTable
              key={section.id}
              title={section.title}
              rows={section.lines}
            />
          ))}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {detailedSections.map(section =>
          section.id === 'existing_performance_sensitivity' ? (
            <ExistingPerformanceSensitivitySection
              key={section.id}
              section={section}
              sensitivity={
                document.sourceCalculatorComparison?.performanceSensitivity ??
                document.sourceCalculatorComparison?.savingsComparison
                  ?.performanceSensitivity
              }
            />
          ) : section.id === 'cagi_reference' ? (
            <CagiReferenceSection
              key={section.id}
              section={section}
              exhibit={document.sourceCalculatorComparison?.cagiReference}
            />
          ) : (
            <DetailedSection key={section.id} section={section} />
          ),
        )}
      </div>

      <section className="mt-5 break-inside-avoid">
        <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
          Investment
        </h2>
        {investment.itemDescription !== null && (
          <p className="mb-2 text-[10px] text-black">
            {investment.itemDescription}
            {investment.quantity !== null && investment.quantity > 1
              ? ` (${investment.quantity} units)`
              : ''}
          </p>
        )}
        {investment.netInitialInvestmentRand === null ? (
          <p className="text-[10px] leading-relaxed text-gray-700">
            {investment.priceStatement}
          </p>
        ) : (
          <>
            <table className="w-full text-[10px]">
              <tbody>
                {investmentRows(document).map(row => (
                  <tr
                    key={row.label}
                    className={
                      row.emphasis ? 'border-t border-gray-300' : undefined
                    }
                  >
                    <th
                      scope="row"
                      className={`py-1 text-left ${
                        row.emphasis
                          ? 'pt-2 font-bold text-black'
                          : 'font-normal text-gray-600'
                      }`}
                    >
                      {row.label}
                    </th>
                    <td
                      className={`py-1 text-right ${
                        row.emphasis
                          ? 'pt-2 text-[12px] font-bold text-ars-primary'
                          : 'font-medium text-black'
                      }`}
                    >
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[9px] leading-relaxed text-gray-600">
              {investment.priceStatement}
            </p>
          </>
        )}
      </section>

      {document.evidence.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
            What this rests on
          </h2>
          <ul className="space-y-1 text-[10px]">
            {document.evidence.map((entry, index) => (
              <li key={`${entry.title}-${index}`} className="text-gray-700">
                <span className="font-medium text-black">{entry.title}</span>
                {entry.organisation !== null && ` · ${entry.organisation}`}
                {entry.date !== null && ` · ${longDate(entry.date)}`}
                {entry.reference !== null && ` · ${entry.reference}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {document.assumptions.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
            What these figures assume
          </h2>
          <ul className="space-y-1 text-[10px] text-gray-700">
            {document.assumptions.map(assumption => (
              <li key={assumption.label}>
                <span className="font-medium text-black">
                  {assumption.label}.
                </span>{' '}
                {assumption.statement}
              </li>
            ))}
          </ul>
        </section>
      )}

      {document.outstandingEvidence.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
            Notes
          </h2>
          <ul className="space-y-1 text-[10px] text-gray-700">
            {document.outstandingEvidence.map(entry => (
              <li key={entry.label}>
                <span className="font-medium text-black">{entry.label}.</span>{' '}
                {entry.statement}
                {entry.expectedBy !== null &&
                  ` Expected by ${longDate(entry.expectedBy)}.`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {document.limitations.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
            What this proposal does not state
          </h2>
          <ul className="space-y-1 text-[10px] text-gray-700">
            {document.limitations.map(limitation => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-6 border-t border-gray-300 pt-2 text-[8px] leading-relaxed text-gray-500">
        {ARS_DEFAULT_HEADER.companyName} · {document.reference}
        {document.version > 0 ? ` · Version ${document.version}` : ' · Preview'}
      </footer>
    </article>
  );
}

export default ProposalDocumentView;
