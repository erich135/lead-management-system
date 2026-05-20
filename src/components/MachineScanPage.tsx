import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Camera,
  Loader2,
  AlertTriangle,
  Wrench,
  Clock,
} from 'lucide-react';
import {
  getPublicMachineForScan,
  submitPublicMachineReading,
  type PublicMachineForScan,
} from '../lib/api';

type Phase = 'loading' | 'capture' | 'submitting' | 'confirmed' | 'error';

/**
 * Public, unauthenticated page reached by scanning the printed QR label on a
 * machine. Three phases: capture → submitting → confirmed.
 *
 * The signed token in the URL is the only credential required; the backend
 * validates it server-side. The page deliberately does NOT show ownership
 * info or oil-sample history — only the bare info a customer needs to
 * confirm they're looking at the right machine.
 */
export function MachineScanPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [machine, setMachine] = useState<PublicMachineForScan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [hours, setHours] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [faultReported, setFaultReported] = useState(false);
  const [faultDescription, setFaultDescription] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { machine: m } = await getPublicMachineForScan(token);
        if (cancelled) return;
        setMachine(m);
        setHours(String(m.machineHours ?? ''));
        setPhase('capture');
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(e?.message || 'Unable to load machine');
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const hoursNum = Number(hours);
    if (!Number.isFinite(hoursNum) || hoursNum < 0) {
      setSubmitError('Please enter a valid hour-meter reading.');
      return;
    }
    if (machine && hoursNum < machine.machineHours) {
      setSubmitError(
        `Reading is lower than the previous reading (${machine.machineHours}). Please re-check.`,
      );
      return;
    }
    if (!photo) {
      setSubmitError('A photo of the hour-meter is required.');
      return;
    }
    if (faultReported && !faultDescription.trim()) {
      setSubmitError('Please describe the fault.');
      return;
    }

    setPhase('submitting');
    try {
      const { reference: ref } = await submitPublicMachineReading(token, {
        submittedHours: hoursNum,
        photo,
        faultReported,
        faultDescription: faultDescription.trim() || undefined,
        submitterName: submitterName.trim() || undefined,
        submitterPhone: submitterPhone.trim() || undefined,
      });
      setReference(ref);
      setPhase('confirmed');
    } catch (err: any) {
      setSubmitError(err?.message || 'Submission failed. Please try again.');
      setPhase('capture');
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (phase === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">Loading machine…</p>
        </div>
      </Shell>
    );
  }

  if (phase === 'error' || !machine) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
          <h2 className="text-lg font-semibold text-slate-800 mb-1">QR code invalid</h2>
          <p className="text-sm text-slate-600">
            {loadError || 'This QR code could not be read. Please contact ARS support.'}
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === 'confirmed') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Thank you!</h2>
          <p className="text-sm text-slate-600 mb-4 max-w-xs">
            Your reading has been received. An ARS team member will review it shortly.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Reference</p>
            <p className="text-lg font-mono font-semibold text-slate-800">{reference}</p>
          </div>
          {faultReported && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-3 text-left max-w-xs">
              <Wrench className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800">
                The fault you reported has been flagged. Our service team will contact you.
              </p>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // capture or submitting
  return (
    <Shell>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Machine summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Machine</p>
          <p className="font-semibold text-slate-800">
            {machine.make} {machine.model}
          </p>
          {machine.machineType && (
            <p className="text-sm text-slate-600">{machine.machineType}</p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <Field label="Serial #" value={machine.serialNumber} />
            <Field label="Asset #" value={machine.assetNumber || '—'} />
            {machine.customerName && (
              <Field label="Customer" value={machine.customerName} />
            )}
            {machine.currentLocation && (
              <Field label="Location" value={machine.currentLocation} />
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Last reading:</span>
            <span className="font-semibold text-slate-800">
              {machine.machineHours.toLocaleString()} hrs
            </span>
            {machine.serviceDue && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                Service due
              </span>
            )}
          </div>
        </div>

        {/* Hours */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Current hour-meter reading <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 12345"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Photo of the hour meter <span className="text-red-500">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Hour meter preview"
                className="w-full rounded-lg border border-slate-300"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-sm text-blue-600 underline"
              >
                Retake photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm font-medium">Tap to take a photo</span>
            </button>
          )}
        </div>

        {/* Fault reporting */}
        <div className="border border-slate-200 rounded-lg p-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={faultReported}
              onChange={(e) => setFaultReported(e.target.checked)}
              className="mt-1"
            />
            <div>
              <span className="font-semibold text-slate-700 text-sm">Report a fault</span>
              <p className="text-xs text-slate-500">
                Tick this if the machine has an issue that needs attention.
              </p>
            </div>
          </label>
          {faultReported && (
            <textarea
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              placeholder="Describe the fault…"
              rows={3}
              className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
        </div>

        {/* Optional contact */}
        <details className="border border-slate-200 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Your contact details (optional)
          </summary>
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="tel"
              value={submitterPhone}
              onChange={(e) => setSubmitterPhone(e.target.value)}
              placeholder="Your phone (for updates)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </details>

        {submitError && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={phase === 'submitting'}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-base font-semibold rounded-lg transition"
        >
          {phase === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
            </>
          ) : (
            'Submit reading'
          )}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-slate-800">ARS Machine Reading</h1>
        </div>
      </header>
      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          {children}
        </div>
      </main>
      <footer className="text-center text-xs text-slate-400 py-4">
        Powered by ARS
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800 truncate">{value}</p>
    </div>
  );
}

export default MachineScanPage;
