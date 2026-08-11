import { useState } from 'react';
import { X, Save, Loader2, Calendar, Clock, User, MapPin, FileText } from 'lucide-react';
import { createAppointment, type RepCode } from '../lib/api';
import { AddressAutocomplete } from './AddressAutocomplete';
import { SmartDateInput } from './SmartDateInput';

interface AppointmentSchedulerProps {
  leadId: string;
  leadCompanyName: string;
  repCodes: RepCode[];
  onClose: () => void;
  onSave: () => void;
}

export function AppointmentScheduler({ leadId, leadCompanyName, repCodes, onClose, onSave }: AppointmentSchedulerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoCoordinates, setGeoCoordinates] = useState<[number, number] | null>(null);
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    assignedRep: '',
    location: '',
    purpose: '',
    notes: '',
    reminderEnabled: true,
  });

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        appointmentDate: formData.scheduledDate,
        appointmentTime: formData.scheduledTime,
        location: formData.location.trim() || 'Not specified',
        purpose: formData.purpose.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      // Include geo coordinates if address was selected from autocomplete
      if (geoCoordinates) {
        payload.geoLocation = {
          type: 'Point',
          coordinates: geoCoordinates,
        };
      }

      await createAppointment(leadId, payload);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  }

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ars-heading flex items-center gap-2">
              <Calendar className="w-6 h-6 text-ars-primary" />
              Schedule Appointment
            </h2>
            <p className="text-sm text-gray-600 mt-1">For: {leadCompanyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-ars-primary" />
              Date & Time
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <SmartDateInput
                  required
                  min={today}
                  value={formData.scheduledDate}
                  onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.scheduledTime}
                  onChange={(e) => handleChange('scheduledTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-ars-primary" />
              Assignment
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Rep
              </label>
              <select
                value={formData.assignedRep}
                onChange={(e) => handleChange('assignedRep', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {repCodes.map((rep) => (
                  <option key={rep._id} value={rep._id}>
                    {rep.description || rep.code}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the rep who will attend this appointment
              </p>
            </div>
          </div>

          {/* Location & Purpose */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-ars-primary" />
              Details
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <AddressAutocomplete
                value={formData.location}
                onChange={(address, coordinates) => {
                  handleChange('location', address);
                  setGeoCoordinates(coordinates || null);
                }}
                placeholder="Start typing an address to search..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="e.g., Initial meeting, Product demo, Site visit, etc."
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-ars-primary" />
              Notes
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent"
                placeholder="Add any additional information about this appointment..."
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="reminderEnabled"
              checked={formData.reminderEnabled}
              onChange={(e) => handleChange('reminderEnabled', e.target.checked)}
              className="w-4 h-4 text-ars-primary border-gray-300 rounded focus:ring-2 focus:ring-ars-primary"
            />
            <label htmlFor="reminderEnabled" className="text-sm text-gray-700">
              <span className="font-medium">Send reminder notification</span>
              <span className="block text-xs text-gray-600 mt-0.5">
                The assigned rep will receive reminders 1 hour before, 5 minutes before, and 1 minute before the appointment
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-ars-secondary text-ars-heading px-6 py-2 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Schedule Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
