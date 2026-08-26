import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getMachinesByCustomer, type Customer } from '../../../lib/api';
import {
  getSalesProposal,
  previewElectricityComparison,
  saveSalesProposal,
  uploadAirAuditCsv,
} from '../api';
import { CustomerSelect } from '../components/CustomerSelect';
import { SiteFields } from '../components/SiteFields';
import { SiteMapCapture } from '../components/SiteMapCapture';
import { AirAuditUpload } from '../components/AirAuditUpload';
import { AirAuditScopeFields } from '../components/AirAuditScopeFields';
import { MeasuredAuditCard } from '../components/MeasuredAuditCard';
import { CurrentMachinePerformanceCard } from '../components/CurrentMachinePerformanceCard';
import { CurrentEquipmentSection } from '../components/CurrentEquipmentSection';
import { ProposedReplacementSection } from '../components/ProposedReplacementSection';
import { MachineSummaryCard } from '../components/MachineSummaryCard';
import { ElectricityBasisSection } from '../components/ElectricityBasisSection';
import { CommercialOfferSection } from '../components/CommercialOfferSection';
import { AirMachineComparisonCard } from '../components/AirMachineComparisonCard';
import { ElectricityResultCard } from '../components/ElectricityResultCard';
import { CommercialResultCard } from '../components/CommercialResultCard';
import {
  currentMachineHasIdentity,
  draftsFromCurrentEquipment,
  emptyProposedDraft,
  proposedDraftFromProposal,
  retainMachinesForCustomer,
  toCurrentEquipmentPayload,
  toProposedEquipmentPayload,
  type CurrentEquipmentDraft,
  type ProposedEquipmentDraft,
} from '../equipmentState';
import { electricityBasisOrEmpty } from '../electricityBasis';
import { commercialOfferOrEmpty } from '../commercialOffer';
import {
  DEFAULT_AIR_AUDIT_SCOPE,
  normaliseAirAuditScope,
  type AirAuditScope,
} from '../airAuditScope';
import { SALES_PROPOSAL_TOOL_LABEL, SALES_PROPOSAL_TOOL_PATH, salesProposalPreviewPath } from '../navigation';
import {
  EMPTY_SITE,
  type AirAndElectricityComparison,
  type CommercialComparison,
  type CommercialOffer,
  type CurrentMachineMeasuredPerformance,
  type ElectricityBasis,
  type SalesProposal,
  type SalesProposalSite,
} from '../types';
import { effectivePackageInput } from '../specDisplay';

export function SalesProposalEditorPage() {
  const { proposalId } = useParams();
  const [proposal, setProposal] = useState<SalesProposal | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [site, setSite] = useState<SalesProposalSite>(EMPTY_SITE);
  const [currentEquipment, setCurrentEquipment] = useState<CurrentEquipmentDraft[]>([]);
  const [proposed, setProposed] = useState<ProposedEquipmentDraft>(emptyProposedDraft());
  const [electricityBasis, setElectricityBasis] = useState<ElectricityBasis>(
    electricityBasisOrEmpty(null),
  );
  const [commercialOffer, setCommercialOffer] = useState<CommercialOffer>(
    commercialOfferOrEmpty(null),
  );
  const [airAuditScope, setAirAuditScope] = useState<AirAuditScope>(DEFAULT_AIR_AUDIT_SCOPE);
  const [comparison, setComparison] = useState<AirAndElectricityComparison | null>(null);
  const [commercial, setCommercial] = useState<CommercialComparison | null>(null);
  const [currentMachinePerformance, setCurrentMachinePerformance] =
    useState<CurrentMachineMeasuredPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const previousCustomerId = useRef<string | null>(null);

  useEffect(() => {
    if (!proposalId) return;
    let cancelled = false;
    setLoading(true);
    void getSalesProposal(proposalId)
      .then((loaded) => {
        if (cancelled) return;
        setProposal(loaded);
        setSite(loaded.site);
        const drafts = draftsFromCurrentEquipment(loaded.currentEquipment);
        setCurrentEquipment(drafts);
        setAirAuditScope(
          normaliseAirAuditScope(
            loaded.airAudit?.scope,
            drafts.filter(currentMachineHasIdentity).map((row) => row.key),
          ),
        );
        setProposed(proposedDraftFromProposal(loaded.proposedEquipment));
        setElectricityBasis(electricityBasisOrEmpty(loaded.electricityBasis));
        setCommercialOffer(commercialOfferOrEmpty(loaded.commercialOffer));
        setComparison(loaded.comparison);
        setCommercial(loaded.commercial);
        setCurrentMachinePerformance(loaded.currentMachinePerformance ?? null);
        setCustomer(
          loaded.customerId && loaded.customerName
            ? { _id: loaded.customerId, name: loaded.customerName }
            : null,
        );
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

  useEffect(() => {
    const nextId = customer?._id ?? null;
    if (previousCustomerId.current && nextId === null) {
      setCurrentEquipment([]);
    }
    previousCustomerId.current = nextId;
    if (!nextId) return;
    let cancelled = false;
    void getMachinesByCustomer(nextId)
      .then(({ machines }) => {
        if (cancelled) return;
        const ids = machines.map((machine) => machine._id);
        setCurrentEquipment((rows) => retainMachinesForCustomer(rows, ids));
      })
      .catch(() => {
        /* keep current selections if the machine list cannot be refreshed */
      });
    return () => {
      cancelled = true;
    };
  }, [customer?._id]);

  useEffect(() => {
    setAirAuditScope((current) =>
      normaliseAirAuditScope(
        current,
        currentEquipment.filter(currentMachineHasIdentity).map((row) => row.key),
      ),
    );
  }, [currentEquipment]);

  useEffect(() => {
    if (!proposalId || loading) return;
    const timer = window.setTimeout(() => {
      void previewElectricityComparison(proposalId, {
        customerId: customer?._id ?? null,
        currentEquipment: toCurrentEquipmentPayload(currentEquipment),
        proposedEquipment: toProposedEquipmentPayload(proposed),
        electricityBasis,
        commercialOffer,
        airAuditScope,
      })
        .then((preview) => {
          setComparison(preview.comparison);
          setCommercial(preview.commercial);
          setCurrentMachinePerformance(preview.currentMachinePerformance ?? null);
        })
        .catch(() => {
          /* keep the last comparison if preview cannot run yet */
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    proposalId,
    loading,
    currentEquipment,
    proposed,
    electricityBasis,
    commercialOffer,
    airAuditScope,
    proposal?.airAudit?.sourceSha256,
    customer?._id,
  ]);

  async function handleSave() {
    if (!proposalId) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const saved = await saveSalesProposal(proposalId, {
        customerId: customer?._id ?? null,
        site: { ...site, name: site.name },
        currentEquipment: toCurrentEquipmentPayload(currentEquipment),
        proposedEquipment: toProposedEquipmentPayload(proposed),
        electricityBasis,
        commercialOffer,
        airAuditScope,
      });
      setProposal(saved);
      setSite(saved.site);
      const drafts = draftsFromCurrentEquipment(saved.currentEquipment);
      setCurrentEquipment(drafts);
      setAirAuditScope(
        normaliseAirAuditScope(
          saved.airAudit?.scope,
          drafts.filter(currentMachineHasIdentity).map((row) => row.key),
        ),
      );
      setProposed(proposedDraftFromProposal(saved.proposedEquipment));
      setElectricityBasis(electricityBasisOrEmpty(saved.electricityBasis));
      setCommercialOffer(commercialOfferOrEmpty(saved.commercialOffer));
      setComparison(saved.comparison);
      setCommercial(saved.commercial);
      setCurrentMachinePerformance(saved.currentMachinePerformance ?? null);
      setSaveMessage('Saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    if (!proposalId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const updated = await uploadAirAuditCsv(proposalId, file);
      setProposal(updated);
      setAirAuditScope(
        normaliseAirAuditScope(
          updated.airAudit?.scope,
          currentEquipment.filter(currentMachineHasIdentity).map((row) => row.key),
        ),
      );
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'The Air Audit could not be read.');
    } finally {
      setUploading(false);
    }
  }

  function updateSiteName(name: string) {
    setSite((current) => ({ ...current, name: name.trim() === '' ? null : name }));
  }

  function openCurrentSpecSheet() {
    setCurrentEquipment((rows) => {
      const index = rows.findIndex(
        (row) =>
          currentMachineHasIdentity(row) &&
          effectivePackageInput(row.selectedSpec, row.sourceBacked).value === null,
      );
      if (index < 0) return rows;
      return rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, capturingSheet: true, changingSpec: false } : row,
      );
    });
  }

  function openProposedSpecSheet() {
    setProposed((draft) => ({ ...draft, capturingSheet: true, changingSpec: false }));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening proposal…
      </div>
    );
  }

  if (!proposal) {
    return <p className="text-sm text-red-600">{error || 'That sales proposal was not found.'}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#383838]">{SALES_PROPOSAL_TOOL_LABEL}</h1>
          {customer?.name && (
            <p className="mt-1 text-sm font-medium text-[#383838]">{customer.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            to={SALES_PROPOSAL_TOOL_PATH}
            className="rounded-[8px] bg-slate-100 px-4 py-2 text-sm font-medium text-[#383838] hover:bg-slate-200"
          >
            Back to proposals
          </Link>
          <Link
            to={salesProposalPreviewPath(proposal.id)}
            className="rounded-[8px] bg-slate-100 px-4 py-2 text-sm font-medium text-[#383838] hover:bg-slate-200"
          >
            Preview Customer Proposal
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-[8px] bg-[#f7c12b] px-4 py-2 text-sm font-bold text-[#383838] hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saveMessage && <p className="mt-0 text-sm text-emerald-700">{saveMessage}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 overflow-visible rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
              Customer &amp; Site
            </h2>
            <CustomerSelect
              customerId={customer?._id ?? null}
              customerName={customer?.name ?? null}
              onSelect={(selected) => setCustomer(selected)}
              onClear={() => setCustomer(null)}
            />
            <SiteFields
              customer={customer}
              siteName={site.name ?? ''}
              onSiteNameChange={updateSiteName}
            />
            <SiteMapCapture site={site} onChange={setSite} />
          </section>
          <AirAuditUpload
            uploading={uploading}
            error={uploadError}
            sourceFileName={proposal.airAudit?.sourceFileName ?? null}
            onFile={(file) => void handleUpload(file)}
          />
          {proposal.airAudit && (
            <AirAuditScopeFields
              scope={airAuditScope}
              machines={currentEquipment}
              onChange={(next) =>
                setAirAuditScope(
                  normaliseAirAuditScope(
                    next,
                    currentEquipment.filter(currentMachineHasIdentity).map((row) => row.key),
                  ),
                )
              }
            />
          )}
          <CurrentEquipmentSection
            proposalId={proposal.id}
            customerId={customer?._id ?? null}
            rows={currentEquipment}
            onChange={setCurrentEquipment}
          />
          <ProposedReplacementSection
            proposalId={proposal.id}
            draft={proposed}
            onChange={setProposed}
          />
          <ElectricityBasisSection value={electricityBasis} onChange={setElectricityBasis} />
          <CommercialOfferSection value={commercialOffer} onChange={setCommercialOffer} />
        </div>
        <div className="space-y-6">
          <MeasuredAuditCard audit={proposal.airAudit} />
          <MachineSummaryCard current={currentEquipment} proposed={proposed} />
          <CurrentMachinePerformanceCard result={currentMachinePerformance} />
          <AirMachineComparisonCard comparison={comparison} />
          <ElectricityResultCard
            comparison={comparison}
            onAddCurrentSpecSheet={openCurrentSpecSheet}
            onAddProposedSpecSheet={openProposedSpecSheet}
          />
          <CommercialResultCard commercial={commercial} />
        </div>
      </div>
    </div>
  );
}
