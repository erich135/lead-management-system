import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X, Search, Navigation } from 'lucide-react';
import { MapPinSelector } from './MapPinSelector';
import { geocodeSearch, type GeoSearchResult } from '../lib/api';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: [number, number]) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing an address...',
  className = '',
  required = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(value || null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes (e.g., editing an existing lead)
  useEffect(() => {
    setQuery(value);
    if (value) {
      setSelectedAddress(value);
    }
  }, [value]);

  // Close dropdown on outside click
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
      return;
    }

    setIsLoading(true);
    try {
      const data = await geocodeSearch(searchQuery);
      setResults(data);
      setShowDropdown(data.length > 0);
    } catch (err: any) {
      console.error('Address search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(newValue: string) {
    setQuery(newValue);
    setSelectedAddress(null);
    // Let parent know the text changed (without coordinates yet)
    onChange(newValue, undefined);

    // Debounce the search (Nominatim fair use: 1 req/sec)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 500);
  }

  function handleSelect(result: GeoSearchResult) {
    const address = result.display_name;
    const coordinates: [number, number] = [
      parseFloat(result.lon), // longitude first (GeoJSON standard)
      parseFloat(result.lat),
    ];

    setQuery(address);
    setSelectedAddress(address);
    setShowDropdown(false);
    setResults([]);
    setCurrentCoords(coordinates);
    onChange(address, coordinates);
  }

  function handleMapConfirm(address: string, coordinates: [number, number]) {
    // coordinates come in GeoJSON order [lon, lat] — convert to [lat, lng] for map state
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
    onChange('', undefined);
  }

  // Format a more readable short address from components
  function formatShortAddress(result: GeoSearchResult): string {
    const parts: string[] = [];
    const a = result.address;
    if (!a) return result.display_name;

    if (a.house_number && a.road) {
      parts.push(`${a.house_number} ${a.road}`);
    } else if (a.road) {
      parts.push(a.road);
    }
    if (a.suburb) parts.push(a.suburb);
    const city = a.city || a.town;
    if (city) parts.push(city);
    if (a.postcode) parts.push(a.postcode);

    return parts.length > 0 ? parts.join(', ') : result.display_name;
  }

  // Secondary line: state, country
  function formatSecondaryAddress(result: GeoSearchResult): string {
    const a = result.address;
    if (!a) return '';
    const parts: string[] = [];
    if (a.state) parts.push(a.state);
    if (a.country) parts.push(a.country);
    return parts.join(', ');
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

      {/* Selected address indicator */}
      {selectedAddress && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
          <MapPin className="h-3 w-3" />
          <span>Address verified with coordinates</span>
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-2"
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {formatShortAddress(result)}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {formatSecondaryAddress(result)}
                </div>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-gray-400 bg-gray-50 text-right">
            Powered by OpenStreetMap
          </div>
        </div>
      )}

      {/* Map Pin Picker Modal */}
      {showMapPicker && (
        <MapPinSelector
          initialPosition={
            currentCoords
              ? [currentCoords[1], currentCoords[0]] // Convert GeoJSON [lon,lat] to Leaflet [lat,lng]
              : undefined
          }
          onConfirm={handleMapConfirm}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
