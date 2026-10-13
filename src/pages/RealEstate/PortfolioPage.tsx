import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import type { Property } from '@/types/realEstate';
import { useAuth } from '@/lib/AuthContext';
import {
  Building2,
  MapPin,
  Maximize2,
  Plus,
  Search,
  FileSpreadsheet,
  Users,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import SpreadsheetImportModal from './SpreadsheetImportModal';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Real Estate (~40)' },
  { id: 'LEASED_OFFICE', label: 'Leased Offices' },
  { id: 'OWNED_HQ', label: 'Owned Headquarters' },
  { id: 'COMPANY_CONDO', label: 'Executive Condos' },
  { id: 'MA_ONLY', label: 'M&A Acquisitions' },
  { id: 'RD_FACILITY', label: 'R&D & Labs' },
];

export default function PortfolioPage() {
  const { hasRole, hasPermission } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const canManage = isSuperAdmin || hasPermission('REAL_ESTATE_MANAGE') || hasPermission('REAL_ESTATE_PORTFOLIO_CREATE');
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'SPACE' | 'COSTS' | 'LEASE' | 'MA'>('SPACE');

  // Add Property State
  const [newProp, setNewProp] = useState<Partial<Property>>({
    name: '',
    city: 'Chicago',
    country: 'USA',
    address: '',
    property_category: 'LEASED_OFFICE',
    square_feet: 12000,
    max_capacity: 85,
    current_occupancy: 70,
    monthly_rent: 32000,
    monthly_cam: 4800,
    annual_property_tax: 22000,
    lease_type: 'Triple Net (NNN)',
    lease_expiration_date: '2028-12-31',
    renewal_notice_deadline: '2028-06-30',
    landlord_name: '',
    is_ma_acquisition: false,
    acquisition_entity_name: '',
    primary_contact: 'Vanessa',
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['real-estate-properties', selectedCity, selectedCategory, searchQuery],
    queryFn: () =>
      realEstateService.getProperties({
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        category: selectedCategory !== 'ALL' && selectedCategory !== 'MA_ONLY' ? selectedCategory : undefined,
        is_ma: selectedCategory === 'MA_ONLY' ? true : undefined,
        search: searchQuery || undefined,
      }),
  });

  // Summary data not required in this component; removed to avoid unused variable.

  const createPropertyMutation = useMutation({
    mutationFn: (data: Partial<Property>) => realEstateService.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-summary'] });
      toast.success('Property successfully registered in corporate portfolio');
      setIsAddPropertyOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Failed to register property: ${err.message || 'Check inputs'}`);
    },
  });

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set).sort();
  }, [properties]);

  const handleOpenDetails = (prop: Property) => {
    setSelectedProperty(prop);
    setActiveDetailTab('SPACE');
    setIsDetailOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Corporate Real Estate Portfolio
            </h1>
            <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
              {properties.length} Properties Tracked
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Central source of truth for all leases, owned properties, executive residences, and M&A offices worldwide.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs h-8.5 gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Vanessa's Spreadsheet Ingestion</span>
          </Button>

          {canManage && (
            <Button
              onClick={() => setIsAddPropertyOpen(true)}
              size="sm"
              className="text-xs h-8.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Property</span>
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by building, city, M&A deal, landlord..."
            className="pl-9 h-8.5 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="h-8.5 text-xs w-full sm:w-44 bg-background">
              <SelectValue placeholder="Filter by City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Global Cities</SelectItem>
              {uniqueCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-xs text-muted-foreground shrink-0 hidden md:block">
            Showing <span className="font-semibold text-foreground">{properties.length}</span> sites
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-sm text-foreground">No Properties Found</h3>
          <p className="text-xs mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => {
            const isMA = prop.is_ma_acquisition;
            const occRate = prop.max_capacity && prop.max_capacity > 0
              ? Math.round(((prop.current_occupancy || 0) / prop.max_capacity) * 100)
              : 0;

            return (
              <Card
                key={prop.id}
                onClick={() => handleOpenDetails(prop)}
                className={`overflow-hidden border border-border/80 hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group ${
                  isMA ? 'bg-gradient-to-b from-purple-500/5 to-card' : 'bg-card'
                }`}
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Top Tags */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={
                          prop.property_category === 'OWNED_HQ'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]'
                            : prop.property_category === 'COMPANY_CONDO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]'
                            : 'bg-muted text-foreground text-[10px]'
                        }
                      >
                        {prop.property_category === 'OWNED_HQ'
                          ? 'Owned HQ'
                          : prop.property_category === 'COMPANY_CONDO'
                          ? 'Executive Condo'
                          : prop.property_category === 'RD_FACILITY'
                          ? 'R&D / Lab'
                          : 'Leased Office'}
                      </Badge>

                      {isMA && (
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[10px] gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>M&A: {prop.acquisition_entity_name || 'Acquired'}</span>
                        </Badge>
                      )}
                    </div>

                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                      {prop.country}
                    </span>
                  </div>

                  {/* Property Name & Location */}
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {prop.name}
                    </h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{prop.address}, {prop.city}</span>
                    </div>
                  </div>

                  {/* Core Metrics: Sq Ft & Occupancy Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Square Footage</span>
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-indigo-500" />
                        {Number(prop.square_feet || 0).toLocaleString()} sq ft
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Headcount & Occ.</span>
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-500" />
                        {prop.current_occupancy || 0} / {prop.max_capacity || 0} ({occRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Costs and Lease Expiration */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Monthly Commitment</span>
                      <span className="font-bold text-foreground">
                        ${(Number(prop.monthly_rent || 0) + Number(prop.monthly_cam || 0)).toLocaleString()}/mo
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Lease Expiration</span>
                      <span className="font-medium text-foreground">
                        {prop.lease_expiration_date || 'Owned / Direct'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="px-4 py-2.5 bg-muted/30 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Contact: {prop.primary_contact || 'Vanessa'}</span>
                  <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Specs & Terms <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Property Details Drawer / Modal */}
      {selectedProperty && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="pb-3 border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold">
                      {selectedProperty.name}
                    </DialogTitle>
                    {selectedProperty.is_ma_acquisition && (
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                        M&A Asset
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedProperty.address}, {selectedProperty.city}, {selectedProperty.country}</span>
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedProperty.property_category || 'OFFICE'}
                </Badge>
              </div>

              {/* Tab Navigation inside Modal */}
              <div className="flex items-center gap-2 pt-3 border-t mt-3">
                {[
                  { id: 'SPACE', label: 'Space & Occupancy' },
                  { id: 'COSTS', label: 'Financials & Costs' },
                  { id: 'LEASE', label: 'Lease Terms & Dates' },
                  { id: 'MA', label: 'M&A & Notes' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveDetailTab(t.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeDetailTab === t.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {activeDetailTab === 'SPACE' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block">Square Footage</span>
                      <span className="text-base font-bold text-foreground">
                        {Number(selectedProperty.square_feet || 0).toLocaleString()} sq ft
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block">Headcount Capacity</span>
                      <span className="text-base font-bold text-foreground">
                        {selectedProperty.max_capacity || 0} seats
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block">Current Staff</span>
                      <span className="text-base font-bold text-emerald-600">
                        {selectedProperty.current_occupancy || 0} people
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <h4 className="font-bold text-xs text-foreground flex items-center justify-between">
                      <span>Floor Plans & Architectural Blueprints</span>
                      {selectedProperty.floor_plan_url && (
                        <a
                          href={selectedProperty.floor_plan_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Open Blueprint <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Floor plan blueprint reference: {selectedProperty.floor_plan_url || 'Schematic blueprint archived in Document Vault'}.
                    </p>
                  </div>
                </div>
              )}

              {activeDetailTab === 'COSTS' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border bg-card">
                      <span className="text-xs text-muted-foreground block">Monthly Base Rent</span>
                      <span className="text-lg font-bold text-foreground">
                        ${Number(selectedProperty.monthly_rent || 0).toLocaleString()} / mo
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-card">
                      <span className="text-xs text-muted-foreground block">Monthly CAM / Maintenance</span>
                      <span className="text-lg font-bold text-foreground">
                        ${Number(selectedProperty.monthly_cam || 0).toLocaleString()} / mo
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-card">
                      <span className="text-xs text-muted-foreground block">Annual Municipal Taxes</span>
                      <span className="text-lg font-bold text-foreground">
                        ${Number(selectedProperty.annual_property_tax || 0).toLocaleString()} / yr
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-card">
                      <span className="text-xs text-muted-foreground block">Total Monthly Cost</span>
                      <span className="text-lg font-bold text-emerald-600">
                        ${(Number(selectedProperty.monthly_rent || 0) + Number(selectedProperty.monthly_cam || 0)).toLocaleString()} / mo
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'LEASE' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-muted-foreground block">Lease Structure</span>
                      <span className="font-bold text-foreground">{selectedProperty.lease_type || 'Triple Net (NNN)'}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-muted-foreground block">Landlord / Owner</span>
                      <span className="font-bold text-foreground">{selectedProperty.landlord_name || 'Direct / Owned'}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-muted-foreground block">Lease Commencement</span>
                      <span className="font-bold text-foreground">{selectedProperty.lease_commencement_date || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20">
                      <span className="text-muted-foreground block">Lease Expiration Date</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{selectedProperty.lease_expiration_date || 'Owned'}</span>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/20 col-span-2">
                      <span className="text-muted-foreground block">Contractual Renewal Notice Deadline</span>
                      <span className="font-bold text-amber-600">{selectedProperty.renewal_notice_deadline || 'No renewal notice requirement'}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'MA' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Acquisition Classification</span>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedProperty.is_ma_acquisition ? 'M&A Deal Asset' : 'Organic Corporate Portfolio'}
                      </Badge>
                    </div>
                    {selectedProperty.is_ma_acquisition && (
                      <div>
                        <span className="text-muted-foreground">Acquired Entity: </span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {selectedProperty.acquisition_entity_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-muted-foreground block font-semibold">Vanessa's Spreadsheet Reference</span>
                    <p className="text-foreground">{selectedProperty.source_spreadsheet_ref || 'Primary Real Estate Register'}</p>
                  </div>

                  {selectedProperty.notes && (
                    <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
                      <span className="text-muted-foreground block font-semibold">Notes & Context</span>
                      <p className="text-foreground">{selectedProperty.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button onClick={() => setIsDetailOpen(false)} className="h-8 text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Property Modal */}
      <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 gap-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Register Real Estate Property</DialogTitle>
            <DialogDescription className="text-sm">
              Add a new lease, office, condo, or acquired site to the global corporate portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1.5">Property Name</label>
                <Input
                  value={newProp.name || ''}
                  onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                  placeholder="e.g. Austin Tech Center"
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Category</label>
                <Select
                  value={newProp.property_category || 'LEASED_OFFICE'}
                  onValueChange={(val) => setNewProp({ ...newProp, property_category: val })}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEASED_OFFICE">Leased Office</SelectItem>
                    <SelectItem value="OWNED_HQ">Owned HQ</SelectItem>
                    <SelectItem value="COMPANY_CONDO">Executive Condo</SelectItem>
                    <SelectItem value="RD_FACILITY">R&D Lab</SelectItem>
                    <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-semibold block mb-1.5">City</label>
                <Input
                  value={newProp.city || ''}
                  onChange={(e) => setNewProp({ ...newProp, city: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Country</label>
                <Input
                  value={newProp.country || ''}
                  onChange={(e) => setNewProp({ ...newProp, country: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Postal Code</label>
                <Input
                  value={newProp.postal_code || ''}
                  onChange={(e) => setNewProp({ ...newProp, postal_code: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1.5">Full Street Address</label>
              <Input
                value={newProp.address || ''}
                onChange={(e) => setNewProp({ ...newProp, address: e.target.value })}
                placeholder="100 Congress Ave, Suite 1400"
                className="h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-semibold block mb-1.5">Square Feet</label>
                <Input
                  type="number"
                  value={newProp.square_feet || 0}
                  onChange={(e) => setNewProp({ ...newProp, square_feet: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Headcount Cap.</label>
                <Input
                  type="number"
                  value={newProp.max_capacity || 0}
                  onChange={(e) => setNewProp({ ...newProp, max_capacity: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Current Staff</label>
                <Input
                  type="number"
                  value={newProp.current_occupancy || 0}
                  onChange={(e) => setNewProp({ ...newProp, current_occupancy: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-semibold block mb-1.5">Monthly Rent ($)</label>
                <Input
                  type="number"
                  value={newProp.monthly_rent || 0}
                  onChange={(e) => setNewProp({ ...newProp, monthly_rent: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Monthly CAM ($)</label>
                <Input
                  type="number"
                  value={newProp.monthly_cam || 0}
                  onChange={(e) => setNewProp({ ...newProp, monthly_cam: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Annual Taxes ($)</label>
                <Input
                  type="number"
                  value={newProp.annual_property_tax || 0}
                  onChange={(e) => setNewProp({ ...newProp, annual_property_tax: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1.5">Lease Expiration</label>
                <Input
                  type="date"
                  value={newProp.lease_expiration_date || ''}
                  onChange={(e) => setNewProp({ ...newProp, lease_expiration_date: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">Renewal Notice Deadline</label>
                <Input
                  type="date"
                  value={newProp.renewal_notice_deadline || ''}
                  onChange={(e) => setNewProp({ ...newProp, renewal_notice_deadline: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1.5">Landlord / Owner</label>
                <Input
                  value={newProp.landlord_name || ''}
                  onChange={(e) => setNewProp({ ...newProp, landlord_name: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1.5">M&A Acquisition Entity (if any)</label>
                <Input
                  value={newProp.acquisition_entity_name || ''}
                  onChange={(e) =>
                    setNewProp({
                      ...newProp,
                      acquisition_entity_name: e.target.value,
                      is_ma_acquisition: Boolean(e.target.value.trim()),
                    })
                  }
                  placeholder="e.g. AeroGrid Analytics"
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAddPropertyOpen(false)} className="h-10 text-sm">
              Cancel
            </Button>
            <Button
              onClick={() => createPropertyMutation.mutate(newProp)}
              disabled={createPropertyMutation.isPending || !newProp.name}
              className="h-10 text-sm bg-primary"
            >
              Save to Portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
          queryClient.invalidateQueries({ queryKey: ['real-estate-summary'] });
        }}
      />
    </div>
  );
}
