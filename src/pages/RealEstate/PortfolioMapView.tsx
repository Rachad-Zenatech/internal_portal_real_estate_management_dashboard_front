import { useState, useMemo } from 'react';
import type { Property } from '@/types/realEstate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface PortfolioMapViewProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
}

export default function PortfolioMapView({ properties, onSelectProperty }: PortfolioMapViewProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    properties.length > 0 ? properties[0].id : null
  );
  const [mapZoom, setMapZoom] = useState(1);

  // Filter properties that have valid latitude and longitude
  const mappedProperties = useMemo(() => {
    return properties.filter((p) => p.latitude && p.longitude);
  }, [properties]);

  const activeProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || mappedProperties[0] || null;
  }, [properties, selectedPropertyId, mappedProperties]);

  // Convert lat/long to SVG normalized coordinates (Mercator projection simplified)
  const projectCoords = (lat: number, lon: number) => {
    // Mercator formula bounded between -60 and +75 lat
    const x = ((lon + 180) / 360) * 1000;
    const latRad = Math.max(-75, Math.min(75, lat)) * (Math.PI / 180);
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = 500 - (mercN / Math.PI) * 500;
    return { x, y };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] border border-border rounded-xl overflow-hidden bg-card shadow-xs">
      {/* Interactive Map Canvas (8 cols) */}
      <div className="lg:col-span-8 relative bg-slate-950 dark:bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-background/80 backdrop-blur-md p-1 rounded-lg border border-border shadow-xs">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setMapZoom((z) => Math.min(2.5, z + 0.25))}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setMapZoom((z) => Math.max(0.75, z - 0.25))}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setMapZoom(1.0)}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-background/85 backdrop-blur-md px-3 py-2 rounded-lg border border-border text-[11px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
            <span className="text-foreground font-medium">Owned & Verified Properties</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
            <span className="text-muted-foreground">Leased & Office Facilities</span>
          </div>
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/60">
            Coordinates matched via geocoding service
          </div>
        </div>

        {/* Scalable Vector World Background & Property Pins */}
        <div
          className="w-full h-full relative transition-transform duration-300"
          style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
        >
          <svg
            viewBox="0 0 1000 650"
            className="w-full h-full select-none"
            style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
          >
            <defs>
              <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
              </linearGradient>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.2" />
              </pattern>
            </defs>

            {/* Ocean / Map grid background */}
            <rect width="1000" height="650" fill="url(#gridGrad)" />
            <rect width="1000" height="650" fill="url(#gridPattern)" />

            {/* Stylized Landmass Contours */}
            {/* North America */}
            <path
              d="M 120 120 Q 200 80, 300 110 T 320 240 Q 240 320, 190 280 T 120 180 Z"
              fill="#334155"
              fillOpacity="0.35"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* South America */}
            <path
              d="M 280 340 Q 350 360, 320 480 T 260 520 Q 240 420, 280 340 Z"
              fill="#334155"
              fillOpacity="0.3"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* Europe */}
            <path
              d="M 460 140 Q 560 120, 580 200 T 480 260 Q 430 200, 460 140 Z"
              fill="#334155"
              fillOpacity="0.35"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* Africa */}
            <path
              d="M 480 280 Q 580 290, 560 420 T 490 480 Q 450 380, 480 280 Z"
              fill="#334155"
              fillOpacity="0.3"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* Asia */}
            <path
              d="M 600 120 Q 780 110, 840 220 T 720 340 Q 620 280, 600 120 Z"
              fill="#334155"
              fillOpacity="0.35"
              stroke="#475569"
              strokeWidth="0.8"
            />
            {/* Australia */}
            <path
              d="M 780 420 Q 860 410, 870 480 T 800 500 Q 760 460, 780 420 Z"
              fill="#334155"
              fillOpacity="0.3"
              stroke="#475569"
              strokeWidth="0.8"
            />

            {/* Property Marker Pins */}
            {mappedProperties.map((prop) => {
              const { x, y } = projectCoords(prop.latitude!, prop.longitude!);
              const isSelected = prop.id === selectedPropertyId;
              const isOwned = prop.ownership_type === 'OWNED';

              return (
                <g
                  key={prop.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => setSelectedPropertyId(prop.id)}
                  className="cursor-pointer group"
                >
                  {/* Radar pulse for active selected marker */}
                  {isSelected && (
                    <circle r="18" className="fill-primary/20 animate-ping" />
                  )}
                  {/* Outer circle */}
                  <circle
                    r={isSelected ? '10' : '7'}
                    className={`transition-all ${
                      isOwned
                        ? 'fill-emerald-500 stroke-white dark:stroke-slate-900 stroke-2'
                        : 'fill-primary stroke-white dark:stroke-slate-900 stroke-2'
                    } ${isSelected ? 'ring-4 ring-primary' : 'group-hover:scale-125'}`}
                  />
                  {/* Core dot */}
                  <circle r="2.5" fill="#ffffff" />
                  {/* Pin label */}
                  <text
                    y="-14"
                    textAnchor="middle"
                    className="text-[9px] fill-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  >
                    {prop.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Detail Sidebar / Property List (4 cols) */}
      <div className="lg:col-span-4 flex flex-col h-full overflow-hidden border-t lg:border-t-0 lg:border-l border-border bg-card">
        {/* Active Property Card Overview */}
        {activeProperty ? (
          <div className="p-4 border-b border-border bg-muted/20 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant={activeProperty.ownership_type === 'OWNED' ? 'default' : 'secondary'} className="text-[10px] mb-1">
                  {activeProperty.ownership_type || 'LEASED'}
                </Badge>
                <h3 className="font-bold text-foreground text-sm leading-tight">{activeProperty.name}</h3>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  {activeProperty.address}, {activeProperty.city}, {activeProperty.country}
                </p>
              </div>
            </div>

            {/* Geocoding confirmation status */}
            <div className="flex items-center gap-1.5 p-2 rounded bg-background/80 border border-border text-[11px] text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-foreground">Geocoded: </span>
                <span className="font-mono text-[10px]">{activeProperty.latitude?.toFixed(4)}, {activeProperty.longitude?.toFixed(4)}</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-background/60 border border-border/80">
                <span className="text-muted-foreground block text-[10px]">Owner / Entity</span>
                <span className="font-semibold text-foreground truncate block">
                  {activeProperty.legal_owner || activeProperty.responsible_legal_entity || 'ZenaTech Operating'}
                </span>
              </div>
              <div className="p-2 rounded bg-background/60 border border-border/80">
                <span className="text-muted-foreground block text-[10px]">Building Area</span>
                <span className="font-semibold text-foreground">
                  {(activeProperty.building_area || activeProperty.square_feet || 0).toLocaleString()} sqft
                </span>
              </div>
            </div>

            <Button
              size="sm"
              className="w-full text-xs gap-1.5 h-8 shadow-xs"
              onClick={() => onSelectProperty(activeProperty)}
            >
              <ExternalLink className="w-3 h-3" />
              View Full Property Details
            </Button>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Select a property on the map or from the list below.
          </div>
        )}

        {/* Filtered Properties List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          <div className="p-3 bg-muted/10 text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Portfolio Buildings ({properties.length})</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {mappedProperties.length} mapped
            </span>
          </div>

          {properties.map((prop) => {
            const isSelected = prop.id === selectedPropertyId;
            return (
              <div
                key={prop.id}
                onClick={() => setSelectedPropertyId(prop.id)}
                className={`p-3 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted/30'
                }`}
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground truncate">{prop.name}</span>
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                      {prop.city}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{prop.address}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
