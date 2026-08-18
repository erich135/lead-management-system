/**
 * The air-audit workflow inside the authenticated Bouwa module.
 *
 * The workspace itself is the same component the development route renders.
 * This page supplies the one thing that differs: a connection pointing at
 * /api/bouwa/workflow and carrying the signed-in user's ARS token.
 *
 * The acting role is read from the backend rather than derived from the
 * permissions held in the browser. The role decides which workflow transitions
 * the accepted role matrix will allow, so a role worked out here could offer an
 * action the backend then refuses, and would drift the moment the mapping
 * changed.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { getAuthToken } from '../../../lib/api';
import { resolveApiBaseUrl } from '../../../lib/resolveApiBaseUrl';
import {
  arsWorkflowBasePath,
  arsWorkflowConnection,
  type BouwaWorkflowConnection,
  type BouwaWorkflowSessionResponse,
} from '../workflowConnection';
import { BouwaLoggerLocalApp } from './BouwaLoggerLocalApp';

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function BouwaAirAuditWorkflowPage() {
  const [connection, setConnection] = useState<BouwaWorkflowConnection | null>(
    null,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    const token = getAuthToken();
    if (!token) {
      setError('Your ARS session has ended. Sign in again to open an audit.');
      return;
    }
    const basePath = arsWorkflowBasePath(resolveApiBaseUrl());
    fetch(`${basePath}/session`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(async response => {
        const payload = (await response.json()) as
          | BouwaWorkflowSessionResponse
          | { error?: string };
        if (!response.ok)
          throw new Error(
            'error' in payload && payload.error
              ? payload.error
              : 'The Bouwa workflow did not accept this session.',
          );
        return payload as BouwaWorkflowSessionResponse;
      })
      .then(session => {
        if (current)
          setConnection(arsWorkflowConnection(basePath, token, session));
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error
              ? reason.message
              : 'The Bouwa workflow could not be opened.',
          );
      });
    return () => {
      current = false;
    };
  }, []);

  if (error) return <Notice>{error}</Notice>;
  if (!connection)
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening the air-audit
        workflow…
      </div>
    );
  return <BouwaLoggerLocalApp connection={connection} />;
}

export default BouwaAirAuditWorkflowPage;
