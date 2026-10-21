import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '@/types/realEstate';
import { FALLBACK_PORTFOLIO_PROPERTIES } from '@/data/portfolioData';
import {
  Building2,
  Globe,
  MapPin,
  Maximize2,
  Users,
  Search,
  ExternalLink,
  Calendar,
  X,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Precise fallback coordinates for all 42 corporate properties
const PROPERTY_COORDINATES: Record<string, [number, number]> = {
  'Chicago Global Headquarters': [41.8814, -87.6405],
  'Chicago Condos (Executive Residence)': [41.8918, -87.6186],
  'Chicago Operations Annex': [41.8885, -87.6354],
  'Denver Innovation Hub (AeroGrid M&A)': [39.7490, -104.9922],
  'Dallas Operations Center (Apex M&A)': [32.7880, -96.7972],
  'New York Financial District Office': [40.7127, -74.0134],
  'New York Midtown Executive Suite': [40.7587, -73.9723],
  'San Francisco R&D Tech Center': [37.7885, -122.3980],
  'San Jose Hardware & Drone Test Lab': [37.3340, -121.8910],
  'Los Angeles Century City Media Hub': [34.0595, -118.4144],
  'Los Angeles Executive Condo (Santa Monica)': [34.0175, -118.4985],
  'Los Angeles Downtown Residence Condo': [34.0450, -118.2630],
  'Austin Tech Corridor Office': [30.2662, -97.7479],
  'Seattle Cloud Engineering Center': [47.6074, -122.3364],
  'Boston AI & Robotics Laboratory': [42.3524, -71.0454],
  'Raleigh Cloud Infrastructure Lab (CloudPulse M&A)': [35.7766, -78.6385],
  'Vancouver Waterfront Office': [49.2865, -123.1118],
  'Vancouver Coal Harbour Condo': [49.2889, -123.1190],
  'Toronto Financial Core Suite': [43.6487, -79.3817],
  'Montreal Software Studio': [45.4988, -73.5663],
  'London European Headquarters': [51.5050, -0.0195],
  'London Mayfair Executive Boardroom': [51.5097, -0.1444],
  'London Docklands Executive Penthouse Condo': [51.5028, -0.0163],
  'London Kensington Residence Condo': [51.4983, -0.2045],
  'Dublin Silicon Docks Regional Office': [53.3444, -6.2396],
  'Dublin Grand Canal Condo': [53.3448, -6.2405],
  'Berlin R&D & Engineering Hub': [52.5096, 13.3759],
  'Berlin Mitte Executive Condo': [52.5283, 13.3934],
  'Munich Hardware Test Lab (AeroGrid M&A)': [48.1755, 11.5910],
  'Frankfurt Financial District Office': [50.1128, 8.6722],
  'Paris Innovation Office': [48.8897, 2.2514],
  'Amsterdam Zuidas Tech Hub': [52.3364, 4.8727],
  'Zurich Wealth & AI Center': [47.3639, 8.5342],
  'Edinburgh Cloud Engineering Hub (CloudPulse M&A)': [55.9442, -3.2082],
  'Warsaw Shared Services Center': [52.2297, 20.9840],
  'Singapore APAC Headquarters': [1.2798, 103.8540],
  'Singapore Marina Bay Residence Condo': [1.2805, 103.8532],
  'Dubai International Financial Centre (DIFC) Hub': [25.2104, 55.2809],
  'Dubai Downtown Executive Condo 1 (Burj Crown)': [25.1950, 55.2755],
  'Dubai Downtown Executive Condo 2 (Opera Grand)': [25.1925, 55.2720],
  'Dubai Marina Penthouse Condo': [25.0865, 55.1455],
  'Dubai Palm Jumeirah Villa Residence': [25.1160, 55.1410],
  'Tokyo Regional Office': [35.6812, 139.7644],
  'Sydney Financial Hub': [-33.8642, 151.2016],
  'Bangalore R&D Engineering Campus': [12.9260, 77.6830],
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

const CATEGORY_THUMBNAILS: Record<string, string> = {
  OWNED_HQ: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
  COMPANY_CONDO: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
  LEASED_OFFICE: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
  RD_FACILITY: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
  WAREHOUSE: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  CO_WORKING: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=600&auto=format&fit=crop&q=80',
};

function getPropertyThumbnail(p: Property): string {
  if (p.image_url) return p.image_url;
  const category = (p.property_category || 'LEASED_OFFICE').toUpperCase();
  return CATEGORY_THUMBNAILS[category] || CATEGORY_THUMBNAILS.LEASED_OFFICE;
}

function getCoords(p: Property): [number, number] {
  if (p.latitude && p.longitude && (Number(p.latitude) !== 0 || Number(p.longitude) !== 0)) {
    return [Number(p.latitude), Number(p.longitude)];
  }
  if (PROPERTY_COORDINATES[p.name]) {
    return PROPERTY_COORDINATES[p.name];
  }
  if (CITY_COORDINATES[p.city]) {
    return CITY_COORDINATES[p.city];
  }
  return [41.8814, -87.6405];
}

function getCategoryColor(category?: string, isMa?: boolean) {
  if (isMa) return { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-500', hex: '#9333ea', label: 'M&A Asset' };
  switch (category) {
    case 'OWNED_HQ':
      return { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-500', hex: '#4f46e5', label: 'Owned HQ' };
    case 'COMPANY_CONDO':
      return { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-500', hex: '#059669', label: 'Company Condo' };
    case 'RD_FACILITY':
      return { bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-500', hex: '#0891b2', label: 'R&D Lab' };
    default:
      return { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-500', hex: '#2563eb', label: 'Leased Office' };
  }
}

interface RealtorLocationMapExplorerProps {
  properties: Property[];
}

export default function RealtorLocationMapExplorer({ properties }: RealtorLocationMapExplorerProps) {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const listItemsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'esri' | 'dark' | 'satellite'>('streets');
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Use live properties if returned, or fallback to complete 42 global properties dataset
  const effectiveProperties = useMemo(() => {
    return properties && properties.length > 0 ? properties : FALLBACK_PORTFOLIO_PROPERTIES;
  }, [properties]);

  // Filter properties
  const filteredProperties = useMemo(() => {
    return effectiveProperties.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.acquisition_entity_name && p.acquisition_entity_name.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'MA' && p.is_ma_acquisition) ||
        p.property_category === categoryFilter;

      let matchesRegion = true;
      if (regionFilter === 'Americas') {
        matchesRegion = ['USA', 'Canada', 'Mexico'].includes(p.country);
      } else if (regionFilter === 'EMEA') {
        matchesRegion = ['UK', 'Ireland', 'Germany', 'France', 'Netherlands', 'Switzerland', 'Poland', 'UAE'].includes(p.country);
      } else if (regionFilter === 'APAC') {
        matchesRegion = ['Singapore', 'Japan', 'Australia', 'India'].includes(p.country);
      }

      return matchesSearch && matchesCategory && matchesRegion;
    });
  }, [effectiveProperties, searchQuery, categoryFilter, regionFilter]);

  // Set initial selected property quietly on first load without auto-opening the card
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && filteredProperties.length > 0) {
      setSelectedProperty(filteredProperties[0]);
      hasInitializedRef.current = true;
    }
  }, [filteredProperties]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [30.0, 10.0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19,
        }
      );
      tileLayer.addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update Tile Layer if changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    let subdomains: string[] | string = ['a', 'b', 'c'];

    if (activeTileLayer === 'esri') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS';
      subdomains = [];
    } else if (activeTileLayer === 'dark') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
      subdomains = [];
    } else if (activeTileLayer === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      subdomains = [];
    }

    L.tileLayer(url, {
      attribution,
      subdomains,
      maxZoom: 19,
    }).addTo(map);
  }, [activeTileLayer]);

  // Render / Update Markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    filteredProperties.forEach((prop) => {
      const [lat, lng] = getCoords(prop);
      const isSelected = selectedProperty?.id === prop.id;
      const isHovered = hoveredPropertyId === prop.id;
      const catColor = getCategoryColor(prop.property_category, prop.is_ma_acquisition);

      const priceOrType = prop.property_category === 'COMPANY_CONDO' 
        ? '🏠 Condo' 
        : prop.is_ma_acquisition 
        ? '✨ M&A' 
        : prop.property_category === 'OWNED_HQ' 
        ? '👑 HQ' 
        : prop.monthly_rent 
        ? '$' + (Number(prop.monthly_rent) / 1000).toFixed(0) + 'k/mo' 
        : '🏢 Office';

      const iconHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : isHovered ? 'scale-110 z-40' : 'scale-100 z-10'}">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg border-2 ${
            isSelected
              ? 'bg-slate-900 border-indigo-400 ring-4 ring-indigo-500/40'
              : 'border-white/90'
          }" style="background-color: ${isSelected ? '#0f172a' : catColor.hex};">
            <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span class="whitespace-nowrap">${priceOrType}</span>
          </div>
          <div class="w-2 h-2 mx-auto -mt-0.5 rotate-45 border-r-2 border-b-2 border-white/80" style="background-color: ${isSelected ? '#0f172a' : catColor.hex};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'realtor-map-custom-marker',
        html: iconHtml,
        iconSize: [80, 32],
        iconAnchor: [40, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        handleSelectProperty(prop, false);
      });

      marker.addTo(map);
      markersRef.current.set(prop.id, marker);
    });
  }, [filteredProperties, selectedProperty?.id, hoveredPropertyId]);

  const handleSelectProperty = (prop: Property, fromList: boolean = true) => {
    setSelectedProperty(prop);
    setIsDetailsOpen(true);

    const [lat, lng] = getCoords(prop);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([lat, lng], 14, {
        duration: 1.3,
        easeLinearity: 0.25,
      });
    }

    if (!fromList) {
      const el = listItemsRef.current[prop.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handleResetToWorldView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setIsDetailsOpen(false);
    setSelectedProperty(null);

    // Smoothly fly back to global world view
    map.flyTo([25.0, 10.0], 2, {
      duration: 1.4,
      easeLinearity: 0.25,
    });

    toast.info('Returned to Global World View');
  };



  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const openGoogleMaps = (prop: Property) => {
    const query = encodeURIComponent(`${prop.address}, ${prop.city}, ${prop.country}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, address, or M&A..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'ALL', label: 'All Sites' },
              { id: 'OWNED_HQ', label: '👑 Owned HQ' },
              { id: 'LEASED_OFFICE', label: '🏢 Leased Offices' },
              { id: 'COMPANY_CONDO', label: '🏠 Condos' },
              { id: 'MA', label: '✨ M&A Assets' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Region & Map Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border">
            {(['ALL', 'Americas', 'EMEA', 'APAC'] as const).map((reg) => (
              <button
                key={reg}
                onClick={() => setRegionFilter(reg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  regionFilter === reg
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToWorldView}
            className="h-8.5 gap-1.5 text-xs rounded-xl cursor-pointer font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-xs"
            title="Reset map view to see the whole world"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>World View</span>
          </Button>

          {/* Tile Layer Style Toggle */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border">
            <button
              onClick={() => setActiveTileLayer('streets')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                activeTileLayer === 'streets' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
              title="OpenStreetMap Standard"
            >
              OSM
            </button>
            <button
              onClick={() => setActiveTileLayer('esri')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                activeTileLayer === 'esri' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
              title="Esri World Street Map"
            >
              Street
            </button>
            <button
              onClick={() => setActiveTileLayer('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                activeTileLayer === 'satellite' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
              title="Esri Satellite Imagery"
            >
              Satellite
            </button>
            <button
              onClick={() => setActiveTileLayer('dark')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                activeTileLayer === 'dark' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
              }`}
              title="Esri Dark Canvas"
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Main Split View: Realtor.com List (Left) + Center Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px] rounded-2xl overflow-hidden border border-border shadow-sm bg-card">
        {/* Left: Realtor.com Style Location List (5 cols on lg) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-full border-r border-border bg-muted/10 overflow-hidden">
          {/* List Header */}
          <div className="p-3.5 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Locations Directory
              </span>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {filteredProperties.length} Properties
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">Click to fly on map</span>
          </div>

          {/* Scrollable Card List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-border/20">
            {filteredProperties.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                <Building2 className="w-10 h-10 text-muted-foreground/40 stroke-1" />
                <p className="text-sm font-semibold text-foreground">No matching locations found</p>
                <p className="text-xs max-w-xs">Try clearing the search query or changing your category filter.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    setRegionFilter('ALL');
                  }}
                  className="mt-2 text-xs"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              filteredProperties.map((prop) => {
                const isSelected = selectedProperty?.id === prop.id;
                const catColor = getCategoryColor(prop.property_category, prop.is_ma_acquisition);
                const thumb = getPropertyThumbnail(prop);

                return (
                  <div
                    key={prop.id}
                    ref={(el) => {
                      listItemsRef.current[prop.id] = el;
                    }}
                    onClick={() => handleSelectProperty(prop, true)}
                    onMouseEnter={() => setHoveredPropertyId(prop.id)}
                    onMouseLeave={() => setHoveredPropertyId(null)}
                    className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex gap-3 group relative ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-card border-border hover:border-indigo-400/60 hover:shadow-xs'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                      <img
                        src={thumb}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-1 left-1">
                        <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md shadow-xs ${catColor.bg}`}>
                          {catColor.label}
                        </span>
                      </div>
                      {prop.is_ma_acquisition && (
                        <div className="absolute bottom-1 right-1 bg-purple-950/80 text-purple-200 rounded p-0.5 backdrop-blur-xs">
                          <Sparkles className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className={`text-xs font-bold truncate leading-snug ${
                            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground group-hover:text-indigo-600'
                          }`}>
                            {prop.name}
                          </h4>
                          {isSelected && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{prop.address}, {prop.city}</span>
                        </p>
                      </div>

                      {/* Specs Strip */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1 truncate">
                          <Maximize2 className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{Number(prop.square_feet || 0).toLocaleString()} sq ft</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Users className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{prop.current_occupancy || 0} / {prop.max_capacity || 0} staff</span>
                        </div>
                      </div>

                      {/* Financial Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-extrabold text-foreground">
                          {prop.monthly_rent && prop.monthly_rent > 0
                            ? '$' + Number(prop.monthly_rent).toLocaleString() + ' /mo'
                            : prop.property_category === 'OWNED_HQ'
                            ? 'Corporate Owned'
                            : 'Active Facility'}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Fly <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center / Right: Interactive Leaflet Map with Google Maps Dropdown Card */}
        <div className="lg:col-span-7 xl:col-span-7 relative h-full w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating World View Quick Reset Button on Map */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetToWorldView}
              className="px-3 py-1.5 rounded-xl bg-card/95 hover:bg-card text-foreground border border-border shadow-md text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all hover:scale-105 active:scale-95 text-indigo-600 dark:text-indigo-400"
              title="Return to Global World View"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>World View</span>
            </button>
          </div>

          {/* COMPACT GOOGLE MAPS STYLE FLOATING CARD */}
          {selectedProperty && isDetailsOpen && (
            <div className="absolute top-3 left-3 z-40 w-[300px] sm:w-[320px] max-w-[calc(100%-24px)] bg-card/95 backdrop-blur-md rounded-xl border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Compact Header with Image & Close Button */}
              <div className="relative h-20 w-full overflow-hidden bg-slate-950">
                <img
                  src={getPropertyThumbnail(selectedProperty)}
                  alt={selectedProperty.name}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                {/* Explicit Close Button (Stays Closed) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailsOpen(false);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer z-50 shadow-md"
                  title="Close Details Card"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Badge Overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-xs ${getCategoryColor(selectedProperty.property_category, selectedProperty.is_ma_acquisition).bg}`}>
                    {getCategoryColor(selectedProperty.property_category, selectedProperty.is_ma_acquisition).label}
                  </span>
                </div>

                {/* Title & City on Banner */}
                <div className="absolute bottom-1.5 left-2.5 right-7 text-white">
                  <h3 className="font-bold text-xs leading-tight truncate">
                    {selectedProperty.name}
                  </h3>
                  <p className="text-[10px] text-white/80 flex items-center gap-0.5 truncate">
                    <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                    <span>{selectedProperty.city}, {selectedProperty.country}</span>
                  </p>
                </div>
              </div>

              {/* Compact Body */}
              <div className="p-2.5 space-y-2">
                {/* Single-line Address Row with Copy */}
                <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-muted/60 border border-border/80 text-[11px]">
                  <span className="truncate text-foreground font-medium">
                    {selectedProperty.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${selectedProperty.address}, ${selectedProperty.city}`)}
                    className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedAddress ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* 3 Compact Metric Chips */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded-lg border border-border bg-card">
                    <span className="text-muted-foreground block text-[9px]">Sq Ft</span>
                    <span className="font-bold text-foreground">
                      {Number(selectedProperty.square_feet || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-1.5 rounded-lg border border-border bg-card">
                    <span className="text-muted-foreground block text-[9px]">Staff</span>
                    <span className="font-bold text-emerald-600">
                      {selectedProperty.current_occupancy || 0}/{selectedProperty.max_capacity || 0}
                    </span>
                  </div>

                  <div className="p-1.5 rounded-lg border border-border bg-card">
                    <span className="text-muted-foreground block text-[9px]">Cost/mo</span>
                    <span className="font-bold text-foreground">
                      {selectedProperty.monthly_rent && selectedProperty.monthly_rent > 0
                        ? '$' + (Number(selectedProperty.monthly_rent) / 1000).toFixed(1) + 'k'
                        : 'Owned'}
                    </span>
                  </div>
                </div>

                {/* Thin Utilization Progress Bar */}
                {selectedProperty.max_capacity && selectedProperty.max_capacity > 0 && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground shrink-0">Usage:</span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round(((selectedProperty.current_occupancy || 0) / selectedProperty.max_capacity) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="font-bold text-foreground shrink-0">
                      {Math.round(((selectedProperty.current_occupancy || 0) / selectedProperty.max_capacity) * 100)}%
                    </span>
                  </div>
                )}

                {/* Compact Actions Bar */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Button
                    size="sm"
                    onClick={() => openGoogleMaps(selectedProperty)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 gap-1 cursor-pointer shadow-xs rounded-lg"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Google Maps</span>
                  </Button>

                  {selectedProperty.property_category === 'COMPANY_CONDO' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/real-estate/bookings')}
                      className="text-[11px] h-7 gap-1 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer rounded-lg"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Book</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/real-estate/portfolio')}
                      className="text-[11px] h-7 gap-1 cursor-pointer rounded-lg"
                    >
                      <span>Register</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Pill Re-Open Button when closed */}
          {selectedProperty && !isDetailsOpen && (
            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-card/95 hover:bg-card border border-border shadow-md text-[11px] font-semibold text-foreground flex items-center gap-1.5 cursor-pointer backdrop-blur-md animate-in fade-in duration-200"
            >
              <MapPin className="w-3 h-3 text-indigo-500" />
              <span className="max-w-[150px] truncate">{selectedProperty.name}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">Details</span>
            </button>
          )}

          {/* Bottom Right Floating Map Badge */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md text-[11px] font-semibold text-foreground border border-border shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Interactive Leaflet & OpenStreetMap Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
