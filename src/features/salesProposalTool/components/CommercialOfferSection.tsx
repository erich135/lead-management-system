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
    </section>
  );
}
