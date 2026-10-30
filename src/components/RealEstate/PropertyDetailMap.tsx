import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '@/types/realEstate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Compass,
  ExternalLink,
  Copy,
  Check,
  LocateFixed,
} from 'lucide-react';
import { toast } from 'sonner';

// Fallback coordinate mappings matching Dashboard RealtorLocationMapExplorer
const PROPERTY_COORDINATES: Record<string, [number, number]> = {
  'Chicago Central Headquarters': [41.8814, -87.6405],
  'Chicago Tech Hub Condo': [41.8902, -87.6256],
  'Chicago West Loop Loft Condo': [41.8847, -87.6480],
  'Denver Engineering Center': [39.7525, -104.9995],
  'Denver LoDo Residence Condo': [39.7538, -105.0012],
  'Dallas Regional Office': [32.7845, -96.7990],
  'Dallas Uptown Executive Condo': [32.7960, -96.8045],
  'New York Executive Suite': [40.7580, -73.9855],
  'New York Tribeca Residence Condo': [40.7163, -74.0086],
  'San Francisco AI Research Center': [37.7897, -122.3972],
  'San Francisco SOMA Condo': [37.7812, -122.3980],
  'San Jose Silicon Valley Office': [37.3361, -121.8906],
  'Los Angeles Media & Sales Office': [34.0537, -118.2568],
  'Austin Innovation Hub': [30.2672, -97.7431],
  'Seattle Cloud Operations Center': [47.6145, -122.3385],
  'Boston Biotech & Analytics Office': [42.3522, -71.0552],
  'Raleigh R&D Center (TerraWatt M&A)': [35.7796, -78.6382],
  'Vancouver Innovation Lab': [49.2827, -123.1207],
  'Vancouver Waterfront Condo': [49.2865, -123.1115],
  'Toronto Financial Center': [43.6487, -79.3817],
  'Montreal AI Institute': [45.5017, -73.5673],
  'London European Headquarters': [51.5050, -0.0195],
  'London Mayfair Executive Boardroom': [51.5097, -0.1444],
  'London Docklands Executive Penthouse Condo': [51.5028, -0.0163],
  'London Kensington Residence Condo': [51.4983, -0.2045],
  'Dublin Silicon Docks Regional Office': [53.3444, -6.2396],
  'Berlin R&D & Engineering Hub': [52.5096, 13.3759],
  'Singapore APAC Headquarters': [1.2798, 103.8540],
  'Dubai International Financial Centre (DIFC) Hub': [25.2104, 55.2809],
  'Tokyo Regional Office': [35.6812, 139.7644],
  'Sydney Financial Hub': [-33.8642, 151.2016],
};

const CITY_COORDINATES: Record<string, [number, number]> = {
  Chicago: [41.8781, -87.6298],
  Denver: [39.7392, -104.9903],
  Dallas: [32.7767, -96.7970],
  'New York': [40.7128, -74.0060],
  'San Francisco': [37.7749, -122.4194],
  'San Jose': [37.3382, -121.8863],
  'Los Angeles': [34.0522, -118.2437],
  Austin: [30.2672, -97.7431],
  Seattle: [47.6062, -122.3321],
  Boston: [42.3601, -71.0589],
  Raleigh: [35.7796, -78.6382],
  Vancouver: [49.2827, -123.1207],
  Toronto: [43.6532, -79.3832],
  Montreal: [45.5017, -73.5673],
  London: [51.5074, -0.1278],
  Dublin: [53.3498, -6.2603],
  Berlin: [52.5200, 13.4050],
  Munich: [48.1351, 11.5820],
  Frankfurt: [50.1109, 8.6821],
  Paris: [48.8566, 2.3522],
  Amsterdam: [52.3676, 4.9041],
  Zurich: [47.3769, 8.5417],
  Edinburgh: [55.9533, -3.1883],
  Warsaw: [52.2297, 21.0122],
  Singapore: [1.3521, 103.8198],
  Dubai: [25.2048, 55.2708],
  Tokyo: [35.6762, 139.6503],
  Sydney: [-33.8688, 151.2093],
  Bangalore: [12.9716, 77.5946],
};

function getCategoryInfo(category?: string, isMa?: boolean) {
  if (isMa) {
    return {
      bg: 'bg-purple-600',
      hex: '#9333ea',
      hexDark: '#7e22ce',
      lightBg: '#faf5ff',
      lightBorder: '#e9d5ff',
      text: '#7e22ce',
      label: 'M&A Asset',
      icon: '✨',
    };
  }
  const cat = (category || '').toUpperCase().trim();
  switch (cat) {
    case 'OWNED_HQ':
    case 'CORPORATE_HQ':
      return {
        bg: 'bg-indigo-600',
        hex: '#4f46e5',
        hexDark: '#4338ca',
        lightBg: '#eef2ff',
        lightBorder: '#c7d2fe',
        text: '#4338ca',
        label: 'Corporate HQ',
        icon: '👑',
      };
    case 'COMPANY_CONDO':
      return {
        bg: 'bg-emerald-600',
        hex: '#059669',
        hexDark: '#047857',
        lightBg: '#ecfdf5',
        lightBorder: '#a7f3d0',
        text: '#047857',
        label: 'Corporate Condo',
        icon: '🏠',
      };
    case 'RD_FACILITY':
      return {
        bg: 'bg-cyan-600',
        hex: '#0891b2',
        hexDark: '#0e7490',
        lightBg: '#ecfeff',
        lightBorder: '#a5f3fc',
        text: '#0e7490',
        label: 'R&D Facility',
        icon: '🔬',
      };
    case 'WAREHOUSE':
      return {
        bg: 'bg-amber-600',
        hex: '#d97706',
        hexDark: '#b45309',
        lightBg: '#fffbeb',
        lightBorder: '#fde68a',
        text: '#b45309',
        label: 'Warehouse',
        icon: '📦',
      };
    case 'CO_WORKING':
      return {
        bg: 'bg-sky-600',
        hex: '#0284c7',
        hexDark: '#0369a1',
        lightBg: '#f0f9ff',
        lightBorder: '#bae6fd',
        text: '#0369a1',
        label: 'Co-Working Space',
        icon: '🤝',
      };
    case 'RETAIL':
      return {
        bg: 'bg-rose-600',
        hex: '#e11d48',
        hexDark: '#be123c',
        lightBg: '#fff1f2',
        lightBorder: '#fecdd3',
        text: '#be123c',
        label: 'Retail',
        icon: '🛍️',
      };
    default:
      return {
        bg: 'bg-blue-600',
        hex: '#2563eb',
        hexDark: '#1d4ed8',
        lightBg: '#eff6ff',
        lightBorder: '#bfdbfe',
        text: '#1d4ed8',
        label: 'Commercial Office',
        icon: '🏢',
      };
  }
}

interface PropertyDetailMapProps {
  property: Property;
  className?: string;
}

export default function PropertyDetailMap({ property, className }: PropertyDetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'satellite' | 'dark' | 'esri'>('streets');
  const [copied, setCopied] = useState(false);

  // Compute resolved coordinates
  const { coords, isExact } = useMemo(() => {
    if (
      property.latitude &&
      property.longitude &&
      (Number(property.latitude) !== 0 || Number(property.longitude) !== 0)
    ) {
      return {
        coords: [Number(property.latitude), Number(property.longitude)] as [number, number],
        isExact: true,
      };
    }
    if (PROPERTY_COORDINATES[property.name]) {
      return { coords: PROPERTY_COORDINATES[property.name], isExact: true };
    }
    if (CITY_COORDINATES[property.city]) {
      return { coords: CITY_COORDINATES[property.city], isExact: false };
    }
    return { coords: [49.2827, -123.1207] as [number, number], isExact: false };
  }, [property]);

  const [lat, lng] = coords;
  const catInfo = getCategoryInfo(property.property_category, property.is_ma_acquisition);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: isExact ? 16 : 13,
        minZoom: 3,
        maxZoom: 19,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      });
      tileLayer.addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], isExact ? 16 : 13);
    }

    // Handle container resize gracefully
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [lat, lng, isExact]);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    let subdomains: string[] | string = ['a', 'b', 'c'];

    if (activeTileLayer === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      subdomains = [];
    } else if (activeTileLayer === 'dark') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
      subdomains = [];
    } else if (activeTileLayer === 'esri') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS';
      subdomains = [];
    }

    L.tileLayer(url, {
      attribution,
      subdomains,
      maxZoom: 19,
    }).addTo(map);
  }, [activeTileLayer]);

  // Place Pin Marker with rich popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const isOwned = (property.ownership_type || '').toUpperCase() === 'OWNED';
    const ownershipStyle = isOwned
      ? { label: 'Owned', icon: '🏛️', bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' }
      : { label: 'Leased', icon: '📋', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };

    const iconHtml = `
      <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 0); width: max-content; pointer-events: auto;">
        <div class="relative group cursor-pointer transition-transform duration-200 hover:scale-110 origin-bottom flex flex-col items-center select-none" title="${property.name}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-[15px] shadow-xl border-2 border-white ring-4 ring-black/15" style="background: linear-gradient(135deg, ${catInfo.hex}, ${catInfo.hexDark});">
            <span class="leading-none flex-shrink-0">${catInfo.icon}</span>
          </div>
          <div class="w-2.5 h-2.5 -mt-1 rotate-45 border-r-2 border-b-2 border-white shadow-sm flex-shrink-0" style="background-color: ${catInfo.hexDark};"></div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'property-detail-pin',
      html: iconHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -38],
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    const popupHtml = `
      <div class="property-popup-card" style="font-family: inherit; min-width: 250px; max-width: 300px; padding: 2px;">
        <!-- Header -->
        <div style="display: flex; align-items: flex-start; gap: 9px; margin-bottom: 6px;">
          <div style="width: 30px; height: 30px; border-radius: 8px; background: ${catInfo.lightBg}; color: ${catInfo.hex}; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid ${catInfo.lightBorder};">
            ${catInfo.icon}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 13.5px; color: #0f172a; line-height: 1.25; margin-bottom: 2px; word-break: break-word;">
              ${property.name}
            </div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.2;">
              ${property.address}${property.unit_number ? `, Unit ${property.unit_number}` : ''}, ${property.city}
            </div>
          </div>
        </div>

        <!-- Tag Layout Row (Badges) -->
        <div style="display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin: 9px 0 10px 0;">
          <!-- Category Tag -->
          <span style="display: inline-flex; align-items: center; gap: 3.5px; padding: 2.5px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 600; background: ${catInfo.lightBg}; color: ${catInfo.text}; border: 1px solid ${catInfo.lightBorder};">
            <span>${catInfo.icon}</span> ${catInfo.label}
          </span>

          <!-- Ownership Tag -->
          <span style="display: inline-flex; align-items: center; gap: 3.5px; padding: 2.5px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 600; background: ${ownershipStyle.bg}; color: ${ownershipStyle.text}; border: 1px solid ${ownershipStyle.border};">
            <span>${ownershipStyle.icon}</span> ${ownershipStyle.label}
          </span>

          <!-- Precision Match Tag -->
          ${
            isExact
              ? `<span style="display: inline-flex; align-items: center; gap: 3.5px; padding: 2.5px 7.5px; border-radius: 9999px; font-size: 10px; font-weight: 500; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
                   <span style="width: 5px; height: 5px; border-radius: 50%; background: #10b981; display: inline-block;"></span> Exact Match
                 </span>`
              : `<span style="display: inline-flex; align-items: center; gap: 3.5px; padding: 2.5px 7.5px; border-radius: 9999px; font-size: 10px; font-weight: 500; background: #fffbeb; color: #b45309; border: 1px solid #fde68a;">
                   City Centroid
                 </span>`
          }
        </div>

        <!-- Footer Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #f1f5f9; gap: 6px;">
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: #64748b; background: #f8fafc; padding: 2.5px 6.5px; border-radius: 5px; border: 1px solid #e2e8f0;">
            ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noreferrer" style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; color: #2563eb; text-decoration: none; padding: 3px 8px; border-radius: 6px; background: #eff6ff; border: 1px solid #bfdbfe; transition: all 0.15s ease;">
            Open Maps ↗
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, {
      className: 'property-detail-popup',
      closeButton: true,
      autoClose: false,
    });
    marker.addTo(map);
    markerRef.current = marker;

    // Open popup after map settles
    const timer = setTimeout(() => {
      marker.openPopup();
    }, 400);

    return () => clearTimeout(timer);
  }, [lat, lng, property, catInfo, isExact]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], isExact ? 16 : 13, { animate: true });
      markerRef.current?.openPopup();
    }
  };

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopied(true);
    toast.success('Coordinates copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-xs ${className || ''}`}>
      {/* Map Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <MapPin className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground text-xs">Interactive Property Location</span>
              {isExact ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px] py-0 px-1.5 flex items-center gap-1">
                  <Compass className="w-2.5 h-2.5" />
                  Exact Pin
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  City Level
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">
              {property.city}, {property.country}
            </p>
          </div>
        </div>

        {/* Map View Controls & Layer Toggles */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-background border border-border rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => setActiveTileLayer('streets')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTileLayer === 'streets' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Streets
            </button>
            <button
              onClick={() => setActiveTileLayer('satellite')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTileLayer === 'satellite' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setActiveTileLayer('dark')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTileLayer === 'dark' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dark
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 cursor-pointer"
            onClick={handleRecenter}
            title="Recenter pin on property"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')}
            title="Open in Google Maps"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Maps</span>
          </Button>
        </div>
      </div>

      {/* Leaflet Map Div */}
      <div className="relative w-full h-[420px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating coordinates badge */}
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 bg-background/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-border shadow-md text-[10px]">
          <span className="font-mono text-foreground font-medium">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
          <button
            onClick={handleCopyCoords}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Copy coordinates"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
