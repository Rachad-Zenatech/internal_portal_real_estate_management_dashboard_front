import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { realEstateService } from '@/services/realEstateService';
import type {
  Property,
  Unit,
  Location,
  PropertyExtractionJob,
  PropertyInspectionFinding,
} from '@/types/realEstate';
import { useAuth } from '@/lib/AuthContext';
import {
  Building2,
  Building,
  MapPin,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Archive,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
  Activity,
  Compass,
  RefreshCw,
  Hammer,
  UploadCloud,
  Download,
  Sparkles,
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
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import DocumentReviewModal from './DocumentReviewModal';
import AddPropertyDocumentModal from './AddPropertyDocumentModal';

import { formatExactFileSize } from '@/lib/utils';
const formatFileSize = formatExactFileSize;

export default function PropertiesPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();

  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const isManager = isSuperAdmin || hasRole('PROPERTY_MANAGER') || hasPermission('REAL_ESTATE_PROPERTIES_CREATE');

  // URL Query Filters
  const cityParam = searchParams.get('city') || 'ALL';
  const [selectedCity, setSelectedCity] = useState<string>(cityParam);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOwnership, setSelectedOwnership] = useState<string>('ALL');
  const [selectedInvStatus, setSelectedInvStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawer State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState('PROPERTY_DEED');
  const [uploadDocAccess, setUploadDocAccess] = useState('INTERNAL');
  const [uploadDocNotes, setUploadDocNotes] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewJob, setSelectedReviewJob] = useState<PropertyExtractionJob | null>(null);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Forms State
  const [newProp, setNewProp] = useState<Partial<Property>>({
    name: '',
    city: 'Chicago',
    country: 'USA',
    address: '',
    property_category: 'LEASED_OFFICE',
    property_type: 'Office',
    ownership_type: 'LEASED',
    responsible_legal_entity: 'ZenaTech Americas LLC',
    local_contact_name: 'Vanessa Local Contact',
    local_contact_email: 'vanessa@zenatech.com',
    timezone: 'America/Chicago',
    square_feet: 5000,
    monthly_rent: 12000,
    currency: 'USD',
    tax_responsibility: 'LANDLORD',
  });

  const [newUnit, setNewUnit] = useState<Partial<Unit>>({
    unit_number: '',
    unit_type: 'Condo',
    floor: '1',
    floor_area: 1200,
    area_unit: 'sqft',
    bedrooms: 2,
    bathrooms: 2,
    guest_capacity: 4,
    is_bookable: true,
    amenities: ['High-Speed WiFi', 'Kitchen', 'Workspace Desk'],
    employee_instructions: 'Keybox on front door handle.',
    restricted_access_info: 'WiFi admin: AdminPass2026',
  });

  // Verification Form State
  const [verifyStatus, setVerifyStatus] = useState('VERIFIED');
  const [verifyNotes, setVerifyNotes] = useState('');

  // Load Locations for Dropdown
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['real-estate-locations'],
    queryFn: () => realEstateService.getLocations(),
  });

  // Load Properties
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['real-estate-properties', selectedCity, selectedCategory, selectedOwnership, selectedInvStatus, searchQuery],
    queryFn: () =>
      realEstateService.getProperties({
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        ownership_type: selectedOwnership !== 'ALL' ? selectedOwnership : undefined,
        inventory_status: selectedInvStatus !== 'ALL' ? selectedInvStatus : undefined,
        search: searchQuery || undefined,
      }),
  });

  // Load Selected Property Details
  const { data: selectedProperty, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['real-estate-property-details', selectedPropertyId],
    queryFn: () => realEstateService.getPropertyDetails(selectedPropertyId!),
    enabled: !!selectedPropertyId,
  });

  // URL Deep Link Support (?propId=... or ?action=new)
  useEffect(() => {
    const propId = searchParams.get('propId');
    if (propId) {
      setSelectedPropertyId(propId);
      setIsDetailOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && isManager) {
      setIsAddPropertyOpen(true);
    }
  }, [searchParams, isManager]);

  const handleOpenDetail = (prop: Property) => {
    setSelectedPropertyId(prop.id);
    setIsDetailOpen(true);
  };

  const createPropMutation = useMutation({
    mutationFn: (data: Partial<Property>) => realEstateService.createProperty(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      toast.success(`Property "${data.name}" added successfully`);
      setIsAddPropertyOpen(false);
      setNewProp({
        name: '',
        city: 'Chicago',
        country: 'USA',
        address: '',
        property_category: 'LEASED_OFFICE',
        property_type: 'Office',
        ownership_type: 'LEASED',
      });
      setSelectedPropertyId(data.id);
      setIsDetailOpen(true);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create property');
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: (data: Partial<Unit> & { property_id: string }) => realEstateService.createUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      toast.success('Unit added successfully');
      setIsAddUnitOpen(false);
      setNewUnit({
        unit_number: '',
        unit_type: 'Condo',
        floor: '1',
        floor_area: 1200,
        area_unit: 'sqft',
        bedrooms: 2,
        bathrooms: 2,
        guest_capacity: 4,
        is_bookable: true,
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to add unit');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      realEstateService.verifyInventory(selectedPropertyId!, verifyStatus, verifyNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      toast.success('Inventory verification status recorded');
      setVerifyNotes('');
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ findingId, status }: { findingId: string; status: string }) =>
      realEstateService.updateInspectionFinding(findingId, { follow_up_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      toast.success('Inspection finding status updated');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update finding status');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (archive: boolean) => realEstateService.archiveProperty(selectedPropertyId!, archive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      toast.success('Property archive status updated');
      setIsDetailOpen(false);
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadDocFile) {
        throw new Error('Please select a file to upload');
      }
      if (!selectedPropertyId) {
        throw new Error('No property selected');
      }
      const formData = new FormData();
      formData.append('file', uploadDocFile);
      formData.append('property_id', selectedPropertyId);
      formData.append('title', uploadDocTitle.trim() || uploadDocFile.name);
      formData.append('document_type', uploadDocType);
      formData.append('access_classification', uploadDocAccess);
      if (uploadDocNotes.trim()) {
        formData.append('notes', uploadDocNotes.trim());
      }
      return realEstateService.uploadDocument(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      toast.success('Document uploaded to property successfully');
      setIsUploadDocOpen(false);
      setUploadDocFile(null);
      setUploadDocTitle('');
      setUploadDocNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to upload document');
    },
  });

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Properties Register
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Centrally manage buildings, ownership, documents, inspections, and verified specs across all locations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isManager && (
            <>
              <Button
                variant="outline"
                className="gap-2 text-xs font-semibold cursor-pointer"
                onClick={() => setIsAddPropertyOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Manually
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

      {/* Filter Toolbar */}
      <Card className="p-4 bg-card border-border shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search property name, address, code, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* City Selector */}
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.city}>
                  {loc.city}, {loc.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Selector */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="LEASED_OFFICE">Leased Office</SelectItem>
              <SelectItem value="COMPANY_CONDO">Company Condo</SelectItem>
              <SelectItem value="OWNED_HQ">Owned HQ</SelectItem>
              <SelectItem value="RD_FACILITY">R&D Facility</SelectItem>
              <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
            </SelectContent>
          </Select>

          {/* Ownership Type */}
          <Select value={selectedOwnership} onValueChange={setSelectedOwnership}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Ownership</SelectItem>
              <SelectItem value="LEASED">Leased</SelectItem>
              <SelectItem value="OWNED">Owned</SelectItem>
            </SelectContent>
          </Select>

          {/* Verification Status */}
          <Select value={selectedInvStatus} onValueChange={setSelectedInvStatus}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Verification Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Verification Statuses</SelectItem>
              <SelectItem value="VERIFIED">Verified Only</SelectItem>
              <SelectItem value="UNVERIFIED">Unverified Only</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Properties Table */}
      <Card className="border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4">Property / Building</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Owner / Entity</th>
                <th className="py-3 px-4">Ownership</th>
                <th className="py-3 px-4 text-center">Units</th>
                <th className="py-3 px-4">Area (Building / Land)</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Loading properties register...
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-sm">No properties found</p>
                    <p className="text-muted-foreground text-xs mt-1 mb-4">
                      Try clearing filters or add properties using automated document extraction.
                    </p>
                    {isManager && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-semibold cursor-pointer"
                          onClick={() => setIsAddPropertyOpen(true)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Manually
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs font-semibold bg-primary cursor-pointer shadow-xs"
                          onClick={() => setIsAddDocModalOpen(true)}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          Add Property via Documents
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                properties.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    onClick={() => handleOpenDetail(prop)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {prop.name}
                        </span>
                        {prop.property_code && (
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                            {prop.property_code}
                          </Badge>
                        )}
                        {prop.is_geocoded && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Geocoded
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px] truncate max-w-xs">{prop.address}</p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">{prop.city}</div>
                      <div className="text-muted-foreground text-[11px]">{prop.state_province ? `${prop.state_province}, ` : ''}{prop.country}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-foreground truncate max-w-[160px]">
                        {prop.legal_owner || prop.owning_company || prop.responsible_legal_entity || '—'}
                      </div>
                      {prop.ownership_interest != null && (
                        <div className="text-[11px] text-muted-foreground">Interest: {prop.ownership_interest}%</div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={prop.ownership_type === 'OWNED' ? 'default' : 'outline'}
                        className="text-[11px]"
                      >
                        {prop.ownership_type || 'LEASED'}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="font-bold text-foreground inline-block px-2 py-0.5 bg-muted/60 rounded">
                        {prop.unit_count || prop.units?.length || 0}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="text-foreground font-medium">
                        {prop.building_area_sqft || prop.square_feet ? `${(prop.building_area_sqft || prop.square_feet)?.toLocaleString()} sqft` : '—'}
                      </div>
                      {prop.land_area_sqft ? (
                        <div className="text-[11px]">Land: {prop.land_area_sqft.toLocaleString()} sqft</div>
                      ) : null}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {prop.inventory_verification_status === 'VERIFIED' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : prop.inventory_verification_status === 'IN_PROGRESS' ? (
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[11px] gap-1">
                          <Clock className="w-3 h-3" />
                          In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Unconfirmed
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 opacity-80 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(prop);
                        }}
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Property Detail Wide Drawer / Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-6">
          {isDetailsLoading || !selectedProperty ? (
            <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Loading property details...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Drawer Header */}
              <div className="flex flex-col gap-1.5 pb-4 border-b border-border">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedProperty.name}
                    </h2>
                    {selectedProperty.property_code && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {selectedProperty.property_code}
                      </Badge>
                    )}
                    {selectedProperty.is_geocoded && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[11px] flex items-center gap-1">
                        <Compass className="w-3 h-3" />
                        Geocoded
                      </Badge>
                    )}
                  </div>
                  <Badge variant={selectedProperty.ownership_type === 'OWNED' ? 'default' : 'secondary'}>
                    {selectedProperty.ownership_type || 'LEASED'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                  {selectedProperty.address}
                  {selectedProperty.unit_number ? `, Unit ${selectedProperty.unit_number}` : ''}, {selectedProperty.city}
                  {selectedProperty.state_province ? `, ${selectedProperty.state_province}` : ''} {selectedProperty.postal_code || ''}, {selectedProperty.country}
                </p>
              </div>

              {/* Detail Tabs - Exactly 6 Required Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-6 w-full text-xs">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="building">Building Details</TabsTrigger>
                  <TabsTrigger value="ownership">Ownership</TabsTrigger>
                  <TabsTrigger value="documents">Docs ({selectedProperty.documents?.length || 0})</TabsTrigger>
                  <TabsTrigger value="inspections">Inspections ({selectedProperty.inspections?.length || 0})</TabsTrigger>
                  <TabsTrigger value="activity">Activity ({selectedProperty.activity_logs?.length || 0})</TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="mt-4 space-y-4 text-xs">
                  {/* Location & Geocoding Details */}
                  {selectedProperty.is_geocoded && (
                    <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 flex items-start gap-2.5">
                      <Compass className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Geocoded Coordinates Matched
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Latitude: {selectedProperty.latitude?.toFixed(6)}, Longitude: {selectedProperty.longitude?.toFixed(6)}
                        </div>
                        {selectedProperty.geocoded_matched_address && (
                          <div className="text-[11px] text-muted-foreground">
                            Matched address: <em>{selectedProperty.geocoded_matched_address}</em>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Legal Owner / Owning Co.</span>
                      <span className="font-semibold text-foreground">
                        {selectedProperty.legal_owner || selectedProperty.owning_company || selectedProperty.responsible_legal_entity || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Ownership Interest</span>
                      <span className="font-semibold text-foreground">
                        {selectedProperty.ownership_interest != null ? `${selectedProperty.ownership_interest}%` : '100%'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Local Property Contact</span>
                      <span className="font-semibold text-foreground">
                        {selectedProperty.local_contact_name || 'Vanessa'} ({selectedProperty.local_contact_email || 'vanessa@zenatech.com'})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Local Timezone</span>
                      <span className="font-semibold text-foreground">{selectedProperty.timezone || 'UTC'}</span>
                    </div>
                  </div>

                  {/* Key Measurements (Separated & Normalized SQFT) */}
                  <Card className="p-4 border-border bg-card">
                    <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Key Property Measurements
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground text-[11px] block">Total Building Area</span>
                        <span className="text-base font-bold text-foreground block mt-0.5">
                          {selectedProperty.building_area ? `${selectedProperty.building_area.toLocaleString()} ${selectedProperty.building_area_unit || 'sqft'}` : (selectedProperty.square_feet ? `${selectedProperty.square_feet.toLocaleString()} sqft` : '—')}
                        </span>
                        {selectedProperty.building_area_sqft && selectedProperty.building_area_unit !== 'sqft' && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Normalized: {selectedProperty.building_area_sqft.toLocaleString()} sqft
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground text-[11px] block">Usable Area</span>
                        <span className="text-base font-bold text-foreground block mt-0.5">
                          {selectedProperty.usable_area ? `${selectedProperty.usable_area.toLocaleString()} ${selectedProperty.usable_area_unit || 'sqft'}` : '—'}
                        </span>
                        {selectedProperty.usable_area_sqft && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Normalized: {selectedProperty.usable_area_sqft.toLocaleString()} sqft
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground text-[11px] block">Land Area</span>
                        <span className="text-base font-bold text-foreground block mt-0.5">
                          {selectedProperty.land_area ? `${selectedProperty.land_area.toLocaleString()} ${selectedProperty.land_area_unit || 'sqft'}` : '—'}
                        </span>
                        {selectedProperty.land_area_sqft && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Normalized: {selectedProperty.land_area_sqft.toLocaleString()} sqft
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Inventory Verification Box */}
                  <Card className="p-4 border-border bg-card">
                    <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Inventory Verification Status
                    </h4>
                    <p className="text-muted-foreground text-[11px] mb-3">
                      Confirmed on-site verification separate from lease extraction review.
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-medium text-muted-foreground">Current Status:</span>
                      <Badge
                        variant={selectedProperty.inventory_verification_status === 'VERIFIED' ? 'default' : 'outline'}
                      >
                        {selectedProperty.inventory_verification_status || 'UNVERIFIED'}
                      </Badge>
                      {selectedProperty.inventory_verified_by_name && (
                        <span className="text-muted-foreground text-[11px]">
                          By {selectedProperty.inventory_verified_by_name} on {selectedProperty.inventory_verified_date}
                        </span>
                      )}
                    </div>

                    {isManager && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex gap-2">
                          <Select value={verifyStatus} onValueChange={setVerifyStatus}>
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VERIFIED">Verified</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Verification notes or inspection record..."
                            value={verifyNotes}
                            onChange={(e) => setVerifyNotes(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => verifyMutation.mutate()}
                            disabled={verifyMutation.isPending}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Actions (Archive) */}
                  {isManager && (
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <span className="text-muted-foreground">Archive property from active inventory counts:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-rose-600 dark:text-rose-400 gap-1"
                        onClick={() => archiveMutation.mutate(true)}
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive Property
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Building Details */}
                <TabsContent value="building" className="mt-4 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Year Built</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.year_built || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Building Count</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.building_count || 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Floor Count</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.floor_count || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Total Units</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.unit_count || selectedProperty.units?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Construction Type</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.construction_type || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Zoning Code</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.zoning || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Building Systems */}
                  <Card className="p-4 border-border bg-card">
                    <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-primary" />
                      Building Systems & Infrastructure
                    </h4>
                    {selectedProperty.building_systems && Object.keys(selectedProperty.building_systems).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(selectedProperty.building_systems).map(([sysKey, sysVal]) => (
                          <div key={sysKey} className="p-2.5 bg-muted/30 rounded border border-border">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                              {sysKey.replace(/_/g, ' ')}
                            </span>
                            <span className="font-medium text-foreground mt-0.5 block">
                              {typeof sysVal === 'object' ? JSON.stringify(sysVal) : String(sysVal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-xs bg-muted/20 rounded-lg border border-dashed border-border">
                        No specific building systems cataloged yet. Upload building engineering reports or certificates to extract HVAC, electrical, and fire suppression specs.
                      </div>
                    )}
                  </Card>

                  {/* Units Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">
                        Configured Units ({selectedProperty.units?.length || 0})
                      </span>
                      {isManager && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setIsAddUnitOpen(true)}>
                          <Plus className="w-3 h-3" />
                          Add Unit
                        </Button>
                      )}
                    </div>

                    {(!selectedProperty.units || selectedProperty.units.length === 0) ? (
                      <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                        No individual units configured for this building. Standalone properties default to 1 unit.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedProperty.units.map((u) => (
                          <Card key={u.id} className="p-3 bg-muted/20 border-border">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-bold text-foreground text-sm">{u.unit_number}</h5>
                                <p className="text-muted-foreground text-[11px]">{u.unit_type} • Floor {u.floor || '1'}</p>
                              </div>
                              <Badge variant={u.status === 'AVAILABLE' ? 'default' : 'secondary'} className="text-[10px]">
                                {u.status}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground space-y-0.5">
                              <div>Capacity: <strong>{u.guest_capacity} guests</strong> • {u.bedrooms} Bed, {u.bathrooms} Bath</div>
                              <div>Area: <strong>{u.floor_area || u.square_feet || 0} {u.area_unit || 'sqft'}</strong></div>
                              {u.employee_instructions && (
                                <div className="text-foreground/80 mt-1.5 p-1.5 bg-background rounded border border-border/60">
                                  Instructions: {u.employee_instructions}
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Ownership */}
                <TabsContent value="ownership" className="mt-4 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Legal Owner Name</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.legal_owner || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Owning Company / Holding Entity</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.owning_company || selectedProperty.responsible_legal_entity || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Ownership Interest</span>
                      <span className="font-semibold text-foreground text-sm">
                        {selectedProperty.ownership_interest != null ? `${selectedProperty.ownership_interest}%` : '100%'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Ownership Structure</span>
                      <Badge variant="outline" className="mt-1">
                        {selectedProperty.ownership_type || 'OWNED'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Parcel Identifier (PIN)</span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {selectedProperty.parcel_id || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Title / Folio Number</span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {selectedProperty.title_number || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Acquisition & Purchase Details */}
                  <Card className="p-4 border-border bg-card space-y-3">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Acquisition & Legal Recording
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Purchase Date</span>
                        <span className="font-medium text-foreground">
                          {selectedProperty.purchase_date || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Purchase Price</span>
                        <span className="font-medium text-foreground">
                          {selectedProperty.purchase_price ? `${selectedProperty.purchase_currency || 'USD'} ${selectedProperty.purchase_price.toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Effective Date</span>
                        <span className="font-medium text-foreground">
                          {selectedProperty.effective_date || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Document Source Date</span>
                        <span className="font-medium text-foreground">
                          {selectedProperty.document_source_date || '—'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Lease terms if leased */}
                  {selectedProperty.current_lease && (
                    <Card className="p-4 bg-muted/20 border-border space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-foreground">Associated Lease Record</h4>
                        <Badge>{selectedProperty.current_lease.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Landlord: <strong>{selectedProperty.current_lease.landlord_lessor}</strong></div>
                        <div>Tenant: <strong>{selectedProperty.current_lease.tenant_company}</strong></div>
                        <div>Rent: <strong>{selectedProperty.current_lease.currency} {selectedProperty.current_lease.rent_amount?.toLocaleString()}/mo</strong></div>
                        <div>Term: <strong>{selectedProperty.current_lease.start_date} → {selectedProperty.current_lease.end_date}</strong></div>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab 4: Documents */}
                <TabsContent value="documents" className="mt-4 space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-foreground text-sm">
                        Uploaded Property Documents ({selectedProperty.documents?.length || 0})
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        Deeds, inspection reports, title certificates, and floor plans attached to this property.
                      </p>
                    </div>
                    {isManager && (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5 font-medium"
                        onClick={() => {
                          setUploadDocFile(null);
                          setUploadDocTitle('');
                          setUploadDocNotes('');
                          setUploadDocType('PROPERTY_DEED');
                          setUploadDocAccess('INTERNAL');
                          setIsUploadDocOpen(true);
                        }}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload Document
                      </Button>
                    )}
                  </div>

                  {(!selectedProperty.documents || selectedProperty.documents.length === 0) ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border space-y-2">
                      <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                      <p className="font-semibold text-foreground text-xs">No documents attached yet</p>
                      <p className="text-[11px]">Upload PDF deeds, leases, inspection reports, or floor plans to this property.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProperty.documents.map((doc: any) => (
                        <Card key={doc.id} className="p-3 bg-card border-border flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="p-2 rounded bg-primary/10 text-primary">
                              <FileText className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-medium text-foreground flex items-center gap-2">
                                <span>{doc.title || doc.filename || 'Document'}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {doc.document_type || 'OTHER'}
                                </Badge>
                                {doc.access_classification && (
                                  <Badge variant="outline" className="text-[9px]">
                                    {doc.access_classification}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                                <span>Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</span>
                                {doc.file_size_bytes != null && (
                                  <span>• {formatFileSize(doc.file_size_bytes)}</span>
                                )}
                                {doc.uploaded_by_full_name && (
                                  <span>• By {doc.uploaded_by_full_name}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {doc.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                <Download className="w-3 h-3" />
                                View / Download
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 5: Inspections */}
                <TabsContent value="inspections" className="mt-4 space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-foreground text-sm">
                        Property Inspections & Findings ({selectedProperty.inspections?.length || 0})
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        Extracted structural, environmental, and mechanical inspection reports with actionable findings.
                      </p>
                    </div>
                  </div>

                  {(!selectedProperty.inspections || selectedProperty.inspections.length === 0) ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border space-y-2">
                      <ShieldCheck className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                      <p className="font-semibold text-foreground text-xs">No inspection records found</p>
                      <p className="text-[11px]">Upload building inspection PDFs to automatically track findings and follow-ups.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedProperty.inspections.map((insp) => (
                        <Card key={insp.id} className="p-4 bg-card border-border space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground text-sm">
                                  {insp.inspection_type} Inspection
                                </h4>
                                <Badge
                                  className={
                                    insp.overall_condition === 'Excellent' || insp.overall_condition === 'Good'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                      : insp.overall_condition === 'Fair'
                                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                  }
                                >
                                  Condition: {insp.overall_condition}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Date: {insp.inspection_date} • Inspector: {insp.inspector_name || 'Licensed Inspector'} ({insp.inspection_company || 'Independent'})
                              </p>
                            </div>
                          </div>

                          {insp.summary && (
                            <p className="text-xs text-foreground/80 bg-muted/30 p-2 rounded border border-border">
                              {insp.summary}
                            </p>
                          )}

                          {/* Findings List */}
                          <div className="space-y-2 pt-1">
                            <span className="font-semibold text-foreground text-[11px] block">
                              Findings ({insp.findings?.length || 0}):
                            </span>

                            {(!insp.findings || insp.findings.length === 0) ? (
                              <p className="text-muted-foreground text-xs italic">No specific issues or findings reported.</p>
                            ) : (
                              insp.findings.map((finding: PropertyInspectionFinding) => (
                                <div
                                  key={finding.id}
                                  className="p-3 bg-muted/25 rounded-lg border border-border space-y-2 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="font-semibold text-foreground flex items-center gap-2">
                                        <span>{finding.finding_title}</span>
                                        {finding.area_location && (
                                          <Badge variant="outline" className="text-[10px]">
                                            {finding.area_location}
                                          </Badge>
                                        )}
                                        {finding.source_page_number && (
                                          <Badge variant="secondary" className="text-[9px] font-mono">
                                            Page {finding.source_page_number}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-muted-foreground text-[11px] mt-0.5">
                                        {finding.finding_description}
                                      </p>
                                    </div>

                                    {/* Follow-up status toggle */}
                                    <Select
                                      value={finding.follow_up_status || 'OPEN'}
                                      onValueChange={(newStatus) =>
                                        updateFindingMutation.mutate({ findingId: finding.id, status: newStatus })
                                      }
                                    >
                                      <SelectTrigger className="w-32 h-7 text-[11px] font-medium">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="OPEN">🔴 Open</SelectItem>
                                        <SelectItem value="IN_PROGRESS">🟡 In Progress</SelectItem>
                                        <SelectItem value="RESOLVED">🟢 Resolved</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Severity & Wording Distinction */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                                    <div className="p-1.5 bg-background rounded border border-border/60">
                                      <span className="text-muted-foreground block text-[10px] font-medium">Report Original Severity:</span>
                                      <span className="font-mono text-foreground font-semibold">
                                        "{finding.reported_severity || 'Not Specified'}"
                                      </span>
                                    </div>
                                    <div className="p-1.5 bg-background rounded border border-border/60">
                                      <span className="text-muted-foreground block text-[10px] font-medium">AI Normalized Suggestion:</span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge
                                          variant="outline"
                                          className={
                                            finding.suggested_severity === 'CRITICAL' || finding.suggested_severity === 'HIGH'
                                              ? 'border-rose-500/50 text-rose-600 dark:text-rose-400 text-[10px]'
                                              : 'border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px]'
                                          }
                                        >
                                          {finding.suggested_severity || 'MEDIUM'}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground italic">(Requires Review)</span>
                                      </div>
                                    </div>
                                  </div>

                                  {finding.recommendation && (
                                    <div className="text-[11px] text-foreground/80">
                                      <strong>Recommendation:</strong> {finding.recommendation}
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                                    <span>
                                      Responsible: <strong>{finding.responsible_person || 'Facility Manager'}</strong>
                                    </span>
                                    {finding.follow_up_deadline && (
                                      <span>Deadline: <strong>{finding.follow_up_deadline}</strong></span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 6: Activity */}
                <TabsContent value="activity" className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground text-sm">
                      Activity & Audit Trail ({selectedProperty.activity_logs?.length || 0})
                    </span>
                  </div>

                  {(!selectedProperty.activity_logs || selectedProperty.activity_logs.length === 0) ? (
                    <div className="p-6 bg-muted/20 rounded-lg border border-dashed border-border text-center text-muted-foreground">
                      No document changes or corrections recorded yet. All extraction confirmations and edits will be logged here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProperty.activity_logs.map((log) => (
                        <Card key={log.id} className="p-3 bg-card border-border flex items-start gap-3">
                          <span className="p-1.5 rounded-full bg-primary/10 text-primary mt-0.5">
                            <Activity className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-foreground">{log.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              By <strong>{log.actor_name || 'System'}</strong> • Action: {log.activity_type}
                            </p>
                            {log.diff && Object.keys(log.diff).length > 0 && (
                              <div className="mt-2 p-2 bg-muted/40 rounded text-[10px] font-mono space-y-0.5">
                                {Object.entries(log.diff).map(([k, v]: [string, any]) => (
                                  <div key={k} className="flex gap-2">
                                    <span className="text-muted-foreground">{k}:</span>
                                    <span className="text-rose-500 line-through">{String(v.old_value ?? 'null')}</span>
                                    <span>→</span>
                                    <span className="text-emerald-500 font-bold">{String(v.proposed_value ?? 'null')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>



      {/* Add Property via Document Extraction Modal */}
      <AddPropertyDocumentModal
        isOpen={isAddDocModalOpen}
        onClose={() => setIsAddDocModalOpen(false)}
        onPropertyCreated={(newProp) => {
          queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
          queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
          setSelectedPropertyId(newProp.id);
          setIsDetailOpen(true);
        }}
        onOpenReviewDetail={(job) => {
          setIsAddDocModalOpen(false);
          setSelectedReviewJob(job);
          setIsReviewModalOpen(true);
        }}
      />

      {/* Side-by-side Document Review Modal */}
      {selectedReviewJob && (
        <DocumentReviewModal
          isOpen={isReviewModalOpen}
          job={selectedReviewJob}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedReviewJob(null);
          }}
          onBack={() => {
            setIsReviewModalOpen(false);
            setSelectedReviewJob(null);
            setIsAddDocModalOpen(true);
          }}
          onPropertySaved={(savedProp) => {
            queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
            queryClient.invalidateQueries({ queryKey: ['property-extraction-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', savedProp.id] });
            setSelectedPropertyId(savedProp.id);
            setIsDetailOpen(true);
          }}
        />
      )}

      {/* Add Property Manual Dialog */}
      <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Property / Building</DialogTitle>
            <DialogDescription className="text-xs">
              Record building-level details. Individual units and documents can be added once the property is created.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="font-medium text-foreground">Property Name *</label>
              <Input
                placeholder="e.g. Chicago River Point Tower"
                value={newProp.name || ''}
                onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Location City *</label>
              <Select
                value={newProp.city || 'Chicago'}
                onValueChange={(val) => {
                  const loc = locations.find((l) => l.city === val);
                  setNewProp({
                    ...newProp,
                    city: val,
                    country: loc?.country || 'USA',
                    timezone: loc?.timezone || 'UTC',
                    currency: loc?.currency || 'USD',
                  });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.city}>
                      {loc.city}, {loc.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Property Code</label>
              <Input
                placeholder="e.g. CHI-001"
                value={newProp.property_code || ''}
                onChange={(e) => setNewProp({ ...newProp, property_code: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="font-medium text-foreground">Full Address *</label>
              <Input
                placeholder="Street address, suite/floor, postal code"
                value={newProp.address || ''}
                onChange={(e) => setNewProp({ ...newProp, address: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Property Type</label>
              <Select
                value={newProp.property_type || 'Office'}
                onValueChange={(val) => setNewProp({ ...newProp, property_type: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Corporate HQ">Corporate HQ</SelectItem>
                  <SelectItem value="Executive Condo">Executive Condo</SelectItem>
                  <SelectItem value="Apartment Building">Apartment Building</SelectItem>
                  <SelectItem value="R&D / Lab">R&D / Lab</SelectItem>
                  <SelectItem value="Warehouse">Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Ownership</label>
              <Select
                value={newProp.ownership_type || 'LEASED'}
                onValueChange={(val) => setNewProp({ ...newProp, ownership_type: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEASED">Leased</SelectItem>
                  <SelectItem value="OWNED">Owned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="font-medium text-foreground">Responsible Legal Entity</label>
              <Input
                placeholder="e.g. ZenaTech Americas LLC"
                value={newProp.responsible_legal_entity || ''}
                onChange={(e) => setNewProp({ ...newProp, responsible_legal_entity: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Local Contact Name</label>
              <Input
                placeholder="Local manager or contact"
                value={newProp.local_contact_name || ''}
                onChange={(e) => setNewProp({ ...newProp, local_contact_name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Local Contact Email</label>
              <Input
                placeholder="email@zenatech.com"
                value={newProp.local_contact_email || ''}
                onChange={(e) => setNewProp({ ...newProp, local_contact_email: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddPropertyOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newProp.name || !newProp.address || createPropMutation.isPending}
              onClick={() => createPropMutation.mutate(newProp)}
            >
              {createPropMutation.isPending ? 'Saving...' : 'Create Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Unit to {selectedProperty?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Define the unit number, floor, guest capacity, and bookable status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-medium">Unit Number *</label>
              <Input
                placeholder="e.g. Unit 302 or Suite B"
                value={newUnit.unit_number || ''}
                onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium">Floor</label>
              <Input
                placeholder="Floor number"
                value={newUnit.floor || ''}
                onChange={(e) => setNewUnit({ ...newUnit, floor: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium">Bedrooms</label>
              <Input
                type="number"
                value={newUnit.bedrooms || 1}
                onChange={(e) => setNewUnit({ ...newUnit, bedrooms: parseInt(e.target.value) || 1 })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium">Guest Capacity</label>
              <Input
                type="number"
                value={newUnit.guest_capacity || 2}
                onChange={(e) => setNewUnit({ ...newUnit, guest_capacity: parseInt(e.target.value) || 2 })}
                className="h-8 text-xs"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="font-medium">Employee Instructions</label>
              <Input
                placeholder="Keybox code, entry instructions, wifi name..."
                value={newUnit.employee_instructions || ''}
                onChange={(e) => setNewUnit({ ...newUnit, employee_instructions: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddUnitOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newUnit.unit_number || createUnitMutation.isPending}
              onClick={() =>
                createUnitMutation.mutate({
                  ...newUnit,
                  property_id: selectedPropertyId!,
                })
              }
            >
              Add Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Property Document Dialog */}
      <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="w-5 h-5 text-primary" />
              Upload Document for {selectedProperty?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attach deeds, leases, inspection reports, floor plans, or tax assessments to this property.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* File Dropzone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select File *</label>
              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  uploadDocFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-muted/20'
                }`}
                onClick={() => {
                  const input = document.getElementById('prop-doc-file-input') as HTMLInputElement;
                  input?.click();
                }}
              >
                <input
                  id="prop-doc-file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadDocFile(file);
                      if (!uploadDocTitle) {
                        setUploadDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                />
                {uploadDocFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-xs">{uploadDocFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(uploadDocFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="w-7 h-7 text-muted-foreground/60 mx-auto" />
                    <p className="font-medium text-foreground text-xs">Click to browse or drag and drop</p>
                    <p className="text-[10px] text-muted-foreground">PDF, DOCX, PNG, or JPG (up to 50MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Document Title</label>
              <Input
                placeholder="e.g. 2026 Warranty Deed, Structural Inspection Report"
                value={uploadDocTitle}
                onChange={(e) => setUploadDocTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Document Type & Access Classification */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Document Type *</label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROPERTY_DEED">Deed / Title</SelectItem>
                    <SelectItem value="LEASE_AGREEMENT">Lease Agreement</SelectItem>
                    <SelectItem value="INSPECTION_REPORT">Inspection Report</SelectItem>
                    <SelectItem value="TITLE_CERTIFICATE">Title Certificate</SelectItem>
                    <SelectItem value="FLOOR_PLAN">Floor Plan / Architecture</SelectItem>
                    <SelectItem value="TAX_ASSESSMENT">Tax Assessment</SelectItem>
                    <SelectItem value="INSURANCE_POLICY">Insurance Policy</SelectItem>
                    <SelectItem value="MAINTENANCE_RECORD">Maintenance Record</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Access Classification</label>
                <Select value={uploadDocAccess} onValueChange={setUploadDocAccess}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select access" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal (Staff)</SelectItem>
                    <SelectItem value="CONFIDENTIAL">Confidential (Admin)</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Notes / Comments (Optional)</label>
              <Input
                placeholder="Additional notes about this document..."
                value={uploadDocNotes}
                onChange={(e) => setUploadDocNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsUploadDocOpen(false);
                setUploadDocFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!uploadDocFile || uploadDocMutation.isPending}
              onClick={() => uploadDocMutation.mutate()}
            >
              {uploadDocMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
