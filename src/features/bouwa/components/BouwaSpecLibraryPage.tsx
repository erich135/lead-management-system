/**
 * BouwaSpecLibraryPage
 *
 * Phase 4D-15: Machine Spec Library page.
 *
 * Split into:
 *   - Bouwa Machine Specs (75 imported — backed by API via BouwaSupplierSpecReview + BouwaMachineSpecLibrary)
 *   - Customer / Manufacturer Machine Specs (demo placeholder)
 *
 * Supplier Spec Review is available here.
 * No API calls beyond what BouwaSupplierSpecReview already makes.
 */

import { useState } from 'react';
import { Cpu, Wind, Search, Database, ClipboardCheck, ChevronDown } from 'lucide-react';
import { BouwaSupplierSpecReview }  from './BouwaSupplierSpecReview';
import { BouwaMachineSpecLibrary }  from './BouwaMachineSpecLibrary';

// ---------------------------------------------------------------------------
// Demo manufacturer specs table
// ---------------------------------------------------------------------------

const DEMO_MFR_SPECS = [
  { make: 'Atlas Copco', model: 'GA55', fad: '9.14 m³/min', pressure: '7.5 bar(g)', power: '55 kW', source: 'Manufacturer datasheet', confidence: 'High' },
  { make: 'CompAir',     model: 'L250', fad: '40.5 m³/min', pressure: '7.0 bar(g)', power: '250 kW', source: 'Manufacturer datasheet', confidence: 'High' },
  { make: 'CompAir',     model: 'L160', fad: '25.8 m³/min', pressure: '7.0 bar(g)', power: '160 kW', source: 'Manufacturer datasheet', confidence: 'High' },
  { make: 'Ingersoll Rand', model: 'R90', fad: '14.8 m³/min', pressure: '8.0 bar(g)', power: '90 kW', source: 'Published spec sheet', confidence: 'Medium' },
  { make: 'Kaeser', model: 'BSD 75', fad: '12.5 m³/min', pressure: '7.5 bar(g)', power: '75 kW', source: 'Published spec sheet', confidence: 'Medium' },
  { make: 'Atlas Copco', model: 'GA110VSD', fad: '18.2 m³/min', pressure: '7.5 bar(g)', power: '110 kW', source: 'Manufacturer datasheet', confidence: 'High' },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  'High':   'bg-green-100 text-green-700 border-green-200',
  'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
  'Low':    'bg-red-100 text-red-700 border-red-200',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type LibView = 'bouwa' | 'manufacturer';

export function BouwaSpecLibraryPage() {
  const [view, setView] = useState<LibView>('bouwa');
  const [mfrSearch, setMfrSearch] = useState('');

  const filteredMfr = DEMO_MFR_SPECS.filter(s =>
    mfrSearch === '' ||
    s.make.toLowerCase().includes(mfrSearch.toLowerCase()) ||
    s.model.toLowerCase().includes(mfrSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-ars-primary/10 p-2.5 shrink-0">
          <Database className="w-6 h-6 text-ars-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ars-heading">Machine Spec Library</h1>
          <p className="text-sm text-ars-body">Browse Bouwa specs and manufacturer reference data. 75 Bouwa specs loaded.</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { key: 'bouwa' as LibView, label: 'Bouwa Machine Specs', icon: <Wind className="w-4 h-4" />, badge: '75' },
          { key: 'manufacturer' as LibView, label: 'Customer / Manufacturer Specs', icon: <Cpu className="w-4 h-4" />, badge: `${DEMO_MFR_SPECS.length}` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              view === tab.key
                ? 'text-ars-primary border-ars-primary bg-white'
                : 'text-ars-body border-transparent hover:text-ars-heading hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Bouwa specs view */}
      {view === 'bouwa' && (
        <div className="space-y-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
            <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Supplier Spec Review — Internal Only. </span>
              Filter, inspect and update internal review status. Existing table/drawer/save behaviour preserved.
            </p>
          </div>
          <BouwaSupplierSpecReview />
          <div className="border-t border-slate-200 pt-6">
            <BouwaMachineSpecLibrary />
          </div>
        </div>
      )}

      {/* Manufacturer specs view */}
      {view === 'manufacturer' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Demo placeholder — </span>
              Manufacturer reference specs for existing customer machines. Used when no site audit is available (Estimate Mode).
              Source and confidence labels indicate data quality.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search make / model…"
                value={mfrSearch}
                onChange={e => setMfrSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ars-primary/30"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Filter <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Make', 'Model', 'FAD', 'Pressure', 'Power (kW)', 'Source', 'Confidence'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMfr.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-ars-heading">{r.make}</td>
                    <td className="px-3 py-2 font-semibold text-ars-primary">{r.model}</td>
                    <td className="px-3 py-2">{r.fad}</td>
                    <td className="px-3 py-2">{r.pressure}</td>
                    <td className="px-3 py-2">{r.power}</td>
                    <td className="px-3 py-2 text-slate-500">{r.source}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CONFIDENCE_COLORS[r.confidence]}`}>
                        {r.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Showing {filteredMfr.length} of {DEMO_MFR_SPECS.length} manufacturer specs.
            Add real manufacturer datasheets via the Templates & Assumptions page.
          </p>
        </div>
      )}
    </div>
  );
}
