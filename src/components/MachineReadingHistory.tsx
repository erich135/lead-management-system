import { useEffect, useState } from 'react';
import { History, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  getMachineReadingHistory,
  getMachineReadingPhotoUrl,
  type MachineReadingSubmission,
} from '../lib/api';

interface MachineReadingHistoryProps {
  machineId: string;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: MachineReadingSubmission['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

export function MachineReadingHistory({ machineId }: MachineReadingHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<MachineReadingSubmission[]>([]);
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMachineReadingHistory(machineId)
      .then((res) => {
        if (!cancelled) setSubmissions(res.submissions || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [machineId]);

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-700">Reading History</h4>
        {!loading && (
          <span className="text-xs text-slate-400">({submissions.length})</span>
        )}
      </div>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && submissions.length === 0 && (
        <div className="text-sm text-slate-400">No QR readings submitted yet.</div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3">Hours</th>
                <th className="py-2 pr-3">By</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Verified</th>
                <th className="py-2 pr-3">Photo</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const delta = s.submittedHours - s.previousHours;
                return (
                  <tr key={s._id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                      {formatDateTime(s.submittedAt)}
                    </td>
                    <td className="py-2 pr-3 text-slate-800 whitespace-nowrap">
                      <div className="font-medium">{s.submittedHours.toLocaleString()} h</div>
                      <div className="text-xs text-slate-400">
                        prev {s.previousHours.toLocaleString()} ({delta >= 0 ? '+' : ''}
                        {delta.toLocaleString()})
                      </div>
                      {s.status === 'approved' && typeof s.approvedHours === 'number' && s.approvedHours !== s.submittedHours && (
                        <div className="text-xs text-green-700">
                          approved as {s.approvedHours.toLocaleString()} h
                        </div>
                      )}
                      {s.faultReported && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="w-3 h-3" /> Fault reported
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                      <div>{s.submitterName || '—'}</div>
                      {s.submitterPhone && (
                        <div className="text-xs text-slate-400">{s.submitterPhone}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={s.status} />
                      {s.status === 'rejected' && s.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs">{s.rejectionReason}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-600 text-xs whitespace-nowrap">
                      {s.verifiedAt ? (
                        <>
                          <div>{formatDateTime(s.verifiedAt)}</div>
                          {s.verifiedBy && (
                            <div className="text-slate-400">
                              {[s.verifiedBy.firstName, s.verifiedBy.lastName].filter(Boolean).join(' ') ||
                                s.verifiedBy.email}
                            </div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => setPhotoOpen(s._id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {photoOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoOpen(null)}
        >
          <img
            src={getMachineReadingPhotoUrl(photoOpen)}
            alt="Reading"
            className="max-w-full max-h-full rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default MachineReadingHistory;
