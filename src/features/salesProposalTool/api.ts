import { ApiRequestError, getAuthToken } from '../../lib/api';
import { resolveApiBaseUrl } from '../../lib/resolveApiBaseUrl';
import type {
  AirAndElectricityComparison,
  CommercialComparison,
  CommercialOffer,
  CurrentEquipment,
  CurrentMachineMeasuredPerformance,
  ElectricityBasis,
  ProposedEquipment,
  PublicMachineSpec,
  SalesProposal,
  SalesProposalListItem,
  SalesProposalSite,
} from './types';

function apiUrl(path: string): string {
  return `${resolveApiBaseUrl()}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: {
    success?: boolean;
    data?: T;
    error?: { message?: string };
    message?: string;
  } = {};
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }
  if (!response.ok || payload.success === false) {
    throw new ApiRequestError(
      payload.error?.message || payload.message || 'Request failed',
      { kind: 'malformed', status: response.status },
    );
  }
  if (payload.data === undefined) {
    throw new ApiRequestError('Request failed', { kind: 'malformed', status: response.status });
  }
  return payload.data;
}

async function jsonRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });
  return parseResponse<T>(response);
}

export async function listSalesProposals(): Promise<SalesProposalListItem[]> {
  const data = await jsonRequest<{ proposals: SalesProposalListItem[] }>(
    '/api/sales-proposal-tool/proposals',
  );
  return data.proposals;
}

export async function createSalesProposal(): Promise<SalesProposal> {
  const data = await jsonRequest<{ proposal: SalesProposal }>(
    '/api/sales-proposal-tool/proposals',
    { method: 'POST' },
  );
  return data.proposal;
}

export async function getSalesProposal(id: string): Promise<SalesProposal> {
  const data = await jsonRequest<{ proposal: SalesProposal }>(
    `/api/sales-proposal-tool/proposals/${id}`,
  );
  return data.proposal;
}

export async function saveSalesProposal(
  id: string,
  body: {
    customerId: string | null;
    site: SalesProposalSite;
    currentEquipment: CurrentEquipment[];
    proposedEquipment: ProposedEquipment[];
    electricityBasis: ElectricityBasis;
    commercialOffer: CommercialOffer;
    airAuditScope?: {
      type: 'single_machine' | 'site_header';
      currentEquipmentId: string | null;
    };
  },
): Promise<SalesProposal> {
  const data = await jsonRequest<{ proposal: SalesProposal }>(
    `/api/sales-proposal-tool/proposals/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
  return data.proposal;
}

export async function previewElectricityComparison(
  id: string,
  body: {
    customerId?: string | null;
    currentEquipment: CurrentEquipment[];
    proposedEquipment: ProposedEquipment[];
    electricityBasis: ElectricityBasis;
    commercialOffer: CommercialOffer;
    airAuditScope?: {
      type: 'single_machine' | 'site_header';
      currentEquipmentId: string | null;
    };
  },
): Promise<{
  comparison: AirAndElectricityComparison;
  commercial: CommercialComparison;
  currentMachinePerformance: CurrentMachineMeasuredPerformance | null;
}> {
  return jsonRequest<{
    comparison: AirAndElectricityComparison;
    commercial: CommercialComparison;
    currentMachinePerformance: CurrentMachineMeasuredPerformance | null;
  }>(
    `/api/sales-proposal-tool/proposals/${id}/electricity-comparison`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function uploadAirAuditCsv(
  id: string,
  file: File,
): Promise<SalesProposal> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(
    apiUrl(`/api/sales-proposal-tool/proposals/${id}/air-audit`),
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    },
  );
  const data = await parseResponse<{ proposal: SalesProposal }>(response);
  return data.proposal;
}

export async function removeAirAudit(id: string): Promise<SalesProposal> {
  const data = await jsonRequest<{ proposal: SalesProposal }>(
    `/api/sales-proposal-tool/proposals/${id}/air-audit`,
    { method: 'DELETE' },
  );
  return data.proposal;
}

export async function searchSpecLibrary(
  query: string,
  scope: 'all' | 'bouwa' = 'all',
): Promise<PublicMachineSpec[]> {
  const params = new URLSearchParams({ q: query, scope });
  const data = await jsonRequest<{ specs: PublicMachineSpec[] }>(
    `/api/sales-proposal-tool/spec-library?${params.toString()}`,
  );
  return data.specs;
}

export async function readSpecLibraryRecord(
  recordId: string,
): Promise<PublicMachineSpec> {
  const data = await jsonRequest<{ spec: PublicMachineSpec }>(
    `/api/sales-proposal-tool/spec-library/${encodeURIComponent(recordId)}`,
  );
  return data.spec;
}

export async function uploadSpecSheet(
  proposalId: string,
  file: File,
): Promise<{
  sourceFileId: string;
  sourceFileName: string;
  sourceSha256: string;
  extracted: {
    manufacturer: string | null;
    model: string | null;
    modelVariant: string | null;
    ratedPressureBarG: number | null;
    ratedAirflowM3PerMin: number | null;
    packageInputPowerKw: number | null;
    motorShaftPowerKw: number | null;
    controlType: string | null;
  };
}> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(
    apiUrl(`/api/sales-proposal-tool/proposals/${proposalId}/spec-sheet`),
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: form,
    },
  );
  const stored = await parseResponse<{
    sourceFileId: string;
    sourceFileName: string;
    sourceSha256: string;
    extracted?: {
      manufacturer: string | null;
      model: string | null;
      modelVariant: string | null;
      ratedPressureBarG: number | null;
      ratedAirflowM3PerMin: number | null;
      packageInputPowerKw: number | null;
      motorShaftPowerKw: number | null;
      controlType: string | null;
    };
  }>(response);
  return {
    ...stored,
    extracted: stored.extracted ?? {
      manufacturer: null,
      model: null,
      modelVariant: null,
      ratedPressureBarG: null,
      ratedAirflowM3PerMin: null,
      packageInputPowerKw: null,
      motorShaftPowerKw: null,
      controlType: null,
    },
  };
}
