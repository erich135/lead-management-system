import type { JobCardWorkEvent } from '../../lib/api';
import { formatOperationalSignOffTime } from './OperationalSignOffReference';

function recordedLocation(location: JobCardWorkEvent['location']) {
  const lat = location?.lat;
  const lng = location?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)
    || lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Unavailable';
  return <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
    {lat.toFixed(6)}, {lng.toFixed(6)}
  </a>;
}

/** Shows all recorded events from the exact linked assignment, without merging visits. */
export function JobCardWorkEvents({ events = [] }: { events?: JobCardWorkEvent[] }) {
  const recorded = events.filter(event => event.action === 'start' || event.action === 'finish');
  const rows: JobCardWorkEvent[] = [...recorded];
  if (!recorded.some(event => event.action === 'start')) rows.unshift({ action: 'start' });
  if (!recorded.some(event => event.action === 'finish')) rows.push({ action: 'finish' });
  const multiple = recorded.filter(event => event.action === 'start').length > 1
    || recorded.filter(event => event.action === 'finish').length > 1;
  return (
    <div className="jcr-block jcr-keep" data-job-card-work-events="">
      <h2 className="jcr-section-title">Start and Finish</h2>
      {multiple && <p>Multiple recorded events are shown separately; no visits have been combined.</p>}
      <table>
        <thead><tr><th>Event</th><th>Technician</th><th>Device time (South Africa)</th><th>Received by server (South Africa)</th><th>Location</th></tr></thead>
        <tbody>{rows.map((event, index) => {
          const name = event.user && typeof event.user === 'object'
            ? `${event.user.firstName || ''} ${event.user.lastName || ''}`.trim() : '';
          return <tr key={event._id || `missing-${event.action}-${index}`}>
            <td>{event.action === 'start' ? 'Start Work' : 'Finish Work'}</td>
            <td>{name || 'Unavailable'}</td>
            <td>{formatOperationalSignOffTime(event.deviceTime)}</td>
            <td>{formatOperationalSignOffTime(event.serverReceivedAt)}</td>
            <td>{recordedLocation(event.location)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
