import { Download, Smartphone, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  downloadTechnicianAppApk,
  getTechnicianAppRelease,
  type TechnicianAppReleaseInfo,
} from '../lib/api';

/**
 * Formats a byte count for display in the download card.
 */
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Tech App page — lets super admins and technicians download the latest ARS Technician APK.
 */
export function TechAppDownload() {
  const [release, setRelease] = useState<TechnicianAppReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the current technician app release metadata from the backend.
   */
  async function loadRelease() {
    setLoading(true);
    setError(null);
    try {
      const release = await getTechnicianAppRelease();
      setRelease(release);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load app information';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRelease();
  }, []);

  /**
   * Downloads the latest APK when downloads are enabled.
   */
  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadTechnicianAppApk(release?.version || undefined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
    } finally {
      setDownloading(false);
    }
  }

  const canDownload = Boolean(release?.hasApk && release?.downloadEnabled);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
          <Smartphone className="w-7 h-7 text-ars-primary" />
          ARS Technician App
        </h1>
        <p className="text-sm text-ars-body mt-2">
          Install the mobile app on your Android device to complete assigned job cards offline.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-ars-body">
            <Loader2 className="w-5 h-5 animate-spin text-ars-primary" />
            Loading app details...
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-medium text-ars-body uppercase tracking-wide">Version</p>
                <p className="text-xl font-bold text-ars-heading mt-1">
                  {release?.version || 'Not uploaded yet'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-medium text-ars-body uppercase tracking-wide">File size</p>
                <p className="text-xl font-bold text-ars-heading mt-1">
                  {formatFileSize(release?.fileSize)}
                </p>
              </div>
            </div>

            {release?.uploadedAt && (
              <p className="text-sm text-ars-body mb-6">
                Last updated{' '}
                {new Date(release.uploadedAt).toLocaleString()}
                {release.uploadedBy?.name ? ` by ${release.uploadedBy.name}` : ''}
              </p>
            )}

            {canDownload ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Download available</p>
                    <p className="text-sm text-green-800 mt-1">
                      Download the APK, open it on your Android phone, and allow installation from your browser or file manager when prompted.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-[8px] bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      DOWNLOADING...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      DOWNLOAD ARS TECHNICIAN APK
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Not available at the moment</p>
                  <p className="text-sm text-amber-800 mt-1">
                    {!release?.hasApk
                      ? 'No app package has been uploaded yet. Please contact your administrator.'
                      : 'Downloads are currently disabled. Please check again later or contact your administrator.'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-ars-body">
              <p className="font-semibold text-ars-heading mb-2">Installation notes</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Android only — this app is distributed outside the Play Store.</li>
                <li>You may need to enable installs from unknown sources in your device settings.</li>
                <li>Sign in with your technician account after installing.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
