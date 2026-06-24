import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Eye, Calendar, User, RefreshCw, MapPin, Edit2, X, Save } from 'lucide-react';
import { getJobCardSubmissions, getJobCardSubmission, patchJobCardSubmission, type JobCardSubmissionRecord } from '../lib/api';
import { FixedJobCardPrintView } from './FixedJobCardPrintView';

/** Build a map of fieldId → { label, type, options } from template sections. */
function buildFieldLabelMap(sections: any[]): Map<string, { label: string; type: string; options?: string[] }> {
  const map = new Map<string, { label: string; type: string; options?: string[] }>();
  for (const section of sections) {
    if (section.fields) {
      for (const f of section.fields) map.set(f.id, { label: f.label, type: f.type, options: f.options });
    }
    if (section.items) {
      for (const item of section.items) map.set(item.id, { label: item.label, type: item.inputType });
    }
    if (section.rows) {
      for (const row of section.rows) {
        if (row.fields) for (const f of row.fields) map.set(f.id, { label: f.label, type: f.type });
      }
    }
  }
  return map;
}

const NON_EDITABLE_TYPES = new Set(['signature', 'photo', 'jobField', 'machineField']);

export function JobCardSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<JobCardSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    submission: JobCardSubmissionRecord;
    machine?: Record<string, unknown>;
  } | null>(null);

  // Edit modal state
  const [editSubmission, setEditSubmission] = useState<JobCardSubmissionRecord | null>(null);
  const [editValues, setEditValues] = useState<{ fieldId: string; label: string; type: string; value: string; options?: string[] }[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJobCardSubmissions();
      setSubmissions(res.submissions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const submissionId = searchParams.get('submission');
    if (submissionId) openPreview(submissionId);
  }, [searchParams]);

  const openPreview = async (id: string) => {
    try {
      const data = await getJobCardSubmission(id);
      setPreviewData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    }
  };

  const closePreview = () => {
    setPreviewData(null);
    searchParams.delete('submission');
    setSearchParams(searchParams);
  };

  const openEdit = async (submission: JobCardSubmissionRecord) => {
    setLoadingEdit(true);
    try {
      // Fetch full submission to get template sections for labels
      const { submission: full } = await getJobCardSubmission(submission._id);
      const sections: any[] = (full.template as any)?.sections || [];
      const labelMap = buildFieldLabelMap(sections);

      const editable = full.fieldValues
        .filter(fv => !fv.signatureData && !fv.imageData && !NON_EDITABLE_TYPES.has(fv.type))
        .map(fv => {
          const meta = labelMap.get(fv.fieldId);
          return {
            fieldId: fv.fieldId,
            label: meta?.label ?? fv.fieldId,
            type: meta?.type ?? fv.type,
            value: fv.value != null ? String(fv.value) : '',
            options: meta?.options,
          };
        });

      setEditValues(editable);
      setEditNotes(full.notes || '');
      setEditSubmission(full);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submission for editing');
    } finally {
      setLoadingEdit(false);
    }
  };

  const saveEdit = async () => {
    if (!editSubmission) return;
    setSavingEdit(true);
    try {
      const { submission: updated } = await patchJobCardSubmission(editSubmission._id, {
        fieldValues: editValues.map(ev => ({ fieldId: ev.fieldId, value: ev.value })),
        notes: editNotes,
      });
      setSubmissions(prev => prev.map(s => s._id === updated._id ? { ...s, notes: updated.notes } : s));
      setEditSubmission(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const updateEditValue = (fieldId: string, value: string) => {
    setEditValues(prev => prev.map(ev => ev.fieldId === fieldId ? { ...ev, value } : ev));
  };

  const renderEditInput = (ev: { fieldId: string; label: string; type: string; value: string; options?: string[] }) => {
    if (ev.type === 'number') {
      return <input type="number" value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />;
    }
    if (ev.type === 'date') {
      return <input type="date" value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />;
    }
    if (ev.type === 'textarea') {
      return <textarea value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y" />;
    }
    if (ev.type === 'checkbox' || ev.type === 'yesno') {
      return (
        <select value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">—</option>
          <option value="true">Yes / Pass</option>
          <option value="false">No / Fail</option>
        </select>
      );
    }
    if (ev.type === 'pass_fail') {
      return (
        <select value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">—</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="n/a">N/A</option>
        </select>
      );
    }
    if (ev.options && ev.options.length > 0) {
      return (
        <select value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">—</option>
          {ev.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return <input type="text" value={ev.value} onChange={e => updateEditValue(ev.fieldId, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="bg-white rounded-[8px] shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#383838] mb-2 flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#0969a9]" />
                Job Card Submissions
              </h1>
              <p className="text-sm text-gray-600">
                View and print completed job cards from technicians
              </p>
            </div>
            <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-[8px] shadow-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0969a9] mx-auto mb-4" />
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No submissions yet</h3>
              <p className="text-sm text-gray-500">Submissions from technicians will appear here after they complete assigned job cards</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission._id} className="border border-gray-200 rounded-[8px] p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">
                          {(submission.job as { jobNumber?: string })?.jobNumber || 'N/A'}
                        </h3>
                        <span className="text-sm text-gray-600">{submission.template?.name || 'N/A'}</span>
                        {submission.reportNumber && (
                          <span className="text-sm text-red-700 font-medium">#{submission.reportNumber}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{submission.submittedBy?.firstName} {submission.submittedBy?.lastName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                        </div>
                        {submission.submissionLocation && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <a
                              href={`https://www.google.com/maps?q=${submission.submissionLocation.lat},${submission.submissionLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 underline hover:text-green-900"
                              title={`Accuracy: ${submission.submissionLocation.accuracy ? Math.round(submission.submissionLocation.accuracy) + 'm' : 'unknown'}`}
                            >
                              View location
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(submission)}
                        disabled={loadingEdit}
                        className="px-4 py-2 bg-amber-50 text-amber-700 rounded-[6px] hover:bg-amber-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openPreview(submission._id)}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-[6px] hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View &amp; Print
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editSubmission && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Edit Submission</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editSubmission.reportNumber ? `#${editSubmission.reportNumber} · ` : ''}
                  {editSubmission.template?.name} — {(editSubmission.job as { jobNumber?: string })?.jobNumber || ''}
                </p>
                <p className="text-xs text-amber-600 mt-1">Signatures and photos cannot be changed.</p>
              </div>
              <button onClick={() => setEditSubmission(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {editValues.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No editable fields found on this submission.</p>
              ) : (
                editValues.map(ev => (
                  <div key={ev.fieldId}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{ev.label}</label>
                    {renderEditInput(ev)}
                  </div>
                ))
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  placeholder="Admin notes..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-gradient-to-r from-[#f7c12b] to-[#f9d04a] text-[#383838] rounded-[8px] font-bold text-sm shadow hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingEdit ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
              <button
                type="button"
                onClick={() => setEditSubmission(null)}
                className="px-5 py-2.5 border border-gray-300 rounded-[8px] font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {previewData && (
        <FixedJobCardPrintView
          template={previewData.submission.template}
          fieldValues={previewData.submission.fieldValues}
          job={previewData.submission.job as Record<string, unknown>}
          machine={previewData.machine}
          reportNumber={previewData.submission.reportNumber}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

