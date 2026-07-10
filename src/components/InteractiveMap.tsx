import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { Location } from '../lib/supabase';
import { MapPin, Phone, Clock, Navigation } from '../lib/icons';

// Fix Leaflet default icon broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Gold / accent rotated pin icon
function createGoldIcon(isMain: boolean) {
  const size = isMain ? 44 : 36;
  const color = isMain ? '#f5a623' : '#e05252';
  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
      border:2px solid rgba(255,255,255,0.35);
    "></div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

// Fit the map to all markers on mount
function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = locations.filter(
      (l) => typeof l.latitude === 'number' && typeof l.longitude === 'number',
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].latitude!, valid[0].longitude!], 14);
      return;
    }
    const bounds = L.latLngBounds(
      valid.map((l) => [l.latitude!, l.longitude!] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [locations, map]);
  return null;
}

export interface InteractiveMapProps {
  locations: Location[];
  onSelect?: (l: Location) => void;
  className?: string;
}

export function InteractiveMap({ locations, onSelect, className = '' }: InteractiveMapProps) {
  const valid = locations.filter(
    (l) => typeof l.latitude === 'number' && typeof l.longitude === 'number',
  );

  const defaultCenter: [number, number] =
    valid.length > 0
      ? [valid[0].latitude!, valid[0].longitude!]
      : [48.8566, 2.3522]; // Paris fallback

  return (
    <div className={`overflow-hidden rounded-2xl border border-line ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', minHeight: '360px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds locations={valid} />

        {valid.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude!, location.longitude!]}
            icon={createGoldIcon(!!location.is_main)}
            eventHandlers={{
              click: () => onSelect?.(location),
            }}
          >
            <Popup className="leaflet-popup-conquete">
              <div className="min-w-[220px] p-1">
                {/* Name */}
                <div className="mb-2 flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                      {location.name}
                    </p>
                    {location.address && (
                      <p className="text-xs text-gray-500 mt-0.5">{location.address}</p>
                    )}
                  </div>
                </div>

                {/* Pastor */}
                {location.pastor && (
                  <p className="mb-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Pasteur :</span> {location.pastor}
                  </p>
                )}

                {/* Phone */}
                {location.phone && (
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <a
                      href={`tel:${location.phone}`}
                      className="hover:text-amber-600 transition-colors"
                    >
                      {location.phone}
                    </a>
                  </div>
                )}

                {/* Service times */}
                {location.service_times && (
                  <div className="mb-2 flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{location.service_times}</span>
                  </div>
                )}

                {/* Google Maps directions */}
                {location.address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      location.address,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Itinéraire
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
