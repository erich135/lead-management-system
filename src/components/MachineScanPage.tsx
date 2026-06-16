import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Camera,
  ImageIcon,
  Loader2,
  AlertTriangle,
  Wrench,
  Clock,
  X,
  History,
  CalendarClock,
} from 'lucide-react';
import {
  getPublicMachineForScan,
  submitPublicMachineReading,
  getPublicMachineReadingHistory,
  type PublicMachineForScan,
  type PublicReadingHistoryEntry,
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
  const [history, setHistory] = useState<PublicReadingHistoryEntry[]>([]);

  // Form state
  const [hours, setHours] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [faultReported, setFaultReported] = useState(false);
  const [faultDescription, setFaultDescription] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  // In-browser camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError('Camera access denied. Please allow camera permission or use the gallery.');
      setShowCamera(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `meter-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhoto(file);
      setPhotoPreview(canvas.toDataURL('image/jpeg'));
      stopStream();
      setShowCamera(false);
    }, 'image/jpeg', 0.92);
  }, [stopStream]);

  const closeCamera = useCallback(() => {
    stopStream();
    setShowCamera(false);
  }, [stopStream]);

  // Clean up stream on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { machine: m } = await getPublicMachineForScan(token);
        if (cancelled) return;
        setMachine(m);
        setHours(String(m.machineHours ?? ''));
        setPhase('capture');
        // Load history in background — non-blocking
        getPublicMachineReadingHistory(token)
          .then(({ submissions }) => { if (!cancelled) setHistory(submissions); })
          .catch(() => {/* silently ignore — history is non-critical */});
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
    const emailTrimmed = submitterEmail.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setSubmitError('Please enter a valid email address, or leave it blank.');
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
        submitterEmail: emailTrimmed || undefined,
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
          {/* Service schedule */}
          {machine.nextServiceHours > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-sm">
              <CalendarClock className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600">Next service:</span>
              <span className="font-semibold text-slate-800">
                {machine.nextServiceHours.toLocaleString()} hrs
              </span>
              {machine.serviceDue ? (
                <span className="ml-auto text-xs text-amber-700 font-medium">
                  Overdue by {(machine.machineHours - machine.nextServiceHours).toLocaleString()} hrs
                </span>
              ) : (
                <span className="ml-auto text-xs text-slate-500">
                  {(machine.nextServiceHours - machine.machineHours).toLocaleString()} hrs remaining
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reading history */}
        {history.length > 0 && (
          <details className="border border-slate-200 rounded-lg">
            <summary className="cursor-pointer flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700">
              <History className="w-4 h-4 text-slate-500" />
              Reading History ({history.length})
            </summary>
            <div className="divide-y divide-slate-100">
              {history.map((entry) => (
                <div key={entry._id} className="px-4 py-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {(entry.approvedHours ?? entry.submittedHours).toLocaleString()} hrs
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(entry.verifiedAt ?? entry.submittedAt).toLocaleDateString('en-ZA', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

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

          {/* Gallery input */}
          <input
            ref={galleryInputRef}
            id="gallery-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
          />

          {/* In-browser camera viewfinder */}
          {showCamera && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-white text-sm font-medium">Take a photo</span>
                <button type="button" onClick={closeCamera} className="text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center py-6">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center shadow-lg"
                >
                  <Camera className="w-7 h-7 text-slate-800" />
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {cameraError && (
            <p className="text-xs text-red-600 mb-2">{cameraError}</p>
          )}

          {photoPreview ? (
            <div>
              <img
                src={photoPreview}
                alt="Hour meter preview"
                className="w-full rounded-lg border border-slate-300"
              />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={openCamera} className="text-sm text-blue-600 underline">
                  Retake photo
                </button>
                <label htmlFor="gallery-input" className="text-sm text-blue-600 underline cursor-pointer">
                  Choose from gallery
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openCamera}
                className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
              >
                <Camera className="w-7 h-7" />
                <span className="text-xs font-medium">Take a photo</span>
              </button>
              <label
                htmlFor="gallery-input"
                className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition cursor-pointer"
              >
                <ImageIcon className="w-7 h-7" />
                <span className="text-xs font-medium text-center">Choose from gallery</span>
              </label>
            </div>
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
          <p className="mt-2 text-xs text-slate-500">
            Add your email if you'd like an emailed confirmation of your reading and approval status.
          </p>
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="Your email (for confirmation)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="tel"
              value={submitterPhone}
              onChange={(e) => setSubmitterPhone(e.target.value)}
              placeholder="Your phone"
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
