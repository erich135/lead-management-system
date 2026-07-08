/**
 * BouwaNewProposalWizard
 *
 * Phase 4D-15: 11-step Air Audit Proposal Builder wizard.
 *
 * Steps:
 *  1  Proposal Setup
 *  2  Existing Compressors
 *  3  Data Source
 *  4  Site Observations
 *  5  Performance Metrics
 *  6  Efficiency & Root Cause
 *  7  Select Bouwa Solution
 *  8  Savings Opportunity
 *  9  ROI Comparison
 * 10  Recommendations & Next Steps
 * 11  Report Preview
 *
 * Demo data based on Ingrain Belville — L250/L160 → Bouwa SVC-RS160-II.
 * No API calls, no DB writes, no approvalStatus changes.
 */

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Phase 4D-17/18 — calculation modules
import { INGRAIN_LOAD_PROFILE as LOAD_PROFILE } from '../calculations/loadProfileEngine';
import { INGRAIN_COST_REFERENCE, MODEL_NAMING_CONFLICT_NOTE } from '../calculations/ingrainReferenceScenario';
import { runValidation, summariseValidation } from '../calculations/validationEngine';
import { INGRAIN_ROI_REFERENCE } from '../calculations/roiEngine';
import { ESKOM_RATES_SET_A, ESKOM_RATES_SET_B, INGRAIN_DAY_CALENDAR } from '../calculations/tariffEngine';
import {
  ChevronRight, ChevronLeft, Check, Wind, FileText, Cpu, Zap, BarChart3,
  AlertTriangle, CheckCircle2, Download, Upload, Plus, Info, Printer,
  Building2, Calendar, User, MapPin, ClipboardList, Wrench, Leaf,
  ArrowUpRight, DollarSign, Target, ListChecks, Thermometer, Gauge, Banknote,
  Mountain, Bolt,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type DataSourceMode = 'audit-excel' | 'manual-entry' | 'manufacturer-specs';

// Source quality levels for conditional fields
type ConditionSource = 'audit-measured' | 'manual' | 'manufacturer-assumption';
type TariffSource = 'actual-bill' | 'eskom-schedule' | 'municipal-schedule' | 'estimate';
type TariffType = 'flat' | 'tou' | 'demand-based' | 'blended-estimate';
type TariffConfidence = 'bill-confirmed' | 'official-schedule' | 'estimate' | 'unknown';

interface ProposalSetup {
  customer: string;
  site: string;
  cityTown: string;
  province: string;
  plantLocation: string;
  applicationLine: string;
  auditDate: string;
  reportDate: string;
  preparedBy: string;
  proposalTitle: string;
  notes: string;
}

interface SiteConditions {
  altitudeM: string;
  ambientTempC: string;
  relativeHumidity: string;
  compressorRoomVentilation: string;
  coolingAirCondition: string;
  sitePressureRequirement: string;
  conditionSource: ConditionSource;
}

interface TariffProfile {
  // --- Core provenance ---
  tariffConfidence: TariffConfidence;
  tariffSource: TariffSource;
  // --- Supplier ---
  electricitySupplier: string;
  municipalityRegion: string;
  tariffCategoryName: string;
  tariffType: TariffType;
  vatIncluded: 'included' | 'excluded' | 'unknown';
  // --- Rates ---
  blendedAvgRkWh: string;
  peakRateRkWh: string;
  standardRateRkWh: string;
  offPeakRateRkWh: string;
  // --- Demand & access charges ---
  demandChargeRkVA: string;
  networkAccessCharge: string;
  serviceAdminCharge: string;
  // --- High/Low demand season rates ---
  highDemandMonths: string;
  lowDemandMonths: string;
  highDemandPeakRate: string;
  highDemandOffPeakRate: string;
  lowDemandPeakRate: string;
  lowDemandOffPeakRate: string;
  // --- Effective dates & provenance ---
  effectiveFrom: string;
  effectiveTo: string;
  sourceDocumentRef: string;
  lastCheckedDate: string;
  confirmedBy: string;
  tariffDateConfirmed: string;
}

interface TariffOperatingProfile {
  peakRunPct: string;
  standardRunPct: string;
  offPeakRunPct: string;
  annualRunHours: string;
  annualPeakHours: string;
  annualStandardHours: string;
  annualOffPeakHours: string;
}

const DEFAULT_SETUP: ProposalSetup = {
  customer: 'Ingrain Belville',
  site: 'Belville, Cape Town, Western Cape',
  cityTown: 'Belville / Cape Town',
  province: 'Western Cape',
  plantLocation: 'Compressor Room — Ingrain Belville Plant',
  applicationLine: 'Compressed air supply — industrial milling / processing',
  auditDate: '2025-05-30',
  reportDate: '2025-08-01',
  preparedBy: 'John Roselt / ARS',
  proposalTitle: 'Ingrain Belville — Compressed Air Performance Audit Report',
  notes: 'Audit performed 30 May 2025. Both CompAir L250 and L160 assessed. Proposed solution: Bouwa SVC-RS160-II / SVC160-II (naming requires review — see Step 7). Full air flow study recommended before finalising specs.',
};

const DEFAULT_SITE_CONDITIONS: SiteConditions = {
  altitudeM: '~10 m (near sea level — Bellville / Cape Town)',
  ambientTempC: '21',
  relativeHumidity: 'Not recorded — assume typical coastal',
  compressorRoomVentilation: 'Standard ventilated room — to be confirmed on site',
  coolingAirCondition: 'Ambient air-cooled — no supplementary cooling noted',
  sitePressureRequirement: '7.5 bar(g)',
  conditionSource: 'audit-measured',
};

const DEFAULT_TARIFF: TariffProfile = {
  tariffConfidence: 'estimate',
  tariffSource: 'estimate',
  electricitySupplier: 'City of Cape Town Municipal / Eskom (confirm with site)',
  municipalityRegion: 'City of Cape Town',
  tariffCategoryName: 'TBC — confirm with site',
  tariffType: 'flat',
  vatIncluded: 'unknown',
  blendedAvgRkWh: 'Placeholder — from deck savings calculation',
  peakRateRkWh: 'TBC — confirm with site billing',
  standardRateRkWh: 'TBC — confirm with site billing',
  offPeakRateRkWh: 'TBC — confirm with site billing',
  demandChargeRkVA: 'Not available',
  networkAccessCharge: 'TBC',
  serviceAdminCharge: 'TBC',
  highDemandMonths: 'Jun, Jul, Aug (typical HDS)',
  lowDemandMonths: 'Sep – May (typical LDS)',
  highDemandPeakRate: 'TBC',
  highDemandOffPeakRate: 'TBC',
  lowDemandPeakRate: 'TBC',
  lowDemandOffPeakRate: 'TBC',
  effectiveFrom: 'TBC',
  effectiveTo: 'TBC',
  sourceDocumentRef: 'Pending — request customer electricity bill',
  lastCheckedDate: 'Not confirmed',
  confirmedBy: '',
  tariffDateConfirmed: 'Not confirmed — pending site bill',
};

const DEFAULT_TARIFF_OP_PROFILE: TariffOperatingProfile = {
  peakRunPct: '~80% (estimated)',
  standardRunPct: '~15% (estimated)',
  offPeakRunPct: '~5% (estimated)',
  annualRunHours: '6,000',
  annualPeakHours: '~4,800',
  annualStandardHours: '~900',
  annualOffPeakHours: '~300',
};

// Demo compressor rows — exact values from Ingrain Belville deck (30 May 2025 audit)
const DEMO_COMPRESSORS = [
  {
    id: 'c1',
    make: 'CompAir',
    model: 'L250',
    type: 'Fixed-speed oil-injected rotary screw',
    yearMfg: 2006,
    age: '19 years (as at audit date)',
    dateOfTest: '30 May 2025',
    ambientTemp: '21 °C',
    motorEfficiency: '87%',
    unloadedOpPct: '30%',
    runningStatus: 'Loaded/Unloaded (ball valve open)',
    peakFlowFAD: '27.86 m³/min (measured peak)',
    standardFAD: '42.7 m³/min (rated)',
    powerDrawMax: '294 kW (package input)',
    pressure: '7.5 bar(g)',
    powerEfficiencyRange: '10.55 kW/m³/min (at peak FAD)',
    standardPowerEfficiency: '6.88 kW/m³/min (at rated FAD)',
    loadedHours: '64,466 h (unit spec)',
    totalRunningHours: '92,143 h (unit spec)',
    deckObsRunningHours: '93,889 h',
    deckObsLoadingHours: '65,574 h',
    usage: '70%',
    wastage: '30%',
    keyFinding: 'Oversized for current demand. Frequent unloading (30% unloaded time). Peak measured FAD (27.86 m³/min) well below rated capacity (42.7 m³/min). 10.55 kW/m³/min at operating point indicates poor efficiency under low-load conditions.',
  },
  {
    id: 'c2',
    make: 'CompAir',
    model: 'L160',
    type: 'Fixed-speed oil-injected rotary screw',
    yearMfg: 2001,
    age: '25 years (as at audit date)',
    dateOfTest: '30 May 2025',
    ambientTemp: '21 °C',
    motorEfficiency: '90%',
    unloadedOpPct: '18%',
    runningStatus: 'Loaded/Unloaded (ball valve open)',
    peakFlowFAD: '26.81 m³/min (measured peak)',
    standardFAD: '29.7 m³/min (rated)',
    powerDrawMax: '184 kW (package input)',
    pressure: '7.5 bar(g)',
    powerEfficiencyRange: '6.86 kW/m³/min (at peak FAD)',
    standardPowerEfficiency: '6.19 kW/m³/min (at rated FAD)',
    loadedHours: '93,123 h (unit spec)',
    totalRunningHours: '112,782 h (unit spec)',
    deckObsRunningHours: '113,530 h',
    deckObsLoadingHours: '93,808 h',
    usage: '82%',
    wastage: '18%',
    keyFinding: 'Slightly oversized with some unloading present (18% unloaded time). Machine is 25 years old — beyond typical redundancy lifecycle. Some unloading creates unnecessary energy consumption.',
  },
];

// Bouwa solution spec — deck references SVC160-II / SVC-RS160-II (naming inconsistency noted)
// Deck recommendations reference SVC160-II / SVC-RS160-II.
// Deck savings table references "BOUWA RS132 VSD COST" — different model name.
// Inconsistency must be shown to user, not hidden.
const BOUWA_SOLUTION = {
  model: 'SVC-RS160-II / SVC160-II',
  fullName: 'Bouwa SVC-RS160-II 2-Stage VSD Air Compressor',
  compressorType: '2-stage oil-injected rotary screw',
  speedControl: 'VSD (Variable Speed Drive)',
  ratedPressure: '7.5 bar(g) (operating)',
  capacityFAD: 'TBC — pending full air flow study',
  motorKw: 160,
  packageInputKw: 'TBC pending spec confirmation',
  specificPower: 'TBC — requires confirmed spec sheet',
  source: 'Bouwa internal spec — requires review',
  sourceLabel: 'Bouwa Spec',
  namingInconsistency: true,
  namingNote: 'Deck recommendations reference SVC160-II / SVC-RS160-II. Deck savings table uses "BOUWA RS132 VSD COST". These appear to be different model designations. Confirm correct model with Bouwa before finalising proposal.',
  notes: 'Proposed solution pending full air flow study and confirmed Bouwa spec sheet. VSD would eliminate unload losses. 2-stage efficiency advantage over fixed-speed L250/L160.',
};

// Savings data — from Ingrain Belville deck
// Note: deck savings table references "BOUWA RS132 VSD COST" (R1.68M/year proposed cost).
// CO₂ factors as provided in deck — note: deck CO₂/kWh factor may differ from SA grid default.
const SAVINGS_TABLE = [
  { metric: 'Annual Energy Cost (R/year)', l160: 'R 2,830,000', l250: 'R 4,350,000', bouwa: 'R 1,680,000', savingL160: 'R 1,150,000', savingL250: 'R 2,670,000', notes: 'From Ingrain deck. Bouwa model ref: RS132 VSD (deck savings table)' },
  { metric: 'Saving %', l160: 'R 2.83M', l250: 'R 4.35M', bouwa: 'R 1.68M', savingL160: '40%', savingL250: '61%', notes: 'vs. individual machine cost' },
  { metric: 'CO₂ Savings (kg CO₂/year)', l160: '—', l250: '—', bouwa: '—', savingL160: '2,240,952 kg (2,241 t)', savingL250: '9,221,538 kg (9,221 t)', notes: 'As per Ingrain deck. CO₂ factor source: deck (may differ from 0.61 SA default)' },
  { metric: 'Proposed model note', l160: '—', l250: '—', bouwa: 'RS132 VSD (savings table) / SVC-RS160-II (recommendations)', savingL160: '—', savingL250: '—', notes: '⚠ Naming inconsistency in deck — confirm with Bouwa' },
];

// ROI scenarios — savings from Ingrain deck; pricing/buy-back TBC
const ROI_SCENARIOS = [
  {
    id: 'A',
    label: 'Scenario A',
    desc: '2 × Bouwa SVC-RS160-II / SVC160-II VSD (both units replaced)',
    unitPrice: 'TBC (pending Bouwa quote)',
    quantity: 2,
    totalCost: 'TBC',
    annualSavingL160: 'R 1,150,000 / year',
    annualSavingL250: 'R 2,670,000 / year',
    annualSavingCombined: 'R 3,820,000 / year (combined)',
    buybackL160: 'TBC — pending assessment',
    buybackL250: 'TBC — pending assessment',
    refurbL160: '—',
    refurbL250: '—',
    netInvestment: 'TBC — after buy-back',
    payback: 'TBC',
    roiPct: 'TBC',
    highlight: true,
    color: 'border-green-300 bg-green-50',
  },
  {
    id: 'B',
    label: 'Scenario B',
    desc: '1 × Bouwa SVC-RS160-II + keep L160 (refurbish)',
    unitPrice: 'TBC',
    quantity: 1,
    totalCost: 'TBC',
    annualSavingL160: '—',
    annualSavingL250: 'R 2,670,000 / year (replace L250)',
    annualSavingCombined: 'TBC',
    buybackL160: '—',
    buybackL250: 'TBC',
    refurbL160: 'TBC',
    refurbL250: '—',
    netInvestment: 'TBC',
    payback: 'TBC',
    roiPct: 'TBC',
    highlight: false,
    color: 'border-blue-200 bg-blue-50',
  },
  {
    id: 'C',
    label: 'Scenario C',
    desc: '1 × Bouwa SVC-RS160-II + keep L250 (refurbish)',
    unitPrice: 'TBC',
    quantity: 1,
    totalCost: 'TBC',
    annualSavingL160: 'R 1,150,000 / year (replace L160)',
    annualSavingL250: '—',
    annualSavingCombined: 'TBC',
    buybackL160: 'TBC',
    buybackL250: '—',
    refurbL160: '—',
    refurbL250: 'TBC',
    netInvestment: 'TBC',
    payback: 'TBC',
    roiPct: 'TBC',
    highlight: false,
    color: 'border-amber-200 bg-amber-50',
  },
];

const SITE_OBSERVATIONS = [
  { label: 'Ball Valve Test', value: 'Ball valve test confirmed low load requirements. Pressure and flow observations support oversizing finding. Both machines operate with ball valve open.', source: 'Audit' },
  { label: 'Load/Unload Behaviour — L250', value: 'L250 unloading 30% of run time. Both machines fluctuate between load and unload, indicating poor match to actual demand profile.', source: 'Audit' },
  { label: 'Load/Unload Behaviour — L160', value: 'L160 unloading 18% of run time. Some unloading present despite lower unload percentage than L250.', source: 'Audit' },
  { label: 'Usage / Wastage — L250', value: 'L250: Usage 70%, Wastage 30%. Significant proportion of compressed air wasted due to oversizing and unload losses.', source: 'Audit' },
  { label: 'Usage / Wastage — L160', value: 'L160: Usage 82%, Wastage 18%. Better utilisation than L250 but still wastage present.', source: 'Audit' },
  { label: 'Redundancy / Machine Age', value: 'L250: 19 years old (2006). L160: 25 years old (2001). Both beyond typical 15-year redundancy lifecycle. High cumulative running hours on both units.', source: 'Audit' },
  { label: 'Air Leaks', value: 'Air leak audit recommended. Reducing leaks will improve demand accuracy and reduce kWh consumption independently of machine replacement.', source: 'Recommendation' },
  { label: 'Control System', value: 'Current control approach results in sub-optimal load distribution. Implementing load-sharing logic or dual-compressor control system recommended.', source: 'Recommendation' },
];

// Root cause findings — from Ingrain Belville deck
const ROOT_CAUSE_FINDINGS = [
  { finding: 'Both compressors oversized for current air demand', severity: 'high', detail: 'L250 rated 42.7 m³/min but peak measured FAD only 27.86 m³/min (65% utilisation). L160 rated 29.7 m³/min, peak FAD 26.81 m³/min. Combined rated capacity far exceeds actual site demand.' },
  { finding: 'Ball valve testing confirmed low load requirements', severity: 'high', detail: 'Ball valve test results support the finding that both machines are operating well below their rated output. Site demand does not justify running both fixed-speed units simultaneously.' },
  { finding: 'Continuous unloading causes unnecessary power consumption', severity: 'high', detail: 'L250 unloads 30% of run time. L160 unloads 18%. Fixed-speed machines continue drawing power when unloaded — this is preventable with VSD technology.' },
  { finding: 'Both compressors fluctuate between load and unload', severity: 'high', detail: 'Frequent cycling between loaded and unloaded states is a symptom of machines not matched to actual demand. A VSD compressor eliminates this cycling by modulating output continuously.' },
  { finding: 'Machines not well matched to actual compressed air demand profile', severity: 'high', detail: 'Fixed-speed machines cannot adapt to variable demand. The site demand profile requires a VSD-capable solution to operate efficiently across the full load range.' },
  { finding: 'Machine age — both beyond typical service lifecycle', severity: 'medium', detail: 'L250: 19 years old (2006), 92,143 h total. L160: 25 years old (2001), 112,782 h total. Both beyond typical 15-year redundancy lifecycle. Maintenance cost escalation expected.' },
  { finding: 'Air leak losses increase apparent demand', severity: 'medium', detail: 'Air leaks increase demand on both machines, contributing to unnecessary running hours. Leak audit and repair recommended before final savings calculation.' },
];

// Recommendations — from Ingrain Belville deck
const RECOMMENDATIONS = [
  { id: 'r1', text: 'Right-size with BOUWA SVC160-II / SVC-RS160-II 2-stage VSD air compressor. Replace both L250 and L160 fixed-speed units with correctly sized VSD solution. (Note: confirm model designation — deck uses both SVC160-II and RS132 VSD.)', checked: true },
  { id: 'r2', text: 'Perform full air flow study to finalise specifications before ordering. Current proposal based on audit snapshot — full study will confirm seasonal demand profile and right-sizing.', checked: true },
  { id: 'r3', text: 'Repair air leaks from air leak audit. Reducing leaks will improve demand accuracy and deliver independent energy savings regardless of machine replacement.', checked: true },
  { id: 'r4', text: 'Consider buy-back options for L250 and L160 to reduce net capital investment.', checked: true },
  { id: 'r5', text: 'Implement load-sharing logic or dual-compressor control system if retaining both machines in any interim scenario.', checked: true },
  { id: 'r6', text: 'Reduce CO₂ footprint — VSD replacement provides significant CO₂ reduction (deck: 2,241 t/year vs L160; 9,221 t/year vs L250).', checked: true },
  { id: 'r7', text: 'Schedule follow-up meeting with Ingrain Belville to present full proposal after air flow study is complete.', checked: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    'Audit': 'bg-green-100 text-green-700 border-green-200',
    'Manufacturer': 'bg-blue-100 text-blue-700 border-blue-200',
    'Manual': 'bg-amber-100 text-amber-700 border-amber-200',
    'Assumed': 'bg-slate-100 text-slate-600 border-slate-200',
    'Recommendation': 'bg-purple-100 text-purple-700 border-purple-200',
    'Bouwa Spec': 'bg-teal-100 text-teal-700 border-teal-200',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${map[source] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {source}
    </span>
  );
}

function TariffConfidenceBadge({ confidence }: { confidence: TariffConfidence }) {
  const cfg: Record<TariffConfidence, { label: string; cls: string; dot: string }> = {
    'bill-confirmed':    { label: 'Customer Bill Confirmed', cls: 'bg-green-100 text-green-800 border-green-300',  dot: 'bg-green-500' },
    'official-schedule': { label: 'Official Tariff Schedule', cls: 'bg-blue-100 text-blue-800 border-blue-300',    dot: 'bg-blue-500'  },
    'estimate':          { label: 'Estimate',                 cls: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
    'unknown':           { label: 'Unknown',                  cls: 'bg-red-100 text-red-800 border-red-300',       dot: 'bg-red-500'   },
  };
  const { label, cls, dot } = cfg[confidence] ?? cfg.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

function StepHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
      <div className="rounded-xl bg-ars-primary/10 p-2.5 shrink-0">{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-ars-heading">{title}</h2>
        {sub && <p className="text-sm text-ars-body mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

// Helper: labelled select input
function LabelledSelect({ label, value, options, onChange, icon }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {icon && <span className="text-ars-primary">{icon}</span>}
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ars-primary/30 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Step1_SiteAndConditions({
  data, onChange, siteConditions, onChangeSiteConditions, tariffProfile, onChangeTariff,
  tariffOpProfile, onChangeTariffOpProfile,
}: {
  data: ProposalSetup;
  onChange: (d: ProposalSetup) => void;
  siteConditions: SiteConditions;
  onChangeSiteConditions: (s: SiteConditions) => void;
  tariffProfile: TariffProfile;
  onChangeTariff: (t: TariffProfile) => void;
  tariffOpProfile: TariffOperatingProfile;
  onChangeTariffOpProfile: (p: TariffOperatingProfile) => void;
}) {
  const [showAdvancedTariff, setShowAdvancedTariff] = useState(false);
  function textField(label: string, value: string, onCh: (v: string) => void, icon?: React.ReactNode, type = 'text', textarea = false) {
    return (
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {icon && <span className="text-ars-primary">{icon}</span>}
          {label}
        </label>
        {textarea ? (
          <textarea
            value={value}
            onChange={e => onCh(e.target.value)}
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ars-primary/30 resize-none"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onCh(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
          />
        )}
      </div>
    );
  }

  function sc(key: keyof SiteConditions) { return (v: string) => onChangeSiteConditions({ ...siteConditions, [key]: v }); }
  function tp(key: keyof TariffProfile) { return (v: string) => onChangeTariff({ ...tariffProfile, [key]: v as never }); }
  function su(key: keyof ProposalSetup) { return (v: string) => onChange({ ...data, [key]: v }); }
  function op(key: keyof TariffOperatingProfile) { return (v: string) => onChangeTariffOpProfile({ ...tariffOpProfile, [key]: v }); }

  const condSourceOpts = [
    { value: 'audit-measured', label: 'Audit Measured' },
    { value: 'manual', label: 'Manual Entry' },
    { value: 'manufacturer-assumption', label: 'Manufacturer / Assumed' },
  ];
  const tariffTypeOpts = [
    { value: 'flat', label: 'Flat Rate' },
    { value: 'tou', label: 'Time-of-Use (TOU)' },
    { value: 'demand-based', label: 'Demand-Based' },
    { value: 'blended-estimate', label: 'Blended Estimate' },
  ];
  const tariffSourceOpts = [
    { value: 'actual-bill', label: 'Actual site electricity bill' },
    { value: 'eskom-schedule', label: 'Eskom published schedule' },
    { value: 'municipal-schedule', label: 'Municipal published schedule' },
    { value: 'estimate', label: 'Estimate / placeholder' },
  ];
  const supplierOpts = [
    { value: 'eskom-direct', label: 'Eskom direct' },
    { value: 'municipal', label: 'Municipal' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Building2 className="w-5 h-5 text-ars-primary" />}
        title="Customer / Site & Conditions"
        sub="Customer details, site conditions, and tariff profile — all three are inputs to the savings calculation."
      />

      {/* ── A: Customer / Site ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-bold text-ars-heading flex items-center gap-2">
          <Building2 className="w-4 h-4 text-ars-primary" />
          A — Customer / Site
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {textField('Customer / Site', data.customer, su('customer'), <Building2 className="w-3.5 h-3.5" />)}
          {textField('Site Address', data.site, su('site'), <MapPin className="w-3.5 h-3.5" />)}
          {textField('City / Town', data.cityTown, su('cityTown'), <MapPin className="w-3.5 h-3.5" />)}
          {textField('Province', data.province, su('province'), <MapPin className="w-3.5 h-3.5" />)}
          {textField('Plant / Location', data.plantLocation, su('plantLocation'), <MapPin className="w-3.5 h-3.5" />)}
          {textField('Application / Line', data.applicationLine, su('applicationLine'), <Wrench className="w-3.5 h-3.5" />)}
          {textField('Audit Date', data.auditDate, su('auditDate'), <Calendar className="w-3.5 h-3.5" />, 'date')}
          {textField('Report Date', data.reportDate, su('reportDate'), <Calendar className="w-3.5 h-3.5" />, 'date')}
          {textField('Prepared By', data.preparedBy, su('preparedBy'), <User className="w-3.5 h-3.5" />)}
        </div>
        {textField('Proposal Title', data.proposalTitle, su('proposalTitle'), <FileText className="w-3.5 h-3.5" />)}
        {textField('Notes', data.notes, su('notes'), <Info className="w-3.5 h-3.5" />, 'text', true)}
      </div>

      {/* ── B: Site Conditions ───────────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ars-heading flex items-center gap-2">
            <Mountain className="w-4 h-4 text-blue-600" />
            B — Site Conditions
          </h3>
          <div className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Altitude &amp; ambient temperature affect compressor performance. These are calculation inputs, not notes.
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {textField('Altitude Above Sea Level (m)', siteConditions.altitudeM, sc('altitudeM'), <Mountain className="w-3.5 h-3.5" />)}
          {textField('Ambient Temperature (°C)', siteConditions.ambientTempC, sc('ambientTempC'), <Thermometer className="w-3.5 h-3.5" />)}
          {textField('Relative Humidity', siteConditions.relativeHumidity, sc('relativeHumidity'), <Gauge className="w-3.5 h-3.5" />)}
          {textField('Site Pressure Requirement (bar(g))', siteConditions.sitePressureRequirement, sc('sitePressureRequirement'), <Gauge className="w-3.5 h-3.5" />)}
          {textField('Compressor Room Ventilation Note', siteConditions.compressorRoomVentilation, sc('compressorRoomVentilation'), <Wind className="w-3.5 h-3.5" />)}
          {textField('Cooling Air Condition', siteConditions.coolingAirCondition, sc('coolingAirCondition'), <Wind className="w-3.5 h-3.5" />)}
        </div>
        <LabelledSelect
          label="Site Condition Source"
          value={siteConditions.conditionSource}
          options={condSourceOpts}
          onChange={sc('conditionSource')}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
        />
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Gauteng / Johannesburg note: </span>
            Proposals for Gauteng / high-altitude sites require altitude correction before final savings approval.
            Manufacturer datasheet values are sea-level references. Apply correction factor for sites above ~1,500 m.
          </p>
        </div>
      </div>

      {/* ── C: Electricity Tariff Profile ────────────────────── */}
      <div className="rounded-xl border border-green-200 bg-green-50/30 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ars-heading flex items-center gap-2">
            <Banknote className="w-4 h-4 text-green-600" />
            C — Electricity Tariff Profile
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <TariffConfidenceBadge confidence={tariffProfile.tariffConfidence} />
            <div className="text-xs text-green-800 bg-green-100 border border-green-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Preferred source: actual customer electricity bill.
            </div>
          </div>
        </div>

        {(tariffProfile.tariffConfidence === 'estimate' || tariffProfile.tariffConfidence === 'unknown') && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <span className="font-bold">Tariff not confirmed. </span>
              Savings can be used for internal discussion only.
              Confirm customer bill or official tariff category before final proposal.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabelledSelect
            label="Tariff Confidence"
            value={tariffProfile.tariffConfidence}
            options={[
              { value: 'bill-confirmed',    label: '✅ Customer bill confirmed' },
              { value: 'official-schedule', label: '🔵 Official supplier tariff' },
              { value: 'estimate',          label: '⚠️ Estimate' },
              { value: 'unknown',           label: '❓ Unknown' },
            ]}
            onChange={v => onChangeTariff({ ...tariffProfile, tariffConfidence: v as TariffConfidence })}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          />
          <LabelledSelect
            label="Tariff Source"
            value={tariffProfile.tariffSource}
            options={tariffSourceOpts}
            onChange={v => onChangeTariff({ ...tariffProfile, tariffSource: v as TariffSource })}
            icon={<FileText className="w-3.5 h-3.5" />}
          />
          <LabelledSelect
            label="Electricity Supplier"
            value={['eskom-direct','municipal','other'].includes(tariffProfile.electricitySupplier) ? tariffProfile.electricitySupplier : 'other'}
            options={supplierOpts}
            onChange={v => onChangeTariff({ ...tariffProfile, electricitySupplier: v })}
            icon={<Bolt className="w-3.5 h-3.5" />}
          />
          {textField('Municipality / Tariff Region', tariffProfile.municipalityRegion, tp('municipalityRegion'), <MapPin className="w-3.5 h-3.5" />)}
          {textField('Tariff Category / Name', tariffProfile.tariffCategoryName, tp('tariffCategoryName'), <Banknote className="w-3.5 h-3.5" />)}
          <LabelledSelect
            label="Tariff Type"
            value={tariffProfile.tariffType}
            options={tariffTypeOpts}
            onChange={v => onChangeTariff({ ...tariffProfile, tariffType: v as TariffType })}
            icon={<Banknote className="w-3.5 h-3.5" />}
          />
          <LabelledSelect
            label="VAT Treatment"
            value={tariffProfile.vatIncluded}
            options={[
              { value: 'included', label: 'VAT Included in rates' },
              { value: 'excluded', label: 'VAT Excluded (ex-VAT rates)' },
              { value: 'unknown',  label: 'Unknown' },
            ]}
            onChange={v => onChangeTariff({ ...tariffProfile, vatIncluded: v as TariffProfile['vatIncluded'] })}
            icon={<Zap className="w-3.5 h-3.5" />}
          />
          {textField('Blended Average Rate (R/kWh)', tariffProfile.blendedAvgRkWh, tp('blendedAvgRkWh'), <Zap className="w-3.5 h-3.5" />)}
          {textField('Peak Rate (R/kWh)', tariffProfile.peakRateRkWh, tp('peakRateRkWh'), <Zap className="w-3.5 h-3.5" />)}
          {textField('Standard Rate (R/kWh)', tariffProfile.standardRateRkWh, tp('standardRateRkWh'), <Zap className="w-3.5 h-3.5" />)}
          {textField('Off-Peak Rate (R/kWh)', tariffProfile.offPeakRateRkWh, tp('offPeakRateRkWh'), <Zap className="w-3.5 h-3.5" />)}
          {textField('Demand Charge (R/kVA or R/kW/month)', tariffProfile.demandChargeRkVA, tp('demandChargeRkVA'), <Gauge className="w-3.5 h-3.5" />)}
          {textField('Source Document / Bill Ref', tariffProfile.sourceDocumentRef, tp('sourceDocumentRef'), <FileText className="w-3.5 h-3.5" />)}
          {textField('Last Checked Date', tariffProfile.lastCheckedDate, tp('lastCheckedDate'), <Calendar className="w-3.5 h-3.5" />)}
          {textField('Confirmed By', tariffProfile.confirmedBy, tp('confirmedBy'), <User className="w-3.5 h-3.5" />)}
        </div>

        {/* Advanced tariff details (collapsible) */}
        <div className="border-t border-green-200 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvancedTariff(p => !p)}
            className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-900 transition"
          >
            <span className={`transition-transform duration-150 inline-block ${showAdvancedTariff ? 'rotate-90' : ''}`}>&#9654;</span>
            {showAdvancedTariff ? 'Hide' : 'Show'} advanced tariff details — HDS/LDS season rates, charges &amp; effective dates
          </button>
          {showAdvancedTariff && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {textField('High-Demand Season Months', tariffProfile.highDemandMonths, tp('highDemandMonths'), <Calendar className="w-3.5 h-3.5" />)}
                {textField('Low-Demand Season Months', tariffProfile.lowDemandMonths, tp('lowDemandMonths'), <Calendar className="w-3.5 h-3.5" />)}
                {textField('HDS Peak Rate (R/kWh)', tariffProfile.highDemandPeakRate, tp('highDemandPeakRate'), <Zap className="w-3.5 h-3.5" />)}
                {textField('HDS Off-Peak Rate (R/kWh)', tariffProfile.highDemandOffPeakRate, tp('highDemandOffPeakRate'), <Zap className="w-3.5 h-3.5" />)}
                {textField('LDS Peak Rate (R/kWh)', tariffProfile.lowDemandPeakRate, tp('lowDemandPeakRate'), <Zap className="w-3.5 h-3.5" />)}
                {textField('LDS Off-Peak Rate (R/kWh)', tariffProfile.lowDemandOffPeakRate, tp('lowDemandOffPeakRate'), <Zap className="w-3.5 h-3.5" />)}
                {textField('Network / Access Charge', tariffProfile.networkAccessCharge, tp('networkAccessCharge'), <Zap className="w-3.5 h-3.5" />)}
                {textField('Service / Admin Charge', tariffProfile.serviceAdminCharge, tp('serviceAdminCharge'), <Banknote className="w-3.5 h-3.5" />)}
                {textField('Effective From', tariffProfile.effectiveFrom, tp('effectiveFrom'), <Calendar className="w-3.5 h-3.5" />)}
                {textField('Effective To', tariffProfile.effectiveTo, tp('effectiveTo'), <Calendar className="w-3.5 h-3.5" />)}
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                <span className="font-semibold">Tariff versioning: </span>
                Tariffs must be versioned by effective date. Old proposals retain the tariff rates used at the time.
                New proposals use the latest confirmed tariff profile. Customer bill is the preferred source.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── D: Compressor Operating Profile by Tariff Period ─── */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ars-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            D — Compressor Operating Profile by Tariff Period
          </h3>
          <div className="text-xs text-purple-800 bg-purple-100 border border-purple-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Used for TOU period-weighted savings calculation.
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {textField('% Running During Peak', tariffOpProfile.peakRunPct, op('peakRunPct'), <Zap className="w-3.5 h-3.5" />)}
          {textField('% Running During Standard', tariffOpProfile.standardRunPct, op('standardRunPct'), <Zap className="w-3.5 h-3.5" />)}
          {textField('% Running During Off-Peak', tariffOpProfile.offPeakRunPct, op('offPeakRunPct'), <Zap className="w-3.5 h-3.5" />)}
          {textField('Annual Run Hours (total)', tariffOpProfile.annualRunHours, op('annualRunHours'), <Calendar className="w-3.5 h-3.5" />)}
          {textField('Annual Peak Hours', tariffOpProfile.annualPeakHours, op('annualPeakHours'), <Calendar className="w-3.5 h-3.5" />)}
          {textField('Annual Standard Hours', tariffOpProfile.annualStandardHours, op('annualStandardHours'), <Calendar className="w-3.5 h-3.5" />)}
          {textField('Annual Off-Peak Hours', tariffOpProfile.annualOffPeakHours, op('annualOffPeakHours'), <Calendar className="w-3.5 h-3.5" />)}
        </div>
        <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2.5">
          <p className="text-xs font-semibold text-purple-800 mb-2">Calculation basis explained:</p>
          <div className="space-y-1.5 text-xs text-purple-800">
            <div className="rounded bg-white/60 border border-purple-200 px-2.5 py-1.5">
              <span className="font-semibold">A) Blended estimate (simple): </span>
              Annual Saving = kWh Saved × Blended R/kWh. Use for early/draft estimates.
            </div>
            <div className="rounded bg-white/60 border border-purple-200 px-2.5 py-1.5">
              <span className="font-semibold">B) TOU method (accurate): </span>
              Annual Saving = (Peak kWh Saved × Peak Rate) + (Standard kWh Saved × Standard Rate) + (Off-peak kWh Saved × Off-peak Rate) + Demand charge impact (if applicable).
              Use when customer bill or official tariff schedule is confirmed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2_ExistingCompressors() {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Cpu className="w-5 h-5 text-ars-primary" />}
        title="Existing Compressors"
        sub="Captured from site audit — CompAir L250 and CompAir L160. Multiple compressors supported."
      />
      <div className="space-y-5">
        {DEMO_COMPRESSORS.map((c, i) => (
          <SectionCard key={c.id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ars-heading flex items-center gap-2">
                <Cpu className="w-4 h-4 text-ars-primary" />
                Compressor {i + 1} — {c.make} {c.model}
              </h3>
              <SourceBadge source="Audit" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                ['Make / Model', `${c.make} ${c.model}`],
                ['Type', c.type],
                ['Year Manufactured', String(c.yearMfg)],
                ['Age', c.age],
                ['Date of Test', c.dateOfTest],
                ['Ambient Temp', c.ambientTemp],
                ['Motor Efficiency', c.motorEfficiency],
                ['Unloaded Operation', c.unloadedOpPct],
                ['Running Status', c.runningStatus],
                ['Peak Flow FAD (measured)', c.peakFlowFAD],
                ['Standard FAD (rated)', c.standardFAD],
                ['Power Draw Max', c.powerDrawMax],
                ['Pressure', c.pressure],
                ['Power Efficiency (at peak FAD)', c.powerEfficiencyRange],
                ['Standard Power Efficiency', c.standardPowerEfficiency ?? '—'],
                ['Usage / Wastage', `${c.usage ?? '—'} used / ${c.wastage ?? '—'} wasted`],
                ['Loaded Hours (unit spec)', c.loadedHours],
                ['Total Running Hours (unit spec)', c.totalRunningHours],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-xs font-medium text-ars-heading">{val}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-slate-500 font-semibold mb-0.5">Key Finding</p>
              <p className="text-xs text-amber-800">{c.keyFinding}</p>
            </div>
            {(c.deckObsRunningHours || c.deckObsLoadingHours) && (
              <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                <p className="text-xs text-blue-700 font-semibold mb-1">Deck Observation Values (may differ slightly from unit spec values above)</p>
                <p className="text-xs text-blue-800">
                  Running hours: {c.deckObsRunningHours} &nbsp;|  Loading hours: {c.deckObsLoadingHours}
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">Small variance between unit spec and observation values is normal — both are shown for accuracy.</p>
              </div>
            )}
          </SectionCard>
        ))}
      </div>
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-ars-primary font-medium border border-ars-primary/30 rounded-lg px-4 py-2 hover:bg-ars-primary/5 transition"
      >
        <Plus className="w-4 h-4" /> Add Compressor
      </button>
    </div>
  );
}

function Step3_DataSource({ mode, onChange }: { mode: DataSourceMode; onChange: (m: DataSourceMode) => void }) {
  const options: { key: DataSourceMode; icon: React.ReactNode; label: string; sub: string; badge: string; badgeColor: string }[] = [
    {
      key: 'audit-excel',
      icon: <FileText className="w-6 h-6 text-green-600" />,
      label: 'Use Completed Air Audit Excel',
      sub: 'Measured values from site audit. Excel template is the source of truth. Most accurate.',
      badge: 'Measured',
      badgeColor: 'bg-green-100 text-green-700 border-green-200',
    },
    {
      key: 'manual-entry',
      icon: <ClipboardList className="w-6 h-6 text-amber-600" />,
      label: 'Manual Audit Entry',
      sub: 'Enter measured values manually without uploading a file. Values will be labelled as Manual.',
      badge: 'Manual',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    {
      key: 'manufacturer-specs',
      icon: <Cpu className="w-6 h-6 text-blue-600" />,
      label: 'Manufacturer Specs / Estimate Mode',
      sub: 'No site audit available. Use manufacturer datasheets or published specs as estimate values.',
      badge: 'Estimate',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  ];

  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Wind className="w-5 h-5 text-ars-primary" />}
        title="Data Source"
        sub="Select how audit data is provided. Every field will be labelled with its source."
      />
      <div className="space-y-3">
        {options.map(o => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`w-full rounded-xl border p-4 text-left flex items-start gap-4 transition-all ${
              mode === o.key
                ? 'border-ars-primary bg-ars-primary/5 shadow-sm'
                : 'border-slate-200 hover:border-ars-primary/40 bg-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">{o.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-ars-heading">{o.label}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${o.badgeColor}`}>
                  {o.badge}
                </span>
              </div>
              <p className="text-xs text-ars-body mt-1">{o.sub}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
              mode === o.key ? 'border-ars-primary bg-ars-primary' : 'border-slate-300'
            }`}>
              {mode === o.key && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>
        ))}
      </div>

      <SectionCard className="bg-slate-50">
        <h3 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-ars-primary" /> File Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FileActionButton icon={<Download className="w-4 h-4" />} label="Download Air Audit Excel Template" color="text-green-700" bg="bg-green-50 border-green-200" />
          <FileActionButton icon={<Upload className="w-4 h-4" />} label="Upload Completed Excel" color="text-blue-700" bg="bg-blue-50 border-blue-200" />
          <FileActionButton icon={<Upload className="w-4 h-4" />} label="Upload Manufacturer Datasheet" color="text-blue-700" bg="bg-blue-50 border-blue-200" />
          <FileActionButton icon={<ClipboardList className="w-4 h-4" />} label="Manual Entry Form" color="text-amber-700" bg="bg-amber-50 border-amber-200" />
        </div>
      </SectionCard>

      <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-5 py-4">
        <p className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" /> No audit data yet? Use Manufacturer Specs / Estimate Mode
        </p>
        <p className="text-xs text-blue-800 leading-relaxed">
          Select <span className="font-semibold">Manufacturer Specs / Estimate Mode</span> above if no site audit has been completed yet.
          Enter the existing machine make and model, then pull values from the manufacturer datasheet.
          Every field will be labelled <SourceBadge source="Manufacturer" /> so the proposal clearly shows these are estimate values, not measured audit data.
        </p>
        <p className="text-xs text-blue-700 mt-2 italic">
          Example: Customer has Atlas Copco GA55 but no audit. Select Estimate Mode → enter GA55 specs from datasheet → proposal will be generated with “Manufacturer / Estimate” labels on all values.
          Upgrade to <SourceBadge source="Audit" /> data when a full air audit is completed.
        </p>
      </div>

      {mode === 'manufacturer-specs' && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900 mb-1">⚠️ Manufacturer datasheet values require site correction before use in savings claims</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Manufacturer datasheet values are reference-condition values — typically measured at <span className="font-semibold">sea level</span>, <span className="font-semibold">standard ambient temperature</span> (usually 20°C or as stated), and standard humidity.
              Before using these values in a savings proposal, apply <span className="font-semibold">site altitude correction</span> and <span className="font-semibold">ambient temperature correction</span>.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-800 list-disc pl-4">
              <li>Gauteng / Johannesburg (≈1,750 m): significant derating applies. FAD and kW output will differ from nameplate.</li>
              <li>Coastal sites (Cape Town, Durban): close to sea level — correction is minor but should still be confirmed.</li>
              <li>Request manufacturer correction table or use ISO 1217 altitude correction procedure.</li>
            </ul>
            <p className="text-xs text-amber-700 mt-2 font-semibold italic">
              Do not present manufacturer-spec savings to a customer without confirming altitude/ambient correction has been applied.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Source labels explained: </span>
          <span className="mr-2"><SourceBadge source="Audit" /></span> = measured on-site value.{' '}
          <span className="mr-2 ml-1"><SourceBadge source="Manufacturer" /></span> = from datasheet.{' '}
          <span className="mr-2 ml-1"><SourceBadge source="Manual" /></span> = entered by user.{' '}
          <span className="ml-1"><SourceBadge source="Assumed" /></span> = standard engineering assumption.
        </p>
      </div>
    </div>
  );
}

function FileActionButton({ icon, label, color, bg }: { icon: React.ReactNode; label: string; color: string; bg: string }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} ${color} text-sm font-medium hover:opacity-80 transition`}
    >
      {icon} {label}
    </button>
  );
}

function Step4_SiteObservations() {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<ClipboardList className="w-5 h-5 text-ars-primary" />}
        title="Site Observations"
        sub="Findings captured during the on-site air audit inspection."
      />
      <div className="space-y-3">
        {SITE_OBSERVATIONS.map(o => (
          <div key={o.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold text-ars-heading">{o.label}</p>
                <SourceBadge source={o.source} />
              </div>
              <p className="text-xs text-ars-body leading-relaxed">{o.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Load Profile / Air Flow Analysis ─────────────────── */}
      <SectionCard className="border-blue-200 bg-blue-50/30">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold text-ars-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Load Profile / Air Flow Analysis
          </h3>
          <SourceBadge source="Audit" />
          <span className="ml-auto text-[10px] text-blue-600 font-medium italic">Air Flow Result Input sheet — 29 May 2025</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {([
            ['Date Range',         LOAD_PROFILE.dateRange],
            ['Average Demand',     LOAD_PROFILE.avgFlowM3Min + ' m³/min'],
            ['Peak Demand',        LOAD_PROFILE.peakFlowM3Min + ' m³/min'],
            ['Minimum Demand',     LOAD_PROFILE.minFlowM3Min + ' m³/min'],
            ['Avg Pressure',       LOAD_PROFILE.avgPressureBar ? LOAD_PROFILE.avgPressureBar + ' bar' : 'Not recorded'],
            ['Readings',           LOAD_PROFILE.readingCount + ' (15-min intervals)'],
            ['Demand Utilisation', LOAD_PROFILE.demandUtilisationPct + '% vs 29.7 m³/min rated'],
            ['Source',             'Audit Excel — DS400 logger'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="rounded-lg bg-white border border-blue-200 px-2.5 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="font-medium text-ars-heading">{val}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Right-sizing: </span>
            Avg demand {LOAD_PROFILE.avgFlowM3Min} m³/min = {LOAD_PROFILE.demandUtilisationPct}% of L160 rated 29.7 m³/min. Confirms oversizing.
            Bouwa RS132-II (28.4 m³/min) covers peak 26.81 m³/min with margin.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function Step5_PerformanceMetrics() {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<BarChart3 className="w-5 h-5 text-ars-primary" />}
        title="Performance Metrics"
        sub="Based on Ingrain Belville audit data and Ingrain deck methodology."
      />

      {/* Flow vs Power */}
      <SectionCard>
        <h3 className="text-sm font-semibold text-ars-heading mb-3">Flow vs Power Draw</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Metric', 'L250 (Fixed)', 'L160 (Fixed)', 'Bouwa SVC-RS160-II (VSD)', 'Source'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Standard FAD (rated, m³/min)', '42.7', '29.7', 'TBC (pending spec)', 'Manufacturer / Audit'],
                ['Peak Measured FAD (m³/min)', '27.86', '26.81', '—', 'Audit'],
                ['Load Factor (usage %)', '70% loaded', '82% loaded', 'N/A (VSD tracks demand)', 'Audit'],
                ['Power Draw Max (kW)', '294', '184', 'TBC pending spec', 'Audit'],
                ['Unloaded Operation', '30%', '18%', '~0% (VSD)', 'Audit'],
                ['Power Efficiency at Peak FAD (kW/m³/min)', '10.55', '6.86', 'TBC', 'Calculated'],
                ['Standard Power Efficiency (kW/m³/min)', '6.88', '6.19', 'TBC', 'Calculated'],
              ].map(([m, ...vals]) => (
                <tr key={m} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-ars-body">{m}</td>
                  {vals.map((v, i) => (
                    <td key={i} className={`px-3 py-2 ${i === 2 ? 'text-green-700 font-semibold' : ''}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Site Correction Basis */}
      <SectionCard className="border-blue-200 bg-blue-50/40">
        <h3 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
          <Mountain className="w-4 h-4 text-blue-600" /> Site Correction Basis
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Location', val: 'Bellville / Cape Town', note: 'Coastal / near sea level' },
            { label: 'Altitude', val: '~10 m', note: 'Sea-level reference' },
            { label: 'Ambient Temp', val: '21 °C', note: 'From audit (deck)' },
            { label: 'Correction Status', val: 'Not applied', note: 'Audit values used as-is' },
          ].map(item => (
            <div key={item.label} className="rounded-lg bg-white border border-blue-200 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{item.label}</p>
              <p className="font-semibold text-ars-heading">{item.val}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{item.note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-3 italic">
          Ingrain Belville is near sea level — altitude correction is minor. For Gauteng / high-altitude sites, apply ISO 1217 correction before comparing datasheet vs. audit values.
        </p>
      </SectionCard>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard>
          <h3 className="text-sm font-semibold text-ars-heading mb-3">Loaded / Unloaded Utilisation</h3>
          <div className="space-y-3">
            {[
              { label: 'L250 — Loaded (Usage)', pct: 70, color: 'bg-ars-primary' },
              { label: 'L250 — Unloaded (Wastage)', pct: 30, color: 'bg-amber-400' },
              { label: 'L160 — Loaded (Usage)', pct: 82, color: 'bg-ars-primary' },
              { label: 'L160 — Unloaded (Wastage)', pct: 18, color: 'bg-amber-400' },
            ].map(b => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ars-body">{b.label}</span>
                  <span className="font-semibold">{b.pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <h3 className="text-sm font-semibold text-ars-heading mb-3">Power Efficiency kW/(m³/min)</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: 'L250 (at peak measured FAD 27.86 m³/min)',  val: '10.55', note: 'Poor — oversized / underloaded', color: 'text-red-600' },
              { label: 'L160 (at peak measured FAD 26.81 m³/min)', val: '6.86',  note: 'Moderate — some unloading', color: 'text-amber-700' },
              { label: 'L250 standard efficiency (rated FAD)',        val: '6.88',  note: 'Standard — would be OK if fully loaded', color: 'text-amber-600' },
              { label: 'L160 standard efficiency (rated FAD)',        val: '6.19',  note: 'Good if fully loaded — but 18% wasted', color: 'text-amber-600' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <span className="text-xs text-ars-body">{r.label}</span>
                <div className="text-right">
                  <span className={`text-sm font-bold ${r.color}`}>{r.val}</span>
                  <p className="text-[10px] text-slate-400">{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Cost per m³ Compressed Air ────────────────────── */}
      <SectionCard className="border-green-200 bg-green-50/30">
        <h3 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-green-600" /> Cost per m³ Compressed Air
          <span className="ml-auto text-[10px] text-green-700 italic">Workbook formula: kW ÷ (motorEff × outputM³/h)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Metric', 'L160', 'Bouwa RS132-II', 'Improvement', 'Source'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Effective Input kW',            '184 kW',    '151.8 kW',  '−23.6%',  'Workbook Report!R5'],
                ['Output m³/h',                  '1,608.6',   '1,704',     '+5.9%',    'Workbook Report!R4'],
                ['Motor Efficiency',              '87%',       '96%',       '+10.3pp', 'Workbook Report!R11'],
                ['kWh/m³ (motor-eff adjusted)',  '0.1315',    '0.0928',    '−29.4%',  'Workbook Report!R10'],
                ['kW/m³/min (direct ratio)',      '6.86',      '5.34*',     'TBC',     'Calculated / *TBC'],
                ['Annual kWh (L160, ~24/7/364)',  '~1,608,384 kWh', '~1,336,272 kWh', 'TBC', 'Estimated'],
              ].map(([m, ...vals]) => (
                <tr key={m} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-ars-body">{m}</td>
                  {vals.map((v, i) => (
                    <td key={i} className={`px-3 py-2 ${i === 2 ? 'text-green-700 font-semibold' : ''}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Workbook formula</p>
            <p className="text-xs font-mono text-green-900">kWh/m³ = kW ÷ (motorEff × (FAD_m³/min × 60))</p>
            <p className="text-xs font-mono text-green-900">L160: 184 ÷ (0.87 × 1608.6) = 0.1315</p>
            <p className="text-xs font-mono text-green-900">Bouwa: 151.8 ÷ (0.96 × 1704) = 0.0928</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Tariff required for cost/m³: </span>
              Rand cost per m³ = kWh/m³ × R/kWh. Confirm electricity tariff in Step 1 Section C before finalising.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Step6_EfficiencyRootCause() {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<AlertTriangle className="w-5 h-5 text-ars-primary" />}
        title="Efficiency Analysis & Root Cause"
        sub="Generated findings from audit data. Editable before report generation."
      />
      <div className="space-y-3">
        {ROOT_CAUSE_FINDINGS.map((f, i) => {
          const sevClass =
            f.severity === 'high' ? 'border-red-200 bg-red-50' :
            f.severity === 'medium' ? 'border-amber-200 bg-amber-50' :
            'border-blue-200 bg-blue-50';
          const icon =
            f.severity === 'high' ? <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> :
            f.severity === 'medium' ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> :
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
          return (
            <div key={i} className={`rounded-xl border ${sevClass} px-4 py-3 flex items-start gap-3`}>
              {icon}
              <div>
                <p className="text-sm font-semibold text-ars-heading">{f.finding}</p>
                <p className="text-xs text-ars-body mt-0.5">{f.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step7_SelectBouwaSolution() {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Wind className="w-5 h-5 text-ars-primary" />}
        title="Select Bouwa Solution"
        sub="Choose the Bouwa model to propose. Default: SVC-RS160-II based on site demand profile."
      />

      <div className="rounded-xl border-2 border-ars-primary bg-ars-primary/5 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-ars-heading">{BOUWA_SOLUTION.fullName}</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                Selected
              </span>
            </div>
            <SourceBadge source="Bouwa Spec" />
          </div>
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
        </div>

        {/* Naming inconsistency alert */}
        <div className="mb-4 rounded-lg bg-amber-50 border-2 border-amber-400 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">⚠️ Proposed solution naming requires review</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">{BOUWA_SOLUTION.namingNote}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            ['Model', BOUWA_SOLUTION.model],
            ['Compressor Type', BOUWA_SOLUTION.compressorType],
            ['Speed Control', BOUWA_SOLUTION.speedControl],
            ['Rated Pressure', BOUWA_SOLUTION.ratedPressure],
            ['Capacity / FAD', BOUWA_SOLUTION.capacityFAD],
            ['Motor kW', String(BOUWA_SOLUTION.motorKw)],
            ['Package Input kW', BOUWA_SOLUTION.packageInputKw],
            ['Specific Power', BOUWA_SOLUTION.specificPower],
          ].map(([label, val]) => (
            <div key={label} className="rounded-lg bg-white border border-slate-200 px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-xs font-semibold text-ars-heading">{val}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <p className="text-xs text-green-800">{BOUWA_SOLUTION.notes}</p>
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-2 text-sm text-ars-primary font-medium border border-ars-primary/30 rounded-lg px-4 py-2 hover:bg-ars-primary/5 transition"
      >
        <Cpu className="w-4 h-4" /> Browse Machine Spec Library
      </button>
    </div>
  );
}

function Step8_SavingsOpportunity({ tariffProfile }: { tariffProfile: TariffProfile }) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Zap className="w-5 h-5 text-ars-primary" />}
        title="Savings Opportunity"
        sub="Estimated energy savings. Based on audit data and Bouwa VSD performance at operating point."
      />

      {/* Tariff calculation basis summary */}
      <div className="rounded-xl border border-green-200 bg-green-50/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-ars-heading flex items-center gap-2">
            <Banknote className="w-4 h-4 text-green-600" />
            Calculation Basis &amp; Tariff Status
          </h3>
          <TariffConfidenceBadge confidence={tariffProfile.tariffConfidence} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {([
            ['Tariff Source',    tariffProfile.tariffSource],
            ['Tariff Type',      tariffProfile.tariffType],
            ['VAT Treatment',    tariffProfile.vatIncluded],
            ['Demand Charge',    tariffProfile.demandChargeRkVA !== 'Not available' ? 'Included (TBC)' : 'Not included'],
            ['Blended Rate',     tariffProfile.blendedAvgRkWh],
            ['Peak Rate',        tariffProfile.peakRateRkWh],
            ['Standard Rate',    tariffProfile.standardRateRkWh],
            ['Source Doc / Ref', tariffProfile.sourceDocumentRef],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="rounded-lg bg-white border border-green-200 px-2.5 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-xs font-medium text-ars-heading break-words">{val || '—'}</p>
            </div>
          ))}
        </div>
        {(tariffProfile.tariffConfidence === 'estimate' || tariffProfile.tariffConfidence === 'unknown') && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <span className="font-bold">Tariff not confirmed — for internal discussion only.</span>
              {' '}Do not present these savings figures to the customer until site tariff is confirmed from the actual electricity bill.
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Metric', 'L160 (Current)', 'L250 (Current)', 'Bouwa SVC-RS160-II', 'Saving vs L160', 'Saving vs L250', 'Notes'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {SAVINGS_TABLE.map(r => (
              <tr key={r.metric} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-ars-body whitespace-nowrap">{r.metric}</td>
                <td className="px-3 py-2">{r.l160}</td>
                <td className="px-3 py-2">{r.l250}</td>
                <td className="px-3 py-2 text-green-700 font-semibold">{r.bouwa}</td>
                <td className="px-3 py-2 text-green-700">{r.savingL160}</td>
                <td className="px-3 py-2 text-green-700 font-semibold">{r.savingL250}</td>
                <td className="px-3 py-2 text-slate-400">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
        <Leaf className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-xs text-green-800">
          <span className="font-semibold">From Ingrain deck: </span>
          L160 annual energy cost: R2.83M → proposed: R1.68M → <span className="font-bold text-green-900">saving R1.15M/year (40%)</span>.
          L250 annual energy cost: R4.35M → saving <span className="font-bold text-green-900">R2.67M/year (61%)</span>.
          CO₂: 2,241 t/year saved vs L160 | 9,221 t/year saved vs L250.
        </p>
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Tariff basis: </span>
          Savings figures from Ingrain Belville deck. Site tariff is <span className="font-semibold">placeholder / TBC</span> — confirm from actual electricity bill before customer issue.
          Do not present these savings as final until site-specific tariff (R/kWh) is confirmed.
        </p>
      </div>

      {/* ── Tariff Calendar / TOU Basis ──────────────────────── */}
      <SectionCard className="border-purple-200 bg-purple-50/30">
        <h3 className="text-sm font-semibold text-ars-heading mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" /> Tariff Calendar / TOU Day Basis
          <span className="text-[10px] text-purple-600 italic ml-auto">Source: Ingrain L160.xlsx — Day Calculations sheet</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {([
            ['LDS Work Days',   String(INGRAIN_DAY_CALENDAR.ldsWorkDays) + ' days'],
            ['LDS Saturdays',   String(INGRAIN_DAY_CALENDAR.ldsSaturdays) + ' days'],
            ['LDS Sundays',     String(INGRAIN_DAY_CALENDAR.ldsSundays) + ' days'],
            ['HDS Work Days',   String(INGRAIN_DAY_CALENDAR.hdsWorkDays) + ' days'],
            ['HDS Saturdays',   String(INGRAIN_DAY_CALENDAR.hdsSaturdays) + ' days'],
            ['HDS Sundays',     String(INGRAIN_DAY_CALENDAR.hdsSundays) + ' days'],
            ['Total Days',      String(INGRAIN_DAY_CALENDAR.totalDays) + ' (364 — 24/7 operation assumed)'],
            ['LDS Rate Peak',   'R ' + ESKOM_RATES_SET_A.ldsPeak + '/kWh'],
            ['LDS Rate Std',    'R ' + ESKOM_RATES_SET_A.ldsStandard + '/kWh'],
            ['LDS Off-Peak',    'R ' + ESKOM_RATES_SET_A.ldsOffPeak + '/kWh'],
            ['HDS Rate Peak',   'R ' + ESKOM_RATES_SET_A.hdsPeak + '/kWh'],
            ['HDS Rate Std',    'R ' + ESKOM_RATES_SET_A.hdsStandard + '/kWh'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="rounded-lg bg-white border border-purple-200 px-2.5 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-xs font-medium text-ars-heading">{val}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Two rate sets in workbook: </span>
              Set A (Report sheet — used for PPT R2.83M figure) vs Set B (Electricity Rates sheet — newer). Effective dates unknown.
              Confirm Eskom tariff year before finalising.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold">TOU formula: </span>
            Annual Saving = Σ (kW × rate × hours per period). Currently showing Set A (older) rates — same set that produced the PPT savings figures.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Step9_ROIComparison() {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<DollarSign className="w-5 h-5 text-ars-primary" />}
        title="ROI Comparison"
        sub="Structured scenarios — pricing TBC. Savings from Ingrain deck."
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">ROI scenarios below are structured placeholders. </span>
          The Ingrain deck provides savings figures (R1.15M vs L160 / R2.67M vs L250) but does not specify machine price,
          buy-back values, or refurbishment costs. Those fields are marked as TBC. Complete these values once
          Bouwa pricing and buy-back assessment are available.
        </p>
      </div>

      {/* ── Workbook Reference Values ─────────────────────────── */}
      <SectionCard className="border-blue-200 bg-blue-50/30">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold text-ars-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Workbook Reference ROI (RS132-II — 132kW)
          </h3>
          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5 font-semibold">⚠ Model unconfirmed — see conflict note</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {([
            ['Unit Price (RS132-II)', 'R 984,810'],
            ['Quantity',             '2'],
            ['Gross Machine Cost',   'R 1,969,620'],
            ['Buy-back (L160+L250)', 'R 130,000'],
            ['Net Investment',       'R 2,297,860'],
            ['Annual Saving (L160)', 'R 1,110,997 / year'],
            ['Payback Period',       '7.35 months'],
            ['ROI %',                '48.35%'],
            ['Annual Saving (L250)', 'R 2,639,781 / year'],
            ['Refurb L160',          'R 472,760'],
            ['Refurb L250',          'R 671,000'],
            ['VAT',                  'Excluded'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="rounded-lg bg-white border border-blue-200 px-2.5 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-xs font-semibold text-ars-heading">{val}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">
            <span className="font-bold">⚠ Model conflict: </span>
            {MODEL_NAMING_CONFLICT_NOTE}
          </p>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 italic">Source: Ingrain L160.xlsx — ROI Calculation sheet. VAT excluded per ROI sheet note.</p>
      </SectionCard>

      <div className="space-y-4">
        {ROI_SCENARIOS.map(s => (
          <div key={s.id} className={`rounded-xl border-2 ${s.color} p-5 ${s.highlight ? 'shadow-md' : ''}`}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-ars-heading">{s.label}</span>
                  {s.highlight && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500 text-white">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-ars-body">{s.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-amber-700">{s.payback}</p>
                <p className="text-xs text-slate-500">Payback period</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                ['Unit Price', s.unitPrice],
                ['Quantity', String(s.quantity)],
                ['Total Cost', s.totalCost],
                ['Net Investment', s.netInvestment],
                ['Annual Saving vs L160', s.annualSavingL160],
                ['Annual Saving vs L250', s.annualSavingL250],
                ['Combined Annual Saving', s.annualSavingCombined],
                ['ROI %', s.roiPct],
                ['Buy-back L160', s.buybackL160],
                ['Buy-back L250', s.buybackL250],
                ['Refurb Cost L160', s.refurbL160],
                ['Refurb Cost L250', s.refurbL250],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg bg-white/70 border border-white/80 px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="font-semibold text-ars-heading text-xs">{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 italic">
        * Pricing TBC — obtain Bouwa quote before finalising ROI calculations.
        Savings from Ingrain Belville deck. Pricing excludes VAT.
      </p>
    </div>
  );
}

function Step10_Recommendations({ recs, onToggle }: {
  recs: typeof RECOMMENDATIONS;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<ListChecks className="w-5 h-5 text-ars-primary" />}
        title="Recommendations & Next Steps"
        sub="Review and confirm recommendations to include in the final report."
      />
      <div className="space-y-3">
        {recs.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => onToggle(r.id)}
            className={`w-full rounded-xl border p-4 text-left flex items-start gap-3 transition-all ${
              r.checked ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center ${
              r.checked ? 'border-green-600 bg-green-600' : 'border-slate-300'
            }`}>
              {r.checked && <Check className="w-3 h-3 text-white" />}
            </div>
            <p className="text-sm text-ars-body leading-relaxed">{r.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step11_ReportPreview({ setup, siteConditions, tariffProfile, onGeneratePDF }: {
  setup: ProposalSetup;
  siteConditions: SiteConditions;
  tariffProfile: TariffProfile;
  onGeneratePDF: () => void;
}) {
  const REPORT_SECTIONS = [
    { num: 1,    title: 'Cover Page',                          desc: `${setup.proposalTitle} — prepared ${setup.reportDate}` },
    { num: 2,    title: 'Agenda / Contents',                   desc: 'Full section listing as per Ingrain deck structure' },
    { num: 3,    title: 'Introduction',                        desc: 'Customer site overview and audit background' },
    { num: 4,    title: 'Objective of Audit',                  desc: 'Energy efficiency assessment and compressor right-sizing' },
    { num: '5a', title: 'Site Conditions & Tariff Basis',      desc: `${siteConditions.altitudeM} | Ambient ${siteConditions.ambientTempC}°C | Tariff: ${tariffProfile.tariffSource}` },
    { num: '5b', title: 'Tariff Accuracy & Calculation Basis', desc: `Confidence: ${tariffProfile.tariffConfidence} | Type: ${tariffProfile.tariffType} | VAT: ${tariffProfile.vatIncluded}` },
    { num: '5c', title: 'Tariff Calendar & TOU Basis',         desc: 'LDS/HDS day calendar, workday/weekend, peak/standard/off-peak rates used' },
    { num: '5d', title: 'Altitude / Site Correction',         desc: `Alt: ${siteConditions.altitudeM} | Ambient: ${siteConditions.ambientTempC}°C | Correction: ${siteConditions.conditionSource}` },
    { num: 6,    title: 'Unit Specifications & Site Observations', desc: 'L250 / L160 specs, audit findings, ball valve, leak survey' },
    { num: '6b', title: 'Load Profile / Air Flow Analysis',   desc: `Avg: ${LOAD_PROFILE.avgFlowM3Min} m³/min | Peak: ${LOAD_PROFILE.peakFlowM3Min} m³/min | Min: ${LOAD_PROFILE.minFlowM3Min} m³/min — 29 May 2025` },
    { num: 7,    title: 'Performance Metrics',                 desc: 'Flow vs power, load/unload utilisation, specific power comparison' },
    { num: '7b', title: 'Cost per m³ Compressed Air',         desc: 'L160: 0.1315 kWh/m³ | Bouwa RS132: 0.0928 kWh/m³ | Improvement: 29.4%' },
    { num: 8,    title: 'Real-Time Data Overview',             desc: 'Operating kW, pressure profile, demand vs capacity chart' },
    { num: 9,    title: 'Efficiency Analysis',                 desc: 'kW/m³/min analysis, benchmarking against VSD alternative' },
    { num: 10,   title: 'Root Cause Analysis',                 desc: 'Oversizing, fixed-speed mismatch, leak losses, age factors' },
    { num: 11,   title: 'Recommendations',                     desc: 'Right-size, leak repair, buy-back, control, follow-up schedule' },
    { num: 12,   title: 'Estimated Savings Opportunity',       desc: `Annual kWh, R/year, CO₂ savings per scenario. Tariff basis: ${tariffProfile.tariffSource}` },
    { num: '12b',title: 'Gross Proposed Cost & VSD Credit',   desc: 'Gross Bouwa cost, 14% VSD credit, net proposed cost — shown separately' },
    { num: 13,   title: 'ROI Scenario',                        desc: 'Workbook reference: R984,810/unit × 2 = R1,969,620 | Net invest R2,297,860 | Payback 7.35 months | ROI 48.35%' },
    { num: '13b',title: 'Optimiser / Load-Sharing Scenario',   desc: 'Current vs proposed vs optimised annual cost — partial draft' },
    { num: '13c',title: 'Calculation Trace / Review Status',   desc: 'Source per value, review status, conflict items requiring ARS confirmation' },
    { num: 14,   title: 'Conclusion',                          desc: 'Summary recommendation and proposed next actions' },
    { num: 15,   title: 'Questions & Next Steps',              desc: 'Follow-up meeting, airflow study, buy-back evaluation' },
  ];

  const validationItems = runValidation();
  const summary = summariseValidation(validationItems);

  const statusConfig: Record<string, { label: string; cls: string }> = {
    'match':           { label: 'Match',           cls: 'bg-green-100 text-green-700 border-green-200' },
    'minor-rounding':  { label: 'Minor rounding',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    'mismatch':        { label: 'Mismatch',         cls: 'bg-red-100 text-red-700 border-red-200' },
    'requires-review': { label: 'Requires review',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    'not-calculated':  { label: 'Not calculated',   cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Printer className="w-5 h-5 text-ars-primary" />}
        title="Report Preview"
        sub="Review the report structure before generating the PDF."
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Demo only — </span>
          Generated PDF is watermarked DEMO ONLY — INTERNAL DRAFT. Not approved for customer issue.
        </p>
      </div>

      {/* ── Calculation Validation / Review Status ───────────── */}
      <SectionCard className="border-slate-300 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold text-ars-heading flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-600" /> Calculation Validation — App vs Workbook
          </h3>
          <div className="flex gap-2 ml-auto flex-wrap">
            {([
              ['match', 'Match'],
              ['minor-rounding', 'Rounding'],
              ['mismatch', 'Mismatch'],
              ['requires-review', 'Review'],
            ] as [string, string][]).map(([k, l]) => (
              <span key={k} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig[k].cls}`}>
                {l}: {summary[k === 'minor-rounding' ? 'minorRounding' : k === 'requires-review' ? 'requiresReview' : k as keyof typeof summary]}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {['Metric', 'Workbook Ref', 'App Calculated', 'PPT Value', 'Difference', 'Status'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {validationItems.map(item => {
                const cfg = statusConfig[item.status] ?? statusConfig['not-calculated'];
                return (
                  <tr key={item.metric} className="hover:bg-slate-50">
                    <td className="px-2 py-2 font-medium text-ars-body text-[11px] max-w-[180px] break-words">{item.metric}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{String(item.workbookRef)}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{item.appCalculated != null ? String(item.appCalculated) : '—'}</td>
                    <td className="px-2 py-2 text-[11px] text-slate-500">{item.pptValue != null ? String(item.pptValue) : '—'}</td>
                    <td className="px-2 py-2 text-[11px]">{item.difference ?? '—'}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {validationItems.some(i => i.note) && (
          <div className="mt-3 space-y-1">
            {validationItems.filter(i => i.note).slice(0, 4).map(i => (
              <p key={i.metric} className="text-[10px] text-slate-500 italic">
                <span className="font-semibold">{i.metric}:</span> {i.note}
              </p>
            ))}
          </div>
        )}
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">
            <span className="font-bold">Do not issue final customer report until: </span>
            Confirm customer electricity bill, tariff category, Bouwa model (RS132 vs RS160-II), and machine price.
            See bouwa-calculation-map.md §14 for full conflict list.
          </p>
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className="text-sm font-semibold text-ars-heading mb-3">Report Sections</h3>
        <div className="space-y-2">
          {REPORT_SECTIONS.map(s => (
            <div key={s.num} className="flex items-start gap-3 rounded-lg hover:bg-slate-50 px-2 py-1.5 transition">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ars-primary/10 text-ars-primary text-xs font-bold shrink-0">
                {s.num}
              </span>
              <div>
                <p className="text-sm font-semibold text-ars-heading">{s.title}</p>
                <p className="text-xs text-ars-body">{s.desc}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1 ml-auto" />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onGeneratePDF}
          className="flex items-center gap-2 px-5 py-3 bg-ars-primary text-white font-bold rounded-xl hover:bg-ars-primary/90 transition shadow text-sm"
        >
          <Printer className="w-4 h-4" /> Generate Demo PDF Report
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-ars-heading font-medium rounded-xl hover:bg-slate-200 transition text-sm"
        >
          <FileText className="w-4 h-4" /> Save Draft
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF generator
// ---------------------------------------------------------------------------

function generateProposalPDF(setup: ProposalSetup, siteConditions: SiteConditions, tariffProfile: TariffProfile, tariffOpProfile: TariffOperatingProfile) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const MARGIN = 15;

  // Helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docAny = doc as any;

  function addWatermark() {
    try {
      docAny.saveGraphicsState();
      docAny.setGState(docAny.GState({ opacity: 0.07 }));
      doc.setFontSize(38);
      doc.setTextColor(100, 100, 100);
      doc.text('DEMO ONLY — INTERNAL DRAFT', W / 2, 148, { align: 'center', angle: 45 });
      docAny.restoreGraphicsState();
    } catch {
      // jsPDF graphics state not available in this build — skip watermark opacity
      doc.setFontSize(38);
      doc.setTextColor(200, 200, 200);
      doc.text('DEMO ONLY — INTERNAL DRAFT', W / 2, 148, { align: 'center', angle: 45 });
    }
  }

  function sectionTitle(text: string, y: number) {
    doc.setFillColor(30, 66, 120);
    doc.rect(MARGIN, y, W - MARGIN * 2, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(text, MARGIN + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    return y + 12;
  }

  function addPage() {
    doc.addPage();
    addWatermark();
  }

  // ── Cover ──────────────────────────────────────────────────
  doc.setFillColor(30, 66, 120);
  doc.rect(0, 0, W, 80, 'F');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('AIR AUDIT PROPOSAL', W / 2, 30, { align: 'center' });
  doc.setFontSize(13);
  doc.text(setup.proposalTitle, W / 2, 42, { align: 'center', maxWidth: W - 40 });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared by: ${setup.preparedBy}`, W / 2, 56, { align: 'center' });
  doc.text(`Report Date: ${setup.reportDate}  |  Audit Date: ${setup.auditDate}`, W / 2, 63, { align: 'center' });
  doc.text(`Customer: ${setup.customer}  |  Site: ${setup.site}`, W / 2, 70, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(200, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMO ONLY — INTERNAL DRAFT — NOT APPROVED FOR CUSTOMER ISSUE', W / 2, 77, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  addWatermark();

  // ── Agenda ────────────────────────────────────────────────
  addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 66, 120);
  doc.text('Agenda', MARGIN, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const agenda = [
    '1. Introduction', '2. Objective of Audit', '3. Site Conditions & Tariff Basis',
    '4. Unit Specifications & Site Observations', '5. Performance Metrics', '6. Real-Time Data Overview',
    '7. Efficiency Analysis', '8. Root Cause Analysis', '9. Recommendations',
    '10. Estimated Savings Opportunity', '11. ROI Comparison', '12. Conclusion', '13. Questions & Next Steps',
  ];
  agenda.forEach((a, i) => doc.text(a, MARGIN, 35 + i * 7));

  // ── Site Conditions & Tariff Basis ───────────────────────
  addPage();
  let y = sectionTitle('Site Conditions & Tariff Basis', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Parameter', 'Value', 'Source / Note']],
    body: [
      ['Location', `${setup.cityTown ?? setup.site}, ${setup.province ?? ''}`, 'From proposal setup'],
      ['Altitude Above Sea Level', siteConditions.altitudeM, siteConditions.conditionSource],
      ['Ambient Temperature', `${siteConditions.ambientTempC} °C`, 'From deck / audit'],
      ['Relative Humidity', siteConditions.relativeHumidity, siteConditions.conditionSource],
      ['Compressor Room Ventilation', siteConditions.compressorRoomVentilation, 'Site observation'],
      ['Site Pressure Requirement', siteConditions.sitePressureRequirement, 'Audit / site'],
      ['Altitude Correction Applied?', 'Not applied — near sea level for this site', 'Ingrain Belville: ~10 m. Gauteng proposals require correction.'],
      ['Electricity Supplier', tariffProfile.electricitySupplier, tariffProfile.tariffSource],
      ['Municipality / Region', tariffProfile.municipalityRegion, ''],
      ['Tariff Type', tariffProfile.tariffType, ''],
      ['Blended Average Rate', tariffProfile.blendedAvgRkWh, tariffProfile.tariffSource],
      ['Peak Rate', tariffProfile.peakRateRkWh, ''],
      ['Standard Rate', tariffProfile.standardRateRkWh, ''],
      ['Off-Peak Rate', tariffProfile.offPeakRateRkWh, ''],
      ['Demand Charge', tariffProfile.demandChargeRkVA, ''],
      ['Tariff Date Confirmed', tariffProfile.tariffDateConfirmed, ''],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  const siteTY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFontSize(7.5);
  doc.setTextColor(180, 80, 0);
  doc.setFont('helvetica', 'italic');
  doc.text('NOTE: Compressor performance must be corrected for site altitude and ambient conditions before final customer issue.', MARGIN, siteTY, { maxWidth: W - MARGIN * 2 });
  doc.text('Manufacturer datasheet values are reference-condition (sea-level / 20°C) values. Apply ISO 1217 altitude correction for sites above ~1,500 m (e.g. Gauteng / Johannesburg).', MARGIN, siteTY + 6, { maxWidth: W - MARGIN * 2 });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  // ── Tariff Accuracy & Calculation Basis ──────────────────
  addPage();
  y = sectionTitle('Tariff Accuracy & Calculation Basis', 20);
  const tariffConfLabel: Record<string, string> = {
    'bill-confirmed':    'Customer Bill Confirmed',
    'official-schedule': 'Official Tariff Schedule',
    'estimate':          'Estimate / Placeholder',
    'unknown':           'Unknown — cannot finalise',
  };
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Field', 'Value']],
    body: [
      ['Tariff Confidence',           tariffConfLabel[tariffProfile.tariffConfidence] ?? tariffProfile.tariffConfidence],
      ['Tariff Source',               tariffProfile.tariffSource],
      ['Electricity Supplier',        tariffProfile.electricitySupplier],
      ['Municipality / Region',       tariffProfile.municipalityRegion],
      ['Tariff Category / Name',      tariffProfile.tariffCategoryName],
      ['Tariff Type',                 tariffProfile.tariffType],
      ['VAT Treatment',               tariffProfile.vatIncluded],
      ['Blended Average Rate (R/kWh)',tariffProfile.blendedAvgRkWh],
      ['Peak Rate (R/kWh)',           tariffProfile.peakRateRkWh],
      ['Standard Rate (R/kWh)',       tariffProfile.standardRateRkWh],
      ['Off-Peak Rate (R/kWh)',       tariffProfile.offPeakRateRkWh],
      ['Demand Charge',               tariffProfile.demandChargeRkVA],
      ['Network / Access Charge',     tariffProfile.networkAccessCharge],
      ['Service / Admin Charge',      tariffProfile.serviceAdminCharge],
      ['HDS Months',                  tariffProfile.highDemandMonths],
      ['LDS Months',                  tariffProfile.lowDemandMonths],
      ['HDS Peak Rate',               tariffProfile.highDemandPeakRate],
      ['HDS Off-Peak Rate',           tariffProfile.highDemandOffPeakRate],
      ['LDS Peak Rate',               tariffProfile.lowDemandPeakRate],
      ['LDS Off-Peak Rate',           tariffProfile.lowDemandOffPeakRate],
      ['Effective From',              tariffProfile.effectiveFrom],
      ['Effective To',                tariffProfile.effectiveTo],
      ['Source Document / Bill Ref',  tariffProfile.sourceDocumentRef],
      ['Last Checked',                tariffProfile.lastCheckedDate],
      ['Confirmed By',                tariffProfile.confirmedBy || '—'],
      ['Operating Profile — Peak Run %',     tariffOpProfile.peakRunPct],
      ['Operating Profile — Standard Run %', tariffOpProfile.standardRunPct],
      ['Operating Profile — Off-Peak Run %', tariffOpProfile.offPeakRunPct],
      ['Annual Run Hours',            tariffOpProfile.annualRunHours],
      ['Annual Peak Hours',           tariffOpProfile.annualPeakHours],
      ['Annual Standard Hours',       tariffOpProfile.annualStandardHours],
      ['Annual Off-Peak Hours',       tariffOpProfile.annualOffPeakHours],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  const taccFinalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  if (tariffProfile.tariffConfidence === 'estimate' || tariffProfile.tariffConfidence === 'unknown') {
    doc.setTextColor(180, 80, 0);
    doc.text('DISCLAIMER: Tariff not confirmed. Savings calculations are estimates for internal discussion only. Confirm customer electricity bill or official tariff schedule before issuing final proposal.', MARGIN, taccFinalY, { maxWidth: W - MARGIN * 2 });
  } else {
    doc.setTextColor(30, 100, 30);
    doc.text('Tariff: ' + (tariffConfLabel[tariffProfile.tariffConfidence] ?? tariffProfile.tariffConfidence) + '. Source: ' + tariffProfile.sourceDocumentRef, MARGIN, taccFinalY, { maxWidth: W - MARGIN * 2 });
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  // ── Existing Compressors ─────────────────────────────────
  addPage();
  y = sectionTitle('Unit Specifications — Ingrain Belville', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Parameter', 'CompAir L250', 'CompAir L160']],
    body: [
      ['Year of Manufacture', '2006 (19 years old)', '2001 (25 years old)'],
      ['Date of Test', '30 May 2025', '30 May 2025'],
      ['Ambient Temp', '21 °C', '21 °C'],
      ['Rated FAD (standard)', '42.7 m³/min @ 7.5 bar', '29.7 m³/min @ 7.5 bar'],
      ['Peak Measured FAD', '27.86 m³/min', '26.81 m³/min'],
      ['Power Draw Max', '294 kW (package input)', '184 kW (package input)'],
      ['Efficiency', '87%', '90%'],
      ['Unloaded Operation', '30%', '18%'],
      ['Usage / Wastage', '70% / 30%', '82% / 18%'],
      ['Power Eff. at Peak FAD', '10.55 kW/m³/min', '6.86 kW/m³/min'],
      ['Standard Power Efficiency', '6.88 kW/m³/min', '6.19 kW/m³/min'],
      ['Loaded Hours (unit spec)', '64,466 h', '93,123 h'],
      ['Total Running Hours (unit spec)', '92,143 h', '112,782 h'],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // ── Savings ────────────────────────────────────────────────
  addPage();
  y = sectionTitle('Estimated Savings Opportunity', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Metric', 'L160', 'L250', 'Bouwa', 'Saving vs L160', 'Saving vs L250']],
    body: SAVINGS_TABLE.map(r => [r.metric, r.l160, r.l250, r.bouwa, r.savingL160, r.savingL250]),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // ── Gross Proposed Cost & VSD Credit ─────────────────────
  addPage();
  y = sectionTitle('Gross Proposed Cost, VSD Saving Credit & Net Proposed Cost', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Item', 'L160 (Current)', 'Bouwa RS132-II (Proposed)', 'Source / Note']],
    body: [
      ['Gross Annual Energy Cost', 'R 2,826,866', 'R 1,995,196', 'Workbook TOU calc (Set A rates)'],
      ['VSD Saving Credit (14%)', 'N/A', 'R 279,327', 'Workbook Report!R31 — internal adjustment'],
      ['Net Proposed Annual Cost', 'N/A', 'R 1,715,869', 'Gross minus VSD credit'],
      ['Annual Saving', '', 'R 1,110,997', 'R 2,826,866 − R 1,715,869'],
      ['Saving %', '', '~39.3%', 'vs L160 gross cost'],
      ['PPT stated Bouwa cost', '', 'R 1,680,000', 'PPT Slide 4 — rounded/older figure (see conflict note)'],
      ['PPT stated saving vs L160', '', 'R 1,130,000 (40%)', 'PPT Slide 4'],
      ['Wizard current (from PPT)', '', 'R 1,680,000', 'REQUIRES REVIEW — see bouwa-calculation-map.md §14.2'],
      ['VAT treatment', 'Excluded', 'Excluded', 'Confirmed — ROI sheet note'],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  const savCY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFontSize(7.5); doc.setTextColor(180, 80, 0); doc.setFont('helvetica', 'italic');
  doc.text('SOURCE CONFLICT: PPT Bouwa cost R1.68M vs workbook gross R1.995M (VSD credit accounts for ~R279K). Wizard uses PPT value. DO NOT issue final report until ARS confirms tariff basis and VSD credit treatment.', MARGIN, savCY, { maxWidth: W - MARGIN * 2 });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);

  // ── Load Profile ───────────────────────────────────────────
  addPage();
  y = sectionTitle('Load Profile / Air Flow Analysis', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Parameter', 'Value', 'Source']],
    body: [
      ['Date Range',           LOAD_PROFILE.dateRange,                                    'Air Flow Result Input sheet'],
      ['Average Demand',       LOAD_PROFILE.avgFlowM3Min + ' m³/min',                    'Workbook — 15-min logger'],
      ['Peak Demand',          LOAD_PROFILE.peakFlowM3Min + ' m³/min',                   'Workbook — confirmed PPT Slide 12'],
      ['Minimum Demand',       LOAD_PROFILE.minFlowM3Min + ' m³/min',                    'Workbook — Air Flow Result Input'],
      ['Avg Pressure',         LOAD_PROFILE.avgPressureBar ? LOAD_PROFILE.avgPressureBar + ' bar' : 'Not recorded', 'Approximate — Data File readings'],
      ['Reading Count',        String(LOAD_PROFILE.readingCount) + ' (15-min intervals)','Workbook'],
      ['Demand Utilisation',   LOAD_PROFILE.demandUtilisationPct + '% of L160 rated',   'Calculated — 25.94 / 29.7 × 100'],
      ['Right-sizing note',    'Bouwa RS132-II (28.4 m³/min) covers peak 26.81 m³/min', 'Workbook Report!R3'],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // ── ROI (workbook reference + placeholder scenarios) ───────
  addPage();
  y = sectionTitle('ROI Scenario', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Item', 'Workbook Reference', 'Note']],
    body: [
      ['Machine Model',          'Bouwa SVC-RS132-II (132kW)',            '⚠ CONFLICT: PPT recs SVC-RS160-II (160kW). Confirm with Bouwa.'],
      ['Unit Price',             'R 984,810',                             'Workbook ROI sheet. Price is for RS132. Changes if model changes.'],
      ['Quantity',               '2 units',                               'Replace both L160 and L250'],
      ['Gross Machine Cost',     'R 1,969,620',                           'R984,810 × 2'],
      ['Buy-back (L160+L250)',   'R 130,000',                             'Workbook ROI!R8'],
      ['Refurb L160',            'R 472,760',                             'Workbook ROI!R9'],
      ['Refurb L250',            'R 671,000',                             'Workbook ROI!R10'],
      ['Net Initial Investment', 'R 2,297,860',                           'Workbook ROI!R13 (buy-back offset scenario)'],
      ['Annual Saving (L160)',   'R 1,110,997 / year',                    'Workbook ROI!R6'],
      ['Annual Saving (L250)',   'R 2,639,781 / year',                    'Workbook ROI!R7'],
      ['Payback Period',         '7.35 months (0.613 years)',              'Workbook ROI!R14'],
      ['ROI %',                  '48.35%',                                'Workbook ROI!R12'],
      ['VAT',                    'Excluded',                              'Workbook ROI!R31 explicit note'],
    ],
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  const roiY2 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFontSize(7.5); doc.setTextColor(180, 80, 0); doc.setFont('helvetica', 'italic');
  doc.text('REQUIRES REVIEW: Machine model (RS132 vs RS160-II), savings figures (PPT vs workbook), and tariff basis must be confirmed with ARS/Bouwa before customer issue.', MARGIN, roiY2, { maxWidth: W - MARGIN * 2 });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);

  // ── Calculation Trace ──────────────────────────────────────
  addPage();
  y = sectionTitle('Calculation Trace / Review Status', 20);
  const valItems = runValidation();
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Metric', 'Workbook', 'App Calc', 'PPT', 'Status']],
    body: valItems.map(i => [
      i.metric,
      String(i.workbookRef),
      i.appCalculated != null ? String(i.appCalculated) : '—',
      i.pptValue != null ? String(i.pptValue) : '—',
      i.status.toUpperCase().replace(/-/g, ' '),
    ]),
    styles: { fontSize: 6.5 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  const ctY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFontSize(7); doc.setTextColor(180, 80, 0); doc.setFont('helvetica', 'italic');
  doc.text('INTERNAL DRAFT — Conflicts and "requires review" items must be resolved before customer issue. Do not present conflicting values to customer.', MARGIN, ctY, { maxWidth: W - MARGIN * 2 });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);

  // ── ROI ────────────────────────────────────────────────────
  addPage();
  y = sectionTitle('ROI Comparison — Scenarios', 20);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['', 'Scenario A', 'Scenario B', 'Scenario C']],
    body: [
      ['Description', ROI_SCENARIOS[0].desc, ROI_SCENARIOS[1].desc, ROI_SCENARIOS[2].desc],
      ['Total Cost', ROI_SCENARIOS[0].totalCost, ROI_SCENARIOS[1].totalCost, ROI_SCENARIOS[2].totalCost],
      ['Net Investment', ROI_SCENARIOS[0].netInvestment, ROI_SCENARIOS[1].netInvestment, ROI_SCENARIOS[2].netInvestment],
      ['Combined Annual Saving', ROI_SCENARIOS[0].annualSavingCombined, ROI_SCENARIOS[1].annualSavingCombined, ROI_SCENARIOS[2].annualSavingCombined],
      ['Payback Period', ROI_SCENARIOS[0].payback, ROI_SCENARIOS[1].payback, ROI_SCENARIOS[2].payback],
      ['ROI %', ROI_SCENARIOS[0].roiPct, ROI_SCENARIOS[1].roiPct, ROI_SCENARIOS[2].roiPct],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 66, 120] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.setFontSize(7);
  doc.setTextColor(100);
  const tY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.text('* Pricing TBC — obtain Bouwa quote. Note: deck savings table references RS132 VSD model; recommendations reference SVC-RS160-II. Confirm model with Bouwa.', MARGIN, tY, { maxWidth: W - MARGIN * 2 });

  // ── Recommendations ───────────────────────────────────────
  addPage();
  y = sectionTitle('Recommendations & Next Steps', 20);
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  RECOMMENDATIONS.filter(r => r.checked).forEach((r, i) => {
    doc.text(`${i + 1}. ${r.text}`, MARGIN, y + 2, { maxWidth: W - MARGIN * 2 });
    y += 12;
  });

  // Page numbers
  const totalPages = (doc as any).getNumberOfPages?.() ?? (docAny.internal?.getNumberOfPages?.() ?? 1);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}  |  ${setup.proposalTitle}  |  DEMO ONLY`, W / 2, 293, { align: 'center' });
  }

  doc.save(`${setup.customer.replace(/\s+/g, '-')}-Air-Audit-Proposal-DEMO.pdf`);
}

// ---------------------------------------------------------------------------
// Stepper nav
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  'Customer/Site & Conditions', 'Existing Compressors', 'Data Source', 'Site Observations',
  'Performance Metrics', 'Efficiency & Root Cause', 'Bouwa Solution',
  'Savings', 'ROI', 'Recommendations', 'Report Preview',
];

function StepperNav({ step, total, onGo }: { step: number; total: number; onGo: (n: number) => void }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-center gap-1 min-w-max">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onGo(n)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                active ? 'bg-ars-primary text-white shadow-sm' :
                done ? 'bg-green-100 text-green-700' :
                'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                active ? 'bg-white text-ars-primary' :
                done ? 'bg-green-500 text-white' :
                'bg-slate-300 text-slate-600'
              }`}>
                {done ? <Check className="w-2.5 h-2.5" /> : n}
              </span>
              {label}
            </button>
          );
        })}
        <span className="text-xs text-slate-400 ml-2 shrink-0">{step}/{total}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export function BouwaNewProposalWizard() {
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState<ProposalSetup>(DEFAULT_SETUP);
  const [siteConditions, setSiteConditions] = useState<SiteConditions>(DEFAULT_SITE_CONDITIONS);
  const [tariffProfile, setTariffProfile] = useState<TariffProfile>(DEFAULT_TARIFF);
  const [tariffOpProfile, setTariffOpProfile] = useState<TariffOperatingProfile>(DEFAULT_TARIFF_OP_PROFILE);
  const [dataMode, setDataMode] = useState<DataSourceMode>('audit-excel');
  const [recs, setRecs] = useState(RECOMMENDATIONS);
  const TOTAL = STEP_LABELS.length;

  function toggleRec(id: string) {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));
  }

  function renderStep() {
    switch (step) {
      case 1:  return <Step1_SiteAndConditions data={setup} onChange={setSetup} siteConditions={siteConditions} onChangeSiteConditions={setSiteConditions} tariffProfile={tariffProfile} onChangeTariff={setTariffProfile} tariffOpProfile={tariffOpProfile} onChangeTariffOpProfile={setTariffOpProfile} />;
      case 2:  return <Step2_ExistingCompressors />;
      case 3:  return <Step3_DataSource mode={dataMode} onChange={setDataMode} />;
      case 4:  return <Step4_SiteObservations />;
      case 5:  return <Step5_PerformanceMetrics />;
      case 6:  return <Step6_EfficiencyRootCause />;
      case 7:  return <Step7_SelectBouwaSolution />;
      case 8:  return <Step8_SavingsOpportunity tariffProfile={tariffProfile} />;
      case 9:  return <Step9_ROIComparison />;
      case 10: return <Step10_Recommendations recs={recs} onToggle={toggleRec} />;
      case 11: return <Step11_ReportPreview setup={setup} siteConditions={siteConditions} tariffProfile={tariffProfile} onGeneratePDF={() => generateProposalPDF(setup, siteConditions, tariffProfile, tariffOpProfile)} />;
      default: return null;
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-ars-primary/10 p-2.5 shrink-0">
          <Wind className="w-6 h-6 text-ars-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ars-heading">New Air Audit Proposal</h1>
          <p className="text-sm text-ars-body">11-step proposal builder — Ingrain Belville demo data loaded.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <StepperNav step={step} total={TOTAL} onGo={setStep} />
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 min-h-[300px]">
        {renderStep()}
      </div>

      {/* Prev / Next */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-ars-body hover:bg-slate-50 transition disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {step < TOTAL ? (
          <button
            type="button"
            onClick={() => setStep(s => Math.min(TOTAL, s + 1))}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-ars-primary text-white font-bold text-sm hover:bg-ars-primary/90 transition shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => generateProposalPDF(setup, siteConditions, tariffProfile, tariffOpProfile)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shadow-sm"
          >
            <Download className="w-4 h-4" /> Generate PDF
          </button>
        )}
      </div>
    </div>
  );
}
