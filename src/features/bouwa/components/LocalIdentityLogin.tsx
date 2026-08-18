import { useEffect, useState } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import type { LocalIdentity, LocalSession } from '../proposalLocalTypes';

export function LocalIdentityLogin({
  onAuthenticated,
}: {
  onAuthenticated: (session: LocalSession) => void;
}) {
  const [identities, setIdentities] = useState<LocalIdentity[]>([]);
  const [identityId, setIdentityId] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/bouwa-local/auth/identities')
      .then(async response => {
        const payload = await response.json() as { identities?: LocalIdentity[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'Local identities are unavailable.');
        return payload.identities ?? [];
      })
      .then(values => {
        setIdentities(values);
        setIdentityId(values[0]?.id ?? '');
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Local identities are unavailable.'));
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/bouwa-local/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId, secret }),
      });
      const payload = await response.json() as LocalSession | { error?: string };
      if (!response.ok) throw new Error('error' in payload ? payload.error : 'Local sign-in failed.');
      setSecret('');
      onAuthenticated(payload as LocalSession);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Local sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-3 text-ars-primary"><LockKeyhole className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Local identity required</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            The server binds each session to a configured person and role. Proposal authority cannot be selected in the browser.
          </p>
        </div>
      </div>
      <form className="mt-5 grid gap-4" onSubmit={login}>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Configured identity
          <select
            value={identityId}
            onChange={event => setIdentityId(event.target.value)}
            required
            className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          >
            {identities.map(identity => (
              <option key={identity.id} value={identity.id}>{identity.displayName}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Local secret
          <input
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={event => setSecret(event.target.value)}
            required
            className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          />
        </label>
        <div aria-live="assertive" aria-atomic="true">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={busy || !identityId || !secret}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ars-primary px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          <LogIn className="h-4 w-4" /> {busy ? 'Signing in…' : 'Sign in locally'}
        </button>
      </form>
    </section>
  );
}
