/**
 * The client for the durable proposal drafts.
 *
 * Every call goes to the authenticated ARS module. There is deliberately no
 * local-storage fallback and no in-memory mode: a draft that survives only as
 * long as the tab is open is the thing this workflow replaced.
 *
 * A refused save is not an error to swallow. `WizardRequestError` carries the
 * status and, for a conflict, the draft as it now stands, so the screen can
 * offer the user a real choice instead of a failure message.
 */

import { getAuthToken } from '../../../lib/api';
import type {
  WizardConflict,
  WizardDraftSummary,
  WizardDraftView,
  WizardEquipment,
  WizardEquipmentType,
  WizardEquipmentTypeOption,
  WizardInstalledMachine,
  WizardMachineComparisonResult,
  WizardMachineRole,
  WizardMachineSelectionResult,
  WizardPriceSuggestion,
  WizardProposalDocumentView,
  WizardProposalType,
  WizardManualBasis,
  WizardSpecEquipmentType,
  WizardSpecMatch,
  WizardSpecRecord,
  WizardStep,
  WizardStepId,
  WizardTariffComparisonResult,
  WizardTariffFacetField,
  WizardTariffFacetValue,
  WizardTariffRecord,
  WizardTariffRoute,
  WizardTariffSelectionResult,
} from './wizardTypes';
import type { AuditIntakeDocument, AuditIntakeFormModel } from '../auditIntakeTypes';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const WIZARD_BASE_PATH = '/api/bouwa/wizard';

export function wizardUrl(path: string): string {
  return `${API_BASE}${WIZARD_BASE_PATH}${path}`;
}

export class WizardRequestError extends Error {
  readonly status: number;
  readonly conflict: WizardConflict | null;

  constructor(message: string, status: number, conflict: WizardConflict | null) {
    super(message);
    this.name = 'WizardRequestError';
    this.status = status;
    this.conflict = conflict;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (text === '') return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: 'The server response could not be read.' };
  }
}

async function requireOk(response: Response): Promise<Record<string, unknown>> {
  const body = await readBody(response);
  if (response.ok) return body;
  const message =
    typeof body.error === 'string' ? body.error : 'The request was refused.';
  const conflict =
    response.status === 409
      ? {
          message,
          expectedRevision: Number(body.expectedRevision ?? -1),
          actualRevision: Number(body.actualRevision ?? -1),
          current: (body.current as WizardDraftView | null) ?? null,
        }
      : null;
  throw new WizardRequestError(message, response.status, conflict);
}

async function requestJson(
  path: string,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(wizardUrl(path), {
    ...options,
    headers: authHeaders({
      ...(options.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...((options.headers as Record<string, string>) ?? {}),
    }),
  });
  return requireOk(response);
}

export async function fetchWizardSteps(): Promise<{
  steps: WizardStep[];
  sequences: Record<WizardProposalType, WizardStepId[]>;
}> {
  const body = await requestJson('/steps');
  return body as unknown as {
    steps: WizardStep[];
    sequences: Record<WizardProposalType, WizardStepId[]>;
  };
}

export async function fetchWizardFormModel(): Promise<AuditIntakeFormModel> {
  return (await requestJson('/form')) as unknown as AuditIntakeFormModel;
}

export async function listWizardDrafts(params?: {
  status?: 'draft' | 'archived';
  onlyMine?: boolean;
}): Promise<WizardDraftSummary[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.onlyMine) query.set('owner', 'me');
  const suffix = query.toString() === '' ? '' : `?${query.toString()}`;
  const body = await requestJson(`/drafts${suffix}`);
  return (body.drafts as WizardDraftSummary[]) ?? [];
}

export async function createWizardDraft(
  proposalType: WizardProposalType,
  manualBasis: WizardManualBasis | null,
): Promise<WizardDraftView> {
  const body = await requestJson('/drafts', {
    method: 'POST',
    body: JSON.stringify({
      proposalType,
      ...(manualBasis === null ? {} : { manualBasis }),
    }),
  });
  return body as unknown as WizardDraftView;
}

export async function fetchWizardDraft(
  draftId: string,
): Promise<WizardDraftView> {
  return (await requestJson(
    `/drafts/${encodeURIComponent(draftId)}`,
  )) as unknown as WizardDraftView;
}

export interface WizardSaveRequest {
  revision: number;
  intake?: AuditIntakeDocument;
  proposalType?: WizardProposalType;
  manualBasis?: WizardManualBasis | null;
  customer?: Partial<{
    customerId: string | null;
    customerName: string | null;
    siteId: string | null;
    siteName: string | null;
  }>;
  currentStepId?: WizardStepId;
  currentPageIndex?: number;
  completedStepIds?: WizardStepId[];
}

export async function saveWizardDraft(
  draftId: string,
  request: WizardSaveRequest,
): Promise<WizardDraftView> {
  const body = await requestJson(`/drafts/${encodeURIComponent(draftId)}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
  return body as unknown as WizardDraftView;
}

/**
 * Choosing the machine a proposal is about.
 *
 * The browser does not fill the fields itself. It says which record was
 * chosen, and the server answers with the draft as it now stands, so what a
 * source published is decided once rather than agreed between two codebases.
 */
export async function selectWizardMachine(
  draftId: string,
  request: {
    revision: number;
    role: WizardMachineRole;
    specRecordId?: string;
    installedMachineId?: string;
    clear?: true;
  },
): Promise<WizardMachineSelectionResult> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/machine-selection`,
    { method: 'POST', body: JSON.stringify(request) },
  );
  return body as unknown as WizardMachineSelectionResult;
}

/** Restates one value the source published, with the reason it was restated. */
export async function overrideWizardAnswer(
  draftId: string,
  request: {
    revision: number;
    path: string;
    answer: unknown;
    reason: string;
  },
): Promise<WizardDraftView> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/answer-override`,
    { method: 'POST', body: JSON.stringify(request) },
  );
  return body as unknown as WizardDraftView;
}

/** Puts the source's own figure back. */
export async function restoreWizardAnswer(
  draftId: string,
  revision: number,
  path: string,
): Promise<WizardDraftView> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/answer-override`,
    { method: 'POST', body: JSON.stringify({ revision, path, restore: true }) },
  );
  return body as unknown as WizardDraftView;
}

export async function compareWizardMachine(
  draftId: string,
  role: WizardMachineRole,
): Promise<WizardMachineComparisonResult> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/machine-comparison?role=${role}`,
  );
  return body as unknown as WizardMachineComparisonResult;
}

export async function updateWizardMachine(
  draftId: string,
  revision: number,
  role: WizardMachineRole,
): Promise<WizardDraftView> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/machine-update`,
    { method: 'POST', body: JSON.stringify({ revision, role }) },
  );
  return body as unknown as WizardDraftView;
}

export async function archiveWizardDraft(
  draftId: string,
  revision: number,
  reason: string | null,
): Promise<WizardDraftView> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/archive`,
    {
      method: 'POST',
      body: JSON.stringify({ revision, reason }),
    },
  );
  return body as unknown as WizardDraftView;
}

export async function duplicateWizardDraft(
  draftId: string,
): Promise<WizardDraftView> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/duplicate`,
    { method: 'POST', body: JSON.stringify({}) },
  );
  return body as unknown as WizardDraftView;
}

/**
 * Uploads the untouched export. The bytes are sent exactly as the browser read
 * them: no parsing, no re-encoding and no trimming happens on this side.
 */
export async function uploadWizardSource(
  draftId: string,
  revision: number,
  file: File,
): Promise<WizardDraftView> {
  const response = await fetch(
    wizardUrl(`/drafts/${encodeURIComponent(draftId)}/source`),
    {
      method: 'POST',
      headers: authHeaders({
        'Content-Type': file.type === '' ? 'text/csv' : file.type,
        'X-Bouwa-Filename': encodeURIComponent(file.name),
        'X-Bouwa-Revision': String(revision),
      }),
      body: await file.arrayBuffer(),
    },
  );
  return (await requireOk(response)) as unknown as WizardDraftView;
}

export async function uploadWizardDocument(
  draftId: string,
  revision: number,
  file: File,
  options?: { evidenceId?: string | null; evidenceType?: string | null },
): Promise<WizardDraftView> {
  const response = await fetch(
    wizardUrl(`/drafts/${encodeURIComponent(draftId)}/documents`),
    {
      method: 'POST',
      headers: authHeaders({
        'Content-Type':
          file.type === '' ? 'application/octet-stream' : file.type,
        'X-Bouwa-Filename': encodeURIComponent(file.name),
        'X-Bouwa-Revision': String(revision),
        ...(options?.evidenceId
          ? { 'X-Bouwa-Evidence-Id': encodeURIComponent(options.evidenceId) }
          : {}),
        ...(options?.evidenceType
          ? { 'X-Bouwa-Evidence-Type': options.evidenceType }
          : {}),
      }),
      body: await file.arrayBuffer(),
    },
  );
  return (await requireOk(response)) as unknown as WizardDraftView;
}

export async function listAuditEquipment(params?: {
  equipmentType?: WizardEquipmentType;
  search?: string;
}): Promise<{
  equipment: WizardEquipment[];
  equipmentTypes: WizardEquipmentTypeOption[];
}> {
  const query = new URLSearchParams();
  if (params?.equipmentType) query.set('type', params.equipmentType);
  if (params?.search) query.set('search', params.search);
  const suffix = query.toString() === '' ? '' : `?${query.toString()}`;
  const body = await requestJson(`/equipment${suffix}`);
  return {
    equipment: (body.equipment as WizardEquipment[]) ?? [],
    equipmentTypes: (body.equipmentTypes as WizardEquipmentTypeOption[]) ?? [],
  };
}

/* ------------------------------------------------------------------ *
 * The machine specification library
 * ------------------------------------------------------------------ */

export interface SpecLibraryQuery {
  equipmentType?: WizardSpecEquipmentType;
  search?: string;
  manufacturer?: string;
  controlMethod?: string;
  sourceType?: string;
  minimumPressureBarG?: number;
  maximumPressureBarG?: number;
  minimumFadM3PerMin?: number;
  maximumFadM3PerMin?: number;
  minimumPowerKw?: number;
  maximumPowerKw?: number;
  limit?: number;
  offset?: number;
}

export interface SpecLibrarySourceBreakdownEntry {
  sourceType: string;
  count: number;
  label: string;
}

export interface SpecLibraryBrowseResult {
  records: WizardSpecRecord[];
  total: number;
  offset: number;
  limit: number;
  sourceBreakdown: SpecLibrarySourceBreakdownEntry[];
}

function queryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const rendered = query.toString();
  return rendered === '' ? '' : `?${rendered}`;
}

/**
 * Wizard machine search. Always scopes to an equipment class (default
 * air_compressor) so a compressor proposal cannot quietly offer dryers.
 */
export async function searchSpecLibrary(
  query: SpecLibraryQuery = {},
): Promise<WizardSpecRecord[]> {
  const body = await browseSpecLibrary({
    ...query,
    equipmentType: query.equipmentType ?? 'air_compressor',
  });
  return body.records;
}

/**
 * Browse/paginated library read used by the Machine Spec Library screen.
 * Omitting equipmentType returns every active authoritative record.
 * Returns authoritative totals and provenance breakdown from the server.
 */
export async function browseSpecLibrary(
  query: SpecLibraryQuery = {},
): Promise<SpecLibraryBrowseResult> {
  const body = await requestJson(
    `/spec-library${queryString({
      ...query,
    })}`,
  );
  return {
    records: (body.records as WizardSpecRecord[]) ?? [],
    total: typeof body.total === 'number' ? body.total : ((body.records as WizardSpecRecord[]) ?? []).length,
    offset: typeof body.offset === 'number' ? body.offset : Number(query.offset ?? 0),
    limit: typeof body.limit === 'number' ? body.limit : Number(query.limit ?? 25),
    sourceBreakdown: (body.sourceBreakdown as SpecLibrarySourceBreakdownEntry[]) ?? [],
  };
}

export async function listSpecLibraryManufacturers(
  equipmentType: WizardSpecEquipmentType = 'air_compressor',
): Promise<string[]> {
  const body = await requestJson(
    `/spec-library/manufacturers${queryString({ equipmentType })}`,
  );
  return (body.manufacturers as string[]) ?? [];
}

/**
 * Asks the library what a named machine means. The answer is one record,
 * several to choose between, or none; this never resolves the ambiguity on
 * the user's behalf.
 */
export async function matchSpecLibrary(subject: {
  manufacturer: string | null;
  model: string | null;
  modelVariant?: string | null;
  ratedPressureBarG?: number | null;
}): Promise<WizardSpecMatch> {
  const body = await requestJson(
    `/spec-library/match${queryString({
      manufacturer: subject.manufacturer,
      model: subject.model,
      modelVariant: subject.modelVariant,
      ratedPressureBarG: subject.ratedPressureBarG,
    })}`,
  );
  return body as unknown as WizardSpecMatch;
}

export async function fetchSpecRecord(recordId: string): Promise<{
  record: WizardSpecRecord;
  alternativeSources: WizardSpecRecord[];
  history: WizardSpecRecord[];
}> {
  const body = await requestJson(
    `/spec-library/${encodeURIComponent(recordId)}`,
  );
  return {
    record: body.record as WizardSpecRecord,
    alternativeSources: (body.alternativeSources as WizardSpecRecord[]) ?? [],
    history: (body.history as WizardSpecRecord[]) ?? [],
  };
}

/** The machines ARS already holds for a customer, optionally at one site. */
export async function listInstalledMachines(params: {
  customerId: string;
  site?: string;
  search?: string;
  limit?: number;
}): Promise<{
  machines: WizardInstalledMachine[];
  sites: string[];
  noneRegistered: boolean;
}> {
  const body = await requestJson(`/installed-machines${queryString(params)}`);
  return {
    machines: (body.machines as WizardInstalledMachine[]) ?? [],
    sites: (body.sites as string[]) ?? [],
    noneRegistered: body.noneRegistered === true,
  };
}

/** Prices ARS has already quoted this customer, newest and closest first. */
export async function fetchPriceSuggestions(
  draftId: string,
): Promise<WizardPriceSuggestion[]> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/price-suggestions`,
  );
  return (body.suggestions as WizardPriceSuggestion[]) ?? [];
}

/* ------------------------------------------------------------------ *
 * The proposal document
 * ------------------------------------------------------------------ */

/**
 * The document as the customer would read it.
 *
 * It is always rebuilt by the backend from the stored answers, so the preview
 * cannot show one thing while the proposal says another.
 */
export async function fetchProposalDocument(
  draftId: string,
): Promise<WizardProposalDocumentView> {
  return (await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/document`,
  )) as unknown as WizardProposalDocumentView;
}

/**
 * The document to preview, generating the first version where there is none.
 *
 * Opening a preview must land on something, so a proposal that has never been
 * previewed gets its first version here. A proposal that already has one is
 * handed the one it has: looking at a proposal twice is not two versions of
 * it.
 */
export async function ensureProposalVersion(
  draftId: string,
  revision: number,
): Promise<WizardProposalDocumentView> {
  return (await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/document-versions/ensure`,
    { method: 'POST', body: JSON.stringify({ revision }) },
  )) as unknown as WizardProposalDocumentView;
}

/** Records that this document was issued, at the revision it was issued from. */
export async function issueProposalVersion(
  draftId: string,
  revision: number,
): Promise<WizardProposalDocumentView> {
  return (await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/document-versions`,
    { method: 'POST', body: JSON.stringify({ revision }) },
  )) as unknown as WizardProposalDocumentView;
}

/**
 * Keeps the rendered PDF against the version it was rendered from.
 *
 * Sent from here because the browser is what rendered it. The file a customer
 * receives and the file ARS can produce again are then the same bytes rather
 * than two renderings that have to be kept in step.
 */
export async function storeProposalPdf(
  draftId: string,
  revision: number,
  version: number,
  filename: string,
  bytes: ArrayBuffer,
): Promise<{ revision: number }> {
  const response = await fetch(
    wizardUrl(
      `/drafts/${encodeURIComponent(draftId)}/document-versions/${version}/pdf`,
    ),
    {
      method: 'PUT',
      headers: authHeaders({
        'Content-Type': 'application/pdf',
        'X-Bouwa-Filename': encodeURIComponent(filename),
        'X-Bouwa-Revision': String(revision),
      }),
      body: bytes,
    },
  );
  return (await requireOk(response)) as unknown as { revision: number };
}

/** The authenticated download URL for the newest stored proposal PDF. */
export function proposalPdfDownloadUrl(draftId: string): string {
  return wizardUrl(
    `/drafts/${encodeURIComponent(draftId)}/document-versions/latest/pdf`,
  );
}

/* ------------------------------------------------------------------ *
 * The tariff library
 * ------------------------------------------------------------------ */

export interface TariffLibraryQuery {
  supplier?: string;
  customerCategory?: string;
  voltageCategory?: string;
  transmissionZone?: string;
  province?: string;
  search?: string;
  effectiveOn?: string;
  limit?: number;
}

export async function searchTariffLibrary(
  query: TariffLibraryQuery = {},
): Promise<WizardTariffRecord[]> {
  const body = await requestJson(`/tariff-library${queryString({ ...query })}`);
  return (body.records as WizardTariffRecord[]) ?? [];
}

/**
 * The choices at one step of the cascade, each with the number of tariffs
 * behind it, so a rep is never offered a narrowing that leads nowhere.
 */
export async function tariffLibraryFacet(
  facet: WizardTariffFacetField,
  query: TariffLibraryQuery = {},
): Promise<WizardTariffFacetValue[]> {
  const body = await requestJson(
    `/tariff-library/facets${queryString({ ...query, facet })}`,
  );
  return (body.values as WizardTariffFacetValue[]) ?? [];
}

export async function fetchTariffRecord(recordId: string): Promise<{
  record: WizardTariffRecord;
  otherYears: WizardTariffRecord[];
  history: WizardTariffRecord[];
}> {
  const body = await requestJson(
    `/tariff-library/${encodeURIComponent(recordId)}`,
  );
  return {
    record: body.record as WizardTariffRecord,
    otherYears: (body.otherYears as WizardTariffRecord[]) ?? [],
    history: (body.history as WizardTariffRecord[]) ?? [],
  };
}

/**
 * Costs the proposal on a determination, or records that the bill has not
 * arrived. As with machines, the browser names the record and the server
 * decides what it answers.
 */
export async function selectWizardTariff(
  draftId: string,
  request: {
    revision: number;
    route?: WizardTariffRoute;
    tariffRecordId?: string;
    evidenceReference?: string | null;
    clear?: true;
  },
): Promise<WizardTariffSelectionResult> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/tariff-selection`,
    { method: 'POST', body: JSON.stringify(request) },
  );
  return body as unknown as WizardTariffSelectionResult;
}

export async function compareWizardTariff(
  draftId: string,
): Promise<WizardTariffComparisonResult> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/tariff-comparison`,
  );
  return body as unknown as WizardTariffComparisonResult;
}

export async function updateWizardTariff(
  draftId: string,
  revision: number,
): Promise<WizardDraftView> {
  const body = await requestJson(
    `/drafts/${encodeURIComponent(draftId)}/tariff-update`,
    { method: 'POST', body: JSON.stringify({ revision }) },
  );
  return body as unknown as WizardDraftView;
}

/**
 * Adds an instrument to the catalogue. What is sent is what the user stated;
 * the backend refuses anything it cannot be true, rather than this side
 * guessing which of the details are safe to keep.
 */
export async function addAuditEquipment(
  equipment: Record<string, unknown>,
): Promise<WizardEquipment> {
  const body = await requestJson('/equipment', {
    method: 'POST',
    body: JSON.stringify(equipment),
  });
  return body.equipment as WizardEquipment;
}

/** The authenticated download URL for the stored source file. */
export function wizardSourceDownloadUrl(draftId: string): string {
  return wizardUrl(`/drafts/${encodeURIComponent(draftId)}/source`);
}

/**
 * Downloads a stored file through the authenticated route and hands the browser
 * a local object URL. The token never travels in a query string.
 */
export async function downloadWizardFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    const body = await readBody(response);
    throw new WizardRequestError(
      typeof body.error === 'string' ? body.error : 'The file could not be read.',
      response.status,
      null,
    );
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
