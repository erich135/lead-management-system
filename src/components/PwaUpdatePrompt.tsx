import { Component, useEffect, useState, type ReactNode } from 'react';
import {
  ARS_APP_BUILD,
  ARS_CHUNK_FAILURE_EVENT,
  ARS_STORAGE_FAILURE_EVENT,
  ARS_UPDATE_READY_EVENT,
  isChunkLoadError,
} from '../pwa/appBuild';
import { applyWaitingServiceWorker, clearArsCachesAndReload } from '../pwa/pwaUpdate';

type PromptMode = 'update' | 'chunk' | 'storage' | null;

const COPY: Record<Exclude<PromptMode, null>, string> = {
  update:
    'A new version of ARS is available. Update now to make sure you are using the latest version.',
  chunk: 'ARS could not load part of this version. Update now to continue.',
  storage:
    'ARS could not store the latest version because browser storage is full. Update now to clear the old cache and continue.',
};

export function PwaUpdatePrompt() {
  const [mode, setMode] = useState<PromptMode>(null);
  const [availableBuild, setAvailableBuild] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ availableBuild?: string | null }>).detail;
      setAvailableBuild(detail?.availableBuild ?? null);
      setMode((current) => (current === 'chunk' || current === 'storage' ? current : 'update'));
    };
    const onChunk = () => setMode('chunk');
    const onStorage = () => setMode((current) => (current === 'chunk' ? current : 'storage'));
    window.addEventListener(ARS_UPDATE_READY_EVENT, onUpdate);
    window.addEventListener(ARS_CHUNK_FAILURE_EVENT, onChunk);
    window.addEventListener(ARS_STORAGE_FAILURE_EVENT, onStorage);
    return () => {
      window.removeEventListener(ARS_UPDATE_READY_EVENT, onUpdate);
      window.removeEventListener(ARS_CHUNK_FAILURE_EVENT, onChunk);
      window.removeEventListener(ARS_STORAGE_FAILURE_EVENT, onStorage);
    };
  }, []);

  if (!mode) return null;

  async function updateNow() {
    if (applying) return;
    setApplying(true);
    try {
      if (mode === 'storage') {
        await clearArsCachesAndReload();
        return;
      }
      await applyWaitingServiceWorker({ clearWhenIdle: mode === 'chunk' });
    } catch {
      setApplying(false);
    }
  }

  const diagnostics = window.__ARS_DIAGNOSTICS__;
  const serviceWorkerBuild = diagnostics?.serviceWorkerBuild ?? null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="ars-update-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 id="ars-update-title" className="text-lg font-bold text-[#383838]">
          App update available
        </h2>
        <p className="mt-2 text-sm text-slate-700">{COPY[mode]}</p>
        <p className="mt-3 text-xs text-slate-500">
          Running {ARS_APP_BUILD}
          {availableBuild ? ` · Available ${availableBuild}` : ''}
          {serviceWorkerBuild ? ` · Service worker ${serviceWorkerBuild}` : ''}
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-[#0969a9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#085a91] disabled:opacity-60"
          disabled={applying}
          onClick={() => void updateNow()}
        >
          {applying ? 'Updating…' : 'Update now'}
        </button>
      </div>
    </div>
  );
}

interface BoundaryState {
  mode: 'ok' | 'chunk' | 'other';
}

export class ChunkRecoveryBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { mode: 'ok' };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { mode: isChunkLoadError(error) ? 'chunk' : 'other' };
  }

  componentDidCatch(error: unknown): void {
    if (isChunkLoadError(error)) {
      window.dispatchEvent(new CustomEvent(ARS_CHUNK_FAILURE_EVENT));
    }
  }

  render() {
    if (this.state.mode === 'chunk') return null;
    if (this.state.mode === 'other') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-bold text-[#383838]">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-700">
              ARS hit an unexpected error. Update now to continue on the latest version.
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-[#0969a9] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => void applyWaitingServiceWorker()}
            >
              Update now
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
