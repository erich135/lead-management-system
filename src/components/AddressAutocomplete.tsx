import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X, Search, Navigation } from 'lucide-react';
import { MapPinSelector } from './MapPinSelector';
import { geocodeAutocomplete, geocodePlaceDetails, type PlaceSuggestion } from '../lib/api';
import {
  GOOGLE_LOOKUP_UNAVAILABLE,
  isGoogleLookupUnavailableError,
  pinFromPlaceDetails,
} from '../lib/googleAddressLookup';

interface AddressAutocompleteProps {
  value: string;
  /** Optional GeoJSON [lng, lat] used to seed the map pin picker. */
  coordinates?: [number, number] | null;
  onChange: (address: string, coordinates?: [number, number]) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Address search with optional map pin for diary and lead location capture.
 */
export function AddressAutocomplete({
  value,
  coordinates = null,
  onChange,
  placeholder = 'Start typing an address...',
  className = '',
  required = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(value || null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(coordinates);
  const [manualHint, setManualHint] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    setQuery(value);
    if (value) {
      setSelectedAddress(value);
    }
  }, [value]);

  useEffect(() => {
    setCurrentCoords(coordinates ?? null);
  }, [coordinates]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      setShowDropdown(false);
      setLookupUnavailable(false);
      setManualHint(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await geocodeAutocomplete(searchQuery, sessionTokenRef.current);
      setLookupUnavailable(false);
      setResults(data);
      setShowDropdown(data.length > 0);
      setManualHint(data.length === 0);
    } catch (err: unknown) {
      setResults([]);
      setShowDropdown(false);
      if (isGoogleLookupUnavailableError(err)) {
        setLookupUnavailable(true);
        setManualHint(false);
      } else {
        setLookupUnavailable(false);
        setManualHint(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(newValue: string) {
    setQuery(newValue);
    setSelectedAddress(null);
    onChange(newValue, undefined);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  }

  async function handleSelect(result: PlaceSuggestion) {
    try {
      const details = await geocodePlaceDetails(result.placeId, sessionTokenRef.current);
      const pin = pinFromPlaceDetails(details);
      const address = pin?.address || result.displayName;
      const nextCoords: [number, number] | undefined = pin
        ? [pin.longitude, pin.latitude]
        : undefined;

      setQuery(address);
      setSelectedAddress(nextCoords ? address : null);
      setShowDropdown(false);
      setResults([]);
      setManualHint(false);
      setLookupUnavailable(false);
      if (nextCoords) {
        setCurrentCoords(nextCoords);
        onChange(address, nextCoords);
      } else {
        onChange(address, undefined);
      }
    } catch (err: unknown) {
      if (isGoogleLookupUnavailableError(err)) {
        setLookupUnavailable(true);
      }
    } finally {
      sessionTokenRef.current = crypto.randomUUID();
    }
  }

  function handleMapConfirm(address: string, coordinates: [number, number]) {
    setQuery(address);
    setSelectedAddress(address);
    setCurrentCoords(coordinates);
    setShowMapPicker(false);
    onChange(address, coordinates);
  }

  function handleClear() {
    setQuery('');
    setSelectedAddress(null);
    setResults([]);
    setShowDropdown(false);
    setCurrentCoords(null);
    setManualHint(false);
    setLookupUnavailable(false);
    sessionTokenRef.current = crypto.randomUUID();
    onChange('', undefined);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0 && !selectedAddress) {
                setShowDropdown(true);
              }
            }}
            required={required}
            placeholder={placeholder}
            className={`w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ars-primary focus:border-transparent ${className}`}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowMapPicker(true)}
          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium whitespace-nowrap"
          title="Pin exact location on map"
        >
          <Navigation className="h-4 w-4" />
          Pin on Map
        </button>
      </div>

      {selectedAddress && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
          <MapPin className="h-3 w-3" />
          <span>Address verified with coordinates</span>
        </div>
      )}

      {lookupUnavailable && query.length >= 3 && (
        <p className="mt-1 text-xs text-amber-700">
          {GOOGLE_LOOKUP_UNAVAILABLE}. Type the address or pin it on the map.
        </p>
      )}

      {manualHint && query.length >= 3 && !showDropdown && !lookupUnavailable && (
        <p className="mt-1 text-xs text-gray-500">
          No address suggestions available. Keep typing the address or pin it on the map.
        </p>
      )}

      {showDropdown && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.placeId}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-2"
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {result.displayName}
                </div>
                {result.secondaryText ? (
                  <div className="text-xs text-gray-500 truncate">
                    {result.secondaryText}
                  </div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {showMapPicker && (
        <MapPinSelector
          initialPosition={
            currentCoords
              ? [currentCoords[1], currentCoords[0]]
              : undefined
          }
          onConfirm={handleMapConfirm}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
