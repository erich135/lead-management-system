/**
 * bouwaApi.ts
 *
 * Typed API client helpers for the Bouwa Proposal Module.
 *
 * Phase 4C-4: API scaffolding only.
 *
 * !! IMPORTANT — SAFETY RULES !!
 * None of the helpers here:
 *   - set customerQuoteSafe: true
 *   - set isCustomerQuoteSafe: true
 *   - set status: "customer_ready"
 *   - set reportStatus: "CUSTOMER_READY"
 *   - set currentStatus: "VERIFIED_CUSTOMER_SAFE"
 *   - set approvalStatus: "approved_customer"
 *
 * Customer-safe export is intentionally absent — it requires a dedicated
 * approval gate (Phase 4B-5+).
 *
 * Binary upload helpers are intentionally absent.
 *
 * These helpers are not called from BouwaModuleShell yet. They are scaffolded
 * for use in later phases.
 */

import { getAuthToken } from '../../../lib/api';
import type {
  BouwaMachineSpec,
  BouwaTariffTable,
  BouwaAuditSession,
  BouwaProposalDraft,
  BouwaFormulaApproval,
  BouwaAssumption,
  BouwaEvidenceFile,
  BouwaReportTemplate,
  CreateBouwaMachineSpecPayload,
  UpdateBouwaMachineSpecPayload,
  UpdateBouwaMachineSpecInternalReviewPayload,
  CreateBouwaTariffTablePayload,
  UpdateBouwaTariffTablePayload,
  CreateBouwaAuditSessionPayload,
  UpdateBouwaAuditSessionPayload,
  CreateBouwaProposalDraftPayload,
  UpdateBouwaProposalDraftPayload,
  CreateBouwaFormulaApprovalPayload,
  UpdateBouwaFormulaApprovalPayload,
  CreateBouwaAssumptionPayload,
  UpdateBouwaAssumptionPayload,
  CreateBouwaEvidenceFileMetadataPayload,
  UpdateBouwaEvidenceFileMetadataPayload,
  CreateBouwaReportTemplatePayload,
  UpdateBouwaReportTemplatePayload,
} from '../types';

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

const BOUWA_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const BOUWA_BASE_PATH = '/api/bouwa';

interface BouwaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
  message?: string;
}

async function bouwaRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${BOUWA_API_BASE}${BOUWA_BASE_PATH}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  let data: BouwaApiResponse<T>;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : { success: false };
  } catch {
    const errorMessage =
      response.status === 401 ? 'Unauthorized'
      : response.status === 403 ? 'Forbidden'
      : response.status === 404 ? 'Not found'
      : `Bouwa API request failed (${response.status})`;
    data = { success: false, error: { message: errorMessage } };
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message ?? data.message ?? 'Bouwa API error');
  }

  if (data.data !== undefined) {
    return data.data as T;
  }

  const { success, ...rest } = data;
  void success;
  return rest as T;
}

// ---------------------------------------------------------------------------
// List query params helper
// ---------------------------------------------------------------------------

function toQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// ---------------------------------------------------------------------------
// 1. Machine Specs
//    Route prefix: /api/bouwa/machine-specs
// ---------------------------------------------------------------------------

export async function listBouwaMachineSpecs(
  params?: Record<string, string | number | boolean>
): Promise<BouwaMachineSpec[]> {
  return bouwaRequest<BouwaMachineSpec[]>(`/machine-specs${toQueryString(params)}`);
}

export async function getBouwaMachineSpec(id: string): Promise<BouwaMachineSpec> {
  return bouwaRequest<BouwaMachineSpec>(`/machine-specs/${encodeURIComponent(id)}`);
}

export async function createBouwaMachineSpec(
  payload: CreateBouwaMachineSpecPayload
): Promise<BouwaMachineSpec> {
  return bouwaRequest<BouwaMachineSpec>('/machine-specs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaMachineSpec(
  id: string,
  payload: UpdateBouwaMachineSpecPayload
): Promise<BouwaMachineSpec> {
  return bouwaRequest<BouwaMachineSpec>(`/machine-specs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /machine-specs/:id/internal-review
 * Updates only internal review fields.  Approval/provenance fields are locked on the backend.
 * SAFETY: payload type deliberately excludes approvalStatus and any customer-safe fields.
 */
export async function updateBouwaMachineSpecInternalReview(
  id: string,
  payload: UpdateBouwaMachineSpecInternalReviewPayload
): Promise<BouwaMachineSpec> {
  return bouwaRequest<BouwaMachineSpec>(`/machine-specs/${encodeURIComponent(id)}/internal-review`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 2. Tariff Tables
//    Route prefix: /api/bouwa/tariff-tables
// ---------------------------------------------------------------------------

export async function listBouwaTariffTables(
  params?: Record<string, string | number | boolean>
): Promise<BouwaTariffTable[]> {
  return bouwaRequest<BouwaTariffTable[]>(`/tariff-tables${toQueryString(params)}`);
}

export async function getBouwaTariffTable(id: string): Promise<BouwaTariffTable> {
  return bouwaRequest<BouwaTariffTable>(`/tariff-tables/${encodeURIComponent(id)}`);
}

export async function createBouwaTariffTable(
  payload: CreateBouwaTariffTablePayload
): Promise<BouwaTariffTable> {
  return bouwaRequest<BouwaTariffTable>('/tariff-tables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaTariffTable(
  id: string,
  payload: UpdateBouwaTariffTablePayload
): Promise<BouwaTariffTable> {
  return bouwaRequest<BouwaTariffTable>(`/tariff-tables/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 3. Audit Sessions
//    Route prefix: /api/bouwa/audit-sessions
// ---------------------------------------------------------------------------

export async function listBouwaAuditSessions(
  params?: Record<string, string | number | boolean>
): Promise<BouwaAuditSession[]> {
  return bouwaRequest<BouwaAuditSession[]>(`/audit-sessions${toQueryString(params)}`);
}

export async function getBouwaAuditSession(id: string): Promise<BouwaAuditSession> {
  return bouwaRequest<BouwaAuditSession>(`/audit-sessions/${encodeURIComponent(id)}`);
}

export async function createBouwaAuditSession(
  payload: CreateBouwaAuditSessionPayload
): Promise<BouwaAuditSession> {
  return bouwaRequest<BouwaAuditSession>('/audit-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaAuditSession(
  id: string,
  payload: UpdateBouwaAuditSessionPayload
): Promise<BouwaAuditSession> {
  return bouwaRequest<BouwaAuditSession>(`/audit-sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 4. Proposal Drafts
//    Route prefix: /api/bouwa/proposals
// ---------------------------------------------------------------------------

export async function listBouwaProposalDrafts(
  params?: Record<string, string | number | boolean>
): Promise<BouwaProposalDraft[]> {
  return bouwaRequest<BouwaProposalDraft[]>(`/proposals${toQueryString(params)}`);
}

export async function getBouwaProposalDraft(id: string): Promise<BouwaProposalDraft> {
  return bouwaRequest<BouwaProposalDraft>(`/proposals/${encodeURIComponent(id)}`);
}

export async function createBouwaProposalDraft(
  payload: CreateBouwaProposalDraftPayload
): Promise<BouwaProposalDraft> {
  return bouwaRequest<BouwaProposalDraft>('/proposals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaProposalDraft(
  id: string,
  payload: UpdateBouwaProposalDraftPayload
): Promise<BouwaProposalDraft> {
  return bouwaRequest<BouwaProposalDraft>(`/proposals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function archiveBouwaProposalDraft(id: string): Promise<BouwaProposalDraft> {
  return bouwaRequest<BouwaProposalDraft>(
    `/proposals/${encodeURIComponent(id)}/archive`,
    { method: 'PATCH' }
  );
}

// ---------------------------------------------------------------------------
// 5. Formula Approvals
//    Route prefix: /api/bouwa/formula-approvals
// ---------------------------------------------------------------------------

export async function listBouwaFormulaApprovals(
  params?: Record<string, string | number | boolean>
): Promise<BouwaFormulaApproval[]> {
  return bouwaRequest<BouwaFormulaApproval[]>(`/formula-approvals${toQueryString(params)}`);
}

export async function getBouwaFormulaApproval(id: string): Promise<BouwaFormulaApproval> {
  return bouwaRequest<BouwaFormulaApproval>(`/formula-approvals/${encodeURIComponent(id)}`);
}

export async function createBouwaFormulaApproval(
  payload: CreateBouwaFormulaApprovalPayload
): Promise<BouwaFormulaApproval> {
  return bouwaRequest<BouwaFormulaApproval>('/formula-approvals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaFormulaApproval(
  id: string,
  payload: UpdateBouwaFormulaApprovalPayload
): Promise<BouwaFormulaApproval> {
  return bouwaRequest<BouwaFormulaApproval>(`/formula-approvals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 6. Assumptions
//    Route prefix: /api/bouwa/assumptions
// ---------------------------------------------------------------------------

export async function listBouwaAssumptions(
  params?: Record<string, string | number | boolean>
): Promise<BouwaAssumption[]> {
  return bouwaRequest<BouwaAssumption[]>(`/assumptions${toQueryString(params)}`);
}

export async function getBouwaAssumption(id: string): Promise<BouwaAssumption> {
  return bouwaRequest<BouwaAssumption>(`/assumptions/${encodeURIComponent(id)}`);
}

export async function createBouwaAssumption(
  payload: CreateBouwaAssumptionPayload
): Promise<BouwaAssumption> {
  return bouwaRequest<BouwaAssumption>('/assumptions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaAssumption(
  id: string,
  payload: UpdateBouwaAssumptionPayload
): Promise<BouwaAssumption> {
  return bouwaRequest<BouwaAssumption>(`/assumptions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 7. Evidence File Metadata
//    Route prefix: /api/bouwa/evidence-files
//
//    NOTE: Binary upload is intentionally NOT implemented here.
//    Only metadata record creation/update is provided.
// ---------------------------------------------------------------------------

export async function listBouwaEvidenceFiles(
  params?: Record<string, string | number | boolean>
): Promise<BouwaEvidenceFile[]> {
  return bouwaRequest<BouwaEvidenceFile[]>(`/evidence-files${toQueryString(params)}`);
}

export async function getBouwaEvidenceFile(id: string): Promise<BouwaEvidenceFile> {
  return bouwaRequest<BouwaEvidenceFile>(`/evidence-files/${encodeURIComponent(id)}`);
}

export async function createBouwaEvidenceFileMetadata(
  payload: CreateBouwaEvidenceFileMetadataPayload
): Promise<BouwaEvidenceFile> {
  return bouwaRequest<BouwaEvidenceFile>('/evidence-files', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaEvidenceFileMetadata(
  id: string,
  payload: UpdateBouwaEvidenceFileMetadataPayload
): Promise<BouwaEvidenceFile> {
  return bouwaRequest<BouwaEvidenceFile>(`/evidence-files/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 8. Report Templates
//    Route prefix: /api/bouwa/report-templates
// ---------------------------------------------------------------------------

export async function listBouwaReportTemplates(
  params?: Record<string, string | number | boolean>
): Promise<BouwaReportTemplate[]> {
  return bouwaRequest<BouwaReportTemplate[]>(`/report-templates${toQueryString(params)}`);
}

export async function getBouwaReportTemplate(id: string): Promise<BouwaReportTemplate> {
  return bouwaRequest<BouwaReportTemplate>(`/report-templates/${encodeURIComponent(id)}`);
}

export async function createBouwaReportTemplate(
  payload: CreateBouwaReportTemplatePayload
): Promise<BouwaReportTemplate> {
  return bouwaRequest<BouwaReportTemplate>('/report-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBouwaReportTemplate(
  id: string,
  payload: UpdateBouwaReportTemplatePayload
): Promise<BouwaReportTemplate> {
  return bouwaRequest<BouwaReportTemplate>(`/report-templates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
