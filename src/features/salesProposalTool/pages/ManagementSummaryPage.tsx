import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSalesProposal, downloadCustomerProposalPdf } from '../api';
import { customerProposalCalculationBasisCopy } from '../electricityCalculationBasis';
import { machineDisplayName } from '../machineDisplayName';
import {
  commercialPositionNote,
  humanizeTimestamps,
  offerMode,
  offerTermRows,
  paybackPresentation,
  readableProposalReference,
  type OfferMode,
} from '../managementSummaryPresentation';
import { readReportSnapshot, rememberReportSnapshot } from '../reportSnapshot';
import { SALES_PROPOSAL_TOOL_PATH, salesProposalEditorPath, salesProposalPreviewPath } from '../navigation';
import type { CommercialOffer, CustomerProposalDocument, SalesProposal } from '../types';

export function ManagementSummaryPage() {
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState<SalesProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!proposalId) return;
    const cached = readReportSnapshot(proposalId, 0);
    const load = cached ? Promise.resolve(cached) : getSalesProposal(proposalId);
    let cancelled = false;
    void load
      .then((loaded) => {
        if (cancelled) return;
        rememberReportSnapshot(loaded);
        setProposal(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this proposal.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  const doc = proposal?.customerProposal ?? null;
  const revision = proposal?.revision ?? doc?.revision ?? 1;

  async function download() {
    const sheet = window.document.querySelector('.spt-customer-proposal-document');
    if (!proposalId || !sheet || !proposal) return;
    const fresh = await getSalesProposal(proposalId);
    if ((fresh.revision ?? 1) !== revision) {
      setError(`This proposal is now revision ${fresh.revision ?? 1}. Open it again before downloading.`);
      setProposal(null);
      return;
    }
    const styles = [
      ...window.document.querySelectorAll('link[rel="stylesheet"]'),
      ...window.document.querySelectorAll('style'),
    ].map((node) => node.outerHTML).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${window.location.origin}/">${styles}</head><body><div class="spt-customer-proposal-print-root">${sheet.outerHTML}</div></body></html>`;
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadCustomerProposalPdf(proposalId, html, revision, 'management-summary');
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = 'Compressed Air Proposal - Management Summary.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the proposal PDF.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="spt-customer-proposal-print-root">
      <div className="spt-customer-proposal-toolbar print:hidden">
        <div className="spt-customer-proposal-toolbar-inner">
          <Link to={proposalId ? salesProposalEditorPath(proposalId) : SALES_PROPOSAL_TOOL_PATH} className="spt-customer-proposal-back">
            Back to editor
          </Link>
          <Link to={proposalId ? salesProposalPreviewPath(proposalId) : SALES_PROPOSAL_TOOL_PATH} className="spt-customer-proposal-back">
            Technical Report
          </Link>
          <button type="button" className="spt-customer-proposal-print-button" onClick={() => void download()} disabled={!doc || downloading}>
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {loading && <p className="spt-customer-proposal-status">Opening management summary…</p>}
      {error && <p className="spt-customer-proposal-status spt-customer-proposal-error">{error}</p>}
      {doc && (
        <ManagementSummaryDocument
          doc={doc}
          offer={proposal?.commercialOffer ?? null}
          revision={revision}
        />
      )}
    </div>
  );
}

export function ManagementSummaryDocument({
  doc,
  offer,
  revision,
}: {
  doc: CustomerProposalDocument;
  offer: CommercialOffer | null;
  revision: number;
}) {
  const mode = offerMode(doc, offer);
  const reference = readableProposalReference(doc.reference);
  const identity = `${doc.preparedFor ?? 'Customer'} · ${doc.siteName ?? 'Site'} · ${doc.date ?? ''} · ${reference} · revision ${revision}`;
  return (
    <div className="spt-customer-proposal-canvas spt-customer-proposal-document">
      <SummaryPage identity={identity}>
        <ExecutivePage doc={doc} offer={offer} mode={mode} reference={reference} revision={revision} />
      </SummaryPage>
      <SummaryPage identity={identity}>
        <ComparisonPage doc={doc} />
      </SummaryPage>
      <SummaryPage identity={identity} last>
        <CommercialPage doc={doc} offer={offer} mode={mode} />
      </SummaryPage>
    </div>
  );
}

function SummaryPage({
  identity,
  last = false,
  children,
}: {
  identity: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`spt-customer-proposal-sheet spt-ms-page${last ? ' spt-ms-last' : ''}`}>
      <header className="spt-proposal-letterhead">
        <div className="spt-proposal-letterhead-row">
          <img src="/ars-letterhead/logo.png" alt="Air Rotary Services" className="spt-proposal-logo" />
          <div className="spt-proposal-letterhead-contact">
            <div className="spt-proposal-company-name">Air Rotory Services (Pty) Ltd</div>
            <div>Tel: 086 1279 765</div>
            <div>accounts@apxsolutions.co.za</div>
          </div>
        </div>
        <p className="spt-ms-note">{identity}</p>
      </header>
      {children}
    </article>
  );
}

function ExecutivePage({
  doc,
  offer,
  mode,
  reference,
  revision,
}: {
  doc: CustomerProposalDocument;
  offer: CommercialOffer | null;
  mode: OfferMode;
  reference: string;
  revision: number;
}) {
  const proposed = proposedNames(doc);
  const current = doc.currentMachines.map((machine) => machineDisplayName(machine.name, '')).filter(Boolean);
  const payback = paybackPresentation(doc, mode);
  const position = commercialPositionNote(mode);
  const commitment = offerTermRows(offer, mode)[0];
  return (
    <>
      <p className="spt-ms-kicker">Management summary</p>
      <h1 className="spt-ms-title">Compressed air proposal</h1>
      <p className="spt-ms-lead">
        Prepared for {doc.preparedFor ?? 'the customer'}
        {doc.siteName ? ` at ${doc.siteName}` : ''}
        {doc.siteLocation ? `, ${doc.siteLocation}` : ''}. {doc.date ?? ''} · {reference} · revision {revision}.
      </p>
      <h2 className="spt-proposal-h2">Recommendation</h2>
      <p className="spt-proposal-body">{doc.recommendation}</p>
      {proposed.length > 0 && (
        <p className="spt-proposal-body">Proposed equipment: {proposed.join('; ')}.</p>
      )}
      <p className="spt-proposal-body">
        {current.length > 0
          ? `The current installation is ${current.join('; ')}.`
          : 'The current installation is recorded in the Technical Report.'}{' '}
        {doc.purposeLead}
      </p>
      <div className="spt-ms-grid">
        <div className="spt-ms-metric">
          <span>{commitment?.label ?? 'Commercial commitment'}</span>
          <strong>{commitment?.value ?? doc.commercial.investment ?? 'See commercial page'}</strong>
        </div>
        <div className="spt-ms-metric">
          <span>Final annual electricity saving</span>
          <strong>{doc.requiresRevision ? 'Withheld' : doc.electricity.saving ?? 'Not available'}</strong>
        </div>
        <div className="spt-ms-metric">
          <span>Average monthly electricity saving</span>
          <strong>{doc.requiresRevision ? 'Withheld' : doc.electricity.averageMonthlySaving ?? 'Not available'}</strong>
        </div>
      </div>
      <p className="spt-ms-note">
        Average monthly electricity saving is the annual electricity saving divided by 12. It is not a forecast for a particular month.
      </p>
      {payback && 'value' in payback && (
        <p className="spt-proposal-body"><strong>{payback.label}.</strong> {payback.value}</p>
      )}
      {payback && 'explanation' in payback && <p className="spt-proposal-body">{payback.explanation}</p>}
      {position && <p className="spt-proposal-body">{position}</p>}
      {doc.commercial.saving && (
        <p className="spt-proposal-body">
          <strong>{doc.commercial.savingHeadline || 'Net position'}.</strong> {doc.commercial.saving}
          {doc.commercial.current && doc.commercial.proposed
            ? ` Current estimated annual cost ${doc.commercial.current}. Proposed estimated annual cost ${doc.commercial.proposed}.`
            : ''}
        </p>
      )}
    </>
  );
}

function ComparisonPage({ doc }: { doc: CustomerProposalDocument }) {
  const basis = customerProposalCalculationBasisCopy(doc.electricityCalculationBasis);
  const proposedList = doc.proposedMachines?.length
    ? doc.proposedMachines
    : doc.proposed.name
      ? [{ name: doc.proposed.name, quantity: doc.proposed.quantity ?? 1, publishedAirflow: doc.proposed.publishedAirflow, publishedPressure: doc.proposed.publishedPressure, packageInput: doc.proposed.packageInput, estimatedAirflow: doc.proposed.estimatedAirflow }]
      : [];
  return (
    <>
      <p className="spt-ms-kicker">Current system and proposed solution</p>
      <h1 className="spt-ms-title">What changes</h1>
      <h2 className="spt-proposal-h2">Equipment</h2>
      <table className="spt-proposal-table">
        <thead>
          <tr>
            <th>Current</th>
            <th>Proposed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {doc.currentMachines.length === 0 && 'No current machine is recorded.'}
              {doc.currentMachines.map((machine) => (
                <div key={machine.name}>
                  {machine.quantity && machine.quantity > 1 ? `${machine.quantity} × ` : ''}
                  {machineDisplayName(machine.name, '')}
                  {machine.publishedAirflow ? ` · published airflow ${machine.publishedAirflow}` : ''}
                </div>
              ))}
            </td>
            <td>
              {proposedList.length === 0 && 'No proposed machine is selected.'}
              {proposedList.map((machine) => (
                <div key={machine.name}>
                  {machine.quantity > 1 ? `${machine.quantity} × ` : ''}
                  {machineDisplayName(machine.name, '')}
                  {machine.publishedAirflow ? ` · published airflow ${machine.publishedAirflow}` : ''}
                  {machine.estimatedAirflow ? ` · site-adjusted ${machine.estimatedAirflow}` : ''}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      {doc.technicalRows.length > 0 && (
        <table className="spt-proposal-table">
          <thead>
            <tr>
              <th>Comparison</th>
              <th className="spt-ms-num">Current</th>
              <th className="spt-ms-num">Proposed</th>
            </tr>
          </thead>
          <tbody>
            {doc.technicalRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="spt-ms-num">{row.current ?? '—'}</td>
                <td className="spt-ms-num">{row.proposed ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="spt-proposal-body">
        Published capacity is the manufacturer rating. Site-adjusted capacity, where shown, applies the site altitude and intake temperature already used in the proposal. Measured demand is the air audit, and it is not the same figure as either published rating.
      </p>
      {doc.airAudit.sourceFile && (
        <>
          <h2 className="spt-proposal-h2">Air audit</h2>
          <p className="spt-proposal-body">
            {doc.airAudit.measuredHeading}. File: {doc.airAudit.sourceFile}.
            {doc.airAudit.period ? ` Recording period on the file: ${humanizeTimestamps(doc.airAudit.period)}.` : ''}
            {doc.airAudit.meanAirflow ? ` Mean measured airflow ${doc.airAudit.meanAirflow}.` : ''}
            {doc.airAudit.p90Airflow ? ` P90 measured airflow ${doc.airAudit.p90Airflow}.` : ''}
            {doc.airAudit.highestAirflow ? ` Highest measured airflow ${doc.airAudit.highestAirflow}.` : ''}
          </p>
        </>
      )}
      <h2 className="spt-proposal-h2">Calculation basis</h2>
      <p className="spt-proposal-body"><strong>{basis.title}.</strong> {basis.explanation}</p>
      {doc.electricity.chartCurrentRand != null && doc.electricity.chartProposedRand != null && !doc.requiresRevision && (
        <p className="spt-proposal-body">
          Annual electricity cost after the variable-speed-drive allowance: current {doc.electricity.current ?? '—'}, proposed {doc.electricity.proposed ?? '—'}.
        </p>
      )}
    </>
  );
}

function CommercialPage({
  doc,
  offer,
  mode,
}: {
  doc: CustomerProposalDocument;
  offer: CommercialOffer | null;
  mode: OfferMode;
}) {
  const terms = offerTermRows(offer, mode);
  const years = decisionYears(doc.financialBenefit?.years ?? []);
  return (
    <>
      <p className="spt-ms-kicker">Commercial offer and decision</p>
      <h1 className="spt-ms-title">{offerTitle(mode)}</h1>
      {terms.length > 0 && (
        <table className="spt-proposal-table">
          <thead>
            <tr>
              <th>Term</th>
              <th className="spt-ms-num">Entered on this proposal</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="spt-ms-num">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {doc.commercial.purchaseLines.length > 0 && mode === 'purchase' && (
        <table className="spt-proposal-table">
          <tbody>
            {doc.commercial.purchaseLines.map((line) => (
              <tr key={line.label}>
                <td>{line.label}</td>
                <td className="spt-ms-num">{line.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {doc.commercial.costRows.length > 0 && (
        <>
          <h2 className="spt-proposal-h2">Annual comparison</h2>
          <table className="spt-proposal-table">
            <thead>
              <tr>
                <th></th>
                <th className="spt-ms-num">Current</th>
                <th className="spt-ms-num">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {doc.commercial.costRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="spt-ms-num">{row.current ?? 'Not entered'}</td>
                  <td className="spt-ms-num">{row.proposed ?? 'Not entered'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {mode === 'rent_to_own' && offer?.rentToOwn.ownershipConfirmed === true && offer.rentToOwn.finalTransferPaymentRand != null && (
        <p className="spt-proposal-body">Ownership transfer after the payment term is confirmed, including the final transfer payment shown above.</p>
      )}
      {mode === 'rent_to_own' && offer?.rentToOwn.ownershipConfirmed === true && offer.rentToOwn.finalTransferPaymentRand == null && (
        <p className="spt-proposal-body">This proposal records that ownership transfers after the term. The final transfer payment has not been entered, so it is not treated as zero.</p>
      )}
      {mode === 'rent_to_own' && offer?.rentToOwn.ownershipConfirmed === false && (
        <p className="spt-proposal-body">Ownership transfer after the term has not been confirmed. A blank final transfer payment is not treated as zero.</p>
      )}
      {years.length > 0 && (
        <>
          <h2 className="spt-proposal-h2">Existing projection</h2>
          <table className="spt-proposal-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="spt-ms-num">Payments</th>
                <th className="spt-ms-num">Net benefit</th>
                <th className="spt-ms-num">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {years.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td className="spt-ms-num">{row.rentalPaid}</td>
                  <td className="spt-ms-num">{row.netBenefit}</td>
                  <td className="spt-ms-num">{row.cumulative}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {doc.financialBenefit?.note && <p className="spt-ms-note">{doc.financialBenefit.note}</p>}
        </>
      )}
      {(doc.financialBenefit?.figures.length ?? 0) > 0 && (
        <table className="spt-proposal-table">
          <tbody>
            {doc.financialBenefit?.figures.map((figure) => (
              <tr key={figure.label}>
                <td>{figure.label}</td>
                <td className="spt-ms-num">{figure.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2 className="spt-proposal-h2">Assumptions and qualifications</h2>
      <p className="spt-proposal-body">{doc.futureCostDisclaimer}</p>
      <p className="spt-proposal-body">{doc.estimatedNote}</p>
      {doc.qualifications?.map((item) => (
        <p key={item.code} className="spt-proposal-body">{humanizeTimestamps(item.text)}</p>
      ))}
      {doc.warnings.length > 0 && (
        <>
          <h2 className="spt-proposal-h2">Still to confirm</h2>
          <ul className="spt-ms-list">
            {doc.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      )}
      {doc.nextSteps.length > 0 && (
        <>
          <h2 className="spt-proposal-h2">Next steps</h2>
          <ol className="spt-ms-list">
            {doc.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      )}
      <p className="spt-ms-note">Detailed workings, the hourly profile and the full reconciliation are in the separate Technical Report. This summary uses the same saved proposal and the same calculated results.</p>
    </>
  );
}

function proposedNames(doc: CustomerProposalDocument): string[] {
  if (doc.proposedMachines?.length) {
    return doc.proposedMachines.map((machine) =>
      machine.quantity > 1
        ? `${machine.quantity} × ${machineDisplayName(machine.name, '')}`
        : machineDisplayName(machine.name, ''),
    );
  }
  if (doc.proposed.name) {
    const quantity = doc.proposed.quantity && doc.proposed.quantity > 1 ? `${doc.proposed.quantity} × ` : '';
    return [`${quantity}${machineDisplayName(doc.proposed.name, '')}`];
  }
  return [];
}

function decisionYears(years: NonNullable<CustomerProposalDocument['financialBenefit']>['years']) {
  if (years.length <= 4) return years;
  const paymentsStop = years.findIndex((row) => /^R\s*0$/.test(row.rentalPaid.replace(/\u00a0/g, ' ').trim()));
  const indexes = new Set<number>([0, years.length - 1]);
  if (paymentsStop > 0) {
    indexes.add(paymentsStop - 1);
    indexes.add(paymentsStop);
  }
  return [...indexes].sort((left, right) => left - right).map((index) => years[index]);
}

function offerTitle(mode: OfferMode): string {
  if (mode === 'rent_to_own') return 'Rent-to-own offer';
  if (mode === 'rental') return 'Rental offer';
  if (mode === 'purchase') return 'Purchase offer';
  return 'Commercial offer';
}
