import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Check, Loader2, LocateFixed, Search, MapPin } from 'lucide-react';
import {
  geocodeAutocomplete,
  geocodePlaceDetails,
  geocodeReverse,
  geocodeSearch,
  type PlaceSuggestion,
} from '../lib/api';
import {
  canConfirmMapPin,
  confirmedPinAddress,
  GOOGLE_LOOKUP_USER_MESSAGE,
  isGoogleLookupUnavailableError,
  pinFromPlaceDetails,
  pinFromReverse,
  pinFromSearchResult,
  STREET_MAP_ZOOM,
} from '../lib/googleAddressLookup';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pinIcon = L.divIcon({
  className: 'custom-pin-marker',
  html: `<div style="
    background-color: #EF4444;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 3px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -42],
});

interface MapPinSelectorProps {
  initialPosition?: [number, number];
  onConfirm: (address: string, coordinates: [number, number]) => void;
  onClose: () => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timers = [0, 100, 300, 500, 1000].map((delay) =>
      setTimeout(() => {
        map.invalidateSize({ animate: false });
      }, delay),
    );

    const container = map.getContainer();
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
      });
      observer.observe(container);
    }

    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [map]);
  return null;
}

function RecenterMap({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, zoom, { duration: 0.5 });
  }, [position, zoom, map]);
  return null;
}

export function MapPinSelector({ initialPosition, onConfirm, onClose }: MapPinSelectorProps) {
  const defaultCenter: [number, number] = initialPosition || [-26.2041, 28.0473];
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(initialPosition || null);
  const [googleAddress, setGoogleAddress] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(initialPosition ? 15 : 6);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());

  const applyPin = useCallback((latitude: number, longitude: number, address: string | null) => {
    setPinPosition([latitude, longitude]);
    setMapCenter([latitude, longitude]);
    setMapZoom(STREET_MAP_ZOOM);
    setGoogleAddress(address);
  }, []);

  const reverseGeocodePosition = useCallback(async (lat: number, lng: number) => {
    setIsReversing(true);
    setGoogleAddress(null);
    try {
      const data = await geocodeReverse(lat, lng);
      const pin = pinFromReverse(data);
      if (pin) {
        setGoogleAddress(pin.address);
        setLookupUnavailable(false);
      } else {
        setGoogleAddress(null);
      }
    } catch (err) {
      setGoogleAddress(null);
      if (isGoogleLookupUnavailableError(err)) {
        setLookupUnavailable(true);
      }
    } finally {
      setIsReversing(false);
    }
  }, []);

  function handleMapClick(lat: number, lng: number) {
    setPinPosition([lat, lng]);
    setMapCenter([lat, lng]);
    reverseGeocodePosition(lat, lng);
  }

  function handleConfirm() {
    if (!pinPosition) return;
    if (!canConfirmMapPin({
      pin: pinPosition,
      reversing: isReversing,
      googleAddress,
      typedAddress: searchQuery,
    })) return;
    const address = confirmedPinAddress(googleAddress, searchQuery);
    const geoCoords: [number, number] = [pinPosition[1], pinPosition[0]];
    onConfirm(address, geoCoords);
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPinPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setMapZoom(STREET_MAP_ZOOM);
        reverseGeocodePosition(lat, lng);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const loadSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await geocodeAutocomplete(query.trim(), sessionTokenRef.current);
      setLookupUnavailable(false);
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      setSuggestions([]);
      setShowSuggestions(false);
      if (isGoogleLookupUnavailableError(err)) {
        setLookupUnavailable(true);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadSuggestions(value);
    }, 300);
  }

  async function applySuggestion(result: PlaceSuggestion) {
    try {
      const details = await geocodePlaceDetails(result.placeId, sessionTokenRef.current);
      const pin = pinFromPlaceDetails(details);
      if (!pin) return;
      applyPin(pin.latitude, pin.longitude, pin.address);
      setSearchQuery(pin.address);
      setSuggestions([]);
      setShowSuggestions(false);
      setLookupUnavailable(false);
    } catch (err) {
      if (isGoogleLookupUnavailableError(err)) {
        setLookupUnavailable(true);
      }
    } finally {
      sessionTokenRef.current = crypto.randomUUID();
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || searchQuery.length < 3) return;
    setIsSearching(true);
    try {
      const typed = searchQuery.trim();
      const auto = suggestions.length > 0
        ? suggestions
        : await geocodeAutocomplete(typed, sessionTokenRef.current);
      if (auto.length > 0) {
        await applySuggestion(auto[0]);
        return;
      }
      const data = await geocodeSearch(typed, 1);
      const pin = pinFromSearchResult(data[0]);
      if (pin) {
        applyPin(pin.latitude, pin.longitude, pin.address);
        setSearchQuery(pin.address);
        setLookupUnavailable(false);
      }
      setSuggestions([]);
      setShowSuggestions(false);
      sessionTokenRef.current = crypto.randomUUID();
    } catch (err) {
      if (isGoogleLookupUnavailableError(err)) {
        setLookupUnavailable(true);
      }
    } finally {
      setIsSearching(false);
    }
  }

  const confirmEnabled = canConfirmMapPin({
    pin: pinPosition,
    reversing: isReversing,
    googleAddress,
    typedAddress: searchQuery,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pin on Map</h3>
            <p className="text-sm text-gray-500 mt-0.5">Search, use My Location, or click the map to place a pin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-start gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="Search for an address..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
                {suggestions.map((result) => (
                  <li key={result.placeId}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-blue-50"
                      onClick={() => void applySuggestion(result)}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <span>
                        <span className="block font-medium text-gray-900">{result.displayName}</span>
                        {result.secondaryText ? (
                          <span className="block text-xs text-gray-500">{result.secondaryText}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={isSearching}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
            title="Use my current location"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>

        <div
          ref={mapContainerRef}
          className="relative"
          style={{ height: '450px', minHeight: '350px' }}
        >
          <MapContainer
            center={defaultCenter}
            zoom={initialPosition ? 15 : 6}
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <RecenterMap position={mapCenter} zoom={mapZoom} />
            <InvalidateSize />
            {pinPosition && (
              <Marker position={pinPosition} icon={pinIcon} />
            )}
          </MapContainer>

          {!pinPosition && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-full pointer-events-none z-[1000]">
              Click anywhere on the map to drop a pin
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
          {lookupUnavailable && (
            <p className="mb-3 text-sm text-amber-700">
              {GOOGLE_LOOKUP_USER_MESSAGE}
            </p>
          )}
          {pinPosition ? (
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Selected Location
                </div>
                {isReversing ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Looking up address...
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 leading-snug">
                    {googleAddress || (searchQuery.trim().length >= 3 ? searchQuery.trim() : 'Address not confirmed yet')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {pinPosition[0].toFixed(6)}, {pinPosition[1].toFixed(6)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!confirmEnabled}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
              >
                <Check className="h-4 w-4" />
                Confirm Location
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              No location selected. Search or click on the map to pin a location.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
