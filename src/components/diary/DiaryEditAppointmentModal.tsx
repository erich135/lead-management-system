import React, { useEffect, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { updateAppointment } from '../../lib/api';
import { AddressAutocomplete } from '../AddressAutocomplete';
import { SmartDateInput } from '../SmartDateInput';
import type { PlannerAppointment } from './DiaryDayAppointmentCard';
import {
  DIARY_APPOINTMENT_TYPE_OPTIONS,
  formatDateForInput,
  getAppointmentLeadId,
  normalizeDiaryAppointmentType,
  requiresSiteVisitPin,
  toTimeInputValue,
} from './diaryUtils';
import { buildGeoLocationPayload, sanitizeGeoLocationForRequest } from '../../utils/geoLocation';

interface DiaryEditAppointmentModalProps {
  appointment: PlannerAppointment | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const FIELD_LABEL = 'mb-1.5 block text-sm font-semibold text-gray-700';
const FIELD_INPUT =
  'w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-ars-primary focus:outline-none focus:ring-2 focus:ring-ars-primary/20';

/**
 * White modal for editing an existing diary appointment.
 */
const DiaryEditAppointmentModal: React.FC<DiaryEditAppointmentModalProps> = ({
  appointment,
  onClose,
  onUpdated,
}) => {
  const [locationCoordinates, setLocationCoordinates] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'site_visit',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (!appointment) {
      return;
    }

    setFormData({
      appointmentDate: formatDateForInput(new Date(appointment.appointmentDate)),
      appointmentTime: toTimeInputValue(appointment.appointmentTime),
      appointmentType: normalizeDiaryAppointmentType(appointment.appointmentType),
      location: appointment.location || '',
      notes: appointment.notes || '',
    });
    setLocationCoordinates(appointment.geoLocation?.coordinates ?? null);
    setError(null);
  }, [appointment]);

  if (!appointment) {
    return null;
  }

  const leadId = getAppointmentLeadId(appointment);
  const customerName = appointment.salesLead?.companyName || 'Customer';

  /**
   * Updates one field in the edit form.
   */
  function handleFieldChange(field: string, value: string): void {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Saves the edited appointment details.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!leadId) {
      setError('Unable to resolve the linked customer for this appointment.');
      return;
    }

    const appointmentType = normalizeDiaryAppointmentType(formData.appointmentType);
    const trimmedLocation = formData.location.trim();

    if (requiresSiteVisitPin(appointmentType)) {
      if (!trimmedLocation) {
        setError('Enter a location for this Site Visit.');
        return;
      }

      if (!buildGeoLocationPayload(locationCoordinates)) {
        setError('Pin the Site Visit location on the map before saving.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = sanitizeGeoLocationForRequest({
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        appointmentType,
        location: trimmedLocation || 'Not specified',
        notes: formData.notes,
        geoLocation: buildGeoLocationPayload(locationCoordinates),
      });

      await updateAppointment(leadId, appointment._id, payload);
      await onUpdated();
      onClose();
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl mobile-fit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-appointment-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 id="edit-appointment-title" className="truncate text-lg font-bold text-gray-900">
              Edit appointment
            </h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">{customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={FIELD_LABEL}>Date</label>
                <SmartDateInput
                  required
                  value={formData.appointmentDate}
                  onChange={(event) => handleFieldChange('appointmentDate', event.target.value)}
                  className={FIELD_INPUT}
                />
              </div>
              <div>
                <label className={FIELD_LABEL}>Time</label>
                <input
                  required
                  type="time"
                  value={formData.appointmentTime}
                  onChange={(event) => handleFieldChange('appointmentTime', event.target.value)}
                  className={FIELD_INPUT}
                />
              </div>
            </div>

            <div>
              <label className={FIELD_LABEL}>Appointment type</label>
              <div className="grid grid-cols-2 gap-2">
                {DIARY_APPOINTMENT_TYPE_OPTIONS.map((option) => {
                  const active = formData.appointmentType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFieldChange('appointmentType', option.value)}
                      className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                        active
                          ? 'border-ars-primary bg-ars-primary text-white shadow-md'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-ars-primary/40'
                      }`}
                    >
                      <span aria-hidden>{option.icon}</span>
                      <span className="leading-tight">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={FIELD_LABEL}>
                Location{' '}
                {requiresSiteVisitPin(formData.appointmentType) ? (
                  <span className="text-red-500">*</span>
                ) : null}
              </label>
              <AddressAutocomplete
                value={formData.location}
                coordinates={locationCoordinates}
                onChange={(address, coordinates) => {
                  handleFieldChange('location', address);
                  setLocationCoordinates(coordinates ?? null);
                }}
                placeholder="Search address or pin on map"
                required={requiresSiteVisitPin(formData.appointmentType)}
              />
            </div>

            <div>
              <label className={FIELD_LABEL}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(event) => handleFieldChange('notes', event.target.value)}
                rows={3}
                className={FIELD_INPUT}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex gap-2 border-t border-gray-200 bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-ars-primary text-sm font-semibold text-white hover:bg-ars-primary/90 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiaryEditAppointmentModal;
