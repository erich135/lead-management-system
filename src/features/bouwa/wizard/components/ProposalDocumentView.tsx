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
  investmentAmount,
  longDate,
  totalRows,
} from '../proposalDocumentPresentation';
import { ARS_DEFAULT_HEADER } from '../../../../utils/arsJobCardHeaderDefaults';

/** A4 at 96dpi, less a 12mm margin each side. Matches the job card reports. */
const PAGE_WIDTH_PX = 794;

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

export function ProposalDocumentView({ document }: ProposalDocumentViewProps) {
  const investment = document.investment;
  const stated = document.figures.filter(figure => figure.available);
  const unstated = document.figures.filter(figure => !figure.available);

  return (
    <article
      className="bouwa-proposal-document bg-white p-10 text-black"
      style={{ width: `${PAGE_WIDTH_PX}px`, maxWidth: '100%' }}
    >
      <Letterhead reference={document.reference} />

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

      {document.preliminaryNotice !== null && (
        <p className="mt-4 border-l-4 border-ars-secondary bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
          {document.preliminaryNotice}
        </p>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-gray-700">
        <span className="font-semibold text-ars-heading">
          {document.evidenceLevelLabel}.
        </span>{' '}
        {document.evidenceLevelStatement}
      </p>

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

      <div className="mt-5 space-y-5">
        {document.sections.map(section => (
          <SectionTable
            key={section.id}
            title={section.title}
            rows={section.lines}
          />
        ))}
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
                {investment.lines
                  .filter(line => !line.notIncluded)
                  .map(line => (
                    <tr key={line.label}>
                      <th
                        scope="row"
                        className="py-1 text-left font-normal text-gray-600"
                      >
                        {line.label}
                      </th>
                      <td className="py-1 text-right font-medium text-black">
                        {investmentAmount(line)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <table className="mt-2 w-full border-t border-gray-300 text-[10px]">
              <tbody>
                {totalRows(document).map(row => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className={`py-1 text-left ${
                        row.emphasis
                          ? 'font-bold text-black'
                          : 'font-normal text-gray-600'
                      }`}
                    >
                      {row.label}
                    </th>
                    <td
                      className={`py-1 text-right ${
                        row.emphasis
                          ? 'text-[12px] font-bold text-ars-primary'
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

      {unstated.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1.5 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wide text-ars-heading">
            What this proposal does not state
          </h2>
          <ul className="space-y-1 text-[10px] text-gray-700">
            {unstated.map(figure => (
              <li key={figure.label}>
                <span className="font-medium text-black">{figure.label}:</span>{' '}
                {figure.unavailableReason}
              </li>
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
