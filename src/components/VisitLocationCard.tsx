import { formatOutOfLocationDistance } from '../utils/salesRequestDistance';
import type { ReadableVisitGps } from '../utils/salesRequestHistoryView';

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Readable visit GPS card shared by RFQ review and submission history.
 */
export function VisitLocationCard({ gps }: { gps: ReadableVisitGps }) {
  if (gps.verified && gps.latitude !== undefined && gps.longitude !== undefined) {
    return (
      <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-emerald-900">
          Visit Location (GPS)
        </h3>
        <p className="mb-3 text-xs text-emerald-800">
          Where the rep was when they submitted — not the customer address on file.
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-emerald-800/80">Status</dt>
            <dd className="font-semibold text-emerald-800">GPS Verified</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-emerald-800/80">Latitude</dt>
            <dd>{gps.latitude.toFixed(6)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-emerald-800/80">Longitude</dt>
            <dd>{gps.longitude.toFixed(6)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-emerald-800/80">Accuracy</dt>
            <dd>
              {gps.accuracyMeters !== undefined
                ? `${Math.round(gps.accuracyMeters)} metres`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-emerald-800/80">Timestamp</dt>
            <dd>{formatWhen(gps.capturedAt)}</dd>
          </div>
          <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
            <dt className="text-xs font-semibold uppercase text-emerald-800/80">
              GPS detected address
            </dt>
            <dd className="mt-0.5 text-emerald-950">
              {gps.address || `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`}
            </dd>
          </div>
          {gps.outsideExpectedLocation ? (
            <div className="sm:col-span-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              Outside expected location
              {gps.distanceFromExpectedMeters !== undefined
                ? ` (${formatOutOfLocationDistance(gps.distanceFromExpectedMeters)})`
                : ''}
            </div>
          ) : null}
        </dl>
        <a
          href={`https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/50"
        >
          View GPS on Google Maps
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-amber-900">
        Visit Location (GPS)
      </h3>
      <p className="mb-2 text-sm font-semibold text-amber-950">
        Location not captured — representative declined or permission was unavailable.
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase text-amber-800/80">Status</dt>
          <dd className="font-semibold text-amber-900">GPS Declined / Unavailable</dd>
        </div>
        {gps.permissionStatus ? (
          <div>
            <dt className="text-xs font-semibold uppercase text-amber-800/80">Permission</dt>
            <dd>{gps.permissionStatus}</dd>
          </div>
        ) : null}
        {gps.capturedAt ? (
          <div>
            <dt className="text-xs font-semibold uppercase text-amber-800/80">Recorded at</dt>
            <dd>{formatWhen(gps.capturedAt)}</dd>
          </div>
        ) : null}
        {gps.declineReason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-amber-800/80">Reason</dt>
            <dd>{gps.declineReason}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
