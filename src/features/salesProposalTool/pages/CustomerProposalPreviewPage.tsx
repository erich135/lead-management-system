import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ARS_DEFAULT_HEADER } from '../../../utils/arsJobCardHeaderDefaults';
import { getSalesProposal } from '../api';
import {
  customerProposalCommercialFigures,
  customerProposalElectricityFigures,
  showsCommercialSaving,
  showsPayback,
  showsRevisionCallout,
} from '../customerProposalPresentation';
import {
  SALES_PROPOSAL_TOOL_PATH,
  salesProposalEditorPath,
} from '../navigation';
import type { CustomerProposalDocument } from '../types';

const ARS_LOGO_SRC = '/Logo.png';

function Cell({ value }: { value: string | null }) {
  return <span>{value ?? '—'}</span>;
}

function Section({
  title,
  children,
  muted = false,
}: {
  title: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={`spt-proposal-section${muted ? ' spt-proposal-section-muted' : ''}`}>
      <h2 className="spt-proposal-h2">{title}</h2>
      <div className="spt-proposal-section-body">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="spt-proposal-metric">
      <div className="spt-proposal-metric-label">{label}</div>
      <div className="spt-proposal-metric-value">{value}</div>
    </div>
  );
}

function FigureStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      className="spt-proposal-figure-strip spt-keep-together"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="spt-proposal-figure">
          <div className="spt-proposal-figure-label">{item.label}</div>
          <div className="spt-proposal-figure-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function Letterhead({
  doc,
}: {
  doc: CustomerProposalDocument;
}) {
  const header = ARS_DEFAULT_HEADER;
  return (
    <header className="spt-proposal-letterhead">
      <div className="spt-proposal-letterhead-row">
        <img
          src={ARS_LOGO_SRC}
          alt={header.companyName}
          className="spt-proposal-logo"
        />
        <div className="spt-proposal-company">
          <div className="spt-proposal-company-name">{header.companyName}</div>
          <div>Reg No: {header.registrationNumber}</div>
          <div>VAT No: {header.vatNumber}</div>
          <div>{header.city}</div>
          <div>{header.phone}</div>
        </div>
        <div className="spt-proposal-letterhead-meta">
          <div className="spt-proposal-kicker">Customer proposal</div>
          <div className="spt-proposal-letterhead-date">{doc.date ?? '—'}</div>
          {doc.preparedFor && <div>{doc.preparedFor}</div>}
          {doc.siteName && <div>{doc.siteName}</div>}
        </div>
      </div>
      <div className="spt-proposal-rule" />
    </header>
  );
}

function PageFooter({
  doc,
  pageLabel,
}: {
  doc: CustomerProposalDocument;
  pageLabel: string;
}) {
  return (
    <footer className="spt-proposal-page-footer">
      <span>{ARS_DEFAULT_HEADER.companyName}</span>
      <span>{[doc.preparedFor, doc.siteName].filter(Boolean).join(' · ')}</span>
      <span>{pageLabel}</span>
    </footer>
  );
}

function DocumentBody({ doc }: { doc: CustomerProposalDocument }) {
  const revisionCallout = showsRevisionCallout(doc);
  const savingVisible = showsCommercialSaving(doc);
  const paybackVisible = showsPayback(doc);
  const proposedName = doc.proposed.name
    ? doc.proposed.quantity && doc.proposed.quantity > 1
      ? `${doc.proposed.quantity} × ${doc.proposed.name}`
      : doc.proposed.name
    : null;
  const electricityFigures = customerProposalElectricityFigures(doc);
  const commercialFigures = customerProposalCommercialFigures(doc);

  return (
    <div className="spt-customer-proposal-canvas">
      <article className="spt-customer-proposal-sheet spt-customer-proposal-page-1 spt-customer-proposal-document">
        <Letterhead doc={doc} />
        <h1 className="spt-proposal-title">{doc.documentTitle}</h1>
        <dl className="spt-proposal-meta">
          <div>
            <dt>Prepared for</dt>
            <dd>{doc.preparedFor ?? '—'}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{doc.date ?? '—'}</dd>
          </div>
          <div>
            <dt>Site</dt>
            <dd>{doc.siteName ?? '—'}</dd>
          </div>
          {doc.siteLocation && (
            <div>
              <dt>Location</dt>
              <dd>{doc.siteLocation}</dd>
            </div>
          )}
        </dl>

        <Section title={doc.purposeTitle}>
          <p className="spt-proposal-body">{doc.purposeLead}</p>
          <ul className="spt-proposal-bullets">
            {doc.purposeBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        {doc.airAudit.sourceFile && (
        <Section title="Air Audit summary">
          <p className="spt-proposal-kicker-inline">
            {doc.airAudit.measuredHeading || 'Measured site air demand'}
          </p>
          <p className="spt-proposal-quiet">Source file: {doc.airAudit.sourceFile}</p>
          <div className="spt-proposal-metric-grid">
            <Metric label="Audit period" value={doc.airAudit.period ?? 'Not available'} />
            <Metric
              label="Mean measured airflow"
              value={doc.airAudit.meanAirflow ?? 'Not available'}
            />
            <Metric
              label="P90 measured airflow"
              value={doc.airAudit.p90Airflow ?? 'Not available'}
            />
            <Metric
              label="Highest recorded airflow"
              value={doc.airAudit.highestAirflow ?? 'Not available'}
            />
            <Metric
              label="Recorded pressure"
              value={doc.airAudit.recordedPressure ?? 'Not available'}
            />
            <Metric
              label="Delivered air"
              value={doc.airAudit.deliveredAir ?? 'Not available'}
            />
          </div>
        </Section>
        )}

        <Section title="Current compressed-air system">
          <p className="spt-proposal-kicker-inline">Published machine specification</p>
          {doc.currentMachines.length === 0 ? (
            <p className="spt-proposal-body">No current machine has been selected.</p>
          ) : (
            doc.currentMachines.map((machine) => (
              <div key={`${machine.name}-${machine.serial ?? ''}`} className="spt-proposal-machine">
                <p className="spt-proposal-machine-name">{machine.name}</p>
                {machine.serial && <p className="spt-proposal-quiet">Serial {machine.serial}</p>}
                <p className="spt-proposal-body">
                  Published airflow {machine.publishedAirflow ?? 'Not available'} · Published
                  pressure {machine.publishedPressure ?? 'Not available'} · Published package
                  input {machine.packageInput ?? 'Not available'}
                </p>
              </div>
            ))
          )}
        </Section>

        {doc.currentMachinePerformance && (
          <Section title={doc.currentMachinePerformance.title}>
            {doc.currentMachinePerformance.machineName && (
              <p className="spt-proposal-machine-name">
                {doc.currentMachinePerformance.machineName}
              </p>
            )}
            <div className="spt-proposal-performance spt-keep-together">
              <Metric
                label={
                  doc.currentMachinePerformance.publishedLabel ?? 'Published airflow'
                }
                value={doc.currentMachinePerformance.publishedAirflow ?? 'Not available'}
              />
              {doc.currentMachinePerformance.estimatedAirflow && (
                <Metric
                  label={
                    doc.currentMachinePerformance.estimatedLabel ??
                    'Estimated airflow at site conditions'
                  }
                  value={doc.currentMachinePerformance.estimatedAirflow}
                />
              )}
              {doc.currentMachinePerformance.presentation !== 'estimated_operating' && (
                <Metric
                  label={
                    doc.currentMachinePerformance.measuredLabel ??
                    'Highest measured airflow during Air Audit'
                  }
                  value={doc.currentMachinePerformance.measuredAirflow ?? 'Not available'}
                />
              )}
              {doc.currentMachinePerformance.annualOperatingHoursLabel && (
                <Metric
                  label={doc.currentMachinePerformance.annualOperatingHoursLabel}
                  value={doc.currentMachinePerformance.annualOperatingHours ?? 'Not available'}
                />
              )}
              {doc.currentMachinePerformance.averageLoadLabel && (
                <Metric
                  label={doc.currentMachinePerformance.averageLoadLabel}
                  value={doc.currentMachinePerformance.averageLoad ?? 'Not available'}
                />
              )}
              {doc.currentMachinePerformance.estimatedAverageOperatingAirflowLabel && (
                <Metric
                  label={doc.currentMachinePerformance.estimatedAverageOperatingAirflowLabel}
                  value={
                    doc.currentMachinePerformance.estimatedAverageOperatingAirflow ??
                    'Not available'
                  }
                />
              )}
              {doc.currentMachinePerformance.differenceLabel && (
                <Metric
                  label={doc.currentMachinePerformance.differenceLabel}
                  value={doc.currentMachinePerformance.differenceAirflow ?? 'Not available'}
                />
              )}
              {doc.currentMachinePerformance.comparisonLabel && (
                <div className="spt-proposal-reduction">
                  <div className="spt-proposal-metric-label">
                    {doc.currentMachinePerformance.comparisonLabel}
                  </div>
                  <div className="spt-proposal-reduction-value">
                    {doc.currentMachinePerformance.comparisonValue ?? 'Not available'}
                  </div>
                </div>
              )}
            </div>
            {doc.currentMachinePerformance.estimatedBasisNote && (
              <p className="spt-proposal-quiet">
                {doc.currentMachinePerformance.estimatedBasisNote}
              </p>
            )}
            {doc.currentMachinePerformance.limitationNote && (
              <p className="spt-proposal-quiet">{doc.currentMachinePerformance.limitationNote}</p>
            )}
            {doc.currentMachinePerformance.caveat && (
              <p className="spt-proposal-quiet">{doc.currentMachinePerformance.caveat}</p>
            )}
          </Section>
        )}

        <Section title="ARS recommended solution">
          {proposedName ? (
            <div className="spt-proposal-machine">
              <p className="spt-proposal-machine-name">{proposedName}</p>
              <p className="spt-proposal-body">
                Published airflow {doc.proposed.publishedAirflow ?? 'Not available'} · Published
                pressure {doc.proposed.publishedPressure ?? 'Not available'} · Published package
                input {doc.proposed.packageInput ?? 'Not available'}
              </p>
              {doc.proposed.estimatedAirflow && (
                <>
                  <p className="spt-proposal-kicker-inline">
                    {doc.proposed.estimatedSectionTitle ??
                      'Estimated performance at site conditions'}
                  </p>
                  <p className="spt-proposal-body">
                    {doc.proposed.estimatedLabel ?? 'Estimated airflow at site conditions'}{' '}
                    {doc.proposed.estimatedAirflow}
                    {doc.proposed.siteAltitude ? ` · Site altitude ${doc.proposed.siteAltitude}` : ''}
                  </p>
                  {doc.proposed.estimatedBasisNote && (
                    <p className="spt-proposal-quiet">{doc.proposed.estimatedBasisNote}</p>
                  )}
                </>
              )}
              {!doc.proposed.estimatedAirflow && doc.proposed.siteUnavailableReason && (
                <p className="spt-proposal-quiet">{doc.proposed.siteUnavailableReason}</p>
              )}
            </div>
          ) : (
            <p className="spt-proposal-body">No proposed BOUWA machine has been selected.</p>
          )}
        </Section>

        <Section title="Machine technical comparison">
          <div className="spt-proposal-compare spt-keep-together">
            <div className="spt-proposal-compare-col">
              <h3>Current</h3>
              {doc.currentMachines[0] ? (
                <p className="spt-proposal-machine-name">{doc.currentMachines[0].name}</p>
              ) : (
                <p>No current machine has been selected.</p>
              )}
            </div>
            <div className="spt-proposal-compare-col">
              <h3>Proposed</h3>
              {proposedName ? (
                <p className="spt-proposal-machine-name">{proposedName}</p>
              ) : (
                <p>No proposed BOUWA machine has been selected.</p>
              )}
            </div>
          </div>
          <table className="spt-proposal-table">
            <thead>
              <tr>
                <th> </th>
                <th className="spt-proposal-num">Current</th>
                <th className="spt-proposal-num">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {doc.technicalRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="spt-proposal-num">
                    <Cell value={row.current} />
                  </td>
                  <td className="spt-proposal-num">
                    <Cell value={row.proposed} />
                  </td>
                </tr>
              ))}
              {doc.proposed.quantity != null && (
                <tr>
                  <td>Quantity</td>
                  <td className="spt-proposal-num"> </td>
                  <td className="spt-proposal-num">{doc.proposed.quantity}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>

        {doc.siteAirflowAdvisory && (
          <p className="spt-proposal-quiet">{doc.siteAirflowAdvisory}</p>
        )}
        {(revisionCallout || doc.warnings.length > 0) && (
          <div className="spt-proposal-callout spt-keep-together">
            {revisionCallout && (
              <p className="spt-proposal-callout-title">
                Proposed configuration requires revision
              </p>
            )}
            {doc.warnings.length > 0 && (
              <ul>
                {doc.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <PageFooter doc={doc} pageLabel="Page 1 of 2" />
      </article>

      <article className="spt-customer-proposal-sheet spt-customer-proposal-page-2 spt-customer-proposal-document">
        <Letterhead doc={doc} />

        <Section title="Estimated electricity">
          <FigureStrip items={electricityFigures} />
          {doc.electricity.suppliedAmountReference && (
            <p className="spt-proposal-quiet">{doc.electricity.suppliedAmountReference}</p>
          )}
          {doc.electricity.suppliedAmountReferenceNote && (
            <p className="spt-proposal-quiet">{doc.electricity.suppliedAmountReferenceNote}</p>
          )}
        </Section>

        <Section title="Estimated annual compressed-air cost">
          <FigureStrip items={commercialFigures} />
        </Section>

        <Section title="Estimated annual cost comparison">
          {doc.commercial.costRows.length === 0 ? (
            <p className="spt-proposal-body">Estimated total annual cost is not yet available.</p>
          ) : (
            <table className="spt-proposal-table">
              <thead>
                <tr>
                  <th> </th>
                  <th className="spt-proposal-num">Current</th>
                  <th className="spt-proposal-num">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {doc.commercial.costRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="spt-proposal-num">
                      <Cell value={row.current} />
                    </td>
                    <td className="spt-proposal-num">
                      <Cell value={row.proposed} />
                    </td>
                  </tr>
                ))}
                <tr className="spt-proposal-total-row">
                  <td>Estimated annual cost</td>
                  <td className="spt-proposal-num">{doc.commercial.current ?? 'Not available'}</td>
                  <td className="spt-proposal-num">{doc.commercial.proposed ?? 'Not available'}</td>
                </tr>
                {savingVisible && (
                  <tr className="spt-proposal-total-row">
                    <td>{doc.commercial.savingHeadline}</td>
                    <td> </td>
                    <td className="spt-proposal-num">
                      {doc.commercial.saving ?? 'Not available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Section>

        {doc.commercial.offerType === 'purchase' && (
          <Section title="Commercial offer — Purchase">
            <table className="spt-proposal-table">
              <tbody>
                {doc.commercial.purchaseLines.map((line) => (
                  <tr key={line.label}>
                    <td>{line.label}</td>
                    <td className="spt-proposal-num">{line.amount}</td>
                  </tr>
                ))}
                {doc.commercial.investmentHeadline && (
                  <tr className="spt-proposal-total-row">
                    <td>{doc.commercial.investmentHeadline}</td>
                    <td className="spt-proposal-num">
                      {doc.commercial.investment ?? 'Not available'}
                    </td>
                  </tr>
                )}
                {savingVisible && (
                  <tr className="spt-proposal-total-row">
                    <td>{doc.commercial.savingHeadline}</td>
                    <td className="spt-proposal-num">
                      {doc.commercial.saving ?? 'Not available'}
                    </td>
                  </tr>
                )}
                {paybackVisible && (
                  <tr className="spt-proposal-payback-row">
                    <td>{doc.commercial.paybackHeadline}</td>
                    <td className="spt-proposal-num">
                      {doc.commercial.payback ?? 'Not available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
        )}

        {doc.commercial.offerType === 'rental' && (
          <Section title="Commercial offer — Rental">
            <table className="spt-proposal-table">
              <tbody>
                {doc.commercial.costRows
                  .filter(
                    (row) =>
                      row.label === 'Rental / finance' || row.label === 'SLA / maintenance',
                  )
                  .map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className="spt-proposal-num">{row.proposed ?? 'Not available'}</td>
                    </tr>
                  ))}
                <tr className="spt-proposal-total-row">
                  <td>{doc.commercial.proposedHeadline}</td>
                  <td className="spt-proposal-num">
                    {doc.commercial.proposed ?? 'Not available'}
                  </td>
                </tr>
                {savingVisible && (
                  <tr className="spt-proposal-total-row">
                    <td>{doc.commercial.savingHeadline}</td>
                    <td className="spt-proposal-num">
                      {doc.commercial.saving ?? 'Not available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
        )}

        <Section title="Recommendation">
          <p className="spt-proposal-closing">{doc.recommendation}</p>
        </Section>

        <Section title="Conclusion">
          <p className="spt-proposal-body">{doc.conclusion}</p>
        </Section>

        <Section title="Next steps">
          <ol className="spt-proposal-steps">
            {doc.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>

        <Section title="Calculation basis" muted>
          <p className="spt-proposal-basis">{doc.basis}</p>
          <p className="spt-proposal-basis">{doc.futureCostDisclaimer}</p>
          <p className="spt-proposal-quiet">{doc.estimatedNote}</p>
        </Section>
        <PageFooter doc={doc} pageLabel="Page 2 of 2" />
      </article>
    </div>
  );
}

const PRINT_HEADER_FOOTER_HINT =
  'In the print dialog, open More settings and turn off Headers and footers. That removes the date, browser title, localhost URL and page numbers from the customer PDF.';

export function CustomerProposalPreviewPage() {
  const { proposalId } = useParams();
  const [document, setDocument] = useState<CustomerProposalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const previousTitle = window.document.title;
    window.document.title = 'Compressed Air Performance & Sales Proposal';
    return () => {
      window.document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!proposalId) return;
    let cancelled = false;
    void getSalesProposal(proposalId)
      .then((proposal) => {
        if (!cancelled) setDocument(proposal.customerProposal ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not open this proposal.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  return (
    <div className="spt-customer-proposal-print-root">
      <div className="spt-customer-proposal-toolbar print:hidden">
        <div className="spt-customer-proposal-toolbar-inner">
          <Link
            to={proposalId ? salesProposalEditorPath(proposalId) : SALES_PROPOSAL_TOOL_PATH}
            className="spt-customer-proposal-back"
          >
            Back to editor
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="spt-customer-proposal-print-button"
          >
            Download / Print Proposal
          </button>
        </div>
        <p className="spt-customer-proposal-print-hint">{PRINT_HEADER_FOOTER_HINT}</p>
      </div>
      {loading && (
        <p className="spt-customer-proposal-status">
          <Loader2 className="h-4 w-4 animate-spin" /> Opening customer proposal…
        </p>
      )}
      {error && <p className="spt-customer-proposal-status spt-customer-proposal-error">{error}</p>}
      {!loading && !error && document && <DocumentBody doc={document} />}
      {!loading && !error && !document && (
        <p className="spt-customer-proposal-status">This proposal is not ready to preview yet.</p>
      )}
    </div>
  );
}
