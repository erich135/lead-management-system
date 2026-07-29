import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Download,
  FileJson,
  Save,
  Settings2,
  Upload,
  XCircle,
} from 'lucide-react';
import type { BouwaLocalAnalysis } from '../loggerLocalTypes';
import type {
  ProposalEvaluation,
  ProposalField,
  ProposalFieldUpdate,
  EvidenceRecordLink,
  LocalSession,
  ProposalMode,
  ProposalPackage,
  ProposalRole,
  SettingsPackageStatus,
  ValueVerificationType,
  WorkflowAction,
} from '../proposalLocalTypes';
import {
  ProposalFieldEditor,
  ProposalTextInput,
} from './proposal/ProposalFieldEditor';
import { displayProposalValue } from './proposal/proposalDisplay';
import { ProposalModeSelector } from './proposal/ProposalModeSelector';
import { OutstandingItemsWorkflow } from './proposal/OutstandingItemsWorkflow';
import { ProposalOutputsPanel } from './proposal/ProposalOutputsPanel';
import {
  mayApplyEvaluation,
  nextEvaluationRequest,
  nextFocusRequest,
  overlayDerivedEvaluation,
  proposalWorkingFingerprint,
  type EvaluationRequestIdentity,
  type FocusRequest,
} from '../proposalEditorState';

type WorkspaceTab = 'readiness' | 'inputs' | 'settings' | 'outputs' | 'workflow';

const UI_ROLE_MATRIX: Record<
  SettingsPackageStatus,
  Partial<Record<WorkflowAction, ProposalRole[]>>
> = {
  draft: {
    save_draft: ['data_entry_user', 'commercial_preparer'],
    submit_for_technical_review: ['commercial_preparer'],
    create_settings_version: ['data_entry_user', 'commercial_preparer'],
    acknowledge_provisional_input: ['data_entry_user', 'commercial_preparer', 'technical_reviewer'],
    supersede: ['technical_approver', 'commercial_approver'],
  },
  submitted_for_technical_review: {
    return_for_correction: ['technical_reviewer'],
    reject: ['technical_reviewer', 'technical_approver'],
    approve_technically: ['technical_approver'],
    acknowledge_provisional_input: ['technical_reviewer', 'technical_approver'],
    supersede: ['technical_approver', 'commercial_approver'],
  },
  technically_approved: {
    approve_commercially: ['commercial_approver'],
    create_settings_version: ['commercial_preparer'],
    supersede: ['technical_approver', 'commercial_approver'],
  },
  commercially_approved: {
    create_settings_version: ['commercial_preparer'],
    supersede: ['commercial_approver'],
  },
  rejected: {
    return_for_correction: ['technical_reviewer', 'technical_approver'],
    create_settings_version: ['data_entry_user', 'commercial_preparer'],
    supersede: ['technical_approver', 'commercial_approver'],
  },
  superseded: {},
};

function downloadText(name: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function api<T>(
  url: string,
  session: LocalSession,
  onSessionExpired: () => void,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${session.token}`,
    },
  });
  const payload = await response.json() as T | { error?: string };
  if (response.status === 401) onSessionExpired();
  if (!response.ok) {
    throw new Error('error' in (payload as { error?: string })
      ? (payload as { error?: string }).error
      : 'The local proposal service rejected the request.');
  }
  return payload as T;
}

function fieldUpdate(field: ProposalField): ProposalFieldUpdate {
  return {
    id: field.id,
    name: field.name,
    description: field.description,
    questionnaireReference: field.questionnaireReference,
    value: field.value,
    unit: field.unit,
    source: field.source,
    notes: field.notes,
  };
}

function allowedWorkflowActions(
  status: SettingsPackageStatus,
  role: ProposalRole,
): WorkflowAction[] {
  return Object.entries(UI_ROLE_MATRIX[status])
    .filter(([, roles]) => roles?.includes(role))
    .map(([action]) => action as WorkflowAction)
    .filter(action => !['create_settings_version', 'acknowledge_provisional_input'].includes(action));
}

export function ProposalReadinessWorkspace({
  mode,
  onModeChange,
  loggerAnalysis,
  session,
  onSessionExpired,
  onProposalContextChange,
}: {
  mode: ProposalMode;
  onModeChange: (mode: ProposalMode) => void;
  loggerAnalysis: BouwaLocalAnalysis | null;
  session: LocalSession;
  onSessionExpired: () => void;
  onProposalContextChange: (value: {
    proposalRecordId: string;
    proposalId: string;
    settingsVersion: number;
  } | null) => void;
}) {
  const [proposal, setProposal] = useState<ProposalPackage | null>(null);
  const [savedProposal, setSavedProposal] = useState<ProposalPackage | null>(null);
  const [evaluation, setEvaluation] = useState<ProposalEvaluation | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>('readiness');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [outstandingIndex, setOutstandingIndex] = useState(0);
  const [reason, setReason] = useState('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [evaluationInProgress, setEvaluationInProgress] = useState(false);
  const [pendingEvidence, setPendingEvidence] = useState<EvidenceRecordLink[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const skipNextTemplateRef = useRef(false);
  const proposalRef = useRef<ProposalPackage | null>(null);
  const evaluationSequenceRef = useRef(0);
  const evaluationAbortRef = useRef<AbortController | null>(null);
  const activeEvaluationRef = useRef<EvaluationRequestIdentity | null>(null);
  const focusTokenRef = useRef(0);

  const localDirty = useMemo(
    () =>
      !!proposal &&
      !!savedProposal &&
      proposalWorkingFingerprint(proposal) !==
        proposalWorkingFingerprint(savedProposal),
    [proposal, savedProposal],
  );
  const workingDirty = evaluation?.dirty ?? localDirty;
  proposalRef.current = proposal;
  const visibleProposal = useMemo(
    () => proposal ? overlayDerivedEvaluation(proposal, evaluation) : null,
    [evaluation, proposal],
  );
  const actor = session.identity.displayName;
  const role = session.identity.role;
  const pendingAnalysis =
    !!loggerAnalysis &&
    proposal?.analysisLink?.analysisId !== loggerAnalysis.attestation.analysisId;

  useEffect(() => {
    if (skipNextTemplateRef.current) {
      skipNextTemplateRef.current = false;
      return;
    }
    let current = true;
    setBusy(true);
    api<ProposalPackage>(
      `/api/bouwa-local/proposal/template?mode=${mode}`,
      session,
      onSessionExpired,
    )
      .then(value => {
        if (!current) return;
        setProposal(value);
        setSavedProposal(value);
        setEvaluation(null);
        setError('');
        setNotice('');
      })
      .catch(reasonValue => current && setError(reasonValue instanceof Error ? reasonValue.message : 'Could not create proposal.'))
      .finally(() => current && setBusy(false));
    return () => { current = false; };
    // A mode change intentionally creates a fresh local package.
     
  }, [mode, onSessionExpired, session]);

  useEffect(() => {
    onProposalContextChange(
      proposal
        ? {
            proposalRecordId: proposal.proposalRecordId,
            proposalId: proposal.proposalId,
            settingsVersion: proposal.settingsVersion,
          }
        : null,
    );
  }, [onProposalContextChange, proposal]);

  useEffect(() => {
    if (!proposal) return;
    evaluationAbortRef.current?.abort();
    const controller = new AbortController();
    evaluationAbortRef.current = controller;
    const requestIdentity = nextEvaluationRequest(
      evaluationSequenceRef.current,
      proposal,
    );
    evaluationSequenceRef.current = requestIdentity.sequence;
    activeEvaluationRef.current = requestIdentity;
    setEvaluation(null);
    setEvaluationInProgress(true);
    const timer = window.setTimeout(() => {
      api<ProposalEvaluation>('/api/bouwa-local/proposal/evaluate', session, onSessionExpired, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
        signal: controller.signal,
      })
        .then(value => {
          const currentProposal = proposalRef.current;
          const active = activeEvaluationRef.current;
          if (
            !currentProposal ||
            !active ||
            value.package.proposalRecordId !== requestIdentity.proposalRecordId ||
            !mayApplyEvaluation(active, requestIdentity, currentProposal)
          )
            return;
          setEvaluation(value);
          setError('');
        })
        .catch(reasonValue => {
          if (controller.signal.aborted) return;
          setError(reasonValue instanceof Error ? reasonValue.message : 'Evaluation failed.');
        })
        .finally(() => {
          if (activeEvaluationRef.current?.sequence === requestIdentity.sequence)
            setEvaluationInProgress(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [onSessionExpired, proposal, session]);

  function updateField(collection: 'inputs' | 'engineeringSettings', next: ProposalField) {
    setProposal(previous => previous ? {
      ...previous,
      [collection]: previous[collection].map(field => field.id === next.id ? next : field),
    } : previous);
  }

  function selectMode(next: ProposalMode) {
    if (next === mode) return;
    if (localDirty && !window.confirm('Discard the unversioned draft and start a new proposal mode?')) return;
    evaluationSequenceRef.current += 1;
    evaluationAbortRef.current?.abort();
    activeEvaluationRef.current = null;
    setEvaluationInProgress(false);
    setEvaluation(null);
    onModeChange(next);
    setTab('readiness');
  }

  function fixField(fieldId: string) {
    if (proposal?.inputs.some(field => field.id === fieldId)) setTab('inputs');
    else setTab('settings');
    const request = nextFocusRequest(focusTokenRef.current, fieldId);
    focusTokenRef.current = request.token;
    setFocusRequest(request);
  }

  function resolveNext() {
    if (!evaluation?.readiness.length) return;
    const index = outstandingIndex % evaluation.readiness.length;
    setOutstandingIndex(index + 1);
    fixField(evaluation.readiness[index].actions[0]?.fieldId);
  }

  async function saveVersion() {
    if (!proposal || !savedProposal) return;
    if (!workingDirty && !pendingAnalysis && pendingEvidence.length === 0) {
      setNotice('There is no unversioned draft to save.');
      return;
    }
    if (!reason.trim()) {
      setError('Enter a version reason in Workflow & versioning.');
      setTab('workflow');
      return;
    }
    setBusy(true);
    try {
      const next = await api<ProposalPackage>(
        '/api/bouwa-local/proposal/settings-version',
        session,
        onSessionExpired,
        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: savedProposal,
          changes: {
            proposalName: proposal.proposalName,
            siteName: proposal.siteName,
            customerName: proposal.customerName,
            fieldUpdates: [...proposal.inputs, ...proposal.engineeringSettings].map(fieldUpdate),
          },
          reason,
          analysisAttestationId: loggerAnalysis?.attestation.analysisId,
          evidenceRecordIds: [
            ...proposal.evidenceLinks.map(link => link.evidenceId),
            ...pendingEvidence.map(link => link.evidenceId),
          ],
        }),
      });
      setProposal(next);
      setSavedProposal(next);
      setPendingEvidence([]);
      setNotice(`Created immutable settings version ${next.settingsVersion}.`);
      setReason('');
      setError('');
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Version creation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function transition(action: WorkflowAction) {
    if (!proposal || !savedProposal) return;
    if (workingDirty || pendingAnalysis || pendingEvidence.length) {
      setError('Create a settings version before changing workflow status.');
      return;
    }
    setBusy(true);
    try {
      const next = await api<ProposalPackage>(
        '/api/bouwa-local/proposal/transition',
        session,
        onSessionExpired,
        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal,
          action,
          reason,
        }),
      });
      setProposal(next);
      setSavedProposal(next);
      setPendingEvidence([]);
      setNotice(`${displayProposalValue(action)} completed by ${actor}.`);
      setReason('');
      setError('');
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Workflow action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge(fieldId: string) {
    if (!proposal || !savedProposal) return;
    if (workingDirty || pendingAnalysis || pendingEvidence.length) {
      setError('Create the current settings version before acknowledging a provisional item.');
      return;
    }
    if (!reason.trim()) {
      setError('Enter an item-specific acknowledgement reason in Workflow & versioning.');
      setTab('workflow');
      return;
    }
    setBusy(true);
    try {
      const next = await api<ProposalPackage>(
        '/api/bouwa-local/proposal/acknowledge',
        session,
        onSessionExpired,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal: savedProposal, fieldId, reason }),
        },
      );
      setProposal(next);
      setSavedProposal(next);
      setReason('');
      setError('');
      setNotice(
        `Acknowledged ${fieldId} with a server-owned workflow record bound to settings version ${next.settingsVersion}.`,
      );
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Acknowledgement failed.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadEvidence(fieldId: string, file: File) {
    if (!proposal) return;
    const field = [...proposal.inputs, ...proposal.engineeringSettings].find(item => item.id === fieldId);
    const category = field?.source.type === 'bouwa_technician_measurement' || field?.source.type === 'site_measurement'
      ? 'technician_measurement'
      : ['customer_document', 'manufacturer_document', 'calibration_certificate'].includes(field?.source.type ?? '')
        ? field!.source.type
        : 'other_supporting_document';
    setBusy(true);
    try {
      const link = await api<EvidenceRecordLink>(
        '/api/bouwa-local/evidence',
        session,
        onSessionExpired,
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Bouwa-Filename': encodeURIComponent(file.name),
            'X-Bouwa-Proposal-Record-Id': proposal.proposalRecordId,
            'X-Bouwa-Proposal-Id': proposal.proposalId,
            'X-Bouwa-Field-Ids': fieldId,
            'X-Bouwa-Evidence-Category': category,
            'X-Bouwa-Evidence-Notes': '',
          },
          body: file,
        },
      );
      setPendingEvidence(previous => [...previous.filter(item => item.evidenceId !== link.evidenceId), link]);
      setNotice(`Evidence ${link.filename} is held in memory. Create a settings version to bind its metadata and hash.`);
      setError('');
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Evidence upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function verificationTypeFor(field: ProposalField): ValueVerificationType | null {
    if (
      field.source.type === 'bouwa_technician_measurement' ||
      field.source.type === 'site_measurement'
    )
      return 'technician_measurement_reviewed';
    if (
      field.source.type === 'manufacturer_document' ||
      field.source.type === 'calibration_certificate'
    )
      return 'manufacturer_documentation_confirms_value';
    if (field.source.type === 'customer_verbal')
      return 'customer_statement_recorded_unverified';
    if (field.source.type === 'engineering_judgement')
      return 'engineering_estimate_approved_for_provisional_use';
    return null;
  }

  function canVerifyField(field: ProposalField): boolean {
    const type = verificationTypeFor(field);
    if (
      !type ||
      workingDirty ||
      pendingAnalysis ||
      pendingEvidence.length > 0
    )
      return false;
    if (type === 'engineering_estimate_approved_for_provisional_use')
      return role === 'technical_approver';
    if (
      type === 'technician_measurement_reviewed' ||
      type === 'manufacturer_documentation_confirms_value'
    )
      return role === 'technical_reviewer' || role === 'technical_approver';
    return true;
  }

  async function verifyValue(fieldId: string) {
    if (!proposal || !savedProposal) return;
    const field = [...visibleProposal!.inputs, ...visibleProposal!.engineeringSettings]
      .find(item => item.id === fieldId);
    const verificationType = field ? verificationTypeFor(field) : null;
    if (!field || !verificationType) {
      setError('Select a technician measurement, manufacturer document, customer statement, or engineering estimate source before verification.');
      return;
    }
    const evidenceRecordIds = proposal.evidenceLinks
      .filter(link => link.fieldIds.includes(fieldId))
      .map(link => link.evidenceId);
    setBusy(true);
    try {
      const next = await api<ProposalPackage>(
        '/api/bouwa-local/proposal/value-verification',
        session,
        onSessionExpired,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal: savedProposal,
            fieldId,
            evidenceRecordIds,
            verificationType,
            notes: reason,
          }),
        },
      );
      setProposal(next);
      setSavedProposal(next);
      setError('');
      setNotice(`Recorded server-owned exact-value verification for ${field.name}.`);
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Value verification failed.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadVersionedReport() {
    if (!proposal || !evaluation?.reportText) return;
    try {
      const result = proposal.mode === 'logger_analysis'
        ? await api<{ reportText: string }>(
            '/api/bouwa-local/proposal/combined-report',
            session,
            onSessionExpired,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proposal }),
            },
          )
        : { reportText: evaluation.reportText };
      downloadText(
        `${proposal.proposalId}-bouwa-proposal-readiness-v${proposal.settingsVersion}.txt`,
        result.reportText,
      );
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Versioned report generation failed.');
    }
  }

  async function importJson(file: File) {
    if (localDirty && !window.confirm('Discard the unversioned draft and import this package?')) return;
    evaluationSequenceRef.current += 1;
    evaluationAbortRef.current?.abort();
    activeEvaluationRef.current = null;
    setEvaluationInProgress(false);
    setEvaluation(null);
    setBusy(true);
    try {
      const next = await api<ProposalPackage>(
        '/api/bouwa-local/proposal/import',
        session,
        onSessionExpired,
        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: await file.text() }),
      });
      setProposal(next);
      setSavedProposal(next);
      if (next.mode !== mode) skipNextTemplateRef.current = true;
      onModeChange(next.mode);
      setNotice(`Imported ${next.proposalId} as Draft; transported approval history is unverified.`);
      setError('');
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (importRef.current) importRef.current.value = '';
    }
  }

  if (!proposal || !visibleProposal) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">{error || 'Preparing local proposal workspace...'}</p>
      </section>
    );
  }

  const tabs: Array<[WorkspaceTab, string, number | null]> = [
    ['readiness', 'Readiness', evaluation?.readiness.length ?? null],
    ['inputs', 'Proposal inputs', proposal.inputs.length],
    ['settings', 'Engineering settings', proposal.engineeringSettings.length],
    ['outputs', 'Outputs', evaluation?.outputs.length ?? null],
    ['workflow', 'Workflow & versioning', proposal.auditTrail.length],
  ];
  const workflowActions = allowedWorkflowActions(proposal.status, role);
  const loggerReportLinked =
    proposal.mode !== 'logger_analysis' ||
    (!!proposal.analysisLink &&
      evaluation?.outputs.find(output => output.id === 'logger_data_quality')?.status !== 'unavailable');

  return (
    <section className="space-y-5">
      <ProposalModeSelector
        mode={mode}
        proposal={visibleProposal}
        evaluation={evaluation}
        onSelect={selectMode}
      />
      {evaluationInProgress && (
        <p role="status" className="text-xs font-medium text-slate-500">
          Recalculating derived readiness for the current proposal values…
        </p>
      )}

      <div
        role={error ? 'alert' : 'status'}
        aria-live={error ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {(error || notice) && (
          <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            {error ? <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />}
            <p>{error || notice}</p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div role="tablist" aria-label="Proposal workspace sections" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2">
          {tabs.map(([id, label, count]) => (
            <button
              key={id}
              id={`proposal-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`proposal-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const tabButtons = Array.from(
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
                );
                const currentIndex = tabButtons.indexOf(event.currentTarget);
                const nextIndex = event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabButtons.length - 1
                    : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
                tabButtons[nextIndex]?.focus();
                tabButtons[nextIndex]?.click();
              }}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === id ? 'bg-white text-ars-primary shadow-sm' : 'text-slate-600 hover:bg-white/70'
              }`}
            >
              {label}{count !== null ? ` (${count})` : ''}
            </button>
          ))}
        </div>

        <div
          id={`proposal-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`proposal-tab-${tab}`}
          className="p-5"
        >
          {tab === 'readiness' && (
            <OutstandingItemsWorkflow
              evaluation={evaluation}
              onResolveNext={resolveNext}
              onFix={fixField}
            />
          )}

          {tab === 'inputs' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Proposal identity and inputs</h3>
              <p className="mt-1 text-sm text-slate-500">Users declare values and sources; the backend derives trust conclusions.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ProposalTextInput label="Proposal name" value={proposal.proposalName} onChange={proposalName => setProposal({ ...proposal, proposalName })} />
                <ProposalTextInput label="Proposal number" value={proposal.proposalId} readOnly />
                <ProposalTextInput label="Proposal record ID · server owned" value={proposal.proposalRecordId} readOnly />
                <ProposalTextInput label="Authoritative record revision" value={String(proposal.recordRevision)} readOnly />
                <ProposalTextInput label="Customer" value={proposal.customerName} onChange={customerName => setProposal({ ...proposal, customerName })} />
                <ProposalTextInput label="Site" value={proposal.siteName} onChange={siteName => setProposal({ ...proposal, siteName })} />
              </div>
              <div className="mt-5 grid gap-3">
                {visibleProposal.inputs.map(field => (
                  <ProposalFieldEditor
                    key={field.id}
                    field={field}
                    canAcknowledge={(
                      UI_ROLE_MATRIX[proposal.status]
                        .acknowledge_provisional_input ?? []
                    ).includes(role)}
                    focusRequestToken={focusRequest?.fieldId === field.id ? focusRequest.token : undefined}
                    onFocusRequestHandled={token => {
                      setFocusRequest(current => current?.token === token ? null : current);
                    }}
                    onAcknowledge={fieldId => void acknowledge(fieldId)}
                    onEvidenceUpload={(fieldId, file) => void uploadEvidence(fieldId, file)}
                    onVerifyValue={fieldId => void verifyValue(fieldId)}
                    canVerifyValue={!busy && canVerifyField(field)}
                    onChange={next => updateField('inputs', next)}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div>
              <div className="flex items-start gap-3">
                <Settings2 className="mt-1 h-5 w-5 text-ars-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Editable engineering settings</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Values, descriptions, and source details are editable. Dependencies, calculation effects, validation, confidence, and approval are system owned.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {visibleProposal.engineeringSettings.map(field => (
                  <ProposalFieldEditor
                    key={field.id}
                    field={field}
                    canAcknowledge={(
                      UI_ROLE_MATRIX[proposal.status]
                        .acknowledge_provisional_input ?? []
                    ).includes(role)}
                    focusRequestToken={focusRequest?.fieldId === field.id ? focusRequest.token : undefined}
                    onFocusRequestHandled={token => {
                      setFocusRequest(current => current?.token === token ? null : current);
                    }}
                    onAcknowledge={fieldId => void acknowledge(fieldId)}
                    onEvidenceUpload={(fieldId, file) => void uploadEvidence(fieldId, file)}
                    onVerifyValue={fieldId => void verifyValue(fieldId)}
                    canVerifyValue={!busy && canVerifyField(field)}
                    onChange={next => updateField('engineeringSettings', next)}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'outputs' && evaluation && (
            <ProposalOutputsPanel evaluation={evaluation} />
          )}

          {tab === 'workflow' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Authenticated versioning and approval</h3>
              <p className="mt-1 text-sm text-slate-500">
                The server resolved this session as <strong>{actor}</strong> with role <strong>{displayProposalValue(role)}</strong>. Browser input cannot change that authority.
              </p>
              <div className="mt-4 grid gap-3">
                <ProposalTextInput label="Reason / review note" value={reason} onChange={setReason} placeholder="Required for versions, review decisions, and superseding" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveVersion}
                  disabled={busy || (!workingDirty && !pendingAnalysis && pendingEvidence.length === 0) || !(UI_ROLE_MATRIX[proposal.status].create_settings_version ?? []).includes(role)}
                  className="inline-flex items-center gap-2 rounded-lg bg-ars-primary px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  <Save className="h-4 w-4" /> Create settings version
                </button>
                {workflowActions.map(action => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => transition(action)}
                    disabled={busy || workingDirty || pendingAnalysis || pendingEvidence.length > 0}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-300"
                  >
                    {displayProposalValue(action)}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  disabled={!evaluation?.reportText || !loggerReportLinked}
                  title={
                    workingDirty
                      ? 'Create a settings version before downloading a versioned report.'
                      : !loggerReportLinked
                        ? 'Select or rerun the exact logger file, then create a settings version that binds its attestation.'
                        : ''
                  }
                  onClick={() => void downloadVersionedReport()}
                  className="inline-flex items-center gap-2 rounded-lg border border-ars-primary px-4 py-2 text-sm font-semibold text-ars-primary disabled:border-slate-200 disabled:text-slate-300"
                >
                  <Download className="h-4 w-4" /> Download versioned report
                </button>
                <button
                  type="button"
                  disabled={!evaluation?.draftReportText}
                  onClick={() => evaluation?.draftReportText && downloadText(
                    `${proposal.proposalId}-UNVERSIONED-DRAFT.txt`,
                    evaluation.draftReportText,
                  )}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 disabled:border-slate-200 disabled:text-slate-300"
                >
                  <Download className="h-4 w-4" /> Download Draft report
                </button>
                <button
                  type="button"
                  disabled={!evaluation?.exportJson}
                  title={workingDirty ? 'Versioned package export is disabled for an unversioned draft.' : ''}
                  onClick={() => evaluation?.exportJson && downloadText(
                    `${proposal.proposalId}-bouwa-proposal-package-v${proposal.settingsVersion}.json`,
                    evaluation.exportJson,
                    'application/json;charset=utf-8',
                  )}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-300"
                >
                  <FileJson className="h-4 w-4" /> Export versioned JSON
                </button>
                <button type="button" onClick={() => importRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  <Upload className="h-4 w-4" /> Import JSON package
                </button>
                <input ref={importRef} type="file" accept=".json,application/json" className="sr-only" onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void importJson(file);
                }} />
              </div>

              {workingDirty && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <strong>{evaluation.versionLabel}.</strong> Versioned reports and package export are disabled. Draft hash: {evaluation.workingContentHash}.
                </div>
              )}
              {(pendingAnalysis || pendingEvidence.length > 0) && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <strong>Unversioned trusted-record linkage.</strong>{' '}
                  {pendingAnalysis && `Parser attestation ${loggerAnalysis?.attestation.analysisId} is pending. `}
                  {pendingEvidence.length > 0 && `${pendingEvidence.length} evidence record(s) are pending. `}
                  Create a settings version before workflow actions or versioned reports.
                </div>
              )}
              {proposal.importedHistory && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                  <strong>Imported history is unverified.</strong> {proposal.importedHistory.statement}
                </div>
              )}

              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                    <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Person / role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reason</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposal.auditTrail.map(event => (
                      <tr key={event.sequence}>
                        <td className="px-3 py-2">{event.sequence}</td>
                        <td className="px-3 py-2 font-semibold">{displayProposalValue(event.action)}</td>
                        <td className="px-3 py-2">{event.actor} · {displayProposalValue(event.role)}</td>
                        <td className="px-3 py-2">{displayProposalValue(event.toStatus)} · v{event.version}</td>
                        <td className="px-3 py-2">{event.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
