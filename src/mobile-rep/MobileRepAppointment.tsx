import React from 'react';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Phone,
  Play,
  Wrench,
} from 'lucide-react';
import type { PlannerAppointment } from '../components/diary/DiaryDayAppointmentCard';
import { getAppointmentTypeBadgeLabel } from '../components/diary/diaryUtils';
import { loadVisitSession } from '../components/diary/visitUtils';
import {
  buildNavigateUrl,
  buildTelUrl,
  formatMobileTime,
} from './mobileRepUtils';

interface MobileRepAppointmentProps {
  appointment: PlannerAppointment;
  onBack: () => void;
  onStartVisit: (appointment: PlannerAppointment) => void;
}

/**
 * Full-screen mobile appointment page with large field-service actions.
 */
const MobileRepAppointment: React.FC<MobileRepAppointmentProps> = ({
  appointment,
  onBack,
  onStartVisit,
}) => {
  const navigateUrl = buildNavigateUrl(appointment);
  const callUrl = buildTelUrl(appointment.salesLead?.contactPhone);
  const hasActiveVisit =
    Boolean(loadVisitSession(appointment._id)) || appointment.status === 'in_progress';
  const address =
    appointment.location ||
    appointment.salesLead?.contactAddress ||
    'No address on file';

  return (
    <div className="mobile-rep-shell fixed inset-0 z-[60] flex flex-col">
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0969a9] via-[#0a7ec4] to-[#064e7a] px-3 pb-3.5 pt-[max(0.85rem,env(safe-area-inset-top))] text-white shadow-[0_8px_24px_rgba(9,105,169,0.25)]">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold tracking-tight">Appointment</h1>
            <p className="truncate text-xs font-medium text-white/85">
              {formatMobileTime(appointment.appointmentTime)} ·{' '}
              {getAppointmentTypeBadgeLabel(appointment.appointmentType)}
            </p>
          </div>
        </div>
      </header>

      <div className="mobile-rep-rise flex-1 overflow-y-auto px-4 py-4 pb-40">
        <section className="mobile-rep-card rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Customer</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            {appointment.salesLead?.companyName || 'Customer'}
          </h2>
          {appointment.salesLead?.contactPerson && (
            <p className="mt-1 text-sm font-medium text-slate-600">{appointment.salesLead.contactPerson}</p>
          )}
          {appointment.salesLead?.leadNumber && (
            <p className="mt-1 text-xs text-slate-400">{appointment.salesLead.leadNumber}</p>
          )}
        </section>

        <dl className="mt-3 space-y-3">
          <div className="mobile-rep-card rounded-2xl p-4">
            <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-[#0969a9]" />
              Address
            </dt>
            <dd className="mt-2 text-base font-medium text-slate-900">{address}</dd>
          </div>
          <div className="mobile-rep-card rounded-2xl p-4">
            <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <Phone className="h-3.5 w-3.5 text-[#0969a9]" />
              Phone
            </dt>
            <dd className="mt-2 text-base font-medium text-slate-900">
              {appointment.salesLead?.contactPhone || 'No phone on file'}
            </dd>
          </div>
          <div className="mobile-rep-card rounded-2xl p-4">
            <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <Wrench className="h-3.5 w-3.5 text-[#0969a9]" />
              Service
            </dt>
            <dd className="mt-2 text-base font-medium text-slate-900">
              {getAppointmentTypeBadgeLabel(appointment.appointmentType)}
              {appointment.purpose ? ` — ${appointment.purpose}` : ''}
            </dd>
          </div>
        </dl>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-[61] space-y-2 border-t border-white/60 bg-white/95 px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(9,105,169,0.12)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onStartVisit(appointment)}
          className="mobile-rep-action inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#0969a9] px-4 text-base font-bold text-white shadow-[0_8px_20px_rgba(9,105,169,0.3)]"
        >
          <Play className="h-5 w-5 fill-current" />
          {hasActiveVisit ? 'Resume Visit' : 'Start Visit'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={navigateUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`mobile-rep-action mobile-rep-card inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl text-sm font-bold text-slate-800 ${
              !navigateUrl ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <Navigation className="h-4 w-4 text-[#0969a9]" />
            Navigate
          </a>
          <a
            href={callUrl || undefined}
            className={`mobile-rep-action mobile-rep-card inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl text-sm font-bold text-slate-800 ${
              !callUrl ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            <Phone className="h-4 w-4 text-[#0969a9]" />
            Call
          </a>
        </div>
      </footer>
    </div>
  );
};

export default MobileRepAppointment;
