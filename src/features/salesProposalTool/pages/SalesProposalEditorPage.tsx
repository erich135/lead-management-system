import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getMachinesByCustomer, type Customer } from '../../../lib/api';
import {
  getSalesProposal,
  previewElectricityComparison,
  removeAirAudit,
  saveSalesProposal,
  uploadAirAuditCsv,
} from '../api';
import { CustomerSelect } from '../components/CustomerSelect';
import { SiteFields } from '../components/SiteFields';
import { SiteMapCapture } from '../components/SiteMapCapture';
import { MeasuredAuditCard } from '../components/MeasuredAuditCard';
import { CurrentMachinePerformanceCard } from '../components/CurrentMachinePerformanceCard';
import { CurrentEquipmentSection } from '../components/CurrentEquipmentSection';
import { ProposedReplacementSection } from '../components/ProposedReplacementSection';
import { MachineSummaryCard } from '../components/MachineSummaryCard';
import { ElectricityBasisSection } from '../components/ElectricityBasisSection';
import { OperatingAssumptionsSection } from '../components/OperatingAssumptionsSection';
import { CommercialOfferSection } from '../components/CommercialOfferSection';
import { AirRequirementSection } from '../components/AirRequirementSection';
import { EditorSection } from '../components/EditorSection';
import { AirMachineComparisonCard } from '../components/AirMachineComparisonCard';
import { ElectricityResultCard } from '../components/ElectricityResultCard';
import { CommercialResultCard } from '../components/CommercialResultCard';
import {
  currentMachineHasIdentity,
  draftsFromCurrentEquipment,
  emptyProposedDraft,
  proposedDraftsFromProposal,
  retainMachinesForCustomer,
  toCurrentEquipmentPayload,
  toProposedEquipmentPayload,
  type CurrentEquipmentDraft,
  type ProposedEquipmentDraft,
} from '../equipmentState';
import { electricityBasisOrEmpty } from '../electricityBasis';
import { operatingAssumptionsOrEmpty } from '../operatingAssumptions';
import { commercialOfferOrEmpty } from '../commercialOffer';
import {
  DEFAULT_AIR_AUDIT_SCOPE,
  normaliseAirAuditScope,
  type AirAuditScope,
} from '../airAuditScope';
import { SALES_PROPOSAL_TOOL_LABEL, SALES_PROPOSAL_TOOL_PATH } from '../navigation';
import {
  persistSalesProposalEditor,
  PREVIEW_SAVE_FAILED_MESSAGE,
  saveThenPreviewCustomerProposal,
  type SalesProposalEditorState,
} from '../salesProposalPersistence';
import {
  CUSTOMER_SELECTION_REQUIRED_MESSAGE,
  customerFromProposal,
  restoreProposalCustomer,
} from '../salesProposalEditorRestore';
import {
  EMPTY_SITE,
  type AirAndElectricityComparison,
  type CommercialComparison,
  type CommercialOffer,
  type CurrentMachineMeasuredPerformance,
  type ElectricityBasis,
  type OperatingAssumptions,
  type SalesProposal,
  type SalesProposalSite,
  type SitePerformanceView,
} from '../types';
import { effectivePackageInput } from '../specDisplay';

export function SalesProposalEditorPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<SalesProposal | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerEntry, setCustomerEntry] = useState<'existing' | 'manual'>('existing');
  const [manualCustomer, setManualCustomer] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
  });
  const [site, setSite] = useState<SalesProposalSite>(EMPTY_SITE);
  const [currentEquipment, setCurrentEquipment] = useState<CurrentEquipmentDraft[]>([]);
  const [proposed, setProposed] = useState<ProposedEquipmentDraft[]>([emptyProposedDraft()]);
  const [electricityBasis, setElectricityBasis] = useState<ElectricityBasis>(
    electricityBasisOrEmpty(null),
  );
  const [operatingAssumptions, setOperatingAssumptions] = useState<OperatingAssumptions>(
    operatingAssumptionsOrEmpty(null),
  );
  const [commercialOffer, setCommercialOffer] = useState<CommercialOffer>(
    commercialOfferOrEmpty(null),
  );
  const [airAuditScope, setAirAuditScope] = useState<AirAuditScope>(DEFAULT_AIR_AUDIT_SCOPE);
  const [comparison, setComparison] = useState<AirAndElectricityComparison | null>(null);
  const [commercial, setCommercial] = useState<CommercialComparison | null>(null);
  const [currentMachinePerformance, setCurrentMachinePerformance] =
    useState<CurrentMachineMeasuredPerformance | null>(null);
  const [proposedSitePerformance, setProposedSitePerformance] =
    useState<SitePerformanceView | null>(null);
  const [proposedSitePerformances, setProposedSitePerformances] = useState<
    SitePerformanceView[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAirAudit, setRemovingAirAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
        setProposed(proposedDraftsFromProposal(loaded.proposedEquipment));
        setElectricityBasis(electricityBasisOrEmpty(loaded.electricityBasis));
        setOperatingAssumptions(
          operatingAssumptionsOrEmpty({
            ...operatingAssumptionsOrEmpty(loaded.operatingAssumptions),
            hasAirAudit:
              loaded.operatingAssumptions?.hasAirAudit ??
              (loaded.airAudit ? true : loaded.operatingAssumptions?.hasAirAudit ?? null),
          }),
        );
        setCommercialOffer(commercialOfferOrEmpty(loaded.commercialOffer));
        setComparison(loaded.comparison);
        setCommercial(loaded.commercial);
        setCurrentMachinePerformance(loaded.currentMachinePerformance ?? null);
        setProposedSitePerformance(loaded.proposedSitePerformance ?? null);
        setProposedSitePerformances(loaded.proposedSitePerformances ?? null);
        const restored = restoreProposalCustomer(loaded);
        setCustomerEntry(restored.entry);
        setManualCustomer({
          companyName: restored.companyName,
          contactName: restored.contactName,
          email: restored.email,
          phone: restored.phone,
        });
        setCustomer(restored.entry === 'manual' ? null : customerFromProposal(loaded));
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
        customerEntry,
        customerId: customerEntry === 'manual' ? null : customer?._id ?? null,
        manualCustomer: {
          companyName: manualCustomer.companyName.trim() || null,
          contactName: manualCustomer.contactName.trim() || null,
          email: manualCustomer.email.trim() || null,
          phone: manualCustomer.phone.trim() || null,
        },
        site,
        currentEquipment: toCurrentEquipmentPayload(currentEquipment),
        proposedEquipment: toProposedEquipmentPayload(proposed),
        electricityBasis,
        operatingAssumptions,
        commercialOffer,
        airAuditScope,
      })
        .then((preview) => {
          setComparison(preview.comparison);
          setCommercial(preview.commercial);
          setCurrentMachinePerformance(preview.currentMachinePerformance ?? null);
          setProposedSitePerformance(preview.proposedSitePerformance ?? null);
          setProposedSitePerformances(preview.proposedSitePerformances ?? null);
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
    operatingAssumptions,
    commercialOffer,
    airAuditScope,
    site.altitudeMetres,
    site.intakeAirTemperatureC,
    site.intakeAirTemperatureKind,
    proposal?.airAudit?.sourceSha256,
    customer?._id,
    customerEntry,
    manualCustomer,
  ]);

  function editorPersistenceState(): SalesProposalEditorState {
    return {
      customerEntry,
      customerId: customer?._id ?? null,
      manualCustomer: {
        companyName: manualCustomer.companyName,
        contactName: manualCustomer.contactName,
        email: manualCustomer.email,
        phone: manualCustomer.phone,
      },
      site,
      currentEquipment,
      proposed,
      electricityBasis,
      operatingAssumptions,
      commercialOffer,
      airAuditScope,
    };
  }

  function applyPersistedProposal(saved: SalesProposal) {
    setProposal(saved);
    const restored = restoreProposalCustomer(saved);
    setCustomerEntry(restored.entry);
    setManualCustomer({
      companyName: restored.companyName,
      contactName: restored.contactName,
      email: restored.email,
      phone: restored.phone,
    });
    setCustomer(restored.entry === 'manual' ? null : customerFromProposal(saved));
    setSite(saved.site);
    const drafts = draftsFromCurrentEquipment(saved.currentEquipment);
    setCurrentEquipment(drafts);
    setAirAuditScope(
      normaliseAirAuditScope(
        saved.airAudit?.scope,
        drafts.filter(currentMachineHasIdentity).map((row) => row.key),
      ),
    );
    setProposed(proposedDraftsFromProposal(saved.proposedEquipment));
    setElectricityBasis(electricityBasisOrEmpty(saved.electricityBasis));
    setOperatingAssumptions(operatingAssumptionsOrEmpty(saved.operatingAssumptions));
    setCommercialOffer(commercialOfferOrEmpty(saved.commercialOffer));
    setComparison(saved.comparison);
    setCommercial(saved.commercial);
    setCurrentMachinePerformance(saved.currentMachinePerformance ?? null);
    setProposedSitePerformance(saved.proposedSitePerformance ?? null);
    setProposedSitePerformances(saved.proposedSitePerformances ?? null);
  }

  async function handleSave() {
    if (!proposalId || saving) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const saved = await persistSalesProposalEditor({
        proposalId,
        state: editorPersistenceState(),
        save: saveSalesProposal,
      });
      applyPersistedProposal(saved);
      setSaveMessage('Saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreviewCustomerProposal() {
    if (!proposalId || saving) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const result = await saveThenPreviewCustomerProposal({
        proposalId,
        state: editorPersistenceState(),
        save: saveSalesProposal,
      });
      if (result.kind === 'blocked') {
        setError(PREVIEW_SAVE_FAILED_MESSAGE);
        return;
      }
      applyPersistedProposal(result.proposal);
      navigate(result.path);
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

  async function handleRemoveAirAudit() {
    if (!proposalId || !proposal?.airAudit) return;
    if (!window.confirm(`Remove ${proposal.airAudit.sourceFileName} from this proposal?`)) return;
    setRemovingAirAudit(true);
    setUploadError(null);
    setSaveMessage(null);
    try {
      const updated = await removeAirAudit(proposalId);
      setProposal(updated);
      setAirAuditScope(DEFAULT_AIR_AUDIT_SCOPE);
      setComparison(updated.comparison);
      setCommercial(updated.commercial);
      setCurrentMachinePerformance(updated.currentMachinePerformance ?? null);
      setSaveMessage('Air Audit removed.');
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'The Air Audit could not be removed.');
    } finally {
      setRemovingAirAudit(false);
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
    setProposed((rows) => {
      const index = rows.findIndex(
        (row) => effectivePackageInput(row.selectedSpec, row.sourceBacked).value === null,
      );
      if (index < 0) return rows;
      return rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, capturingSheet: true, changingSpec: false, specsOpen: true } : row,
      );
    });
  }

  function setHasAirAudit(next: boolean) {
    setOperatingAssumptions((current) => ({ ...current, hasAirAudit: next }));
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
    <div className="space-y-4 pb-28">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#383838]">{SALES_PROPOSAL_TOOL_LABEL}</h1>
          {(customerEntry === 'manual' ? manualCustomer.companyName.trim() : customer?.name) && (
            <p className="mt-1 text-sm font-medium text-[#383838]">
              {customerEntry === 'manual' ? manualCustomer.companyName.trim() : customer?.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            to={SALES_PROPOSAL_TOOL_PATH}
            className="rounded-[8px] bg-slate-100 px-4 py-2 text-sm font-medium text-[#383838] hover:bg-slate-200"
          >
            Back to proposals
          </Link>
          <button
            type="button"
            onClick={() => void handlePreviewCustomerProposal()}
            disabled={saving}
            className="rounded-[8px] bg-slate-100 px-4 py-2 text-sm font-medium text-[#383838] hover:bg-slate-200 disabled:opacity-50"
          >
            Preview Customer Proposal
          </button>
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
        <div className="space-y-8 overflow-visible rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <EditorSection
            number={1}
            title="Customer"
            instruction="Choose an existing customer, or enter the customer on this proposal only."
          >
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerEntry('existing')}
                className={`rounded-[8px] px-3 py-2 text-sm font-bold ${
                  customerEntry === 'existing'
                    ? 'bg-[#f7c12b] text-[#383838]'
                    : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
                }`}
              >
                Choose existing customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerEntry('manual');
                  setCustomer(null);
                }}
                className={`rounded-[8px] px-3 py-2 text-sm font-bold ${
                  customerEntry === 'manual'
                    ? 'bg-[#f7c12b] text-[#383838]'
                    : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
                }`}
              >
                Enter customer manually
              </button>
            </div>
            {customerEntry === 'existing' ? (
              <>
                <CustomerSelect
                  customerId={customer?._id ?? null}
                  customerName={customer?.name ?? null}
                  onSelect={(selected) => setCustomer(selected)}
                  onClear={() => setCustomer(null)}
                />
                {!customer && (
                  <p className="text-xs font-medium text-amber-800">
                    {CUSTOMER_SELECTION_REQUIRED_MESSAGE}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Company / customer name</span>
                  <input
                    type="text"
                    value={manualCustomer.companyName}
                    onChange={(event) =>
                      setManualCustomer((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Contact name</span>
                  <input
                    type="text"
                    value={manualCustomer.contactName}
                    onChange={(event) =>
                      setManualCustomer((current) => ({
                        ...current,
                        contactName: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Email</span>
                  <input
                    type="email"
                    value={manualCustomer.email}
                    onChange={(event) =>
                      setManualCustomer((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="Optional"
                    className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Phone</span>
                  <input
                    type="tel"
                    value={manualCustomer.phone}
                    onChange={(event) =>
                      setManualCustomer((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="Optional"
                    className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
                  />
                </label>
                {!manualCustomer.companyName.trim() && (
                  <p className="text-xs font-medium text-amber-800">
                    Enter the customer name to complete this proposal. A draft can still be saved.
                  </p>
                )}
                <p className="text-xs text-slate-600">
                  This name is stored on the proposal only. It does not create a customer record.
                </p>
              </div>
            )}
          </EditorSection>
          <EditorSection
            number={2}
            title="Site"
            instruction="Name the site and pin it on the map. Altitude is read from the pin."
          >
            <SiteFields
              customer={customer}
              siteName={site.name ?? ''}
              onSiteNameChange={updateSiteName}
            />
            <SiteMapCapture site={site} onChange={setSite} />
          </EditorSection>
          <EditorSection
            number={3}
            title="Current machines"
            instruction="Add every machine being replaced. Choose from the library, enter details by hand, or upload a spec sheet. You can mix these. Edits stay on this proposal."
          >
            <CurrentEquipmentSection
              proposalId={proposal.id}
              customerId={customer?._id ?? null}
              rows={currentEquipment}
              onChange={setCurrentEquipment}
            />
          </EditorSection>
          <EditorSection
            number={4}
            title="Air requirement"
            instruction="If you have an air audit, upload it. If not, the proposed machines set the assumed air requirement for both sides of the comparison."
          >
            <AirRequirementSection
              hasAirAudit={operatingAssumptions.hasAirAudit}
              onHasAirAuditChange={setHasAirAudit}
              uploading={uploading}
              removing={removingAirAudit}
              error={uploadError}
              sourceFileName={proposal.airAudit?.sourceFileName ?? null}
              onFile={(file) => void handleUpload(file)}
              onRemove={() => void handleRemoveAirAudit()}
              scope={airAuditScope}
              machines={currentEquipment}
              onScopeChange={(next) =>
                setAirAuditScope(
                  normaliseAirAuditScope(
                    next,
                    currentEquipment.filter(currentMachineHasIdentity).map((row) => row.key),
                  ),
                )
              }
              proposedReady={toProposedEquipmentPayload(proposed).length > 0}
              airRequirement={comparison?.airRequirement}
            />
          </EditorSection>
          <EditorSection
            number={5}
            title="Proposed machines"
            instruction="Add the BOUWA machines you are offering. Different models and quantities are allowed. Specifications can always be edited."
          >
            <ProposedReplacementSection
              proposalId={proposal.id}
              rows={proposed}
              intakeAirTemperatureC={site.intakeAirTemperatureC ?? null}
              intakeAirTemperatureKind={site.intakeAirTemperatureKind ?? null}
              onIntakeTemperatureChange={(next) => setSite({ ...site, ...next })}
              onChange={setProposed}
            />
          </EditorSection>
          <EditorSection
            number={6}
            title="Electricity"
            instruction="Enter annual hours and the six R/kWh rates. The same hours, air requirement and tariff apply to current and proposed machines."
          >
            <OperatingAssumptionsSection
              value={operatingAssumptions}
              airAuditPresent={operatingAssumptions.hasAirAudit === true}
              onChange={setOperatingAssumptions}
            />
            <ElectricityBasisSection value={electricityBasis} onChange={setElectricityBasis} />
          </EditorSection>
          <EditorSection
            number={7}
            title="Price"
            instruction="Enter the commercial offer, including buy-back, installation and extras."
          >
            <CommercialOfferSection value={commercialOffer} onChange={setCommercialOffer} />
          </EditorSection>
        </div>
        <div className="space-y-6">
          {operatingAssumptions.hasAirAudit !== false && (
            <MeasuredAuditCard audit={proposal.airAudit} />
          )}
          <MachineSummaryCard
            current={currentEquipment}
            proposed={proposed}
            proposedSitePerformance={proposedSitePerformance}
            proposedSitePerformances={proposedSitePerformances}
          />
          <CurrentMachinePerformanceCard result={currentMachinePerformance} />
          <AirMachineComparisonCard
            comparison={comparison}
            proposedSitePerformance={proposedSitePerformance}
          />
          <ElectricityResultCard
            comparison={comparison}
            onAddCurrentSpecSheet={openCurrentSpecSheet}
            onAddProposedSpecSheet={openProposedSpecSheet}
            hoursAreEstimated={operatingAssumptions.hoursAreEstimated}
          />
          <CommercialResultCard commercial={commercial} />
        </div>
      </div>
    </div>
  );
}
