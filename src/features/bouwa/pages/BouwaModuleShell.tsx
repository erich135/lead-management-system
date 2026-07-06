/**
 * BouwaModuleShell
 *
 * Internal placeholder shell for the Bouwa Proposal Module.
 * Renders the structural overview of the module including phase status cards
 * and the access/safety notice.
 *
 * IMPORTANT:
 * - This component is NOT mounted in Dashboard.tsx or MobileNavigation.tsx.
 * - It calls listBouwaMachineSpecs() via BouwaMachineSpecLibrary (read-only; errors are handled gracefully).
 * - It does NOT expose any customer-facing data.
 * - Customer-facing proposal outputs remain DISABLED until formulas, assumptions
 *   and report templates are formally approved.
 *
 * Phase 4C-2: shell / placeholder only.
 * Phase 4C-5: BouwaMachineSpecLibrary read-only screen added.
 * Phase 4C-6: BouwaTariffTablesPanel read-only screen added.
 * Phase 4C-7: BouwaAirAuditEvidencePanel read-only screen added.
 * Phase 4C-8: BouwaProposalDraftsPanel, BouwaFormulaApprovalsPanel,
 *              BouwaAssumptionsPanel, BouwaReportTemplatesPanel added.
 * Phase 4D-9: BouwaSupplierSpecReview (internal review panel with editable review fields).
 */

import { FileText, Cpu, DollarSign, Wind, ClipboardCheck, Eye, Download } from 'lucide-react';
import { BouwaMachineSpecLibrary } from '../components/BouwaMachineSpecLibrary';
import { BouwaTariffTablesPanel } from '../components/BouwaTariffTablesPanel';
import { BouwaAirAuditEvidencePanel } from '../components/BouwaAirAuditEvidencePanel';
import { BouwaProposalDraftsPanel } from '../components/BouwaProposalDraftsPanel';
import { BouwaFormulaApprovalsPanel } from '../components/BouwaFormulaApprovalsPanel';
import { BouwaAssumptionsPanel } from '../components/BouwaAssumptionsPanel';
import { BouwaReportTemplatesPanel } from '../components/BouwaReportTemplatesPanel';
import { BouwaSupplierSpecReview } from '../components/BouwaSupplierSpecReview';
import { BOUWA_MODULE_META } from '../bouwaFrontendConfig';
import { BouwaAccessNotice } from '../components/BouwaAccessNotice';
import { BouwaPhaseCard } from '../components/BouwaPhaseCard';
import type { BouwaShellCard } from '../types';

const SHELL_CARDS: BouwaShellCard[] = [
  {
    title: 'Machine Specification Library',
    description:
      'Stores validated compressor specifications used as the basis for energy and savings calculations.',
    status: 'pending',
    iconKey: 'Cpu',
  },
  {
    title: 'Tariff Tables',
    description:
      'Electricity and compressed-air tariff schedules by region. Must be reviewed before use in any proposal.',
    status: 'pending',
    iconKey: 'DollarSign',
  },
  {
    title: 'Air Audit Evidence',
    description:
      'Stores site measurement data, leak surveys and load-profile evidence gathered during audits.',
    status: 'pending',
    iconKey: 'Wind',
  },
  {
    title: 'Proposal Drafts',
    description:
      'Internal working copies of energy-saving proposals. Not visible to customers until exported.',
    status: 'pending',
    iconKey: 'FileText',
  },
  {
    title: 'Internal Calculation Review',
    description:
      'Formulas and assumption sets pending review. Proposals cannot be finalised until calculations are approved.',
    status: 'pending',
    iconKey: 'ClipboardCheck',
  },
  {
    title: 'Customer-Safe Proposal Export',
    description:
      'Generates the customer-visible PDF output. Blocked until all approvals are complete.',
    status: 'disabled',
    iconKey: 'Download',
  },
];

/**
 * Renders the Bouwa module shell overview.
 *
 * Not routed or visible in any navigation until Phase 4C-3+ wires it up.
 */
export function BouwaModuleShell() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5">
          <Eye className="w-6 h-6 text-ars-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ars-heading">
            {BOUWA_MODULE_META.label}
          </h1>
          <p className="text-sm text-ars-body mt-1">
            {BOUWA_MODULE_META.description}{' '}
            This is an internal preparation module — not visible to customers.
          </p>
        </div>
      </div>

      {/* Internal safety banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
        <p className="text-sm text-red-900 font-medium leading-relaxed">
          Customer-facing proposal outputs remain disabled until formulas, assumptions and report
          templates are approved by an authorised reviewer.
        </p>
      </div>

      {/* Access requirements */}
      <BouwaAccessNotice />

      {/* Phase status cards */}
      <section>
        <h2 className="text-base font-semibold text-ars-heading mb-4">Module Areas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHELL_CARDS.map((card) => (
            <BouwaPhaseCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      {/* Machine Specification Library — read-only, internal only */}
      <BouwaMachineSpecLibrary />

      {/* Supplier Spec Review — Phase 4D-9 — internal review workflow, admin/super_admin only */}
      <BouwaSupplierSpecReview />

      {/* Tariff Tables — read-only, internal only */}
      <BouwaTariffTablesPanel />

      {/* Air Audit Evidence — read-only, internal only */}
      <BouwaAirAuditEvidencePanel />

      {/* Proposal Drafts — read-only, internal only */}
      <BouwaProposalDraftsPanel />

      {/* Formula Approvals — read-only, internal only */}
      <BouwaFormulaApprovalsPanel />

      {/* Assumptions — read-only, internal only */}
      <BouwaAssumptionsPanel />

      {/* Report Templates — read-only, internal only */}
      <BouwaReportTemplatesPanel />

      {/* Phase/build status footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex flex-wrap items-center gap-4 text-xs text-ars-body">
        <span>
          <span className="font-medium">Feature flag:</span>{' '}
          <code className="rounded bg-slate-100 border border-slate-200 px-1 py-0.5 font-mono">
            {BOUWA_MODULE_META.featureFlag}
          </code>
        </span>
        <span>
          <span className="font-medium">View permission:</span>{' '}
          <code className="rounded bg-slate-100 border border-slate-200 px-1 py-0.5 font-mono">
            {BOUWA_MODULE_META.viewPermission}
          </code>
        </span>
        <span className="ml-auto">
          {BOUWA_MODULE_META.uiReady ? (
            <span className="text-green-700 font-medium">UI Ready</span>
          ) : (
            <span className="text-amber-700 font-medium">UI Not Yet Wired</span>
          )}
        </span>
      </div>
    </div>
  );
}

// Named exports for icons — kept here so components above don't need to import individually
export { Cpu, DollarSign, Wind, ClipboardCheck, Download };
