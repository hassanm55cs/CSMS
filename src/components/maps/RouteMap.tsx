import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type LatLngPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
};

export type RouteSummary = {
  distanceKm: number;
  durationMinutes: number;
  steps: RouteStep[];
};

interface RouteMapProps {
  /** Primary point (e.g. customer or selected branch) */
  destination?: LatLngPoint | null;
  /** Origin point (e.g. driver current location) — draws a free OSRM driving route when paired with destination */
  origin?: LatLngPoint | null;
  /** Optional branch location marker */
  branch?: LatLngPoint | null;
  /** Allow clicking on the map to pick coordinates */
  onPickLocation?: (latitude: number, longitude: number) => void;
  /** Show turn-by-turn navigation steps below the map */
  showTurnByTurn?: boolean;
  height?: number;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [30.0444, 31.2357]; // Cairo fallback

function createPinIcon(color: string, glyph: string) {
  return L.divIcon({
    className: 'csms-map-pin',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${glyph}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function formatStepInstruction(step: any): string {
  const type = step?.maneuver?.type ?? '';
  const modifier = step?.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
  const road = step?.name ? ` onto ${step.name}` : '';
  if (type === 'depart') return `Head${modifier}${road}`.trim();
  if (type === 'arrive') return 'Arrive at destination';
  if (type === 'turn') return `Turn${modifier}${road}`.trim();
  if (type === 'roundabout') return `Enter roundabout${road}`.trim();
  return `${type || 'Continue'}${modifier}${road}`.trim();
}

export function RouteMap({
  destination,
  origin,
  branch,
  onPickLocation,
  showTurnByTurn = false,
  height = 280,
  className = '',
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const pickHandlerRef = useRef(onPickLocation);
  pickHandlerRef.current = onPickLocation;

  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (pickHandlerRef.current) {
        pickHandlerRef.current(
          Number(event.latlng.lat.toFixed(6)),
          Number(event.latlng.lng.toFixed(6)),
        );
      }
    });

    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update markers and fetch free OSRM driving route when origin + destination exist
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds: [number, number][] = [];

    if (destination) {
      const marker = L.marker([destination.latitude, destination.longitude], {
        icon: createPinIcon('#dc2626', 'C'),
      }).addTo(group);
      marker.bindTooltip(destination.label || 'Customer', { direction: 'top', offset: [0, -14] });
      bounds.push([destination.latitude, destination.longitude]);
    }

    if (origin) {
      const marker = L.marker([origin.latitude, origin.longitude], {
        icon: createPinIcon('#2563eb', 'T'),
      }).addTo(group);
      marker.bindTooltip(origin.label || 'Tow Truck', { direction: 'top', offset: [0, -14] });
      bounds.push([origin.latitude, origin.longitude]);
    }

    if (branch) {
      const marker = L.marker([branch.latitude, branch.longitude], {
        icon: createPinIcon('#059669', 'B'),
      }).addTo(group);
      marker.bindTooltip(branch.label || 'Branch', { direction: 'top', offset: [0, -14] });
      bounds.push([branch.latitude, branch.longitude]);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    }

    if (!origin || !destination) {
      setRouteSummary(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadRoute = async () => {
      setRouteLoading(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Route unavailable');
        const data = await response.json();
        const route = data?.routes?.[0];
        if (!route || cancelled) return;

        const coords: [number, number][] = (route.geometry?.coordinates ?? []).map(
          ([lng, lat]: [number, number]) => [lat, lng],
        );

        if (coords.length > 1) {
          const line = L.polyline(coords, { color: '#2563eb', weight: 4, opacity: 0.85 }).addTo(group);
          map.fitBounds(line.getBounds(), { padding: [36, 36], maxZoom: 15 });
        }

        const rawSteps = route.legs?.[0]?.steps ?? [];
        setRouteSummary({
          distanceKm: Number((route.distance / 1000).toFixed(1)),
          durationMinutes: Math.max(1, Math.round(route.duration / 60)),
          steps: rawSteps.map((s: any) => ({
            instruction: formatStepInstruction(s),
            distanceMeters: Math.round(s.distance ?? 0),
          })),
        });
      } catch {
        if (!cancelled) {
          // Fallback straight dashed line if OSRM is unreachable
          L.polyline(
            [
              [origin.latitude, origin.longitude],
              [destination.latitude, destination.longitude],
            ],
            { color: '#2563eb', weight: 3, dashArray: '6 8', opacity: 0.7 },
          ).addTo(group);
          setRouteSummary(null);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    void loadRoute();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    destination?.latitude,
    destination?.longitude,
    destination?.label,
    origin?.latitude,
    origin?.longitude,
    origin?.label,
    branch?.latitude,
    branch?.longitude,
    branch?.label,
  ]);

  const externalNavUrl = destination
    ? origin
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude}%2C${origin.longitude}%3B${destination.latitude}%2C${destination.longitude}`
      : `https://www.openstreetmap.org/?mlat=${destination.latitude}&mlon=${destination.longitude}#map=15/${destination.latitude}/${destination.longitude}`
    : null;

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border"
        style={{ height, borderColor: 'var(--border)', zIndex: 1 }}
      />
      {(routeSummary || routeLoading || externalNavUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
          <div>
            {routeLoading
              ? 'Calculating road route…'
              : routeSummary
                ? <>Road distance: <strong style={{ color: 'var(--text)' }}>{routeSummary.distanceKm} km</strong> · ETA: <strong style={{ color: 'var(--text)' }}>{routeSummary.durationMinutes} min</strong></>
                : destination
                  ? `Target: ${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)}`
                  : null}
          </div>
          {externalNavUrl && (
            <a
              href={externalNavUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
              style={{ color: 'var(--primary)' }}
            >
              Open in OpenStreetMap →
            </a>
          )}
        </div>
      )}
      {showTurnByTurn && routeSummary && routeSummary.steps.length > 0 && (
        <details className="mt-3 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          <summary className="cursor-pointer font-semibold" style={{ color: 'var(--text)' }}>
            Turn-by-turn directions ({routeSummary.steps.length} steps)
          </summary>
          <ol className="mt-2 space-y-1.5 list-decimal list-inside" style={{ color: 'var(--text-2)' }}>
            {routeSummary.steps.map((step, idx) => (
              <li key={idx}>
                {step.instruction}
                {step.distanceMeters > 0 && (
                  <span className="ml-1 font-mono" style={{ color: 'var(--text-4)' }}>
                    ({step.distanceMeters >= 1000 ? `${(step.distanceMeters / 1000).toFixed(1)} km` : `${step.distanceMeters} m`})
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
