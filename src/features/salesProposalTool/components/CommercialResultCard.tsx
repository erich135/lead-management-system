import type { CommercialComparison, CommercialLine } from '../types';
import {
  displayOrUnavailable,
  formatEstimatedRand,
  formatMeasuredNumber,
} from '../formatMeasured';

interface CommercialResultCardProps {
  commercial: CommercialComparison | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-[#383838]">{value}</dd>
    </div>
  );
}

function MoneyLines({ lines }: { lines: CommercialLine[] }) {
  return (
    <dl className="mt-2">
      {lines.map((line) => (
        <Row
          key={line.key}
          label={line.label}
          value={displayOrUnavailable(formatEstimatedRand(line.amountRand))}
        />
      ))}
    </dl>
  );
}

export function CommercialResultCard({ commercial }: CommercialResultCardProps) {
  if (!commercial) {
    return (
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Estimated annual cost
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Choose purchase or rental and enter the commercial amounts for this proposal.
        </p>
      </section>
    );
  }

  const saving = formatEstimatedRand(commercial.saving.displayRand);
  const currentTotal = formatEstimatedRand(commercial.current.totalA);
  const proposedTotal = formatEstimatedRand(commercial.proposed.totalB);
  const investment = formatEstimatedRand(commercial.purchase?.netInvestmentRand);
  const payback =
    commercial.purchase?.paybackYears == null
      ? null
      : `${formatMeasuredNumber(commercial.purchase.paybackYears, 1)} years`;
  const configurationInvalidNote =
    commercial.unavailableReason?.includes('does not meet the audited air requirement')
      ? commercial.unavailableReason
      : commercial.notes.find((note) =>
          note.includes('does not meet the audited air requirement'),
        );
  const otherNotes = commercial.notes.filter((note) => note !== configurationInvalidNote);

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Estimated annual cost
      </h2>

      <div className="mt-4">
        <h3 className="text-sm font-bold text-[#383838]">Current system</h3>
        {commercial.current.unavailableReason && (
          <p className="mt-2 text-sm text-slate-600">{commercial.current.unavailableReason}</p>
        )}
        <MoneyLines lines={commercial.current.lines} />
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {commercial.copy.currentHeadline}
        </p>
        <p className="mt-1 text-lg font-bold text-[#383838]">
          {currentTotal ?? 'Not available'}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-[#383838]">Proposed BOUWA solution</h3>
        {commercial.proposed.unavailableReason && (
          <p className="mt-2 text-sm text-slate-600">{commercial.proposed.unavailableReason}</p>
        )}
        <MoneyLines lines={commercial.proposed.lines} />
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {commercial.copy.proposedHeadline}
        </p>
        <p className="mt-1 text-lg font-bold text-[#383838]">
          {proposedTotal ?? 'Not available'}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-[#383838]">{commercial.copy.savingHeadline}</h3>
        {configurationInvalidNote && (
          <p className="mt-2 text-sm text-amber-800">{configurationInvalidNote}</p>
        )}
        <p className="mt-2 text-lg font-bold text-[#383838]">{saving ?? 'Not available'}</p>
      </div>

      {commercial.purchase && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {commercial.copy.investmentHeadline}
          </p>
          <p className="mt-1 text-lg font-bold text-[#383838]">
            {investment ?? 'Not available'}
          </p>
          <MoneyLines
            lines={[
              commercial.purchase.equipmentPriceRand == null
                ? null
                : {
                    key: 'equipment',
                    label: 'Equipment price',
                    amountRand: commercial.purchase.equipmentPriceRand,
                  },
              commercial.purchase.installationRand == null
                ? null
                : {
                    key: 'installation',
                    label: 'Installation',
                    amountRand: commercial.purchase.installationRand,
                  },
              commercial.purchase.deliveryRand == null
                ? null
                : {
                    key: 'delivery',
                    label: 'Delivery',
                    amountRand: commercial.purchase.deliveryRand,
                  },
              commercial.purchase.buyBackRand == null
                ? null
                : {
                    key: 'buyBack',
                    label: 'Buy-back / trade-in',
                    amountRand: commercial.purchase.buyBackRand,
                  },
            ].filter((line): line is CommercialLine => line !== null)}
          />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {commercial.copy.paybackHeadline}
          </p>
          <p className="mt-1 text-lg font-bold text-[#383838]">
            {payback ?? commercial.purchase.paybackUnavailableReason ?? 'Not available'}
          </p>
        </div>
      )}

      {commercial.included.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            This estimate includes
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            {commercial.included.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {otherNotes.map((note) => (
        <p key={note} className="mt-2 text-xs text-slate-500">
          {note}
        </p>
      ))}
    </section>
  );
}
