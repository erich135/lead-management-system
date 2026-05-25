import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Loader2,
  FileText,
  AlertCircle,
  X,
  Plus,
  CheckCircle2,
  Download,
  Save,
} from 'lucide-react';
import {
  listRoiAudits,
  listRoiCompressorModels,
  listRoiLoadProfiles,
  listRoiSupplyAuthorities,
  listRoiTariffs,
  createRoiAudit,
  computeRoiAudit,
  uploadRoiAuditCsv,
  updateRoiAudit,
  downloadRoiAuditReport,
  getRoiAudit,
  getCustomers,
  type RoiAuditSummary,
  type CompressorModelRef,
  type LoadProfileRef,
  type SupplyAuthorityRef,
  type TariffRef,
  type CreateRoiAuditPayload,
  type UpdateRoiAuditPayload,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface CustomerOption {
  id: string;
  name: string;
}

/**
 * ROI / Air Audit list view with a single-screen wizard modal for
 * ESTIMATED audits (the MEASURED path needs the CSV uploader which lands
 * in a follow-up commit).
 */
export function RoiAudits(): JSX.Element {
  const { isSuperAdmin, hasPermission } = useAuth();
  const canManage = isSuperAdmin || hasPermission('roi.manage');

  const [audits, setAudits] = useState<RoiAuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const loadAudits = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRoiAudits();
      setAudits(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load audits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
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
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Audit
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
            Click <span className="font-medium">New Audit</span> to model a compressor replacement.
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
                <th className="px-3 py-3 text-right">5yr ROI</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((a) => (
                <tr
                  key={a._id}
                  className="hover:bg-amber-50 cursor-pointer"
                  onClick={() => setEditId(a._id)}
                >
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
                  <td className="px-3 py-3 text-right text-slate-800 font-medium">
                    {fmtZAR(a.results?.annualCostSavingExVat)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">
                    {typeof a.results?.paybackYears === 'number' && a.results.paybackYears > 0
                      ? `${a.results.paybackYears.toFixed(2)} yr`
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600">
                    {typeof a.results?.roiPercentFiveYear === 'number'
                      ? `${a.results.roiPercentFiveYear.toFixed(0)}%`
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void downloadRoiAuditReport(a._id).catch((err) =>
                          setError((err as Error).message || 'Download failed'),
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded"
                      title="Download PDF report"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showWizard && (
        <NewAuditWizard
          onClose={() => setShowWizard(false)}
          onCreated={async () => {
            setShowWizard(false);
            await loadAudits();
          }}
        />
      )}

      {editId && (
        <EditRoiAuditModal
          auditId={editId}
          canManage={canManage}
          onClose={() => setEditId(null)}
          onSaved={async () => {
            await loadAudits();
          }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// New Audit Wizard
// ===========================================================================

interface NewAuditWizardProps {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

function NewAuditWizard({ onClose, onCreated }: NewAuditWizardProps): JSX.Element {
  // Reference data
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [arsModels, setArsModels] = useState<CompressorModelRef[]>([]);
  const [loadProfiles, setLoadProfiles] = useState<LoadProfileRef[]>([]);
  const [authorities, setAuthorities] = useState<SupplyAuthorityRef[]>([]);
  const [tariffs, setTariffs] = useState<TariffRef[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState<string | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [mode, setMode] = useState<'ESTIMATED' | 'MEASURED'>('ESTIMATED');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [existingMake, setExistingMake] = useState('');
  const [existingModel, setExistingModel] = useState('');
  const [existingKW, setExistingKW] = useState('');
  const [existingFAD, setExistingFAD] = useState('');
  const [existingIsVSD, setExistingIsVSD] = useState(false);
  const [proposedModelId, setProposedModelId] = useState('');
  const [loadProfileId, setLoadProfileId] = useState('');
  const [authorityId, setAuthorityId] = useState('');
  const [tariffId, setTariffId] = useState('');
  const [priceOverride, setPriceOverride] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<RoiAuditSummary | null>(null);

  // Load reference data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefLoading(true);
      try {
        const [cust, models, profiles, auth] = await Promise.all([
          getCustomers({ limit: 500 }),
          listRoiCompressorModels({ ownerType: 'ARS' }),
          listRoiLoadProfiles(),
          listRoiSupplyAuthorities(),
        ]);
        if (cancelled) return;
        setCustomers(
          (cust.customers || []).map((c: { _id?: string; id?: string; name: string }) => ({
            id: (c._id || c.id || '') as string,
            name: c.name,
          })),
        );
        setArsModels(models);
        setLoadProfiles(profiles);
        setAuthorities(auth);
      } catch (err) {
        if (!cancelled) setRefError((err as Error).message || 'Failed to load reference data');
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load tariffs when authority changes
  useEffect(() => {
    if (!authorityId) {
      setTariffs([]);
      setTariffId('');
      return;
    }
    let cancelled = false;
    listRoiTariffs(authorityId)
      .then((data) => {
        if (!cancelled) setTariffs(data);
      })
      .catch(() => {
        if (!cancelled) setTariffs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authorityId]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    if (!customerId) {
      setSubmitError('Please select a customer');
      return;
    }
    if (!existingKW || Number(existingKW) <= 0) {
      setSubmitError('Existing machine rated kW is required');
      return;
    }
    if (!proposedModelId) {
      setSubmitError('Please pick a proposed compressor model');
      return;
    }
    if (!loadProfileId) {
      setSubmitError('Please pick a load profile (used for annual run hours)');
      return;
    }
    if (mode === 'MEASURED' && !csvFile) {
      setSubmitError('Please choose a CSV file or switch to Estimated mode');
      return;
    }

    const payload: CreateRoiAuditPayload = {
      customer: customerId,
      mode: 'ESTIMATED', // always create as ESTIMATED; upload flips to MEASURED
      existingMachine: {
        make: existingMake || undefined,
        model: existingModel || undefined,
        ratedKW: Number(existingKW),
        fadM3PerMin: existingFAD ? Number(existingFAD) : undefined,
        isVSD: existingIsVSD,
      },
      estimated: {
        loadProfile: loadProfileId,
      },
      proposedModel: proposedModelId,
      proposedPriceExVatOverride: priceOverride ? Number(priceOverride) : undefined,
      supplyAuthority: authorityId || undefined,
      tariff: tariffId || undefined,
    };

    setSubmitting(true);
    try {
      const created = await createRoiAudit(payload);
      if (mode === 'MEASURED' && csvFile) {
        await uploadRoiAuditCsv(created._id, csvFile);
      }
      const computed = await computeRoiAudit(created._id);
      setResultPreview(computed);
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to create audit');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtZAR = (n?: number): string =>
    typeof n === 'number'
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          maximumFractionDigits: 0,
        }).format(n)
      : '—';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">
            {resultPreview ? 'Audit Computed' : 'New ROI Audit'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {refLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : refError ? (
          <div className="p-6 text-sm text-red-700 bg-red-50 m-6 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {refError}
          </div>
        ) : resultPreview ? (
          <ResultPreview
            result={resultPreview}
            fmtZAR={fmtZAR}
            onClose={() => {
              setResultPreview(null);
              onCreated();
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setMode('ESTIMATED')}
                className={`px-4 py-1.5 text-sm font-medium rounded ${
                  mode === 'ESTIMATED'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Estimated
              </button>
              <button
                type="button"
                onClick={() => setMode('MEASURED')}
                className={`px-4 py-1.5 text-sm font-medium rounded ${
                  mode === 'MEASURED'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Measured (Logger CSV)
              </button>
            </div>

            {mode === 'ESTIMATED' ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                <strong>Estimated mode.</strong> Numbers are projections from an
                industry load profile, not from a data logger. The PDF will flag this.
              </p>
            ) : (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-3 space-y-2">
                <p>
                  <strong>Measured mode.</strong> Upload a CS Instruments / similar logger CSV
                  (semicolon delimited, columns: <code>timestamp;id;flow;consum;temp;pressure</code>).
                  The load profile below is still used for the annual-hours projection.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="block text-xs"
                />
                {csvFile && (
                  <p className="text-slate-700">
                    Selected: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            )}

            {/* Customer */}
            <Field label="Customer *">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            {/* Existing machine */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-medium text-slate-700 px-2">
                Existing Compressor
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Make">
                  <input
                    type="text"
                    value={existingMake}
                    onChange={(e) => setExistingMake(e.target.value)}
                    placeholder="e.g. Atlas Copco"
                    className="input"
                  />
                </Field>
                <Field label="Model">
                  <input
                    type="text"
                    value={existingModel}
                    onChange={(e) => setExistingModel(e.target.value)}
                    placeholder="e.g. GA37"
                    className="input"
                  />
                </Field>
                <Field label="Rated kW *">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={existingKW}
                    onChange={(e) => setExistingKW(e.target.value)}
                    required
                    className="input"
                  />
                </Field>
                <Field label="FAD (m³/min)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={existingFAD}
                    onChange={(e) => setExistingFAD(e.target.value)}
                    placeholder="optional, improves accuracy"
                    className="input"
                  />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 mt-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={existingIsVSD}
                  onChange={(e) => setExistingIsVSD(e.target.checked)}
                />
                Existing unit is VSD
              </label>
            </fieldset>

            {/* Proposed */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-medium text-slate-700 px-2">
                Proposed Replacement (Bouwa)
              </legend>
              <Field label="Compressor model *">
                <select
                  value={proposedModelId}
                  onChange={(e) => setProposedModelId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select model…</option>
                  {arsModels.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.make} {m.model} — {m.ratedKW}kW
                      {m.isVSD ? ' VSD' : ''}
                      {m.listPriceExVat ? ` (${fmtZAR(m.listPriceExVat)})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Price override (R, ex VAT)">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                  placeholder="Leave blank to use catalogue list price"
                  className="input"
                />
              </Field>
            </fieldset>

            {/* Operating profile */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-medium text-slate-700 px-2">
                Operating Profile & Tariff
              </legend>
              <Field label="Load profile (sets annual run hours) *">
                <select
                  value={loadProfileId}
                  onChange={(e) => setLoadProfileId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select profile…</option>
                  {loadProfiles.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — {p.runHoursPerDay}h × {p.workingDaysPerYear}d, load {(p.averageLoadFraction * 100).toFixed(0)}%
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Supply authority">
                  <select
                    value={authorityId}
                    onChange={(e) => setAuthorityId(e.target.value)}
                    className="input"
                  >
                    <option value="">Use default R2.20/kWh</option>
                    {authorities.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tariff">
                  <select
                    value={tariffId}
                    onChange={(e) => setTariffId(e.target.value)}
                    className="input"
                    disabled={!authorityId || tariffs.length === 0}
                  >
                    <option value="">
                      {authorityId ? (tariffs.length ? 'Select tariff…' : 'None published') : 'Pick authority first'}
                    </option>
                    {tariffs.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </fieldset>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Computing…' : 'Create & Compute'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: rgb(217 119 6);
          box-shadow: 0 0 0 2px rgb(254 215 170);
        }
        .input:disabled { background: rgb(241 245 249); cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ResultPreview({
  result,
  fmtZAR,
  onClose,
}: {
  result: RoiAuditSummary & {
    results?: {
      baselineAnnualKWh?: number;
      proposedAnnualKWh?: number;
      annualEnergySavingKWh?: number;
      annualCostSavingExVat: number;
      paybackYears: number;
      roiPercentFiveYear: number;
      investmentExVat?: number;
      co2SavingTonsPerYear?: number;
      baselineAnnualCostExVat?: number;
      proposedAnnualCostExVat?: number;
    };
  };
  fmtZAR: (n?: number) => string;
  onClose: () => void;
}): JSX.Element {
  const r = result.results;
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-green-800">Audit created and computed</p>
          <p className="text-xs text-green-700">
            ESTIMATED mode — projections based on industry load profile.
          </p>
        </div>
      </div>

      {r && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Metric label="Baseline annual cost" value={fmtZAR(r.baselineAnnualCostExVat)} />
          <Metric label="Proposed annual cost" value={fmtZAR(r.proposedAnnualCostExVat)} />
          <Metric
            label="Annual energy saving"
            value={`${(r.annualEnergySavingKWh ?? 0).toLocaleString()} kWh`}
          />
          <Metric
            label="Annual cost saving"
            value={fmtZAR(r.annualCostSavingExVat)}
            highlight
          />
          <Metric label="Investment (ex VAT)" value={fmtZAR(r.investmentExVat)} />
          <Metric
            label="Payback"
            value={r.paybackYears > 0 ? `${r.paybackYears.toFixed(2)} years` : '—'}
            highlight
          />
          <Metric
            label="5-year ROI"
            value={`${r.roiPercentFiveYear.toFixed(0)}%`}
            highlight
          />
          <Metric
            label="CO₂ saving"
            value={`${(r.co2SavingTonsPerYear ?? 0).toFixed(1)} t/yr`}
          />
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div
      className={`p-3 rounded-lg border ${
        highlight
          ? 'bg-amber-50 border-amber-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${highlight ? 'text-amber-700' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}

export default RoiAudits;

// ===========================================================================
// Edit ROI Audit Modal — pricing/markup + PDF download
// ===========================================================================

interface EditRoiAuditModalProps {
  auditId: string;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function EditRoiAuditModal({
  auditId,
  canManage,
  onClose,
  onSaved,
}: EditRoiAuditModalProps): JSX.Element {
  const [audit, setAudit] = useState<RoiAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pricing form state
  const [costExVat, setCostExVat] = useState('');
  const [markupPercent, setMarkupPercent] = useState('');
  const [quotedPriceExVat, setQuotedPriceExVat] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteValidUntil, setQuoteValidUntil] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [quotedPriceTouched, setQuotedPriceTouched] = useState(false);

  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getRoiAudit(auditId);
        if (cancelled) return;
        setAudit(data);
        const p = data.pricing;
        if (p) {
          if (typeof p.costExVat === 'number') setCostExVat(String(p.costExVat));
          if (typeof p.markupPercent === 'number') setMarkupPercent(String(p.markupPercent));
          if (typeof p.quotedPriceExVat === 'number')
            setQuotedPriceExVat(String(p.quotedPriceExVat));
          if (p.quoteNumber) setQuoteNumber(p.quoteNumber);
          if (p.quoteDate) setQuoteDate(p.quoteDate.slice(0, 10));
          if (p.quoteValidUntil) setQuoteValidUntil(p.quoteValidUntil.slice(0, 10));
          if (p.preparedBy) setPreparedBy(p.preparedBy);
          if (p.notes) setNotes(p.notes);
        }
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message || 'Failed to load audit');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  // Auto-derive quoted price from cost + markup unless user has typed in the
  // quoted-price field manually.
  useEffect(() => {
    if (quotedPriceTouched) return;
    const c = Number(costExVat);
    const m = Number(markupPercent);
    if (costExVat && markupPercent && !Number.isNaN(c) && !Number.isNaN(m)) {
      setQuotedPriceExVat((c * (1 + m / 100)).toFixed(2));
    }
  }, [costExVat, markupPercent, quotedPriceTouched]);

  const fmtZAR = (n?: number): string =>
    typeof n === 'number'
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          maximumFractionDigits: 0,
        }).format(n)
      : '—';

  const handleSave = async (recompute: boolean): Promise<void> => {
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);
    try {
      const payload: UpdateRoiAuditPayload = {
        pricing: {
          costExVat: costExVat ? Number(costExVat) : undefined,
          markupPercent: markupPercent ? Number(markupPercent) : undefined,
          quotedPriceExVat: quotedPriceExVat ? Number(quotedPriceExVat) : undefined,
          quoteNumber: quoteNumber || undefined,
          quoteDate: quoteDate || undefined,
          quoteValidUntil: quoteValidUntil || undefined,
          preparedBy: preparedBy || undefined,
          notes: notes || undefined,
        },
      };
      const updated = await updateRoiAudit(auditId, payload);
      let fresh = updated;
      if (recompute) {
        fresh = await computeRoiAudit(auditId);
      }
      setAudit(fresh);
      setSaveSuccess(true);
      await onSaved();
    } catch (err) {
      setSaveError((err as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (): Promise<void> => {
    setDownloading(true);
    setSaveError(null);
    try {
      await downloadRoiAuditReport(auditId);
    } catch (err) {
      setSaveError((err as Error).message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const customerName =
    audit && typeof audit.customer === 'object' ? audit.customer.name : '';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Edit ROI Audit
            </h3>
            {customerName && (
              <p className="text-xs text-slate-500 mt-0.5">{customerName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="p-6 text-sm text-red-700 bg-red-50 m-6 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {loadError}
          </div>
        ) : audit ? (
          <div className="p-6 space-y-5">
            {/* Read-only summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <SummaryCell label="Mode" value={audit.mode} />
              <SummaryCell label="Status" value={audit.status} />
              <SummaryCell
                label="Annual Saving"
                value={fmtZAR(audit.results?.annualCostSavingExVat)}
              />
              <SummaryCell
                label="Payback"
                value={
                  audit.results?.paybackYears && audit.results.paybackYears > 0
                    ? `${audit.results.paybackYears.toFixed(2)} yr`
                    : '—'
                }
              />
            </div>

            {/* Pricing block */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-medium text-slate-700 px-2">
                Pricing & Quote
              </legend>
              <p className="text-xs text-slate-500 mb-3">
                Admin: enter your <strong>cost</strong> and a <strong>markup %</strong>.
                The quoted price auto-fills (you can override). The quoted price
                replaces the catalogue price in the PDF and payback calc.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Cost (R, ex VAT)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costExVat}
                    onChange={(e) => setCostExVat(e.target.value)}
                    className="input"
                    disabled={!canManage}
                  />
                </Field>
                <Field label="Markup %">
                  <input
                    type="number"
                    step="0.1"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    className="input"
                    disabled={!canManage}
                  />
                </Field>
                <Field label="Quoted price (R, ex VAT)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quotedPriceExVat}
                    onChange={(e) => {
                      setQuotedPriceTouched(true);
                      setQuotedPriceExVat(e.target.value);
                    }}
                    className="input"
                    disabled={!canManage}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <Field label="Quote number">
                  <input
                    type="text"
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="input"
                    placeholder="e.g. Q-2025-001"
                    disabled={!canManage}
                  />
                </Field>
                <Field label="Quote date">
                  <input
                    type="date"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                    className="input"
                    disabled={!canManage}
                  />
                </Field>
                <Field label="Valid until">
                  <input
                    type="date"
                    value={quoteValidUntil}
                    onChange={(e) => setQuoteValidUntil(e.target.value)}
                    className="input"
                    disabled={!canManage}
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Prepared by">
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="input"
                    placeholder="Sales rep or admin name"
                    disabled={!canManage}
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Notes / scope / exclusions">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Anything to call out in the quote (delivery, commissioning, exclusions, etc.)"
                    disabled={!canManage}
                  />
                </Field>
              </div>
            </fieldset>

            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                {saveError}
              </div>
            )}
            {saveSuccess && !saveError && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                Saved.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={saving || downloading}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 border border-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save & Recompute
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: rgb(217 119 6);
          box-shadow: 0 0 0 2px rgb(254 215 170);
        }
        .input:disabled { background: rgb(241 245 249); cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}
