/**
 * BouwaDashboard
 *
 * Landing dashboard for the Air Audit Proposal Builder.
 * Machine Spec Library count is loaded from the consolidated library API.
 * Other summary cards remain illustrative until those modules are wired.
 */

import { useEffect, useState } from 'react';
import {
  Activity, Wind, FileText, Plus, ArrowRight, ChevronRight, Cpu,
  BarChart3, CheckCircle2, Zap,
} from 'lucide-react';
import { browseSpecLibrary } from '../wizard/wizardApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BouwaTopNav =
  | 'proposals'
  | 'dashboard'
  | 'air-audit'
  | 'new-proposal'
  | 'drafts'
  | 'spec-library'
  | 'templates';

interface BouwaDashboardProps {
  onNavigate: (view: BouwaTopNav, extra?: string) => void;
}

// ---------------------------------------------------------------------------
// Demo data (non-library cards remain illustrative)
// ---------------------------------------------------------------------------

const ILLUSTRATIVE_STATS = [
  { label: 'Draft Proposals',          value: '—',  color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',icon: <FileText className="w-5 h-5 text-amber-500" /> },
  { label: 'Completed Comparisons',    value: '—',  color: 'text-green-700', bg: 'bg-green-50 border-green-200',icon: <BarChart3 className="w-5 h-5 text-green-500" /> },
  { label: 'Reports Generated',        value: '—',  color: 'text-purple-700',bg: 'bg-purple-50 border-purple-200',icon: <Zap     className="w-5 h-5 text-purple-500" /> },
];

const RECENT_PROPOSALS = [
  {
    id: 'ingrain-bellville',
    customer: 'Ingrain Belville',
    title: 'L250 / L160 → Bouwa SVC-RS160-II (Audit: 30 May 2025)',
    status: 'Draft',
    statusColor: 'bg-amber-100 text-amber-700 border-amber-200',
    savings: 'R 1.15M/yr vs L160 | R 2.67M/yr vs L250',
    updated: '08 Jul 2026',
  },
  {
    id: 'boksburg-plant',
    customer: 'Boksburg Plant',
    title: 'GA55 → Bouwa SVC-RS55A-II',
    status: 'Review',
    statusColor: 'bg-blue-100 text-blue-700 border-blue-200',
    savings: '~R 182,450 / year',
    updated: '04 Jul 2026',
  },
  {
    id: 'radley-rs250',
    customer: 'Radley',
    title: 'RS250-II Review Proposal',
    status: 'Draft',
    statusColor: 'bg-amber-100 text-amber-700 border-amber-200',
    savings: 'Pending calculation',
    updated: '01 Jul 2026',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LocalhostBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-300 uppercase tracking-wide">
      Localhost demo
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BouwaDashboard({ onNavigate }: BouwaDashboardProps) {
  const [activeSpecCount, setActiveSpecCount] = useState<string>('…');

  useEffect(() => {
    let cancelled = false;
    browseSpecLibrary({ limit: 1, offset: 0 })
      .then((page) => {
        if (!cancelled) setActiveSpecCount(String(page.total));
      })
      .catch(() => {
        if (!cancelled) setActiveSpecCount('—');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    {
      label: 'Active Machine Specs',
      value: activeSpecCount,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      icon: <Cpu className="w-5 h-5 text-blue-500" />,
    },
    ...ILLUSTRATIVE_STATS,
  ];
  return (
    <div className="space-y-8">

      {/* ── Hero CTA ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-ars-primary to-slate-700 text-white px-8 py-10 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="rounded-xl bg-white/10 p-4 shrink-0">
            <Wind className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Air Audit Proposal Builder</h1>
              <LocalhostBadge />
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-w-xl">
              Create detailed air compressor energy-saving proposals. Upload a completed
              air audit template or use manufacturer specs to generate a professional
              savings and ROI report for your customer.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('air-audit')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-ars-primary font-bold rounded-xl hover:bg-white/90 transition shadow text-sm"
            >
              <Activity className="w-5 h-5" />
              Start a measured air audit
            </button>
            <button
              onClick={() => onNavigate('new-proposal')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition text-sm border border-white/30"
            >
              <Plus className="w-5 h-5" />
              New Air Audit Proposal
            </button>
            <button
              onClick={() => onNavigate('new-proposal')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition text-sm border border-white/30"
            >
              <Wind className="w-4 h-4" />
              Continue Ingrain Proposal
            </button>
            <button
              onClick={() => onNavigate('drafts')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition text-sm border border-white/20"
            >
              <FileText className="w-4 h-4" />
              All Drafts
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.bg} px-4 py-4 flex items-center gap-3`}>
            {s.icon}
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 leading-snug">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent proposals ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ars-heading">Recent Proposals</h2>
          <button
            onClick={() => onNavigate('drafts')}
            className="text-xs text-ars-primary font-medium flex items-center gap-1 hover:underline"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {RECENT_PROPOSALS.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-ars-primary/30 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onNavigate('drafts', p.id)}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-ars-heading">{p.customer}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.statusColor}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-ars-body">{p.title}</p>
              </div>
              <div className="flex items-center gap-6 text-right shrink-0">
                <div>
                  <p className="text-xs text-slate-400">Est. Savings</p>
                  <p className="text-sm font-semibold text-green-700">{p.savings}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Updated</p>
                  <p className="text-xs text-ars-body">{p.updated}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-ars-primary" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick links ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLinkCard
          icon={<Cpu className="w-5 h-5 text-blue-600" />}
          title="Machine Spec Library"
          desc="Consolidated active library (live count)"
          bg="bg-blue-50 border-blue-200"
          onClick={() => onNavigate('spec-library')}
        />
        <QuickLinkCard
          icon={<FileText className="w-5 h-5 text-purple-600" />}
          title="Templates & Assumptions"
          desc="Download audit template, tariff defaults, CO₂ factor"
          bg="bg-purple-50 border-purple-200"
          onClick={() => onNavigate('templates')}
        />
        <QuickLinkCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          title="New Proposal Wizard"
          desc="11-step guided proposal builder — start here"
          bg="bg-green-50 border-green-200"
          onClick={() => onNavigate('new-proposal')}
        />
      </section>
    </div>
  );
}

function QuickLinkCard({
  icon, title, desc, bg, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border ${bg} p-4 text-left hover:shadow-sm transition-all w-full flex items-start gap-3`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-ars-heading">{title}</p>
        <p className="text-xs text-ars-body mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1 ml-auto" />
    </button>
  );
}
