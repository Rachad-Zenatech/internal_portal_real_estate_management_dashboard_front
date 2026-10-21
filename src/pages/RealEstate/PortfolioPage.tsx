import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { realEstateService } from '@/services/realEstateService';
import type { RealEstateSummary, Property, PropertyExtractionJob } from '@/types/realEstate';
import { useAuth } from '@/lib/AuthContext';
import {
  Building2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Map as MapIcon,
  LayoutGrid,
  Table as TableIcon,
  Search,
  ChevronRight,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DocumentReviewModal from './DocumentReviewModal';
import AddPropertyDocumentModal from './AddPropertyDocumentModal';
import PortfolioMapView from './PortfolioMapView';

export default function PortfolioPage() {
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const canManage = isSuperAdmin || hasRole('PROPERTY_MANAGER') || hasPermission('REAL_ESTATE_PROPERTIES_CREATE');

  // View Mode: 'cards' | 'table' | 'map'
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'map'>('cards');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modals state
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewJob, setSelectedReviewJob] = useState<PropertyExtractionJob | null>(null);

  // Load KPI Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery<RealEstateSummary>({
    queryKey: ['real-estate-portfolio-summary'],
    queryFn: () => realEstateService.getSummary(),
  });

  // Load All Properties for Table, Cards & Map views
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['real-estate-properties', selectedCity, selectedType, searchQuery],
    queryFn: () =>
      realEstateService.getProperties({
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        category: selectedType !== 'ALL' ? selectedType : undefined,
        search: searchQuery || undefined,
      }),
  });

  // Load Pending Document Extraction Jobs
  const { data: extractionJobs = [] } = useQuery<PropertyExtractionJob[]>({
    queryKey: ['property-extraction-jobs', 'NEEDS_REVIEW'],
    queryFn: () => realEstateService.getPropertyExtractionJobs('NEEDS_REVIEW'),
  });

  // Unique Filter Options
  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      const owner = p.legal_owner || p.owning_company || p.responsible_legal_entity;
      if (owner) set.add(owner);
    });
    return Array.from(set);
  }, [properties]);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (p.country) set.add(p.country);
    });
    return Array.from(set);
  }, [properties]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set);
  }, [properties]);

  // Filtered Properties for Views
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (selectedOwner !== 'ALL') {
        const owner = p.legal_owner || p.owning_company || p.responsible_legal_entity;
        if (owner !== selectedOwner) return false;
      }
      if (selectedCountry !== 'ALL' && p.country !== selectedCountry) return false;
      if (selectedCity !== 'ALL' && p.city !== selectedCity) return false;
      if (selectedType !== 'ALL' && p.property_category !== selectedType && p.property_type !== selectedType)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          (p.legal_owner && p.legal_owner.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [properties, selectedOwner, selectedCountry, selectedCity, selectedType, searchQuery]);

  const handleOpenPropertyDetail = (prop: Property) => {
    navigate(`/real-estate/properties?property_id=${prop.id}`);
  };

  const handleOpenReview = (job: PropertyExtractionJob) => {
    setSelectedReviewJob(job);
    setIsReviewModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Real Estate Portfolio
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Portfolio intelligence, property ownership records, building specifications, and inspection history.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManage && (
            <>
              <Button
                variant="outline"
                className="gap-2 text-xs font-semibold cursor-pointer"
                onClick={() => navigate('/real-estate/properties')}
              >
                <Building2 className="w-3.5 h-3.5" />
                Manage Properties
              </Button>
              <Button
                className="gap-2 text-xs font-semibold bg-linear-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-sm cursor-pointer"
                onClick={() => setIsAddDocModalOpen(true)}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Add Property via Documents
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Pending Document Reviews Alert Banner */}
      {extractionJobs.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
            </span>
            <div>
              <span className="font-bold text-foreground">
                {extractionJobs.length} Document(s) Awaiting Evidence Review:
              </span>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                New property deeds and inspection reports have been processed by the hybrid extraction pipeline and require user confirmation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-amber-500/40 text-amber-800 dark:text-amber-200"
              onClick={() => handleOpenReview(extractionJobs[0])}
            >
              <Eye className="w-3 h-3" />
              Review Latest Extraction ({extractionJobs[0].document_title || extractionJobs[0].document_filename})
            </Button>
          </div>
        </div>
      )}

      {/* Top Inventory & Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Active Properties */}
        <Card className="p-4 bg-card border-border shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Properties Owned / Managed</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {isSummaryLoading ? '...' : summary?.active_properties ?? properties.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Confirmed portfolio assets</p>
        </Card>

        {/* Total Square Footage */}
        <Card className="p-4 bg-card border-border shadow-xs hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Building Area</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {isSummaryLoading
              ? '...'
              : properties
                  .reduce((acc, p) => acc + (p.building_area || p.square_feet || 0), 0)
                  .toLocaleString()}{' '}
            <span className="text-xs font-normal text-muted-foreground">sqft</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Normalized gross structural area</p>
        </Card>

        {/* Total Units */}
        <Card className="p-4 bg-card border-border shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Units</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {isSummaryLoading ? '...' : summary?.active_units ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Bookable & office premises</p>
        </Card>

        {/* Global Locations */}
        <Card className="p-4 bg-card border-border shadow-xs hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Global Locations</span>
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {isSummaryLoading ? '...' : summary?.total_locations ?? uniqueCities.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Cities across North America & Europe</p>
        </Card>
      </div>

      {/* Main Portfolio Exploration Section */}
      <div className="space-y-4">
        {/* Filter Bar & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl">
          {/* Left: Filters */}
          <div className="flex items-center gap-2 flex-wrap flex-1 text-xs">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search name, address, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Owner Filter */}
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Owner / Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Owners</SelectItem>
                {uniqueOwners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Country Filter */}
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Countries</SelectItem>
                {uniqueCountries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City Filter */}
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Property Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Property Types</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Corporate HQ">Corporate HQ</SelectItem>
                <SelectItem value="Executive Condo">Executive Condo</SelectItem>
                <SelectItem value="Apartment Building">Apartment Building</SelectItem>
                <SelectItem value="R&D / Lab">R&D / Lab</SelectItem>
                <SelectItem value="Warehouse">Warehouse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right: View Toggles (Cards, Table, Map) */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border shrink-0">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'map' ? 'secondary' : 'ghost'}
              className="h-7 text-xs gap-1 px-2.5"
              onClick={() => setViewMode('map')}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </Button>
          </div>
        </div>

        {/* VIEW 1: MAP VIEW */}
        {viewMode === 'map' && (
          <PortfolioMapView
            properties={filteredProperties}
            onSelectProperty={handleOpenPropertyDetail}
          />
        )}

        {/* VIEW 2: CARDS VIEW */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.length === 0 ? (
              <div className="col-span-full p-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border text-xs">
                No properties match the selected filters.
              </div>
            ) : (
              filteredProperties.map((prop) => (
                <Card
                  key={prop.id}
                  className="p-4 bg-card border-border hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between cursor-pointer group"
                  onClick={() => handleOpenPropertyDetail(prop)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge
                            variant={prop.ownership_type === 'OWNED' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {prop.ownership_type || 'LEASED'}
                          </Badge>
                          {prop.is_geocoded && (
                            <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">
                              Geocoded
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                          {prop.name}
                        </h3>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      {prop.address}, {prop.city}, {prop.country}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/60">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Owner / Entity</span>
                        <span className="font-semibold text-foreground truncate block">
                          {prop.legal_owner || prop.responsible_legal_entity || 'ZenaTech Operating'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Building Area</span>
                        <span className="font-semibold text-foreground">
                          {(prop.building_area || prop.square_feet || 0).toLocaleString()} sqft
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Usable Area</span>
                        <span className="font-medium text-foreground">
                          {(prop.usable_area || prop.square_feet || 0).toLocaleString()} sqft
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Year Built</span>
                        <span className="font-medium text-foreground">{prop.year_built || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px]">{prop.property_code || 'PROP-HQ'}</span>
                    <span className="text-primary font-medium flex items-center gap-0.5">
                      View 6 Tabs <ArrowRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* VIEW 3: TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Property / Address</th>
                    <th className="p-3">Owner / Company</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Building Area</th>
                    <th className="p-3">Usable Area</th>
                    <th className="p-3">Ownership</th>
                    <th className="p-3">Year Built</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No properties found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map((prop) => (
                      <tr
                        key={prop.id}
                        onClick={() => handleOpenPropertyDetail(prop)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <span className="font-bold text-foreground block">{prop.name}</span>
                          <span className="text-muted-foreground text-[11px]">{prop.address}</span>
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {prop.legal_owner || prop.owning_company || prop.responsible_legal_entity || 'ZenaTech LLC'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-foreground">
                            <span>{prop.city}, {prop.country}</span>
                            {prop.is_geocoded && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          {(prop.building_area || prop.square_feet || 0).toLocaleString()} sqft
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {(prop.usable_area || 0).toLocaleString()} sqft
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={prop.ownership_type === 'OWNED' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {prop.ownership_type || 'LEASED'}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{prop.year_built || 'N/A'}</td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPropertyDetail(prop);
                            }}
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>



      {/* Add Property via Document Extraction Modal */}
      <AddPropertyDocumentModal
        isOpen={isAddDocModalOpen}
        onClose={() => setIsAddDocModalOpen(false)}
        onPropertyCreated={(newProp) => handleOpenPropertyDetail(newProp)}
        onOpenReviewDetail={(job) => {
          setIsAddDocModalOpen(false);
          handleOpenReview(job);
        }}
      />

      {/* Side-by-Side Review Screen Modal */}
      <DocumentReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onBack={() => {
          setIsReviewModalOpen(false);
          setIsAddDocModalOpen(true);
        }}
        job={selectedReviewJob}
        onPropertySaved={(savedProp) => handleOpenPropertyDetail(savedProp)}
      />
    </div>
  );
}
