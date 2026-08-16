import React from 'react';
import { MapPin, X } from 'lucide-react';

interface VisitLocationPermissionModalProps {
  visible: boolean;
  loading?: boolean;
  onEnable: () => void;
  onContinueWithout: () => void;
}

/**
 * Prompt shown when a rep opens a diary visit form without location enabled.
 * Location is attached at submission; declining still allows them to continue.
 */
export const VisitLocationPermissionModal: React.FC<VisitLocationPermissionModalProps> = ({
  visible,
  loading = false,
  onEnable,
  onContinueWithout,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#e8f4fc] to-[#f0f9ff] px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={onContinueWithout}
            disabled={loading}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0969a9]/20 bg-white shadow-sm">
            <MapPin className="h-8 w-8 text-[#0969a9]" />
          </div>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-center text-xl font-extrabold text-slate-900">Enable location</h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
            Your GPS coordinates are attached to the report when you submit. Location is not enabled
            on this device yet.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onContinueWithout}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Continue without location
            </button>
            <button
              type="button"
              onClick={onEnable}
              disabled={loading}
              className="flex-1 rounded-xl bg-[#0969a9] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#075a8f] disabled:opacity-50"
            >
              {loading ? 'Requesting…' : 'Enable location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitLocationPermissionModal;
