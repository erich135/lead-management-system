import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import {
  geocodeAutocomplete,
  geocodeEnrich,
  geocodePlaceDetails,
  geocodeSearch,
  type PlaceSuggestion,
  type SiteLocationEnrichmentResponse,
} from '../../../lib/api';
import type { SalesProposalSite } from '../types';
import { formatAltitudeMetres, formatGps } from '../formatMeasured';
import { SEARCH_MENU_PANEL, searchMenuWrapClass } from '../searchOverlay';
import {
  GOOGLE_LOOKUP_UNAVAILABLE,
  isGoogleLookupUnavailableError,
  pinFromPlaceDetails,
  pinFromSearchResult,
} from '../../../lib/googleAddressLookup';

const DEFAULT_CENTER: [number, number] = [-26.2041, 28.0473];

const crosshairIcon = L.divIcon({
  className: 'spt-selection-crosshair',
  html: `<div style="width:28px;height:28px;position:relative;">
    <div style="position:absolute;left:13px;top:0;width:2px;height:28px;background:#0969a9;"></div>
    <div style="position:absolute;top:13px;left:0;height:2px;width:28px;background:#0969a9;"></div>
    <div style="position:absolute;left:9px;top:9px;width:10px;height:10px;border:2px solid #f7c12b;border-radius:50%;background:rgba(255,255,255,0.35);"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, Math.max(map.getZoom(), 12), { duration: 0.4 });
  }, [position, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timers = [0, 150, 400].map((delay) =>
      setTimeout(() => map.invalidateSize({ animate: false }), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

function siteFromEnrichment(
  latitude: number,
  longitude: number,
  enrichment: SiteLocationEnrichmentResponse,
  existingName: string | null,
): SalesProposalSite {
  const address = enrichment.address;
  return {
    name: existingName,
    latitude,
    longitude,
    address: address?.formatted ?? null,
    locality: address?.locality ?? address?.suburb ?? null,
    municipality: address?.municipality ?? null,
    province: address?.province ?? null,
    postcode: address?.postcode ?? null,
    country: address?.country ?? null,
    altitudeMetres: enrichment.elevation?.metres ?? null,
  };
}

interface SiteMapCaptureProps {
  site: SalesProposalSite;
  onChange: (site: SalesProposalSite | ((current: SalesProposalSite) => SalesProposalSite)) => void;
}

export function SiteMapCapture({ site, onChange }: SiteMapCaptureProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const sessionTokenRef = useRef(crypto.randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = useMemo<[number, number] | null>(
    () =>
      site.latitude !== null && site.longitude !== null
        ? [site.latitude, site.longitude]
        : null,
    [site.latitude, site.longitude],
  );
  const center = selected ?? DEFAULT_CENTER;

  const applyCoordinates = useCallback(
    async (latitude: number, longitude: number) => {
      setEnriching(true);
      try {
        const enrichment = await geocodeEnrich(latitude, longitude);
        onChange((current) =>
          siteFromEnrichment(latitude, longitude, enrichment, current.name),
        );
      } catch {
        onChange((current) => ({
          ...current,
          latitude,
          longitude,
        }));
      } finally {
        setEnriching(false);
      }
    },
    [onChange],
  );

  const loadSuggestions = useCallback(async (value: string) => {
    if (value.trim().length < 3) {
      setResults([]);
      setLookupUnavailable(false);
      return;
    }
    setSearching(true);
    try {
      const found = await geocodeAutocomplete(value.trim(), sessionTokenRef.current);
      setLookupUnavailable(false);
      setResults(found);
    } catch (error) {
      setResults([]);
      setLookupUnavailable(isGoogleLookupUnavailableError(error));
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadSuggestions(value);
    }, 300);
  }

  async function selectSuggestion(result: PlaceSuggestion) {
    try {
      const details = await geocodePlaceDetails(result.placeId, sessionTokenRef.current);
      const pin = pinFromPlaceDetails(details);
      sessionTokenRef.current = crypto.randomUUID();
      if (!pin) return;
      setResults([]);
      setQuery(pin.address);
      setLookupUnavailable(false);
      void applyCoordinates(pin.latitude, pin.longitude);
    } catch (error) {
      setLookupUnavailable(isGoogleLookupUnavailableError(error));
    }
  }

  async function handleSearch() {
    if (query.trim().length < 3) return;
    setSearching(true);
    try {
      const typed = query.trim();
      const found = results.length > 0
        ? results
        : await geocodeAutocomplete(typed, sessionTokenRef.current);
      if (found.length > 0) {
        await selectSuggestion(found[0]);
        return;
      }
      const geocoded = await geocodeSearch(typed, 1);
      const pin = pinFromSearchResult(geocoded[0]);
      if (pin) {
        setQuery(pin.address);
        setLookupUnavailable(false);
        void applyCoordinates(pin.latitude, pin.longitude);
      }
      setResults([]);
    } catch (error) {
      setResults([]);
      setLookupUnavailable(isGoogleLookupUnavailableError(error));
    } finally {
      setSearching(false);
    }
  }

  const locationTitle = useMemo(() => {
    return [site.locality, site.municipality].filter(Boolean).join(', ') || null;
  }, [site.locality, site.municipality]);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
        Site location
      </label>
      <div className="flex gap-2">
        <div className={`${searchMenuWrapClass(results.length > 0)} flex-1`}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="Search location"
            className="w-full rounded-[8px] border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-[#0969a9] focus:outline-none focus:ring-2 focus:ring-[#0969a9]/20"
          />
          {results.length > 0 && (
            <ul className={SEARCH_MENU_PANEL}>
              {results.map((result) => (
                <li key={result.placeId}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => void selectSuggestion(result)}
                  >
                    <span className="block">{result.displayName}</span>
                    {result.secondaryText ? (
                      <span className="block text-xs text-slate-500">{result.secondaryText}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searching}
          className="rounded-[8px] bg-slate-100 px-3 py-2 text-sm font-medium text-[#383838] hover:bg-slate-200 disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
      </div>
      {lookupUnavailable ? (
        <p className="text-xs text-amber-700">{GOOGLE_LOOKUP_UNAVAILABLE}. You can still click the map or type the site details.</p>
      ) : null}
      <div className="h-64 overflow-hidden rounded-[8px] border border-slate-200">
        <MapContainer
          key="spt-site-map"
          center={center}
          zoom={selected ? 13 : 6}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSize />
          <MapClickHandler onMapClick={(lat, lng) => void applyCoordinates(lat, lng)} />
          {selected && (
            <>
              <Marker position={selected} icon={crosshairIcon} />
              <RecenterMap position={selected} />
            </>
          )}
        </MapContainer>
      </div>
      <div className="rounded-[8px] bg-slate-50 p-3 text-sm text-[#383838]">
        {enriching && (
          <p className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Updating location…
          </p>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-[#383838]/70">
          Site location
        </p>
        <p className="mt-1 font-medium">{locationTitle || 'Click the map or choose a search result.'}</p>
        {formatGps(site.latitude, site.longitude) && (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-[#383838]">GPS</span>
            <br />
            {formatGps(site.latitude, site.longitude)}
          </p>
        )}
        {site.municipality && (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-[#383838]">Municipality</span>
            <br />
            {site.municipality}
          </p>
        )}
        {site.province && (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-[#383838]">Province</span>
            <br />
            {site.province}
          </p>
        )}
        {formatAltitudeMetres(site.altitudeMetres) && (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-[#383838]">Altitude</span>
            <br />
            {formatAltitudeMetres(site.altitudeMetres)}
          </p>
        )}
      </div>
    </div>
  );
}
