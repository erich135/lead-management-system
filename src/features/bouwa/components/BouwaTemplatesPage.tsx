/**
 * BouwaTemplatesPage
 *
 * Phase 4D-15: Templates & Assumptions page.
 *
 * Shows:
 *   - Air Audit Excel Template download
 *   - Report Template (PDF demo)
 *   - Tariff Defaults
 *   - CO₂ Factor
 *   - ROI Defaults
 *   - Manufacturer Spec Sources
 *
 * Excel download reuses the xlsx-based template from BouwaDemoAirAuditSection.
 * No API calls.
 */

import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet, FileText, Banknote, Leaf, BarChart3,
  Download, Info, CheckCircle2, Edit3, Save, X, AlertTriangle, Mountain, Thermometer,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Template builder (same as BouwaDemoAirAuditSection)
// ---------------------------------------------------------------------------

function generateAuditTemplate() {
  const wb = XLSX.utils.book_new();

  const sheets: { name: string; data: string[][] }[] = [
    {
      name: '1 Site & Customer',
      data: [
        ['ARS / Bouwa — Air Audit Template'],
        ['Sheet 1: Site & Customer Details'],
        [],
        ['Field', 'Value', 'Notes'],
        ['Customer Name', '', ''],
        ['Site / Plant', '', ''],
        ['Site Address', '', ''],
        ['Contact Person', '', ''],
        ['Audit Date', '', 'DD MMM YYYY'],
        ['Prepared By', '', ''],
        ['Report Date', '', 'DD MMM YYYY'],
        [],
        ['DEMO ONLY — localhost prototype'],
      ],
    },
    {
      name: '2 Existing Compressor',
      data: [
        ['Sheet 2: Existing Compressor Data'],
        [],
        ['Parameter', 'Machine 1', 'Machine 2', 'Unit', 'Notes'],
        ['Make', '', '', '', ''],
        ['Model', '', '', '', ''],
        ['Year of Manufacture', '', '', '', ''],
        ['Motor Rated Power', '', '', 'kW', ''],
        ['Motor Efficiency', '', '', '%', 'IE class if known'],
        ['Compressor FAD (rated)', '', '', 'm³/min', 'At rated pressure'],
        ['Rated Pressure', '', '', 'bar(g)', ''],
        ['Specific Power (rated)', '', '', 'kW/m³/min', ''],
        ['Speed Control', '', '', '', 'Fixed / VSD'],
        ['Total Running Hours', '', '', 'hours', ''],
        ['Last Service Date', '', '', '', ''],
      ],
    },
    {
      name: '3 Operating Profile',
      data: [
        ['Sheet 3: Operating Profile'],
        [],
        ['Parameter', 'Value', 'Unit', 'Notes'],
        ['Annual Run Hours', '', 'h/year', ''],
        ['Shift Pattern', '', '', 'e.g. 3-shift, 5-day'],
        ['Load Factor (est.)', '', '%', ''],
        ['Unload Duty (%)', '', '%', ''],
        ['Seasonal Variation', '', '', 'Peak / low season notes'],
      ],
    },
    {
      name: '4 Demand & Pressure',
      data: [
        ['Sheet 4: Air Demand & Pressure Readings'],
        [],
        ['Parameter', 'Value', 'Unit', 'Notes'],
        ['Measured Site Demand', '', 'm³/min', 'At compressor outlet'],
        ['System Pressure (operating)', '', 'bar(g)', ''],
        ['Pressure Drop (main header)', '', 'bar', ''],
        ['Total Air Leakage (est.)', '', 'm³/min', ''],
        ['No. of Leak Points Identified', '', '', ''],
      ],
    },
    {
      name: '5 Tariff & TOU',
      data: [
        ['Sheet 5: Electricity Tariff'],
        [],
        ['Parameter', 'Value', 'Unit', 'Notes'],
        ['Tariff Type', '', '', 'Eskom / Municipal / Custom'],
        ['Average Rate', '', 'R/kWh', ''],
        ['Peak Rate (LDS/HDS)', '', 'R/kWh', ''],
        ['Standard Rate', '', 'R/kWh', ''],
        ['Off-Peak Rate', '', 'R/kWh', ''],
        ['Demand Charge', '', 'R/kVA/month', 'If applicable'],
        ['CO₂ Factor', '0.61', 'kg/kWh', 'SA grid default'],
      ],
    },
    {
      name: '6 Leak Survey',
      data: [
        ['Sheet 6: Leak Survey'],
        [],
        ['Leak #', 'Location', 'Estimated Volume (m³/min)', 'Priority', 'Notes'],
        ['1', '', '', 'High', ''],
        ['2', '', '', 'High', ''],
        ['3', '', '', 'Medium', ''],
        ['4', '', '', 'Medium', ''],
        ['5', '', '', 'Low', ''],
      ],
    },
    {
      name: '7 Proposed Machine',
      data: [
        ['Sheet 7: Proposed Bouwa Machine'],
        [],
        ['Parameter', 'Value', 'Unit', 'Notes'],
        ['Bouwa Model', '', '', ''],
        ['Compressor Type', '', '', ''],
        ['Speed Control', '', '', 'VSD / Fixed'],
        ['Motor kW', '', 'kW', ''],
        ['Rated FAD (VSD range)', '', 'm³/min', ''],
        ['Package Input kW', '', 'kW', 'At operating point'],
        ['Rated Pressure Range', '', 'bar(g)', ''],
        ['Specific Power', '', 'kW/m³/min', ''],
        ['Estimated CapEx (excl. VAT)', '', 'R', ''],
      ],
    },
    {
      name: '8 Results Summary',
      data: [
        ['Sheet 8: Results / Savings Summary'],
        ['CALCULATED FROM DATA IN SHEETS 1–7'],
        [],
        ['Metric', 'Current', 'Proposed', 'Saving', 'Notes'],
        ['Annual Energy (kWh/year)', '', '', '', ''],
        ['Annual Energy Cost (R/year)', '', '', '', 'R/kWh × annual kWh'],
        ['CO₂ Emissions (kg/year)', '', '', '', '× 0.61 kg/kWh'],
        ['Saving %', '', '', '', ''],
        ['Payback Period (years)', '', '', '', 'CapEx ÷ Annual saving'],
        ['ROI %', '', '', '', '(Annual saving ÷ CapEx) × 100'],
        [],
        ['DEMO ONLY — Internal prototype'],
      ],
    },
  ];

  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  XLSX.writeFile(wb, 'ARS-Bouwa-Air-Audit-Template.xlsx');
}

// ---------------------------------------------------------------------------
// Editable defaults
// ---------------------------------------------------------------------------

interface TariffDefaults {
  avgRate: string;
  peakRate: string;
  standardRate: string;
  offPeakRate: string;
  co2Factor: string;
  annualHours: string;
}

const DEFAULT_TARIFFS: TariffDefaults = {
  avgRate: '1.35',
  peakRate: '1.9646',
  standardRate: '1.3524',
  offPeakRate: '0.7181',
  co2Factor: '0.61',
  annualHours: '6000',
};

interface ROIDefaults {
  targetPayback: string;
  vatRate: string;
  inflationRate: string;
  discountRate: string;
}

const DEFAULT_ROI: ROIDefaults = {
  targetPayback: '3.0',
  vatRate: '15',
  inflationRate: '6.0',
  discountRate: '8.5',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, icon, badge, children }: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-ars-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-ars-heading">{title}</h3>
        {badge && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-100 text-blue-700 border-blue-200">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EditableField({ label, value, unit, onChange }: {
  label: string;
  value: string;
  unit?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-ars-body">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-24 text-right text-sm font-semibold text-ars-heading border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
        />
        {unit && <span className="text-xs text-slate-400 w-14 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BouwaTemplatesPage() {
  const [tariffs, setTariffs] = useState<TariffDefaults>(DEFAULT_TARIFFS);
  const [roi, setROI] = useState<ROIDefaults>(DEFAULT_ROI);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-ars-primary/10 p-2.5 shrink-0">
          <FileText className="w-6 h-6 text-ars-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ars-heading">Templates & Assumptions</h1>
          <p className="text-sm text-ars-body">Download templates, configure default values, and manage assumption sources.</p>
        </div>
      </div>

      {/* Template downloads */}
      <SectionCard title="Templates" icon={<FileSpreadsheet className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-ars-heading">Air Audit Excel Template</p>
                <p className="text-xs text-ars-body">8-sheet workbook — Site, Compressor, Operating Profile, Demand, Tariff, Leak Survey, Proposed Machine, Results Summary</p>
              </div>
            </div>
            <button
              type="button"
              onClick={generateAuditTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg text-sm hover:bg-green-700 transition shrink-0"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-ars-heading">Report Template (PDF Demo)</p>
                <p className="text-xs text-ars-body">Demo jsPDF proposal template — watermarked DEMO ONLY. Access via New Proposal → Step 11.</p>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shrink-0">
              Via Wizard Step 11
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Tariff defaults */}
      <SectionCard title="Tariff Defaults (Fallback Only)" icon={<Banknote className="w-4 h-4" />} badge="Eskom LDS reference">
        <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2.5 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Defaults only — </span>
            Actual site tariff must be selected or captured per proposal in Step 1 (Tariff Profile).
            These default values are used only when no site-specific tariff has been entered.
            Confirm R/kWh from the customer’s electricity bill before finalising any savings claim.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          <EditableField label="Average Rate" value={tariffs.avgRate} unit="R/kWh" onChange={v => setTariffs(t => ({ ...t, avgRate: v }))} />
          <EditableField label="Peak Rate (LDS/HDS)" value={tariffs.peakRate} unit="R/kWh" onChange={v => setTariffs(t => ({ ...t, peakRate: v }))} />
          <EditableField label="Standard Rate" value={tariffs.standardRate} unit="R/kWh" onChange={v => setTariffs(t => ({ ...t, standardRate: v }))} />
          <EditableField label="Off-Peak Rate" value={tariffs.offPeakRate} unit="R/kWh" onChange={v => setTariffs(t => ({ ...t, offPeakRate: v }))} />
          <EditableField label="Typical Annual Run Hours" value={tariffs.annualHours} unit="h/year" onChange={v => setTariffs(t => ({ ...t, annualHours: v }))} />
        </div>
        <p className="text-xs text-slate-400 mt-3">Reference rates only — confirm actual site tariff before finalising proposal.</p>
      </SectionCard>

      {/* CO₂ factor */}
      <SectionCard title="CO₂ Emission Factor" icon={<Leaf className="w-4 h-4" />} badge="SA Grid">
        <div className="divide-y divide-slate-100">
          <EditableField
            label="CO₂ Factor (South Africa grid)"
            value={tariffs.co2Factor}
            unit="kg CO₂/kWh"
            onChange={v => setTariffs(t => ({ ...t, co2Factor: v }))}
          />
        </div>
        <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800">
            SA grid average: ~0.61 kg CO₂/kWh (2024 DFFE reference). Update annually as Eskom generation mix changes.
          </p>
        </div>
      </SectionCard>

      {/* ROI defaults */}
      <SectionCard title="ROI Defaults" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="divide-y divide-slate-100">
          <EditableField label="Target Payback Period" value={roi.targetPayback} unit="years" onChange={v => setROI(r => ({ ...r, targetPayback: v }))} />
          <EditableField label="VAT Rate" value={roi.vatRate} unit="%" onChange={v => setROI(r => ({ ...r, vatRate: v }))} />
          <EditableField label="Electricity Inflation Rate" value={roi.inflationRate} unit="% p.a." onChange={v => setROI(r => ({ ...r, inflationRate: v }))} />
          <EditableField label="Discount Rate (WACC estimate)" value={roi.discountRate} unit="% p.a." onChange={v => setROI(r => ({ ...r, discountRate: v }))} />
        </div>
        <p className="text-xs text-slate-400 mt-3">* All pricing in proposals excludes VAT unless stated otherwise.</p>
      </SectionCard>

      {/* Site Conditions Defaults */}
      <SectionCard title="Site Conditions Defaults & Altitude Reference" icon={<Mountain className="w-4 h-4" />}>
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 mb-4 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Compressor performance is altitude and temperature dependent.
            Manufacturer datasheets are reference-condition values (sea level, standard ambient).
            Apply site correction before using in savings proposals — especially for Gauteng / high-altitude sites.
          </p>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Sea Level Reference (Cape Town, Durban, PE)', alt: '0 – 100 m', correction: 'Minimal — use datasheet values with minor adjustment', color: 'bg-green-50 border-green-200' },
            { label: 'Johannesburg / Gauteng High Altitude', alt: '~1,750 m', correction: 'Significant derating required — approx. 5–10% FAD and kW reduction. Request manufacturer correction table.', color: 'bg-amber-50 border-amber-200' },
            { label: 'Pretoria / Tshwane', alt: '~1,350 m', correction: 'Moderate derating — apply correction before savings claim', color: 'bg-amber-50 border-amber-200' },
            { label: 'General default ambient temp', alt: '—', correction: '20°C (ISO 1217 reference). Adjust for site actual (Ingrain Belville: 21°C per audit).', color: 'bg-slate-50 border-slate-200' },
          ].map(r => (
            <div key={r.label} className={`rounded-lg border ${r.color} px-3 py-2`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-semibold text-ars-heading">{r.label}</p>
                <span className="text-slate-500">Altitude: {r.alt}</span>
              </div>
              <p className="text-slate-600 mt-0.5">{r.correction}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Manufacturer correction table required: </span>
            Before issuing any proposal based on manufacturer specs at a high-altitude site, request the altitude correction table from Bouwa / the manufacturer, or apply ISO 1217 Annex C altitude correction procedure.
          </p>
        </div>
      </SectionCard>

      {/* Industrial Tariff Profiles */}
      <SectionCard title="Industrial Tariff Profiles" icon={<Banknote className="w-4 h-4" />} badge="Large Industrial / Mining">
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-800">
              <span className="font-semibold">Preferred source: actual customer electricity bill. </span>
              For large industrial and mining customers, electricity spend can run into millions of Rand per year.
              A blended average tariff is acceptable for early estimates only.
              Final savings calculations must be based on the customer's actual tariff structure wherever possible.
            </p>
          </div>
          <div className="space-y-2 text-xs">
            {[
              {
                rule: 'Customer bill is the preferred tariff source',
                detail: 'Request the customer\'s most recent electricity bill. Extract actual R/kWh rates and demand charges. Record the bill reference and date.',
                color: 'bg-green-50 border-green-200 text-green-800',
              },
              {
                rule: 'Official Eskom / municipal schedules are secondary',
                detail: 'Use official published tariff schedules when a customer bill is unavailable. Match the correct tariff category (LDS, HDS, MegaFlex, Ruraflex, etc.) to the site\'s supply agreement.',
                color: 'bg-blue-50 border-blue-200 text-blue-800',
              },
              {
                rule: 'Estimates / placeholders for internal drafts only',
                detail: 'Placeholder tariffs must be labelled as such. Do not present estimate-based savings as final figures to a customer. Clearly mark proposals as "Draft — tariff unconfirmed".',
                color: 'bg-amber-50 border-amber-200 text-amber-800',
              },
              {
                rule: 'Tariffs must be versioned by effective date',
                detail: 'Tariff schedules change annually (typically 1 April). Old proposals must retain the tariff rates used at the time. New proposals must use the latest confirmed tariff profile.',
                color: 'bg-purple-50 border-purple-200 text-purple-800',
              },
              {
                rule: 'TOU method preferred over blended estimate for large accounts',
                detail: 'Annual Saving = (Peak kWh Saved × Peak Rate) + (Standard kWh Saved × Standard Rate) + (Off-peak kWh Saved × Off-peak Rate) + Demand charge impact. This is significantly more accurate than a blended rate for customers on TOU tariffs.',
                color: 'bg-slate-50 border-slate-200 text-slate-700',
              },
              {
                rule: 'Demand charges can be significant for large compressors',
                detail: 'Large fixed-speed compressors draw high peak kVA. VSD compressors reduce peak demand. Demand charge savings (R/kVA/month) can be as significant as kWh savings for some customers.',
                color: 'bg-slate-50 border-slate-200 text-slate-700',
              },
            ].map(r => (
              <div key={r.rule} className={`rounded-lg border ${r.color} px-3 py-2`}>
                <p className="font-semibold">{r.rule}</p>
                <p className="mt-0.5 text-slate-600">{r.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Manufacturer spec sources */}
      <SectionCard title="Manufacturer Spec Sources" icon={<FileText className="w-4 h-4" />}>
        <div className="space-y-2 text-xs">
          {[
            { source: 'Atlas Copco product range datasheets', status: 'Available' },
            { source: 'CompAir L-Series published specification sheets', status: 'Available' },
            { source: 'Ingersoll Rand R-Series product data', status: 'Available' },
            { source: 'Kaeser BSD/CSD series product literature', status: 'Available' },
            { source: 'Bouwa internal spec library (75 specs)', status: 'Loaded' },
            { source: 'CAGI data sheets (certified performance)', status: 'Partial' },
          ].map(s => (
            <div key={s.source} className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span className="flex-1 text-ars-body">{s.source}</span>
              <span className="text-slate-400">{s.status}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Save defaults button */}
      <div className="flex items-center gap-3 justify-end">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" /> Defaults saved (demo only)
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-ars-primary text-white font-semibold rounded-xl text-sm hover:bg-ars-primary/90 transition"
        >
          <Save className="w-4 h-4" /> Save Defaults
        </button>
      </div>
    </div>
  );
}
