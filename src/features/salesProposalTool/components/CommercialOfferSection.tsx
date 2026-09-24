import { useState } from 'react';
import { buildCommercialOffer, moneyText } from '../commercialOffer';
import type { CommercialOffer, CommercialOfferType } from '../types';

interface CommercialOfferSectionProps {
  value: CommercialOffer;
  onChange: (next: CommercialOffer) => void;
}

function RandField({
  label,
  unit,
  text,
  onText,
}: {
  label: string;
  unit: string;
  text: string;
  onText: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm text-[#383838]">R</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(event) => onText(event.target.value)}
          placeholder="Optional"
          className="w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
        />
        <span className="whitespace-nowrap text-sm text-slate-600">{unit}</span>
      </div>
    </label>
  );
}

export function CommercialOfferSection({
  value,
  onChange,
}: CommercialOfferSectionProps) {
  const [currentMonthlyRental, setCurrentMonthlyRental] = useState(
    moneyText(value.current.monthlyRental),
  );
  const [currentAnnualSla, setCurrentAnnualSla] = useState(moneyText(value.current.annualSla));
  const [equipmentPrice, setEquipmentPrice] = useState(moneyText(value.purchase.equipmentPrice));
  const [installation, setInstallation] = useState(moneyText(value.purchase.installation));
  const [delivery, setDelivery] = useState(moneyText(value.purchase.delivery));
  const [buyBack, setBuyBack] = useState(moneyText(value.purchase.buyBack));
  const [purchaseAnnualSla, setPurchaseAnnualSla] = useState(moneyText(value.purchase.annualSla));
  const [rentalMonthly, setRentalMonthly] = useState(moneyText(value.rental.monthlyRental));
  const [rentalAnnualSla, setRentalAnnualSla] = useState(moneyText(value.rental.annualSla));
  const [rentalInstallation, setRentalInstallation] = useState(moneyText(value.rental.installation));
  const [rentalTerm, setRentalTerm] = useState(
    value.rental.termMonths == null ? '' : String(value.rental.termMonths),
  );
  const [rentalEscalation, setRentalEscalation] = useState(
    value.rental.annualEscalationPercent == null
      ? ''
      : String(value.rental.annualEscalationPercent),
  );
  const [rentToOwnMonthly, setRentToOwnMonthly] = useState(moneyText(value.rentToOwn?.monthlyPayment));
  const [rentToOwnTerm, setRentToOwnTerm] = useState(
    value.rentToOwn?.termMonths == null ? '' : String(value.rentToOwn.termMonths),
  );
  const [rentToOwnEscalation, setRentToOwnEscalation] = useState(
    value.rentToOwn?.annualEscalationPercent == null ? '' : String(value.rentToOwn.annualEscalationPercent),
  );
  const [rentToOwnFinal, setRentToOwnFinal] = useState(moneyText(value.rentToOwn?.finalTransferPaymentRand));
  const [rentToOwnUpfront, setRentToOwnUpfront] = useState(moneyText(value.rentToOwn?.upfrontRand));
  const [rentToOwnBuyBack, setRentToOwnBuyBack] = useState(moneyText(value.rentToOwn?.buyBackRand));
  const [rentToOwnPostSla, setRentToOwnPostSla] = useState(moneyText(value.rentToOwn?.postTermAnnualSlaRand));
  const [rentToOwnYears, setRentToOwnYears] = useState(
    value.rentToOwn?.projectionYears == null ? '10' : String(value.rentToOwn.projectionYears),
  );
  const [rentToOwnOwnership, setRentToOwnOwnership] = useState(value.rentToOwn?.ownershipConfirmed === true);

  function emit(
    type: CommercialOfferType,
    next: Partial<{
      currentMonthlyRental: string;
      currentAnnualSla: string;
      equipmentPrice: string;
      installation: string;
      delivery: string;
      buyBack: string;
      purchaseAnnualSla: string;
      rentalMonthly: string;
      rentalAnnualSla: string;
      rentalInstallation: string;
      rentalTerm: string;
      rentalEscalation: string;
      rentToOwnMonthly: string;
      rentToOwnTerm: string;
      rentToOwnEscalation: string;
      rentToOwnFinal: string;
      rentToOwnUpfront: string;
      rentToOwnBuyBack: string;
      rentToOwnPostSla: string;
      rentToOwnYears: string;
      rentToOwnOwnership: boolean;
    }> = {},
  ) {
    onChange(
      buildCommercialOffer({
        type,
        currentMonthlyRental: next.currentMonthlyRental ?? currentMonthlyRental,
        currentAnnualSla: next.currentAnnualSla ?? currentAnnualSla,
        equipmentPrice: next.equipmentPrice ?? equipmentPrice,
        installation: next.installation ?? installation,
        delivery: next.delivery ?? delivery,
        buyBack: next.buyBack ?? buyBack,
        purchaseAnnualSla: next.purchaseAnnualSla ?? purchaseAnnualSla,
        rentalMonthly: next.rentalMonthly ?? rentalMonthly,
        rentalAnnualSla: next.rentalAnnualSla ?? rentalAnnualSla,
        rentalInstallation: next.rentalInstallation ?? rentalInstallation,
        rentalTerm: next.rentalTerm ?? rentalTerm,
        rentalEscalation: next.rentalEscalation ?? rentalEscalation,
        rentToOwnMonthly: next.rentToOwnMonthly ?? rentToOwnMonthly,
        rentToOwnTerm: next.rentToOwnTerm ?? rentToOwnTerm,
        rentToOwnEscalation: next.rentToOwnEscalation ?? rentToOwnEscalation,
        rentToOwnFinal: next.rentToOwnFinal ?? rentToOwnFinal,
        rentToOwnUpfront: next.rentToOwnUpfront ?? rentToOwnUpfront,
        rentToOwnBuyBack: next.rentToOwnBuyBack ?? rentToOwnBuyBack,
        rentToOwnPostSla: next.rentToOwnPostSla ?? rentToOwnPostSla,
        rentToOwnYears: next.rentToOwnYears ?? rentToOwnYears,
        rentToOwnOwnership: next.rentToOwnOwnership ?? rentToOwnOwnership,
      }),
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Commercial offer
      </h2>
      <div>
        <p className="text-xs font-medium text-slate-500">How are we offering the proposed solution?</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => emit('purchase')}
            className={`rounded-[8px] px-4 py-2 text-sm font-bold ${
              value.type === 'purchase'
                ? 'bg-[#f7c12b] text-[#383838]'
                : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
            }`}
          >
            Purchase
          </button>
          <button
            type="button"
            onClick={() => emit('rental')}
            className={`rounded-[8px] px-4 py-2 text-sm font-bold ${
              value.type === 'rental'
                ? 'bg-[#f7c12b] text-[#383838]'
                : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
            }`}
          >
            Rental
          </button>
          <button
            type="button"
            onClick={() => {
              const monthly = rentToOwnMonthly || rentalMonthly;
              const term = rentToOwnTerm || rentalTerm || '60';
              const escalation = rentToOwnEscalation || rentalEscalation;
              const years = rentToOwnYears || '10';
              setRentToOwnMonthly(monthly);
              setRentToOwnTerm(term);
              setRentToOwnEscalation(escalation);
              setRentToOwnYears(years);
              setRentToOwnOwnership(true);
              emit('rent_to_own', {
                rentToOwnMonthly: monthly,
                rentToOwnTerm: term,
                rentToOwnEscalation: escalation,
                rentToOwnYears: years,
                rentToOwnOwnership: true,
              });
            }}
            className={`rounded-[8px] px-4 py-2 text-sm font-bold ${
              value.type === 'rent_to_own'
                ? 'bg-[#f7c12b] text-[#383838]'
                : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
            }`}
          >
            Rent-to-own
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-[8px] border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Current commercial costs
        </p>
        <RandField
          label="Current rental / finance"
          unit="/ month"
          text={currentMonthlyRental}
          onText={(next) => {
            setCurrentMonthlyRental(next);
            emit(value.type, { currentMonthlyRental: next });
          }}
        />
        <RandField
          label="Current SLA / maintenance"
          unit="/ year"
          text={currentAnnualSla}
          onText={(next) => {
            setCurrentAnnualSla(next);
            emit(value.type, { currentAnnualSla: next });
          }}
        />
      </div>

      {value.type === 'purchase' && (
        <div className="space-y-3">
          <RandField
            label="Machine / equipment price"
            unit=""
            text={equipmentPrice}
            onText={(next) => {
              setEquipmentPrice(next);
              emit('purchase', { equipmentPrice: next });
            }}
          />
          <RandField
            label="Installation"
            unit=""
            text={installation}
            onText={(next) => {
              setInstallation(next);
              emit('purchase', { installation: next });
            }}
          />
          <RandField
            label="Delivery"
            unit=""
            text={delivery}
            onText={(next) => {
              setDelivery(next);
              emit('purchase', { delivery: next });
            }}
          />
          <RandField
            label="Buy-back / trade-in"
            unit=""
            text={buyBack}
            onText={(next) => {
              setBuyBack(next);
              emit('purchase', { buyBack: next });
            }}
          />
          <RandField
            label="SLA / maintenance"
            unit="/ year"
            text={purchaseAnnualSla}
            onText={(next) => {
              setPurchaseAnnualSla(next);
              emit('purchase', { purchaseAnnualSla: next });
            }}
          />
        </div>
      )}

      {value.type === 'rental' && (
        <div className="space-y-3">
          <RandField
            label="Monthly rental"
            unit="/ month"
            text={rentalMonthly}
            onText={(next) => {
              setRentalMonthly(next);
              emit('rental', { rentalMonthly: next });
            }}
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Rental term (months)</span>
            <input
              type="text"
              inputMode="numeric"
              value={rentalTerm}
              onChange={(event) => {
                setRentalTerm(event.target.value);
                emit('rental', { rentalTerm: event.target.value });
              }}
              placeholder="Required for the full-term benefit"
              className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Annual rental escalation (%)</span>
            <input
              type="text"
              inputMode="decimal"
              value={rentalEscalation}
              onChange={(event) => {
                setRentalEscalation(event.target.value);
                emit('rental', { rentalEscalation: event.target.value });
              }}
              placeholder="Blank means 0%"
              className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
            />
            <p className="mt-1 text-xs text-slate-600">
              Rental increases every 12 months from the start of the agreement.
            </p>
          </label>
          <RandField
            label="SLA / maintenance"
            unit="/ year"
            text={rentalAnnualSla}
            onText={(next) => {
              setRentalAnnualSla(next);
              emit('rental', { rentalAnnualSla: next });
            }}
          />
          <RandField
            label="Installation / once-off"
            unit=""
            text={rentalInstallation}
            onText={(next) => {
              setRentalInstallation(next);
              emit('rental', { rentalInstallation: next });
            }}
          />
        </div>
      )}

      {value.type === 'rent_to_own' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Ownership transfers after the payment term. Payments stop the following month. Electricity and operating costs continue. A blank final transfer payment and a blank post-term maintenance amount are left out of the figures and shown as unconfirmed assumptions. Blank escalation means 0%.
          </p>
          <RandField label="Monthly payment" unit="/ month" text={rentToOwnMonthly} onText={(next) => { setRentToOwnMonthly(next); emit('rent_to_own', { rentToOwnMonthly: next }); }} />
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Term (months)</span>
            <input className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm" value={rentToOwnTerm} onChange={(event) => { setRentToOwnTerm(event.target.value); emit('rent_to_own', { rentToOwnTerm: event.target.value }); }} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Annual payment escalation (%)</span>
            <input className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm" placeholder="Blank means 0%" value={rentToOwnEscalation} onChange={(event) => { setRentToOwnEscalation(event.target.value); emit('rent_to_own', { rentToOwnEscalation: event.target.value }); }} />
            <p className="mt-1 text-xs text-slate-600">Payments increase every 12 months and stop after the term. Electricity and maintenance are not escalated.</p>
          </label>
          <RandField label="Final ownership-transfer payment" unit="" text={rentToOwnFinal} onText={(next) => { setRentToOwnFinal(next); emit('rent_to_own', { rentToOwnFinal: next }); }} />
          <p className="text-xs text-slate-600">Leave blank if unknown. Enter 0 only when a final payment of zero is confirmed. It is applied in the month after the last payment.</p>
          <RandField label="Upfront cost" unit="" text={rentToOwnUpfront} onText={(next) => { setRentToOwnUpfront(next); emit('rent_to_own', { rentToOwnUpfront: next }); }} />
          <RandField label="Buy-back credit" unit="" text={rentToOwnBuyBack} onText={(next) => { setRentToOwnBuyBack(next); emit('rent_to_own', { rentToOwnBuyBack: next }); }} />
          <RandField label="Post-term maintenance / SLA" unit="/ year" text={rentToOwnPostSla} onText={(next) => { setRentToOwnPostSla(next); emit('rent_to_own', { rentToOwnPostSla: next }); }} />
          <p className="text-xs text-slate-600">Applied only after payments end. Leave blank if unknown.</p>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Projection period (years)</span>
            <input className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm" value={rentToOwnYears} onChange={(event) => { setRentToOwnYears(event.target.value); emit('rent_to_own', { rentToOwnYears: event.target.value }); }} />
            <p className="mt-1 text-xs text-slate-600">Assumption, default 10 years. It must extend beyond the payment term.</p>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={rentToOwnOwnership} onChange={(event) => { setRentToOwnOwnership(event.target.checked); emit('rent_to_own', { rentToOwnOwnership: event.target.checked }); }} />
            Ownership transfer after the term is confirmed
          </label>
        </div>
      )}
    </section>
  );
}
