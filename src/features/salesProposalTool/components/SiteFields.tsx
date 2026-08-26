import { useEffect, useState } from 'react';
import { getMachinesByCustomer, type Customer } from '../../../lib/api';
import { uniqueKnownLocations } from '../knownSiteLocations';

interface SiteFieldsProps {
  customer: Customer | null;
  siteName: string;
  onSiteNameChange: (name: string) => void;
}

export function SiteFields({ customer, siteName, onSiteNameChange }: SiteFieldsProps) {
  const [mode, setMode] = useState<'known' | 'new'>('new');
  const [knownLocations, setKnownLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer?._id) {
      setKnownLocations([]);
      setMode('new');
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getMachinesByCustomer(customer._id)
      .then(({ machines }) => {
        if (cancelled) return;
        const locations = uniqueKnownLocations(machines);
        setKnownLocations(locations);
        if (locations.length === 0) {
          setMode('new');
        } else if (siteName && !locations.includes(siteName)) {
          setMode('new');
        } else {
          setMode('known');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setKnownLocations([]);
          setMode('new');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer?._id]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70 mb-1">
          Site
        </label>
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            disabled={knownLocations.length === 0}
            onClick={() => setMode('known')}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-medium ${
              mode === 'known'
                ? 'bg-[#f7c12b] text-[#383838]'
                : 'bg-slate-100 text-[#383838] disabled:opacity-50'
            }`}
          >
            Known location
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-medium ${
              mode === 'new' ? 'bg-[#f7c12b] text-[#383838]' : 'bg-slate-100 text-[#383838]'
            }`}
          >
            New site
          </button>
        </div>
        {mode === 'known' && knownLocations.length > 0 ? (
          <select
            value={knownLocations.includes(siteName) ? siteName : ''}
            onChange={(event) => onSiteNameChange(event.target.value)}
            className="w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          >
            <option value="">Select known location</option>
            {knownLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={siteName}
            onChange={(event) => onSiteNameChange(event.target.value)}
            placeholder="Site name"
            className="w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
        )}
        {loading && (
          <p className="mt-1 text-xs text-slate-500">Looking up known machine locations…</p>
        )}
      </div>
      {customer?.address && (
        <p className="text-xs text-slate-500">
          Customer address is available as a suggestion only — it may not be the compressor site.{' '}
          <button
            type="button"
            className="font-medium text-[#0969a9] underline"
            onClick={() => {
              setMode('new');
              onSiteNameChange(customer.address || '');
            }}
          >
            Use as site name
          </button>
        </p>
      )}
    </div>
  );
}
