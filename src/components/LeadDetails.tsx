import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lead, LeadStatus, Profile, LeadStatusHistory, Attachment } from '../types';
import {
  X,
  Calendar,
  User,
  Building2,
  Banknote,
  FileText,
  Download,
  Trash2,
} from 'lucide-react';

interface LeadDetailsProps {
  lead: Lead;
  statuses: LeadStatus[];
  users: Profile[];
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetails({ lead, statuses, users, onClose, onUpdate }: LeadDetailsProps) {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<LeadStatusHistory[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [booking, setBooking] = useState({
    technician_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    location: '',
  });
  const [statusUpdate, setStatusUpdate] = useState({
    status_id: lead.current_status_id || '',
    notes: '',
    reference_number: '',
  });

  const isPOGoAheadSelected = (() => {
    if (!statusUpdate.status_id) return false;
    const s = statuses.find((x) => x.id === statusUpdate.status_id);
    const n = (s?.name || '').toLowerCase();
    return n.includes('po received') || n.includes('go-ahead');
  })();

  useEffect(() => {
    loadHistory();
    loadAttachments();
  }, [lead.id]);

  async function loadHistory() {
    try {
      const { data } = await supabase
        .from('lead_status_history')
        .select('*, status:lead_statuses(*), changed_by_user:profiles(*)')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (data) setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  async function loadAttachments() {
    try {
      const { data } = await supabase
        .from('attachments')
        .select('*, status:lead_statuses(*), uploaded_by_user:profiles(*)')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (data) setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  }

  async function handleStatusUpdate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const status = statuses.find((s) => s.id === statusUpdate.status_id);

      if (status?.requires_reference_number && !statusUpdate.reference_number) {
        alert('This status requires a reference number');
        setLoading(false);
        return;
      }

      if (status?.requires_attachment && !selectedFile) {
        alert('This status requires a file attachment');
        setLoading(false);
        return;
      }

      // Update lead status, and set reference numbers for known status types
      const updates: any = {
        current_status_id: statusUpdate.status_id,
        updated_at: new Date().toISOString(),
      };

      if (status?.requires_reference_number && statusUpdate.reference_number) {
        const name = (status?.name || '').toLowerCase();
        if (name.includes('quote')) {
          updates.quote_number = statusUpdate.reference_number;
        } else if (name.includes('invoice')) {
          updates.invoice_number = statusUpdate.reference_number;
        } else if (name.includes('purchase') || name.includes('order')) {
          updates.order_number = statusUpdate.reference_number;
        }
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', lead.id);

      if (updateError) throw updateError;

      const alertDate = status?.days_until_alert
        ? new Date(Date.now() + status.days_until_alert * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: historyError } = await supabase.from('lead_status_history').insert({
        lead_id: lead.id,
        status_id: statusUpdate.status_id,
        changed_by: profile?.id,
        notes: statusUpdate.notes,
        reference_number: statusUpdate.reference_number,
        alert_date: alertDate,
      });

      if (historyError) throw historyError;

      if (selectedFile) {
        await handleFileUpload();
      }

      // If status is PO Received/Go-Ahead, create a tech booking if provided
      if ((status?.name || '').toLowerCase().includes('po received') || (status?.name || '').toLowerCase().includes('go-ahead')) {
        if (booking.technician_id && booking.booking_date && booking.start_time && booking.end_time) {
          const { error: bookingError } = await supabase.from('tech_bookings').insert({
            lead_id: lead.id,
            technician_id: booking.technician_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            location: booking.location || null,
            created_by: profile?.id,
          });
          if (bookingError) throw bookingError;
        }
      }

  setShowStatusUpdate(false);
      setStatusUpdate({ status_id: '', notes: '', reference_number: '' });
      setSelectedFile(null);
  setBooking({ technician_id: '', booking_date: '', start_time: '', end_time: '', location: '' });
      loadHistory();
      loadAttachments();
      onUpdate();
    } catch (error: any) {
      alert(error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) return;

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${lead.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lead-attachments')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: attachmentError } = await supabase.from('attachments').insert({
        lead_id: lead.id,
        status_id: statusUpdate.status_id,
        file_name: selectedFile.name,
        file_path: fileName,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        uploaded_by: profile?.id,
      });

      if (attachmentError) throw attachmentError;
    } catch (error: any) {
      throw new Error('Failed to upload file: ' + error.message);
    }
  }

  async function downloadAttachment(attachment: Attachment) {
    try {
      const { data, error } = await supabase.storage
        .from('lead-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('Failed to download file: ' + error.message);
    }
  }

  async function deleteAttachment(attachment: Attachment) {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (deleteError) throw deleteError;

      await supabase.storage.from('lead-attachments').remove([attachment.file_path]);

      loadAttachments();
    } catch (error: any) {
      alert('Failed to delete attachment: ' + error.message);
    }
  }

  const canEdit = isAdmin || lead.assigned_rep === profile?.id || lead.assigned_admin === profile?.id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{lead.lead_number}</h2>
            <p className="text-sm text-slate-600">{lead.client_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Lead Information</h3>

              <div className="space-y-3">
                {lead.client_name === 'Cash Sales' && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Cash Customer</p>
                      <p className="text-sm text-slate-900">{lead.cash_customer_name || '-'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Contact Person</p>
                    <p className="text-sm text-slate-900">{lead.contact_person || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Email</p>
                    <p className="text-sm text-slate-900">{lead.contact_email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Phone</p>
                    <p className="text-sm text-slate-900">{lead.contact_phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Branch</p>
                    <p className="text-sm text-slate-900">{lead.branch?.name || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Assigned Rep</p>
                    <p className="text-sm text-slate-900">
                      {lead.assigned_rep_user?.full_name || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Assigned Admin</p>
                    <p className="text-sm text-slate-900">
                      {lead.assigned_admin_user?.full_name || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Estimated Value</p>
                    <p className="text-sm text-slate-900">
                      {lead.estimated_value ? `R${lead.estimated_value.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Created</p>
                    <p className="text-sm text-slate-900">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {lead.description && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
                  <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg">
                    {lead.description}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Current Status</h3>
                {canEdit && (
                  <button
                    onClick={() => setShowStatusUpdate(!showStatusUpdate)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    {showStatusUpdate ? 'Cancel' : 'Update Status'}
                  </button>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-1">Status</p>
                <p className="text-lg font-bold text-slate-900">
                  {lead.current_status?.name || 'Unknown'}
                </p>
              </div>

              {showStatusUpdate && (
                <form onSubmit={handleStatusUpdate} className="bg-slate-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      New Status
                    </label>
                    <select
                      required
                      value={statusUpdate.status_id}
                      onChange={(e) =>
                        setStatusUpdate({ ...statusUpdate, status_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                      <option value="">Select Status</option>
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {statusUpdate.status_id &&
                    statuses.find((s) => s.id === statusUpdate.status_id)
                      ?.requires_reference_number && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {(() => {
                            const s = statuses.find((x) => x.id === statusUpdate.status_id);
                            const n = (s?.name || '').toLowerCase();
                            if (n.includes('purchase') || n.includes('order')) return 'PO Number *';
                            if (n.includes('quote')) return 'Quote Number *';
                            if (n.includes('invoice')) return 'Invoice Number *';
                            return 'Reference Number *';
                          })()}
                        </label>
                        <input
                          type="text"
                          required
                          value={statusUpdate.reference_number}
                          onChange={(e) =>
                            setStatusUpdate({ ...statusUpdate, reference_number: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          placeholder="Quote/Order/Invoice number"
                        />
                      </div>
                    )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea
                      rows={3}
                      value={statusUpdate.notes}
                      onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                      placeholder="Add notes about this status change..."
                    />
                  </div>

                  {statusUpdate.status_id &&
                    statuses.find((s) => s.id === statusUpdate.status_id)?.requires_attachment && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Attachment *
                        </label>
                        <input
                          type="file"
                          required
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                    )}

                  {isPOGoAheadSelected && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded border border-slate-200">
                      <div className="md:col-span-2 text-sm font-medium text-slate-700">Book Technician</div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Technician *</label>
                        <select
                          required
                          value={booking.technician_id}
                          onChange={(e) => setBooking({ ...booking, technician_id: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        >
                          <option value="">Select technician</option>
                          {users
                            .filter((u) => u.is_active)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                        <input
                          type="date"
                          required
                          value={booking.booking_date}
                          onChange={(e) => setBooking({ ...booking, booking_date: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Start Time *</label>
                        <input
                          type="time"
                          required
                          value={booking.start_time}
                          onChange={(e) => setBooking({ ...booking, start_time: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">End Time *</label>
                        <input
                          type="time"
                          required
                          value={booking.end_time}
                          onChange={(e) => setBooking({ ...booking, end_time: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={booking.location}
                          onChange={(e) => setBooking({ ...booking, location: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          placeholder="Site address or notes"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Status'}
                  </button>
                </form>
              )}

              {lead.quote_number && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-1">Quote Number</p>
                  <p className="text-sm text-slate-900">{lead.quote_number}</p>
                </div>
              )}

              {lead.order_number && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-1">Order Number</p>
                  <p className="text-sm text-slate-900">{lead.order_number}</p>
                </div>
              )}

              {lead.invoice_number && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-1">Invoice Number</p>
                  <p className="text-sm text-slate-900">{lead.invoice_number}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Attachments</h3>
            <div className="space-y-2">
              {attachments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg">
                  No attachments
                </p>
              ) : (
                attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{attachment.file_name}</p>
                        <p className="text-xs text-slate-500">
                          {attachment.status?.name} •{' '}
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadAttachment(attachment)}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                      </button>
                      {(isAdmin || attachment.uploaded_by === profile?.id) && (
                        <button
                          onClick={() => deleteAttachment(attachment)}
                          className="p-2 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Status History</h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg">
                  No history yet
                </p>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="flex gap-4 pb-3 border-b border-slate-200 last:border-0">
                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {entry.status?.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.changed_by_user?.full_name} •{' '}
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                        {entry.reference_number && (
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            {entry.reference_number}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-2 rounded">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
