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
  centered = false,
}: {
  items: Array<{ label: string; value: string }>;
  centered?: boolean;
}) {
  return (
    <div
      className={`spt-proposal-figure-strip spt-keep-together${centered ? ' spt-proposal-figure-strip-center' : ''}`}
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
  return (
    <header className="spt-proposal-letterhead">
      <div className="spt-proposal-letterhead-row">
        <img src="/ars-letterhead/logo.png" alt="Air Rotary Services" className="spt-proposal-logo" />
        <div className="spt-proposal-letterhead-contact">
          <div className="spt-proposal-company-name">Air Rotory Services (Pty) Ltd</div>
          <div>Centric Park, Block C,</div>
          <div>Romeo Street, Hughes,</div>
          <div>Boksburg, 1459</div>
          <div>PO Box 9217, Cinda Park, 1463</div>
          <div>Tel: 086 1279 765</div>
          <div>Fax: 086 5500 474</div>
          <div>Email: accounts@apxsolutions.co.za</div>
          <div>Registration Number: 2015/221198/07</div>
          <div>VAT Number: 4470274590</div>
        </div>
      </div>
      <p className="spt-proposal-letterhead-date">{doc.date ?? ''}</p>
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
      <img src="/ars-letterhead/footer.png" alt="Thank you for your trust within Air Rotory as your preferred air compressor and dryer service specialists. Excellence in every m³/min!" />
      <span>{pageLabel}</span>
    </footer>
  );
}

function proposalReference(reference: string | null | undefined): string {
  if (!reference) return '—';
  if (/^[a-f0-9]{24}$/i.test(reference)) return `SPT-${reference.slice(-8).toUpperCase()}`;
  return reference;
}

function machineTitle(name: string, quantity: number | null | undefined): string {
  const label = name.trim();
  if (quantity && quantity > 1) return `${quantity} × ${label}`;
  return label;
}

function ElectricityChart({
  current,
  proposed,
  currentText,
  proposedText,
}: {
  current: number;
  proposed: number;
  currentText: string;
  proposedText: string;
}) {
  const max = Math.max(current, proposed, 1);
  const currentHeight = Math.max(8, (current / max) * 120);
  const proposedHeight = Math.max(8, (proposed / max) * 120);
  return (
    <figure className="spt-proposal-chart spt-keep-together">
      <figcaption className="spt-proposal-kicker-inline">
        Annual electricity cost
      </figcaption>
      <div className="spt-proposal-chart-plot">
        <div className="spt-proposal-chart-col">
          <div className="spt-proposal-chart-value">{currentText}</div>
          <div
            className="spt-proposal-chart-bar spt-proposal-chart-bar-current"
            style={{ height: `${currentHeight}px` }}
          />
          <div className="spt-proposal-chart-name">Current</div>
        </div>
        <div className="spt-proposal-chart-col">
          <div className="spt-proposal-chart-value">{proposedText}</div>
          <div
            className="spt-proposal-chart-bar spt-proposal-chart-bar-proposed"
            style={{ height: `${proposedHeight}px` }}
          />
          <div className="spt-proposal-chart-name">Proposed</div>
        </div>
      </div>
    </figure>
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
  const proposedMachines = doc.proposedMachines ?? [];
  const rentalRow = doc.commercial.costRows.find((row) => row.label === 'Rental / finance');
  const explanations = proposedMachines
    .map((machine) => machine.calculationExplanation)
    .filter((text): text is string => Boolean(text));
  const sharedExplanation =
    explanations.length > 0 && explanations.every((text) => text === explanations[0])
      ? explanations[0]
      : null;
  const capacityResult = {
    label: doc.proposed.estimatedAirflow
      ? doc.proposed.estimatedLabel ?? 'Site-adjusted capacity'
      : 'Published airflow',
    value: doc.proposed.estimatedAirflow ?? doc.proposed.publishedAirflow ?? 'Not available',
  };
  const electricitySavingResult = savingVisible
    ? [{ label: doc.electricity.savingLabel, value: doc.electricity.saving ?? 'Not available' }]
    : [];
  const financialLead = doc.financialBenefit?.figures ?? [];
  const keyResults =
    financialLead.length > 0
      ? [...financialLead, ...electricitySavingResult, capacityResult]
      : [
          capacityResult,
          ...electricitySavingResult,
          ...(doc.commercial.offerType === 'purchase' && doc.commercial.investment
            ? [{ label: doc.commercial.investmentHeadline ?? 'Net investment', value: doc.commercial.investment }]
            : []),
          ...(paybackVisible
            ? [{ label: doc.commercial.paybackHeadline ?? 'Estimated payback', value: doc.commercial.payback ?? 'Not available' }]
            : []),
          ...(doc.commercial.offerType === 'rental' && rentalRow?.proposed
            ? [{ label: 'Proposed rental / finance', value: rentalRow.proposed }]
            : []),
        ];
  const chartReady =
    typeof doc.electricity.chartCurrentRand === 'number' &&
    typeof doc.electricity.chartProposedRand === 'number' &&
    doc.electricity.current &&
    doc.electricity.proposed;

  return (
    <div className="spt-customer-proposal-canvas">
      <article className="spt-customer-proposal-sheet spt-customer-proposal-page-1 spt-customer-proposal-document">
        <img
          src="/ars-letterhead/watermark.png"
          alt=""
          className="spt-proposal-watermark"
        />
        <Letterhead doc={doc} />
        <h1 className="spt-proposal-title">{doc.documentTitle}</h1>
        <dl className="spt-proposal-meta">
          <div>
            <dt>Prepared for</dt>
            <dd>{doc.preparedFor ?? '—'}</dd>
          </div>
          <div>
            <dt>Site</dt>
            <dd>{doc.siteName ?? '—'}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{doc.date ?? '—'}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd className="spt-proposal-wrap">{proposalReference(doc.reference)}</dd>
          </div>
          {doc.siteLocation && (
            <div>
              <dt>Location</dt>
              <dd className="spt-proposal-wrap">{doc.siteLocation}</dd>
            </div>
          )}
        </dl>

        {doc.financialBenefit?.mode === 'rent_to_own' && financialLead.length > 0 && (
          <section className="spt-proposal-return">
            <h2 className="spt-proposal-h2">Your 10-year financial return</h2>
            <FigureStrip items={financialLead} centered />
            {doc.financialBenefit.note && (
              <p className="spt-proposal-quiet">{doc.financialBenefit.note}</p>
            )}
          </section>
        )}
        {doc.financialBenefit?.mode === 'rent_to_own' && (doc.financialBenefit.chart?.length ?? 0) > 0 && (
          <section className="spt-proposal-section">
              <h2 className="spt-proposal-h2">Year-by-year cash flow</h2>
              <table className="spt-proposal-table spt-proposal-centered-nums">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th className="spt-proposal-num">Current total</th>
                    <th className="spt-proposal-num">Proposed operating</th>
                    <th className="spt-proposal-num">Rent-to-own payments</th>
                    <th className="spt-proposal-num">Annual net benefit</th>
                    <th className="spt-proposal-num">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.financialBenefit.chart?.map((row, index) => {
                    const year = doc.financialBenefit?.years[index];
                    const current = row.currentElectricity + row.currentFinance + row.currentMaintenance;
                    const operating = row.proposedElectricity + row.proposedMaintenance;
                    const money = (amount: number) =>
                      amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
                    return (
                      <tr key={row.year}>
                        <td>{year?.year ?? row.year}</td>
                        <td className="spt-proposal-num">{money(current)}</td>
                        <td className="spt-proposal-num">{money(operating)}</td>
                        <td className="spt-proposal-num">{money(row.proposedFinance)}</td>
                        <td className="spt-proposal-num">{money(row.netBenefit)}</td>
                        <td className="spt-proposal-num">{money(row.cumulative)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="spt-proposal-quiet">Proposed operating cost is electricity plus maintenance. Rent-to-own payments stop after the agreed term. A blank final transfer payment and blank post-term maintenance are excluded and noted above.</p>
            </section>
        )}

        <section className="spt-proposal-recommend">
          <h2 className="spt-proposal-h2">Recommendation</h2>
          <p className="spt-proposal-closing">{doc.recommendation}</p>
          <p className="spt-proposal-body">{doc.purposeLead}</p>
          {proposedName && (
            <p className="spt-proposal-body spt-proposal-wrap">
              Proposed equipment: {proposedName}
            </p>
          )}
          {doc.financialBenefit?.mode === 'rent_to_own' && financialLead.length > 0 ? (
            <FigureStrip items={[...electricitySavingResult, capacityResult]} centered />
          ) : financialLead.length > 0 ? (
            <>
              <FigureStrip items={financialLead} centered />
              <FigureStrip items={[...electricitySavingResult, capacityResult]} centered />
            </>
          ) : (
            <FigureStrip items={keyResults} centered />
          )}
          {doc.financialBenefit?.note && (
            <p className="spt-proposal-quiet">{doc.financialBenefit.note}</p>
          )}
          {savingVisible && (
            <p className="spt-proposal-quiet">
              {doc.electricity.savingLabel} is the electricity difference only. {doc.commercial.savingHeadline} includes rental, finance and maintenance where those costs were supplied.
            </p>
          )}
        </section>

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

        <Section title="Current and proposed equipment">
          <div className="spt-proposal-compare">
            <div className="spt-proposal-compare-col">
              <h3>Current</h3>
              {doc.currentMachines.length === 0 ? (
                <p>No current machine has been selected.</p>
              ) : (
                doc.currentMachines.map((machine) => (
                  <p key={`${machine.name}-${machine.serial ?? ''}`} className="spt-proposal-machine-name spt-proposal-wrap">
                    {machineTitle(machine.name, machine.quantity)}
                    {machine.serial ? ` · Serial ${machine.serial}` : ''}
                  </p>
                ))
              )}
            </div>
            <div className="spt-proposal-compare-col">
              <h3>Proposed</h3>
              {proposedMachines.length > 0 ? (
                proposedMachines.map((machine) => (
                  <p key={`${machine.name}-${machine.quantity}`} className="spt-proposal-machine-name spt-proposal-wrap">
                    {machineTitle(machine.name, machine.quantity)}
                  </p>
                ))
              ) : proposedName ? (
                <p className="spt-proposal-machine-name spt-proposal-wrap">{proposedName}</p>
              ) : (
                <p>No proposed BOUWA machine has been selected.</p>
              )}
            </div>
          </div>
          <table className="spt-proposal-table spt-proposal-centered-nums">
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
                  <td className="spt-proposal-num"><Cell value={row.current} /></td>
                  <td className="spt-proposal-num"><Cell value={row.proposed} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {doc.siteAirflowAdvisory && (
            <p className="spt-proposal-quiet">{doc.siteAirflowAdvisory}</p>
          )}
        </Section>

        <Section title="Air audit and site conditions">
          {doc.airAudit.sourceFile ? (
            <>
              <p className="spt-proposal-kicker-inline">Measured site air demand</p>
              <div className="spt-proposal-metric-grid">
                <Metric label="Audit period" value={doc.airAudit.period ?? 'Not available'} />
                <Metric label="Mean measured airflow" value={doc.airAudit.meanAirflow ?? 'Not available'} />
                <Metric label="P90 measured airflow" value={doc.airAudit.p90Airflow ?? 'Not available'} />
                <Metric label="Highest recorded airflow" value={doc.airAudit.highestAirflow ?? 'Not available'} />
                <Metric label="Recorded pressure" value={doc.airAudit.recordedPressure ?? 'Not available'} />
                <Metric label="Delivered air" value={doc.airAudit.deliveredAir ?? 'Not available'} />
              </div>
            </>
          ) : (
            <p className="spt-proposal-body">No Air Audit was supplied. Demand uses the stated operating hours and load.</p>
          )}
          <div className="spt-proposal-metric-grid">
            <Metric label="Site altitude" value={doc.proposed.siteAltitude ?? 'Not available'} />
            <Metric
              label="Intake temperature"
              value={
                doc.proposed.siteIntakeTemperature
                  ? `${doc.proposed.siteIntakeTemperature}${doc.proposed.siteIntakeTemperatureKind ? ` (${doc.proposed.siteIntakeTemperatureKind})` : ''}`
                  : 'Not entered'
              }
            />
            <Metric label="Site pressure" value={doc.proposed.sitePressure ?? 'Not available'} />
          </div>
          {doc.currentMachinePerformance && (
            <div className="spt-proposal-performance">
              {doc.currentMachinePerformance.machineName && (
                <p className="spt-proposal-machine-name spt-proposal-wrap">{doc.currentMachinePerformance.machineName}</p>
              )}
              <Metric
                label={doc.currentMachinePerformance.measuredLabel ?? doc.currentMachinePerformance.publishedLabel}
                value={
                  doc.currentMachinePerformance.measuredAirflow ??
                  doc.currentMachinePerformance.publishedAirflow ??
                  'Not available'
                }
              />
              {doc.currentMachinePerformance.comparisonValue && (
                <Metric
                  label={doc.currentMachinePerformance.comparisonLabel ?? 'Comparison'}
                  value={doc.currentMachinePerformance.comparisonValue}
                />
              )}
            </div>
          )}
        </Section>

        <Section title="Electricity">
          <FigureStrip items={electricityFigures} centered />
          {chartReady && (
            <ElectricityChart
              current={doc.electricity.chartCurrentRand as number}
              proposed={doc.electricity.chartProposedRand as number}
              currentText={doc.electricity.current as string}
              proposedText={doc.electricity.proposed as string}
            />
          )}
          {doc.electricity.costBreakdown?.vsdNote && (
            <p className="spt-proposal-quiet">{doc.electricity.costBreakdown.vsdNote}</p>
          )}
          {doc.electricity.suppliedAmountReference && (
            <p className="spt-proposal-quiet">{doc.electricity.suppliedAmountReference}</p>
          )}
          {doc.electricity.suppliedAmountReferenceNote && (
            <p className="spt-proposal-quiet">{doc.electricity.suppliedAmountReferenceNote}</p>
          )}
          {doc.electricity.costBreakdown && (
            <div>
              <p className="spt-proposal-kicker-inline">Electricity cost by season and day type</p>
              {doc.electricity.costBreakdown.averageTariff && (
                <p className="spt-proposal-quiet">
                  Average electricity tariff: {doc.electricity.costBreakdown.averageTariff}
                </p>
              )}
              <table className="spt-proposal-table spt-proposal-electricity-table spt-proposal-centered-nums">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="spt-proposal-num">Production days</th>
                    <th className="spt-proposal-num">Daily current</th>
                    <th className="spt-proposal-num">Daily proposed</th>
                    <th className="spt-proposal-num">Annual current</th>
                    <th className="spt-proposal-num">Annual proposed</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.electricity.costBreakdown.rows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className="spt-proposal-num"><Cell value={row.productionDays} /></td>
                      <td className="spt-proposal-num"><Cell value={row.dailyCurrent} /></td>
                      <td className="spt-proposal-num"><Cell value={row.dailyProposed} /></td>
                      <td className="spt-proposal-num"><Cell value={row.annualCurrent} /></td>
                      <td className="spt-proposal-num"><Cell value={row.annualProposed} /></td>
                    </tr>
                  ))}
                  <tr className="spt-proposal-total-row">
                    <td>Annual totals before VSD allowance</td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td className="spt-proposal-num">{doc.electricity.costBreakdown.beforeVsdCurrent ?? 'Not available'}</td>
                    <td className="spt-proposal-num">{doc.electricity.costBreakdown.beforeVsdProposed ?? 'Not available'}</td>
                  </tr>
                  <tr>
                    <td>{doc.electricity.costBreakdown.vsdAllowanceLabel}</td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td className="spt-proposal-num">
                      {doc.electricity.costBreakdown.vsdAllowanceCurrent ??
                        (doc.electricity.costBreakdown.vsdAllowance ? 'R 0' : 'Not applicable')}
                    </td>
                    <td className="spt-proposal-num">
                      {doc.electricity.costBreakdown.vsdAllowanceProposed ??
                        doc.electricity.costBreakdown.vsdAllowance ??
                        'Not applicable'}
                    </td>
                  </tr>
                  <tr className="spt-proposal-total-row">
                    <td>Adjusted annual totals</td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td className="spt-proposal-num">{doc.electricity.costBreakdown.adjustedCurrent ?? 'Not available'}</td>
                    <td className="spt-proposal-num">{doc.electricity.costBreakdown.adjustedProposed ?? 'Not available'}</td>
                  </tr>
                  <tr className="spt-proposal-total-row">
                    <td>Final annual electricity saving</td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td> </td>
                    <td className="spt-proposal-num">{doc.electricity.costBreakdown.finalSaving ?? 'Not available'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {doc.financialBenefit?.mode !== 'rent_to_own' && (doc.financialBenefit?.years.length ?? 0) > 0 && (
          <Section title="Financial projection">
            <table className="spt-proposal-table spt-proposal-centered-nums">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="spt-proposal-num">Months</th>
                  <th className="spt-proposal-num">Payments</th>
                  <th className="spt-proposal-num">Net benefit</th>
                  <th className="spt-proposal-num">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {doc.financialBenefit?.years.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="spt-proposal-num">{row.months}</td>
                    <td className="spt-proposal-num">{row.rentalPaid}</td>
                    <td className="spt-proposal-num">{row.netBenefit}</td>
                    <td className="spt-proposal-num">{row.cumulative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section title="Commercial costs">
          <FigureStrip items={commercialFigures} centered />
          <p className="spt-proposal-quiet">
            Electricity is shown separately from rental, finance and maintenance. The total is the estimated annual compressed-air cost.
          </p>
          {doc.commercial.costRows.length === 0 ? (
            <p className="spt-proposal-body">Estimated total annual cost is not yet available.</p>
          ) : (
            <table className="spt-proposal-table spt-proposal-centered-nums">
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
                    <td className="spt-proposal-num"><Cell value={row.current} /></td>
                    <td className="spt-proposal-num"><Cell value={row.proposed} /></td>
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
                    <td className="spt-proposal-num">{doc.commercial.saving ?? 'Not available'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Section>

        {doc.commercial.offerType === 'purchase' && (
          <Section title="Purchase">
            <table className="spt-proposal-table spt-proposal-centered-nums">
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
                    <td className="spt-proposal-num">{doc.commercial.investment ?? 'Not available'}</td>
                  </tr>
                )}
                {doc.financialBenefit?.figures
                  .filter((figure) => figure.label === 'Simple annual ROI' || figure.label === 'Simple payback')
                  .map((figure) => (
                    <tr key={figure.label} className="spt-proposal-payback-row">
                      <td>{figure.label}</td>
                      <td className="spt-proposal-num">{figure.value}</td>
                    </tr>
                  ))}
                {paybackVisible && !doc.financialBenefit?.figures.some((figure) => figure.label === 'Simple payback') && (
                  <tr className="spt-proposal-payback-row">
                    <td>{doc.commercial.paybackHeadline}</td>
                    <td className="spt-proposal-num">{doc.commercial.payback ?? 'Not available'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
        )}

        {doc.commercial.offerType === 'rental' && (
          <Section title="Rental">
            <table className="spt-proposal-table spt-proposal-centered-nums">
              <tbody>
                <tr className="spt-proposal-total-row">
                  <td>{doc.commercial.proposedHeadline}</td>
                  <td className="spt-proposal-num">{doc.commercial.proposed ?? 'Not available'}</td>
                </tr>
                {savingVisible && (
                  <tr className="spt-proposal-total-row">
                    <td>{doc.commercial.savingHeadline}</td>
                    <td className="spt-proposal-num">{doc.commercial.saving ?? 'Not available'}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {(doc.financialBenefit?.years.length ?? 0) > 0 && (
              <div className="spt-proposal-year-table">
                <p className="spt-proposal-quiet">
                  Year-by-year cash flow. A negative net benefit is an additional cost. Monthly amounts are the annual estimates divided by 12.
                </p>
                <table className="spt-proposal-table spt-proposal-centered-nums">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th className="spt-proposal-num">Months</th>
                      <th className="spt-proposal-num">Rental paid</th>
                      <th className="spt-proposal-num">Net benefit</th>
                      <th className="spt-proposal-num">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.financialBenefit?.years.map((row) => (
                      <tr key={row.year}>
                        <td>{row.year}</td>
                        <td className="spt-proposal-num">{row.months}</td>
                        <td className="spt-proposal-num">{row.rentalPaid}</td>
                        <td className="spt-proposal-num">{row.netBenefit}</td>
                        <td className="spt-proposal-num">{row.cumulative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        <Section title="Conclusion">
          <p className="spt-proposal-body">{doc.conclusion}</p>
          <ol className="spt-proposal-steps">
            {doc.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>

        <section className="spt-proposal-section spt-proposal-basis-page">
          <h2 className="spt-proposal-h2">How these figures were worked out</h2>
          <div className="spt-proposal-section-body spt-proposal-plain">
            <p>
              These pages explain the estimate in everyday language. The rand amounts earlier in this proposal come from the steps below. They are an estimate for this site, not a promise of future bills.
            </p>

            <h3 className="spt-proposal-h3">The air this site uses</h3>
            {doc.airAudit.sourceFile ? (
              <table className="spt-proposal-table">
                <thead>
                  <tr>
                    <th>What we looked at</th>
                    <th>Result</th>
                    <th>What that means</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>When the air was measured</td>
                    <td>{doc.airAudit.period ?? 'Not available'}</td>
                    <td>The days the logger was recording on site.</td>
                  </tr>
                  <tr>
                    <td>Typical airflow</td>
                    <td>{doc.airAudit.meanAirflow ?? 'Not available'}</td>
                    <td>The average air the site used during that recording.</td>
                  </tr>
                  <tr>
                    <td>Busy airflow</td>
                    <td>{doc.airAudit.p90Airflow ?? 'Not available'}</td>
                    <td>Air use that was higher only about 10% of the time.</td>
                  </tr>
                  <tr>
                    <td>Highest airflow</td>
                    <td>{doc.airAudit.highestAirflow ?? 'Not available'}</td>
                    <td>The largest airflow recorded. Gaps in the recording are left out. They are not treated as zero air use.</td>
                  </tr>
                  <tr>
                    <td>Air used over a year</td>
                    <td>{doc.airAudit.deliveredAir ?? 'Not available'}</td>
                    <td>The measured air, stretched to a full year using 30-day months.</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p>No air measurement was supplied. The estimate uses the operating hours and load entered for this site.</p>
            )}

            <h3 className="spt-proposal-h3">What the proposed machine can supply here</h3>
            <p>
              Brochure airflow is the figure published for the machine. Site capacity is that figure adjusted for the height of this site and the temperature of the air going into the compressor. A thinner, hotter intake means the machine delivers less air. This adjustment is used to check whether the machine is big enough. It is not used again in the electricity cost.
            </p>
            <table className="spt-proposal-table">
              <thead>
                <tr>
                  <th>Site condition</th>
                  <th>Value used</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Height of the site</td>
                  <td>{doc.proposed.siteAltitude ?? 'Not available'}</td>
                </tr>
                <tr>
                  <td>Temperature of air entering the compressor</td>
                  <td>
                    {doc.proposed.siteIntakeTemperature
                      ? `${doc.proposed.siteIntakeTemperature}${doc.proposed.siteIntakeTemperatureKind ? ` (${doc.proposed.siteIntakeTemperatureKind})` : ''}`
                      : 'Not entered'}
                  </td>
                </tr>
                <tr>
                  <td>Air pressure at this site</td>
                  <td>{doc.proposed.sitePressure ?? 'Not available'}</td>
                </tr>
                <tr>
                  <td>Brochure reference pressure</td>
                  <td>{[doc.proposed.referencePressure, doc.proposed.referencePressureSource].filter(Boolean).join(' · ') || 'Not available'}</td>
                </tr>
                <tr>
                  <td>Brochure reference temperature</td>
                  <td>{[doc.proposed.referenceTemperature, doc.proposed.referenceTemperatureSource].filter(Boolean).join(' · ') || 'Not available'}</td>
                </tr>
              </tbody>
            </table>
            {proposedMachines.length > 0 && (
              <table className="spt-proposal-table">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th className="spt-proposal-num">Brochure airflow</th>
                    <th className="spt-proposal-num">Air available at this site</th>
                    <th className="spt-proposal-num">Reduction</th>
                  </tr>
                </thead>
                <tbody>
                  {proposedMachines.map((machine) => (
                    <tr key={`${machine.name}-${machine.quantity}-${machine.publishedAirflow}`}>
                      <td className="spt-proposal-wrap">{machineTitle(machine.name, machine.quantity)}</td>
                      <td className="spt-proposal-num">{machine.publishedAirflow ?? '—'}</td>
                      <td className="spt-proposal-num">{machine.estimatedAirflow ?? '—'}</td>
                      <td className="spt-proposal-num">{machine.reduction ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {sharedExplanation && <p>{sharedExplanation}</p>}
            {!sharedExplanation &&
              proposedMachines.map((machine) =>
                machine.calculationExplanation ? (
                  <p key={`${machine.name}-calc`}>
                    <strong>{machineTitle(machine.name, machine.quantity)}. </strong>
                    {machine.calculationExplanation}
                  </p>
                ) : machine.siteUnavailableReason ? (
                  <p key={`${machine.name}-unavailable`}>
                    <strong>{machineTitle(machine.name, machine.quantity)}. </strong>
                    {machine.siteUnavailableReason}
                  </p>
                ) : null,
              )}

            <h3 className="spt-proposal-h3">How the electricity cost is calculated</h3>
            <p>
              Both sides of the comparison use the same measured air and the same electricity tariff. The difference is the power each machine needs to supply that air.
            </p>
            <table className="spt-proposal-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>What we do</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1. Air for the year</td>
                  <td>Start with the measured air and stretch it to 12 months of 30 days. The logger period is not treated as a full year by itself.</td>
                </tr>
                <tr>
                  <td>2. Machine power</td>
                  <td>Use the published power of each machine together with its published airflow. We do not measure how much electricity the current machines actually draw.</td>
                </tr>
                <tr>
                  <td>3. Efficiency</td>
                  <td>
                    The published power is divided once by the efficiency entered for that machine. If efficiency is left blank, it is treated as 100%.
                    {doc.currentMachines.some((machine) => machine.efficiency) && (
                      <> Current: {doc.currentMachines.filter((machine) => machine.efficiency).map((machine) => `${machine.name} ${machine.efficiency}`).join('; ')}.</>
                    )}
                    {doc.proposed.efficiency ? <> Proposed: {doc.proposed.efficiency}.</> : null}
                  </td>
                </tr>
                <tr>
                  <td>4. Extra equipment</td>
                  <td>Add 15% for dryers, filters and other equipment around the compressor.</td>
                </tr>
                <tr>
                  <td>5. Variable-speed drive</td>
                  <td>Where a machine has a variable-speed drive, add 14% once. It is not added again anywhere else.</td>
                </tr>
                <tr>
                  <td>6. Electricity tariff</td>
                  <td>
                    Multiply the energy by the tariff used for this proposal
                    {doc.electricity.costBreakdown?.averageTariff ? ` (average ${doc.electricity.costBreakdown.averageTariff})` : ''}.
                    Height and intake temperature are not applied to this electricity figure.
                  </td>
                </tr>
              </tbody>
            </table>
            {doc.proposed.electricityNote && <p>{doc.proposed.electricityNote}</p>}

            <h3 className="spt-proposal-h3">What this estimate leaves out</h3>
            <table className="spt-proposal-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>How it is treated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Future electricity price increases</td>
                  <td>Not included. {doc.futureCostDisclaimer}</td>
                </tr>
                <tr>
                  <td>Tax and the value of the machine at the end</td>
                  <td>Not included.</td>
                </tr>
                <tr>
                  <td>Costs that were not supplied</td>
                  <td>{doc.estimatedNote} Only amounts entered on this proposal are included.</td>
                </tr>
                {doc.financialBenefit?.mode === 'rent_to_own' && (
                  <tr>
                    <td>After the payments stop</td>
                    <td>A blank final transfer payment and blank maintenance after the term are left out and described as unconfirmed. They are not treated as zero.</td>
                  </tr>
                )}
                {doc.financialBenefit?.mode === 'rental' && (
                  <tr>
                    <td>End of the rental</td>
                    <td>This is an open rental. There is no fixed end date and no ownership transfer in these figures.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <PageFooter doc={doc} pageLabel="" />
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
