import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Check, Loader2, LocateFixed, Search } from 'lucide-react';
import { geocodeSearch, geocodeReverse } from '../lib/api';

// Fix Leaflet default marker icons
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

// Red pin icon for selected location
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
  initialPosition?: [number, number]; // [lat, lng]
  onConfirm: (address: string, coordinates: [number, number]) => void;
  onClose: () => void;
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Invalidate map size when rendered in a modal (fixes blank tiles)
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    // Force multiple invalidations and also use ResizeObserver
    const timers = [0, 100, 300, 500, 1000].map((delay) =>
      setTimeout(() => {
        map.invalidateSize({ animate: false });
      }, delay),
    );

    // Also observe container resize
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

// Component to recenter map
function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom(), { duration: 0.5 });
  }, [position, map]);
  return null;
}

export function MapPinSelector({ initialPosition, onConfirm, onClose }: MapPinSelectorProps) {
  // Default center: South Africa (Johannesburg area)
  const defaultCenter: [number, number] = initialPosition || [-26.2041, 28.0473];
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(initialPosition || null);
  const [address, setAddress] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  // Reverse geocode a position to get an address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReversing(true);
    try {
      const data = await geocodeReverse(lat, lng);
      setAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (err) {
      console.error('Reverse geocode error:', err);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsReversing(false);
    }
  }, []);

  function handleMapClick(lat: number, lng: number) {
    setPinPosition([lat, lng]);
    reverseGeocode(lat, lng);
  }

  function handleConfirm() {
    if (!pinPosition) return;
    // Coordinates in GeoJSON order: [longitude, latitude]
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
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSearch() {
    if (!searchQuery.trim() || searchQuery.length < 3) return;
    setIsSearching(true);
    try {
      const data = await geocodeSearch(searchQuery, 1);
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPinPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setAddress(data[0].display_name);
      }
    } catch (err) {
      console.error('Map search error:', err);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pin on Map</h3>
            <p className="text-sm text-gray-500 mt-0.5">Click on the map to place a pin, or use the search bar</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search bar + locate */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              placeholder="Search for an area, city, or landmark..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ars-primary focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
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

        {/* Map */}
        <div
          ref={mapContainerRef}
          className="relative"
          style={{ height: '450px', minHeight: '350px' }}
        >
          <MapContainer
            center={defaultCenter}
            zoom={initialPosition ? 15 : 6}
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
            whenReady={() => setMapReady(true)}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <RecenterMap position={mapCenter} />
            <InvalidateSize />
            {pinPosition && (
              <Marker position={pinPosition} icon={pinIcon} />
            )}
          </MapContainer>

          {/* Crosshair hint when no pin */}
          {!pinPosition && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-full pointer-events-none z-[1000]">
              Click anywhere on the map to drop a pin
            </div>
          )}
        </div>

        {/* Footer with address and confirm */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
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
                  <p className="text-sm text-gray-800 leading-snug">{address}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {pinPosition[0].toFixed(6)}, {pinPosition[1].toFixed(6)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isReversing}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
              >
                <Check className="h-4 w-4" />
                Confirm Location
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">
              No location selected. Click on the map to pin a location.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
