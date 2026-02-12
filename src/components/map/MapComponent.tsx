import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons (known issue with bundlers)
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

// Custom marker icons
export const createCustomIcon = (color: string, size: [number, number] = [25, 41]) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size[0]}px;
      height: ${size[0]}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });
};

// Predefined marker colors
export const MARKER_COLORS = {
  client: '#3B82F6',      // blue - client locations
  rep: '#10B981',         // green - rep current location
  repIdle: '#F59E0B',     // amber - rep idle
  repOffline: '#6B7280',  // gray - rep offline
  appointment: '#8B5CF6', // purple - appointments
  attended: '#10B981',    // green - attended appointments
  missed: '#EF4444',      // red - missed appointments
  branch: '#F97316',      // orange - branch offices
  geofence: '#3B82F6',    // blue - geofence circles
} as const;

// ============================================================
// Types
// ============================================================

export interface MapMarker {
  id: string;
  position: [number, number]; // [latitude, longitude]
  label?: string;
  description?: string;
  color?: string;
  icon?: L.Icon | L.DivIcon;
  popup?: React.ReactNode;
}

export interface MapCircle {
  id: string;
  center: [number, number]; // [latitude, longitude]
  radius: number; // meters
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

export interface MapRoute {
  id: string;
  positions: [number, number][]; // Array of [lat, lng]
  color?: string;
  weight?: number;
  dashArray?: string;
}

interface MapComponentProps {
  // Map center and zoom
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  
  // Content
  markers?: MapMarker[];
  circles?: MapCircle[];
  routes?: MapRoute[];
  
  // Sizing
  height?: string;
  className?: string;
  
  // Interaction
  onClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (markerId: string) => void;
  
  // Options
  showZoomControl?: boolean;
  showAttribution?: boolean;
  draggable?: boolean;
  scrollWheelZoom?: boolean;
  
  // Auto-fit to markers
  fitBounds?: boolean;
  fitBoundsPadding?: [number, number];
}

// ============================================================
// Sub-components
// ============================================================

/** Auto-fit map bounds to all markers */
function FitBoundsToMarkers({ 
  markers, 
  padding = [50, 50] 
}: { 
  markers: MapMarker[]; 
  padding?: [number, number];
}) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length === 0) return;
    
    if (markers.length === 1) {
      map.setView(markers[0].position, 15);
      return;
    }
    
    const bounds = L.latLngBounds(markers.map(m => m.position));
    map.fitBounds(bounds, { padding });
  }, [markers, map, padding]);
  
  return null;
}

/** Handle click events on the map */
function MapClickHandler({ 
  onClick 
}: { 
  onClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onClick]);
  
  return null;
}

// ============================================================
// Main Component
// ============================================================

const MapComponent: React.FC<MapComponentProps> = ({
  center = [-26.2041, 28.0473], // Default: Johannesburg
  zoom = 12,
  markers = [],
  circles = [],
  routes = [],
  height = '400px',
  className = '',
  onClick,
  onMarkerClick,
  showZoomControl = true,
  showAttribution = true,
  draggable = true,
  scrollWheelZoom = true,
  fitBounds = false,
  fitBoundsPadding = [50, 50],
}) => {
  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={showZoomControl}
        attributionControl={showAttribution}
        dragging={draggable}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Auto-fit bounds */}
        {fitBounds && markers.length > 0 && (
          <FitBoundsToMarkers markers={markers} padding={fitBoundsPadding} />
        )}
        
        {/* Click handler */}
        {onClick && <MapClickHandler onClick={onClick} />}
        
        {/* Circles (geofences) */}
        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={circle.center}
            radius={circle.radius}
            pathOptions={{
              color: circle.color || MARKER_COLORS.geofence,
              fillColor: circle.fillColor || circle.color || MARKER_COLORS.geofence,
              fillOpacity: circle.fillOpacity ?? 0.1,
              weight: 2,
              dashArray: '5, 10',
            }}
          />
        ))}
        
        {/* Routes / paths */}
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.positions}
            pathOptions={{
              color: route.color || '#3B82F6',
              weight: route.weight || 3,
              dashArray: route.dashArray,
            }}
          />
        ))}
        
        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={marker.icon || (marker.color ? createCustomIcon(marker.color) : undefined)}
            eventHandlers={
              onMarkerClick
                ? { click: () => onMarkerClick(marker.id) }
                : undefined
            }
          >
            {(marker.popup || marker.label) && (
              <Popup>
                {marker.popup || (
                  <div>
                    {marker.label && <strong className="block">{marker.label}</strong>}
                    {marker.description && (
                      <span className="text-sm text-gray-600">{marker.description}</span>
                    )}
                  </div>
                )}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
