/**
 * How the Bouwa workflow screens reach their backend.
 *
 * The same screens serve two mounts. The development service at
 * /api/bouwa-local signs a technician in against a local identity registry and
 * runs without the rest of ARS. The authenticated module at /api/bouwa/workflow
 * is reached by a signed-in ARS user carrying their ordinary token. Everything
 * else about the two is identical, so the screens take a connection rather than
 * knowing which one they are talking to.
 *
 * The acting role is never derived here. It decides which workflow transitions
 * the backend will accept, so the backend states it and this module carries it.
 */

import type { LocalSession, ProposalRole } from './proposalLocalTypes';

export type BouwaWorkflowDeployment =
  | 'local_development'
  | 'authenticated_ars_route';

export interface BouwaWorkflowActor {
  id: string;
  displayName: string;
  role: ProposalRole;
}

export interface BouwaWorkflowConnection {
  /** Prefix every workflow path is appended to, without a trailing slash. */
  basePath: string;
  /** Bearer token: the local session token, or the ARS token. */
  token: string;
  actor: BouwaWorkflowActor;
  deployment: BouwaWorkflowDeployment;
}

export interface BouwaWorkflowSessionResponse {
  deployment: BouwaWorkflowDeployment;
  actor: BouwaWorkflowActor;
}

export const LOCAL_WORKFLOW_BASE_PATH = '/api/bouwa-local';

/**
 * The authenticated mount sits inside the ARS API, so it is reached through the
 * same origin the rest of the application uses rather than the dev proxy.
 */
export function arsWorkflowBasePath(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/api/bouwa/workflow`;
}

export function workflowUrl(
  connection: BouwaWorkflowConnection,
  path: string,
): string {
  return `${connection.basePath}${path}`;
}

export function workflowHeaders(
  connection: BouwaWorkflowConnection,
  extra?: Record<string, string>,
): Record<string, string> {
  return { ...extra, Authorization: `Bearer ${connection.token}` };
}

export function localWorkflowConnection(
  session: LocalSession,
): BouwaWorkflowConnection {
  return {
    basePath: LOCAL_WORKFLOW_BASE_PATH,
    token: session.token,
    actor: session.identity,
    deployment: 'local_development',
  };
}

export function arsWorkflowConnection(
  basePath: string,
  token: string,
  session: BouwaWorkflowSessionResponse,
): BouwaWorkflowConnection {
  return {
    basePath,
    token,
    actor: session.actor,
    deployment: session.deployment,
  };
}