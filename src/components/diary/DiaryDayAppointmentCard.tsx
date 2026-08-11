import React, { useEffect, useMemo, useState } from 'react';
import { Clock, ExternalLink, MapPin, Navigation } from 'lucide-react';
import type { Appointment } from '../../types';
import { StatusBadge, type StatusBadgeTone } from '../ui';
import {
  extractShortLocation,
  formatAppointmentStatusLabel,
  formatAppointmentWhen,
  formatCountdown,
  getAppointmentStatusTone,
  getAppointmentTypeBadgeLabel,
  isAppointmentCompleted,
  normalizeDiaryAppointmentType,
  parseAppointmentDateTime,
} from './diaryUtils';

export interface PlannerAppointment extends Omit<Appointment, 'salesLead'> {
  salesLead?: {
    _id: string;
    leadNumber?: string;
    companyName?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
  };
}

interface DiaryDayAppointmentCardProps {
  appointment: PlannerAppointment;
  onClick: (appointment: PlannerAppointment) => void;
  /** Larger timeline card for Day view with navigate / details actions. */
  variant?: 'compact' | 'timeline';
}

/**
 * Maps diary appointment types to status badge tones.
 */
function typeTone(appointmentType?: string): StatusBadgeTone {
  switch (normalizeDiaryAppointmentType(appointmentType)) {
    case 'rfc':
      return 'rfc';
    case 'loan_rental':
      return 'loan';
    case 'rfc_new_service_level':
      return 'sla';
    default:
      return 'visit';
  }
}

/**
 * CSS class for colour-coded left accent by appointment type.
 */
function typeRailClass(appointmentType?: string): string {
  switch (normalizeDiaryAppointmentType(appointmentType)) {
    case 'rfc':
      return 'crm-type-rfc';
    case 'loan_rental':
      return 'crm-type-loan';
    case 'rfc_new_service_level':
      return 'crm-type-sla';
    default:
      return 'crm-type-visit';
  }
}

/**
 * Field-ready appointment card: customer first, then type, when, address, countdown, actions.
 */
const DiaryDayAppointmentCard: React.FC<DiaryDayAppointmentCardProps> = ({
  appointment,
  onClick,
  variant = 'compact',
}) => {
  const [now, setNow] = useState(() => new Date());
  const isCompleted = isAppointmentCompleted(appointment);
  const tone = typeTone(appointment.appointmentType);
  const statusTone = getAppointmentStatusTone(appointment.status);
  const isTimeline = variant === 'timeline';
  const customerName = appointment.salesLead?.companyName || 'Client';
  const address =
    appointment.location ||
    appointment.salesLead?.contactAddress ||
    null;
  const shortAddress = extractShortLocation(address || undefined) || address;
  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  useEffect(() => {
    if (isCompleted) return;
    const intervalId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, [isCompleted]);

  const countdown = useMemo(() => {
    if (isCompleted) return null;
    const dateTime = parseAppointmentDateTime(
      appointment.appointmentDate,
      appointment.appointmentTime,
    );
    return dateTime ? formatCountdown(dateTime, now) : null;
  }, [appointment.appointmentDate, appointment.appointmentTime, isCompleted, now]);

  return (
    <div
      className={`group w-full rounded-crm-lg border text-left shadow-crm transition duration-200 ${typeRailClass(appointment.appointmentType)} ${
        isCompleted
          ? 'border-emerald-200/60 bg-emerald-50/50 opacity-90 dark:border-emerald-500/20 dark:bg-emerald-500/10'
          : 'crm-glass hover:-translate-y-0.5 hover:shadow-crm-md'
      } ${isTimeline ? 'px-4 py-3.5' : 'px-3 py-2.5'}`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick(appointment);
        }}
        className="w-full text-left"
      >
        <p
          className={`leading-snug text-ink ${
            isTimeline ? 'text-base font-bold sm:text-lg' : 'text-[13px] font-bold'
          }`}
        >
          {customerName}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge
            label={getAppointmentTypeBadgeLabel(appointment.appointmentType)}
            tone={tone}
            className="!normal-case tracking-normal"
          />
          <StatusBadge
            label={formatAppointmentStatusLabel(appointment.status)}
            tone={statusTone}
          />
        </div>

        <p
          className={`mt-2 flex items-center gap-1.5 font-medium text-ink ${
            isTimeline ? 'text-sm' : 'text-[11px]'
          }`}
        >
          <span aria-hidden>📅</span>
          <span>
            {formatAppointmentWhen(appointment.appointmentDate, appointment.appointmentTime)}
          </span>
        </p>

        {shortAddress ? (
          <p
            className={`mt-1.5 flex items-center gap-1.5 text-ink-muted ${
              isTimeline ? 'text-sm' : 'text-[11px]'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
            <span className="truncate">{shortAddress}</span>
          </p>
        ) : null}

        {countdown ? (
          <p
            className={`mt-1.5 inline-flex items-center gap-1.5 font-semibold text-brand ${
              isTimeline ? 'text-sm' : 'text-[11px]'
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{countdown}</span>
          </p>
        ) : null}
      </button>

      <div className={`mt-3 flex flex-wrap gap-2 ${isTimeline ? '' : 'gap-1.5'}`}>
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={`crm-press inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-crm bg-brand px-3 text-xs font-semibold text-white shadow-crm hover:bg-brand-deep ${
              isTimeline ? '' : 'min-h-[40px] px-2.5'
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            Navigate
          </a>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick(appointment);
          }}
          className={`crm-press inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-crm border border-line bg-surface-elevated px-3 text-xs font-semibold text-ink hover:bg-surface-muted ${
            isTimeline ? '' : 'min-h-[40px] px-2.5'
          }`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Details
        </button>
      </div>
    </div>
  );
};

export default DiaryDayAppointmentCard;
