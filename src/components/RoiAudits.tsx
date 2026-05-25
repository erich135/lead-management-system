import { useEffect, useState } from 'react';
import { TrendingUp, Loader2, FileText, AlertCircle } from 'lucide-react';
import { listRoiAudits, type RoiAuditSummary } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * ROI / Air Audit list view. Lives inside the Machines page as a tab.
 *
 * Scaffold only — shows existing audits in a table and a "New Audit"
 * button that's wired to a stub. The audit wizard, CSV upload,
 * computation, and PDF generation arrive in follow-up commits.
 */
export function RoiAudits(): JSX.Element {
  const { isSuperAdmin, hasPermission } = useAuth();
  const canManage = isSuperAdmin || hasPermission('roi.manage');

  const [audits, setAudits] = useState<RoiAuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRoiAudits()
      .then((data) => {
        if (!cancelled) setAudits(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load audits');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fmtZAR = (n?: number): string =>
    typeof n === 'number'
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          maximumFractionDigits: 0,
        }).format(n)
      : '—';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            ROI / Air Audits
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Compressor replacement ROI analysis — measured (logger CSV) or estimated.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            disabled
            title="Audit wizard coming next"
            className="px-4 py-2.5 bg-slate-200 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            + New Audit (coming soon)
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : audits.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText className="w-14 h-14 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">No audits yet</p>
          <p className="text-sm mt-1">
            ROI audits will appear here once the wizard is built.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left">Existing Machine</th>
                <th className="px-3 py-3 text-left">Proposed</th>
                <th className="px-3 py-3 text-left">Mode</th>
                <th className="px-3 py-3 text-right">Annual Saving</th>
                <th className="px-3 py-3 text-right">Payback</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((a) => (
                <tr key={a._id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 text-slate-800">
                    {typeof a.customer === 'string' ? a.customer : a.customer.name}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {a.machine ? `${a.machine.make} ${a.machine.model}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {a.proposedModel
                      ? `${a.proposedModel.make} ${a.proposedModel.model}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        a.mode === 'MEASURED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {a.mode}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-800">
                    {fmtZAR(a.results?.annualCostSavingExVat)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">
                    {typeof a.results?.paybackYears === 'number'
                      ? `${a.results.paybackYears.toFixed(2)} yr`
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RoiAudits;
