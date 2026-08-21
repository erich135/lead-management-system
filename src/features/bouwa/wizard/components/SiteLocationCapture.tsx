/**
 * Map-driven site capture for the Customer and site step.
 *
 * The salesperson searches, clicks, or types GPS once. Coordinates are stored
 * immediately; address and altitude are filled only when the backend returns them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Search } from 'lucide-react';

import type { AuditIntakeDocument, IntakeAnswer } from '../../auditIntakeTypes';
import { readAnswerAtPath } from '../../auditIntakeState';
import {
  geocodeEnrich,
  geocodeSearch,
  type GeoSearchResult,
} from '../../../../lib/api';
import {
  altitudeCaption,
  formatGpsReference,
  intakeEntriesForLocation,
  MANUAL_ALTITUDE_NOTE,
  parseGpsReference,
  type GpsCaptureSource,
  type SiteCoordinates,
  type SiteLocationEnrichment,
} from '../siteLocation';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore Leaflet's default icon URL hook is not in the public types.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pinIcon = L.divIcon({
  className: 'bouwa-site-pin',
  html: `<div style="
    background-color: #EF4444;
    width: 22px;
    height: 22px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [22, 32],
  iconAnchor: [11, 32],
});

const SOUTH_AFRICA: SiteCoordinates = { latitude: -26.2041, longitude: 28.0473 };

function MapClickHandler({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (disabled) return;
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({
  position,
  zoom,
  nonce,
}: {
  position: SiteCoordinates;
  zoom: number;
  nonce: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (nonce === 0) return;
    map.flyTo([position.latitude, position.longitude], zoom, { duration: 0.45 });
  }, [map, nonce, position.latitude, position.longitude, zoom]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timers = [0, 150, 400].map(delay =>
      setTimeout(() => map.invalidateSize({ animate: false }), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

function textAnswer(answer: IntakeAnswer<unknown> | null): string {
  if (answer?.state !== 'answered' || typeof answer.value !== 'string') return '';
  return answer.value;
}

function numberAnswer(answer: IntakeAnswer<unknown> | null): IntakeAnswer<number> | null {
  if (answer === null) return null;
  if (answer.state !== 'answered') return answer as IntakeAnswer<number>;
  return typeof answer.value === 'number'
    ? (answer as IntakeAnswer<number>)
    : null;
}

export interface SiteLocationCaptureProps {
  intake: AuditIntakeDocument;
  disabled: boolean;
  onAnswerMany: (entries: readonly [string, IntakeAnswer<unknown>][]) => void;
}

export function SiteLocationCapture({
  intake,
  disabled,
  onAnswerMany,
}: SiteLocationCaptureProps) {
  const gpsAnswer = readAnswerAtPath(intake, 'identity.gpsReference');
  const addressAnswer = readAnswerAtPath(intake, 'identity.physicalAddress');
  const municipalityAnswer = readAnswerAtPath(intake, 'identity.municipality');
  const altitudeAnswer = numberAnswer(
    readAnswerAtPath(intake, 'siteConditions.altitudeM'),
  );
  const gpsText =
    gpsAnswer?.state === 'answered' && typeof gpsAnswer.value === 'string'
      ? gpsAnswer.value
      : '';
  const currentGps = parseGpsReference(gpsText || null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeoSearchResult[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [elevationFailed, setElevationFailed] = useState(false);
  const [lookedUpPlace, setLookedUpPlace] = useState<
    SiteLocationEnrichment['address']
  >(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manualGps, setManualGps] = useState(
    currentGps === null
      ? ''
      : formatGpsReference(currentGps.latitude, currentGps.longitude),
  );
  const [manualAddress, setManualAddress] = useState(textAnswer(addressAnswer));
  const [manualMunicipality, setManualMunicipality] = useState(
    textAnswer(municipalityAnswer),
  );
  const [manualAltitude, setManualAltitude] = useState(
    altitudeAnswer?.state === 'answered' && typeof altitudeAnswer.value === 'number'
      ? String(altitudeAnswer.value)
      : '',
  );
  const [mapFocus, setMapFocus] = useState<SiteCoordinates>(
    currentGps ?? SOUTH_AFRICA,
  );
  const [mapZoom, setMapZoom] = useState(currentGps === null ? 6 : 14);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [pin, setPin] = useState<SiteCoordinates | null>(currentGps);

  const lastEnrichKey = useRef<string | null>(
    currentGps === null
      ? null
      : formatGpsReference(currentGps.latitude, currentGps.longitude),
  );
  const enrichRequest = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({
    currentGps,
    altitudeAnswer,
    addressAnswer,
    municipalityAnswer,
  });
  latest.current = {
    currentGps,
    altitudeAnswer,
    addressAnswer,
    municipalityAnswer,
  };

  useEffect(() => {
    setPin(parseGpsReference(gpsText || null));
  }, [gpsText]);

  useEffect(() => {
    setManualGps(
      currentGps === null
        ? ''
        : formatGpsReference(currentGps.latitude, currentGps.longitude),
    );
    setManualAddress(textAnswer(addressAnswer));
    setManualMunicipality(textAnswer(municipalityAnswer));
    setManualAltitude(
      altitudeAnswer?.state === 'answered' && typeof altitudeAnswer.value === 'number'
        ? String(altitudeAnswer.value)
        : '',
    );
  }, [addressAnswer, altitudeAnswer, currentGps, municipalityAnswer]);

  const applyEnrichment = useCallback(
    async (
      coordinates: SiteCoordinates,
      gpsSource: GpsCaptureSource,
      options: { fly?: boolean } = {},
    ) => {
      const key = formatGpsReference(coordinates.latitude, coordinates.longitude);
      if (lastEnrichKey.current === key && enrichRequest.current !== 0) return;
      lastEnrichKey.current = key;
      const requestId = ++enrichRequest.current;
      if (options.fly) {
        setMapFocus(coordinates);
        setMapZoom(14);
        setRecenterNonce(value => value + 1);
      }
      setEnriching(true);
      const held = latest.current;
      try {
        const enrichment: SiteLocationEnrichment = await geocodeEnrich(
          coordinates.latitude,
          coordinates.longitude,
        );
        if (requestId !== enrichRequest.current) return;
        setGeocodeFailed(enrichment.geocodeFailed);
        setElevationFailed(enrichment.elevationFailed);
        setLookedUpPlace(enrichment.address);
        onAnswerMany(
          intakeEntriesForLocation({
            enrichment,
            gpsSource,
            previousGps: held.currentGps,
            currentAltitude: held.altitudeAnswer,
            currentAddress: held.addressAnswer as IntakeAnswer<string> | null,
          }),
        );
      } catch {
        if (requestId !== enrichRequest.current) return;
        setGeocodeFailed(true);
        setElevationFailed(true);
        setLookedUpPlace(null);
        onAnswerMany([
          [
            'identity.gpsReference',
            {
              state: 'answered',
              value: formatGpsReference(coordinates.latitude, coordinates.longitude),
              note: null,
            },
          ],
          ['identity.gpsSource', { state: 'answered', value: gpsSource, note: null }],
        ]);
      } finally {
        if (requestId === enrichRequest.current) {
          enrichRequest.current = 0;
          setEnriching(false);
        }
      }
    },
    [onAnswerMany],
  );

  useEffect(() => {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    const query = searchQuery.trim();
    if (query.length < 3) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      void geocodeSearch(query, 6)
        .then(results => setCandidates(results))
        .catch(() => setCandidates([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  function pickCoordinates(
    latitude: number,
    longitude: number,
    gpsSource: GpsCaptureSource,
    fly: boolean,
  ) {
    setPin({ latitude, longitude });
    void applyEnrichment({ latitude, longitude }, gpsSource, { fly });
  }

  function selectCandidate(result: GeoSearchResult) {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setSearchQuery(result.display_name);
    setCandidates([]);
    pickCoordinates(latitude, longitude, 'map_lookup', true);
  }

  function applyManualGps() {
    const parsed = parseGpsReference(manualGps);
    if (parsed === null) return;
    pickCoordinates(parsed.latitude, parsed.longitude, 'user_supplied', true);
  }

  function saveManualDetails() {
    const entries: [string, IntakeAnswer<unknown>][] = [];
    const address = manualAddress.trim();
    if (address !== '')
      entries.push(['identity.physicalAddress', { state: 'answered', value: address, note: null }]);
    const municipality = manualMunicipality.trim();
    if (municipality !== '')
      entries.push([
        'identity.municipality',
        { state: 'answered', value: municipality, note: null },
      ]);
    const parsedGps = parseGpsReference(manualGps);
    const gpsChanged =
      parsedGps !== null &&
      (currentGps === null ||
        formatGpsReference(currentGps.latitude, currentGps.longitude) !==
          formatGpsReference(parsedGps.latitude, parsedGps.longitude));
    if (parsedGps !== null && !gpsChanged) {
      entries.push([
        'identity.gpsReference',
        {
          state: 'answered',
          value: formatGpsReference(parsedGps.latitude, parsedGps.longitude),
          note: null,
        },
      ]);
    }
    const altitude = Number(manualAltitude);
    if (!gpsChanged && manualAltitude.trim() !== '' && Number.isFinite(altitude)) {
      entries.push([
        'siteConditions.altitudeM',
        { state: 'answered', value: altitude, note: MANUAL_ALTITUDE_NOTE },
      ]);
    }
    if (entries.length > 0) onAnswerMany(entries);
    if (gpsChanged && parsedGps !== null)
      pickCoordinates(parsedGps.latitude, parsedGps.longitude, 'user_supplied', true);
    setDetailsOpen(false);
  }

  const selectedLabel = useMemo(() => {
    const address = textAnswer(addressAnswer);
    if (address !== '') return address;
    const municipality = textAnswer(municipalityAnswer);
    if (municipality !== '') return municipality;
    if (currentGps !== null)
      return formatGpsReference(currentGps.latitude, currentGps.longitude);
    return 'No location selected yet';
  }, [addressAnswer, currentGps, municipalityAnswer]);

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium text-slate-800">Site location</p>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Search for the site, click the map, or enter GPS. Coordinates identify
          the plant. Address and altitude are filled in when the lookup succeeds.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          data-testid="site-location-search"
          type="text"
          disabled={disabled}
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search for a site or address"
          className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm disabled:bg-slate-100"
        />
        {searching ? (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
        ) : null}
        {candidates.length > 0 ? (
          <ul
            data-testid="site-location-search-results"
            className="absolute z-[1000] mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white text-sm shadow-md"
          >
            {candidates.map(result => (
              <li key={`${result.place_id}-${result.lat}-${result.lon}`}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => selectCandidate(result)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        data-testid="site-location-map"
        className="relative overflow-hidden rounded-md border border-slate-200"
        style={{ height: '260px' }}
      >
        <MapContainer
          center={[mapFocus.latitude, mapFocus.longitude]}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            disabled={disabled}
            onPick={(lat, lng) => pickCoordinates(lat, lng, 'map_lookup', false)}
          />
          <RecenterMap position={mapFocus} zoom={mapZoom} nonce={recenterNonce} />
          <InvalidateSize />
          {pin !== null ? (
            <Marker
              draggable={!disabled}
              position={[pin.latitude, pin.longitude]}
              icon={pinIcon}
              eventHandlers={{
                dragend: event => {
                  const next = event.target.getLatLng();
                  pickCoordinates(next.lat, next.lng, 'map_lookup', false);
                },
              }}
            />
          ) : null}
        </MapContainer>
        {pin === null ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white">
            Click the map to drop a pin
          </div>
        ) : null}
      </div>

      <div
        data-testid="site-location-summary"
        className="space-y-1 rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-700"
      >
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ars-primary" />
          <span>
            <span className="font-medium text-slate-500">Selected: </span>
            {enriching ? 'Looking up location…' : selectedLabel}
          </span>
        </p>
        <p>
          <span className="font-medium text-slate-500">GPS: </span>
          {currentGps === null
            ? 'Not set'
            : formatGpsReference(currentGps.latitude, currentGps.longitude)}
        </p>
        <p>
          <span className="font-medium text-slate-500">Altitude: </span>
          {altitudeCaption(altitudeAnswer, elevationFailed)}
        </p>
        <p>
          <span className="font-medium text-slate-500">Municipality: </span>
          {textAnswer(municipalityAnswer) ||
            lookedUpPlace?.municipality ||
            'Not identified'}
        </p>
        <p>
          <span className="font-medium text-slate-500">Province: </span>
          {lookedUpPlace?.province || 'Not identified'}
        </p>
        {geocodeFailed ? (
          <p className="text-[11px] text-amber-700">
            Address lookup did not return a result. Coordinates are kept. You can
            type the address below.
          </p>
        ) : null}
        {elevationFailed ? (
          <p className="text-[11px] text-amber-700">
            Terrain altitude could not be estimated. Coordinates are kept. Enter
            a known altitude if you have one.
          </p>
        ) : null}
      </div>

      {disabled ? null : (
        <button
          type="button"
          data-testid="site-location-change-details"
          onClick={() => setDetailsOpen(open => !open)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Change details
        </button>
      )}

      {detailsOpen && !disabled ? (
        <div className="space-y-2 rounded-md border border-slate-200 p-3">
          <label className="block text-[11px] font-medium text-slate-600">
            Address
            <textarea
              value={manualAddress}
              onChange={event => setManualAddress(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Municipality
            <input
              value={manualMunicipality}
              onChange={event => setManualMunicipality(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            GPS (latitude, longitude)
            <input
              data-testid="site-location-manual-gps"
              value={manualGps}
              onChange={event => setManualGps(event.target.value)}
              placeholder="-24.658238, 30.169335"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-sm"
            />
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Altitude (m)
            <input
              data-testid="site-location-manual-altitude"
              value={manualAltitude}
              onChange={event => setManualAltitude(event.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyManualGps}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Use typed GPS
            </button>
            <button
              type="button"
              data-testid="site-location-save-details"
              onClick={saveManualDetails}
              className="rounded-md bg-ars-primary px-2.5 py-1.5 text-xs font-medium text-white"
            >
              Save changes
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
