/**
 * BouwaModuleShell
 *
 * Phase 4D-15: Air Audit Proposal Builder — full rebuild.
 *
 * Navigation:
 *   Dashboard | New Proposal | Drafts | Machine Spec Library | Templates & Assumptions
 *
 * Removed from main UI:
 *   - Customer-Safe Export module card
 *   - Access Requirements panel (BouwaAccessNotice)
 *   - Feature flag explanation text
 *   - Big approval warnings / approvalStatus wording
 *   - Excessive module card grid on landing screen
 *
 * Preserved:
 *   - BouwaSupplierSpecReview (under Machine Spec Library)
 *   - 75 imported Bouwa specs
 *   - Excel template download (Templates & Assumptions)
 *   - Demo PDF generation (New Proposal Step 11)
 *   - Detailed technical report direction
 *
 * SAFETY:
 *   - NOT mounted in Dashboard.tsx or MobileNavigation.tsx.
 *   - Only reachable via hidden /bouwa route behind BouwaRouteGuard.
 *   - approvalStatus is never set, never "approved_customer".
 *   - No customer-safe export exposed.
 */

import { useState } from 'react';
import { Cpu, ChevronRight, Wind, FileText, Database, LayoutDashboard, FolderOpen } from 'lucide-react';

import { BouwaDashboard }          from '../components/BouwaDashboard';
import { BouwaNewProposalWizard }  from '../components/BouwaNewProposalWizard';
import { BouwaDraftProposalsList } from '../components/BouwaDraftProposalsList';
import { BouwaSpecLibraryPage }    from '../components/BouwaSpecLibraryPage';
import { BouwaTemplatesPage }      from '../components/BouwaTemplatesPage';

import type { BouwaTopNav }        from '../components/BouwaDashboard';

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------

interface NavItem {
  key: BouwaTopNav;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',    label: 'Dashboard',               icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'new-proposal', label: 'New Proposal',            icon: <Wind            className="w-4 h-4" /> },
  { key: 'drafts',       label: 'Draft Proposals',         icon: <FolderOpen      className="w-4 h-4" /> },
  { key: 'spec-library', label: 'Machine Spec Library',    icon: <Database        className="w-4 h-4" /> },
  { key: 'templates',    label: 'Templates & Assumptions', icon: <FileText        className="w-4 h-4" /> },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopNav({ active, onChange }: { active: BouwaTopNav; onChange: (k: BouwaTopNav) => void }) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-0.5 border-b border-slate-200">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              isActive
                ? 'text-ars-primary border-ars-primary bg-white'
                : 'text-ars-body border-transparent hover:text-ars-heading hover:bg-slate-50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function Breadcrumb({ view }: { view: BouwaTopNav }) {
  const label = NAV_ITEMS.find(n => n.key === view)?.label ?? view;
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Cpu className="w-3.5 h-3.5" />
      <span>Bouwa</span>
      <ChevronRight className="w-3 h-3" />
      <span className="text-ars-body font-medium">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main shell
// ---------------------------------------------------------------------------

export function BouwaModuleShell() {
  const [view, setView] = useState<BouwaTopNav>('dashboard');

  function navigate(v: BouwaTopNav) {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderView() {
    switch (view) {
      case 'dashboard':
        return <BouwaDashboard onNavigate={navigate} />;
      case 'new-proposal':
        return <BouwaNewProposalWizard />;
      case 'drafts':
        return (
          <BouwaDraftProposalsList
            onNewProposal={() => navigate('new-proposal')}
            onOpenProposal={() => navigate('new-proposal')}
          />
        );
      case 'spec-library':
        return <BouwaSpecLibraryPage />;
      case 'templates':
        return <BouwaTemplatesPage />;
      default:
        return <BouwaDashboard onNavigate={navigate} />;
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Breadcrumb view={view} />
      <TopNav active={view} onChange={navigate} />
      <div className="pt-2">{renderView()}</div>
    </div>
  );
}
