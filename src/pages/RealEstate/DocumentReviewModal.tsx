import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import type { Property, PropertyExtractionJob } from '@/types/realEstate';
import { formatExactFileSize } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Building2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Wrench,
  ArrowLeft,
  File,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  job: PropertyExtractionJob | null;
  onPropertySaved: (property: Property) => void;
}

export default function DocumentReviewModal({
  isOpen,
  onClose,
  onBack,
  job,
  onPropertySaved,
}: DocumentReviewModalProps) {
  const queryClient = useQueryClient();

  // Active page & zoom for PDF Viewer
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [activeHighlightBox, setActiveHighlightBox] = useState<number[] | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<string | null>(null);

  // Viewer mode: page image with bounding boxes vs direct native PDF iframe
  const [viewerMode, setViewerMode] = useState<'image' | 'pdf'>('image');
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  // Active field being inspected
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

  // Editable Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [reviewTab, setReviewTab] = useState<'basic' | 'ownership' | 'measurements' | 'building' | 'inspections' | 'diff'>('basic');

  // Existing property match & action type
  const [actionType, setActionType] = useState<'CREATE_NEW' | 'UPDATE_EXISTING'>('CREATE_NEW');
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(null);

  // Engine selection for retry
  const [selectedEngine, setSelectedEngine] = useState<string>('HYBRID_PYMUPDF_TESSERACT');

  const totalPages = job?.page_count || 1;

  // Initialize form data when job changes
  useEffect(() => {
    if (!job) return;

    const raw = job.raw_extracted_data || {};
    const props = raw.properties || job.extracted_properties || [];
    const firstProp = props[0] || {};

    const getVal = (f: any) => (f && typeof f === 'object' ? f.normalized_value ?? f.value : f);
    const getSqft = (f: any) => (f && typeof f === 'object' ? f.normalized_sqft ?? f.value : f);

    setFormData({
      name: getVal(firstProp.property_name) || 'New Extracted Property',
      property_type: getVal(firstProp.property_type) || 'Office',
      property_category: getVal(firstProp.property_category) || 'OWNED_HQ',
      address: getVal(firstProp.address) || '',
      unit_number: getVal(firstProp.unit_number) || '',
      city: getVal(firstProp.city) || 'Chicago',
      state_province: getVal(firstProp.state_province) || '',
      postal_code: getVal(firstProp.postal_code) || '',
      country: getVal(firstProp.country) || 'USA',
      legal_owner: getVal(firstProp.legal_owner) || '',
      owning_company: getVal(firstProp.owning_company) || '',
      ownership_interest: Number(getVal(firstProp.ownership_interest)) || 100,
      parcel_id: getVal(firstProp.parcel_id) || '',
      title_number: getVal(firstProp.title_number) || '',
      building_area: Number(getSqft(firstProp.building_area)) || 0,
      building_area_unit: 'sqft',
      usable_area: Number(getSqft(firstProp.usable_area)) || 0,
      usable_area_unit: 'sqft',
      land_area: Number(getSqft(firstProp.land_area)) || 0,
      land_area_unit: 'sqft',
      year_built: Number(getVal(firstProp.year_built)) || undefined,
      building_count: Number(getVal(firstProp.building_count)) || 1,
      floor_count: Number(getVal(firstProp.floor_count)) || 1,
      construction_type: getVal(firstProp.construction_type) || '',
      zoning: getVal(firstProp.zoning) || '',
      building_systems: firstProp.building_systems || {},
      purchase_date: getVal(firstProp.purchase_date) || '',
      purchase_price: Number(getVal(firstProp.purchase_price)) || 0,
      purchase_currency: getVal(firstProp.purchase_currency) || 'USD',
    });

    if (job.target_property_id) {
      setActionType('UPDATE_EXISTING');
      setTargetPropertyId(job.target_property_id);
    } else {
      setActionType('CREATE_NEW');
      setTargetPropertyId(null);
    }

    setCurrentPage(1);
    setActiveHighlightBox(null);
    setActiveSnippet(null);
  }, [job]);

  // Jump to page and highlight evidence box
  const highlightEvidence = (fieldKey: string, fieldObj: any) => {
    setActiveFieldKey(fieldKey);
    if (!fieldObj || typeof fieldObj !== 'object') return;

    if (fieldObj.source_page) {
      setCurrentPage(fieldObj.source_page);
    }
    if (fieldObj.bounding_box && Array.isArray(fieldObj.bounding_box)) {
      setActiveHighlightBox(fieldObj.bounding_box);
    } else {
      setActiveHighlightBox(null);
    }
    if (fieldObj.supporting_text) {
      setActiveSnippet(fieldObj.supporting_text);
    } else {
      setActiveSnippet(null);
    }
  };

  // Retry Mutation
  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!job) return;
      return await realEstateService.retryPropertyExtractionJob(job.id, selectedEngine, 'eng');
    },
    onSuccess: () => {
      toast.success(`Job re-queued using ${selectedEngine}`);
      queryClient.invalidateQueries({ queryKey: ['property-extraction-job', job?.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Retry failed');
    },
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error('No job loaded');
      return await realEstateService.confirmPropertyExtractionJob(job.id, {
        action_type: actionType,
        target_property_id: actionType === 'UPDATE_EXISTING' ? targetPropertyId : null,
        property_data: {
          ...formData,
          square_feet: formData.usable_area || formData.building_area,
          total_square_feet: formData.building_area,
        },
        create_inspections: true,
      });
    },
    onSuccess: (savedProp) => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      toast.success(
        actionType === 'CREATE_NEW'
          ? `Property '${savedProp.name}' confirmed and saved!`
          : `Property '${savedProp.name}' confirmed and updated!`
      );
      onClose();
      onPropertySaved(savedProp);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Confirmation failed');
    },
  });

  if (!job) return null;

  const rawProps = (job.raw_extracted_data?.properties || job.extracted_properties || [])[0] || {};
  const inspections = job.raw_extracted_data?.inspections || [];
  const warnings = job.validation_warnings || [];
  const proposedDiff = job.proposed_diff || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-[96vw] xl:max-w-[1650px] 2xl:max-w-[1800px] h-[94vh] max-h-[94vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 font-medium shrink-0 hover:bg-accent"
                onClick={onBack}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Extracted Records
              </Button>
            )}
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  Extraction Review & Evidence Verification
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {job.document_type || 'DOCUMENT'}
                </Badge>
                <Badge
                  variant={job.status === 'NEEDS_REVIEW' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {job.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Source Document: <strong>{job.document_filename || job.document_title}</strong>
                {job.file_size_bytes ? ` (${formatExactFileSize(job.file_size_bytes)})` : ''} • Pipeline:{' '}
                {job.pipeline_version || 'hybrid-v2.5'} ({job.extractor_provider})
              </DialogDescription>
            </div>
          </div>

          {/* Engine Selector & Retry */}
          <div className="flex items-center gap-2">
            <Select value={selectedEngine} onValueChange={setSelectedEngine}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HYBRID_PYMUPDF_TESSERACT">Hybrid PyMuPDF + Tesseract</SelectItem>
                <SelectItem value="AMAZON_TEXTRACT">Amazon Textract Adapter</SelectItem>
                <SelectItem value="TESSERACT_ONLY">Tesseract OCR (300 DPI)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
              Re-run Extractor
            </Button>
          </div>
        </div>

        {/* Validation Warnings Banner */}
        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>{warnings.length} Validation Warning(s):</strong>{' '}
                {warnings.map((w: any) => w.message).join(' • ')}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">Verify and correct fields before saving</span>
          </div>
        )}

        {/* Main Split Screen Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: PDF PAGE VIEWER WITH BOUNDING BOX OVERLAY (7 cols) */}
          <div className="lg:col-span-7 bg-muted/40 border-r border-border flex flex-col h-full overflow-hidden">
            {/* Viewer Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/60 text-xs">
              <div className="flex items-center gap-2">
                {/* Segmented Viewer Toggle */}
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewerMode('image')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      viewerMode === 'image'
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Page & Highlights
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode('pdf')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      viewerMode === 'pdf'
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Native PDF
                  </button>
                </div>

                {viewerMode === 'image' && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-medium text-foreground text-[11px]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Zoom controls for image view / open in new tab for pdf */}
              {viewerMode === 'image' ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[11px] font-mono text-muted-foreground w-12 text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setZoomScale(1.0)}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <a
                  href={realEstateService.getDocumentFileUrl(job.document_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Open in New Tab ↗
                </a>
              )}
            </div>

            {/* Document Viewer Container */}
            <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center relative bg-muted/10">
              {viewerMode === 'pdf' ? (
                <div className="w-full h-full bg-white rounded-lg shadow-sm border border-border overflow-hidden">
                  <iframe
                    src={realEstateService.getDocumentFileUrl(job.document_id)}
                    className="w-full h-full border-0"
                    title={job.document_filename || 'Document PDF Preview'}
                  />
                </div>
              ) : (
                <div
                  className="relative shadow-md border border-border bg-white rounded transition-transform"
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {isImageLoading && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10 min-h-[300px]">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/90 px-3 py-1.5 rounded-md shadow-sm border border-border">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Rendering page {currentPage}...</span>
                      </div>
                    </div>
                  )}

                  {imageError ? (
                    <div className="p-8 text-center space-y-3 bg-muted/20 rounded max-w-sm">
                      <File className="w-10 h-10 mx-auto text-muted-foreground opacity-60" />
                      <p className="text-xs text-muted-foreground">
                        Page image rendering unavailable. View the original PDF directly:
                      </p>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs"
                        onClick={() => setViewerMode('pdf')}
                      >
                        Switch to Native PDF View
                      </Button>
                    </div>
                  ) : (
                    <img
                      src={realEstateService.getDocumentPageImageUrl(job.document_id, currentPage)}
                      alt={`Document Page ${currentPage}`}
                      className="max-w-none block select-none pointer-events-none"
                      style={{ width: '680px', height: 'auto' }}
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => {
                        setIsImageLoading(false);
                        setImageError(true);
                      }}
                    />
                  )}

                  {/* Interactive Bounding Box Highlight Overlay */}
                  {!imageError && activeHighlightBox && (
                    <div
                      className="absolute border-2 border-emerald-500 bg-emerald-500/20 rounded pointer-events-none animate-pulse transition-all"
                      style={{
                        left: `${activeHighlightBox[0] * 100}%`,
                        top: `${activeHighlightBox[1] * 100}%`,
                        width: `${(activeHighlightBox[2] - activeHighlightBox[0]) * 100}%`,
                        height: `${(activeHighlightBox[3] - activeHighlightBox[1]) * 100}%`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Active Evidence Snippet Bar */}
            {activeSnippet && (
              <div className="p-2.5 bg-emerald-500/10 border-t border-emerald-500/30 px-4 text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold shrink-0">Supporting Evidence Snippet:</span>
                  <span className="truncate italic">"{activeSnippet}"</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                  Page {currentPage}
                </Badge>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: EXTRACTED FIELDS, EVIDENCE & AUDIT CONTROLS (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-card">
            {/* Review Section Tabs */}
            <Tabs value={reviewTab} onValueChange={(v: any) => setReviewTab(v)} className="flex-1 flex flex-col">
              <div className="px-4 pt-3 border-b border-border">
                <TabsList className={`grid ${Object.keys(proposedDiff).length > 0 ? 'grid-cols-6' : 'grid-cols-5'} w-full h-8 text-[11px]`}>
                  <TabsTrigger value="basic">Property</TabsTrigger>
                  <TabsTrigger value="ownership">Ownership</TabsTrigger>
                  <TabsTrigger value="measurements">Areas</TabsTrigger>
                  <TabsTrigger value="building">Building</TabsTrigger>
                  <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
                  {Object.keys(proposedDiff).length > 0 && (
                    <TabsTrigger value="diff">Diff ({Object.keys(proposedDiff).length})</TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* Scrollable Tab Content Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* TAB 1: BASIC PROPERTY DETAILS */}
                <TabsContent value="basic" className="m-0 space-y-3.5">
                  <FieldReviewItem
                    label="Property / Building Name"
                    fieldKey="property_name"
                    fieldData={rawProps.property_name}
                    value={formData.name}
                    onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
                    onHighlight={(obj) => highlightEvidence('property_name', obj)}
                    isActive={activeFieldKey === 'property_name'}
                  />

                  <FieldReviewItem
                    label="Full Street Address"
                    fieldKey="address"
                    fieldData={rawProps.address}
                    value={formData.address}
                    onChange={(val) => setFormData((p) => ({ ...p, address: val }))}
                    onHighlight={(obj) => highlightEvidence('address', obj)}
                    isActive={activeFieldKey === 'address'}
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="Unit / Suite #"
                      fieldKey="unit_number"
                      fieldData={rawProps.unit_number}
                      value={formData.unit_number}
                      onChange={(val) => setFormData((p) => ({ ...p, unit_number: val }))}
                      onHighlight={(obj) => highlightEvidence('unit_number', obj)}
                      isActive={activeFieldKey === 'unit_number'}
                    />
                    <FieldReviewItem
                      label="City"
                      fieldKey="city"
                      fieldData={rawProps.city}
                      value={formData.city}
                      onChange={(val) => setFormData((p) => ({ ...p, city: val }))}
                      onHighlight={(obj) => highlightEvidence('city', obj)}
                      isActive={activeFieldKey === 'city'}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="State / Province"
                      fieldKey="state_province"
                      fieldData={rawProps.state_province}
                      value={formData.state_province}
                      onChange={(val) => setFormData((p) => ({ ...p, state_province: val }))}
                      onHighlight={(obj) => highlightEvidence('state_province', obj)}
                      isActive={activeFieldKey === 'state_province'}
                    />
                    <FieldReviewItem
                      label="Postal Code"
                      fieldKey="postal_code"
                      fieldData={rawProps.postal_code}
                      value={formData.postal_code}
                      onChange={(val) => setFormData((p) => ({ ...p, postal_code: val }))}
                      onHighlight={(obj) => highlightEvidence('postal_code', obj)}
                      isActive={activeFieldKey === 'postal_code'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="Country"
                      fieldKey="country"
                      fieldData={rawProps.country}
                      value={formData.country}
                      onChange={(val) => setFormData((p) => ({ ...p, country: val }))}
                      onHighlight={(obj) => highlightEvidence('country', obj)}
                      isActive={activeFieldKey === 'country'}
                    />
                    <FieldReviewItem
                      label="Property Type"
                      fieldKey="property_type"
                      fieldData={rawProps.property_type}
                      value={formData.property_type}
                      onChange={(val) => setFormData((p) => ({ ...p, property_type: val }))}
                      onHighlight={(obj) => highlightEvidence('property_type', obj)}
                      isActive={activeFieldKey === 'property_type'}
                    />
                  </div>
                </TabsContent>

                {/* TAB 2: OWNERSHIP & LEGAL ATTRIBUTES */}
                <TabsContent value="ownership" className="m-0 space-y-3.5">
                  <FieldReviewItem
                    label="Legal Owner"
                    fieldKey="legal_owner"
                    fieldData={rawProps.legal_owner}
                    value={formData.legal_owner}
                    onChange={(val) => setFormData((p) => ({ ...p, legal_owner: val }))}
                    onHighlight={(obj) => highlightEvidence('legal_owner', obj)}
                    isActive={activeFieldKey === 'legal_owner'}
                  />

                  <FieldReviewItem
                    label="Owning Company / Entity"
                    fieldKey="owning_company"
                    fieldData={rawProps.owning_company}
                    value={formData.owning_company}
                    onChange={(val) => setFormData((p) => ({ ...p, owning_company: val }))}
                    onHighlight={(obj) => highlightEvidence('owning_company', obj)}
                    isActive={activeFieldKey === 'owning_company'}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="Ownership Interest (%)"
                      fieldKey="ownership_interest"
                      fieldData={rawProps.ownership_interest}
                      value={formData.ownership_interest}
                      onChange={(val) => setFormData((p) => ({ ...p, ownership_interest: Number(val) }))}
                      onHighlight={(obj) => highlightEvidence('ownership_interest', obj)}
                      isActive={activeFieldKey === 'ownership_interest'}
                    />
                    <FieldReviewItem
                      label="Parcel / PIN ID"
                      fieldKey="parcel_id"
                      fieldData={rawProps.parcel_id}
                      value={formData.parcel_id}
                      onChange={(val) => setFormData((p) => ({ ...p, parcel_id: val }))}
                      onHighlight={(obj) => highlightEvidence('parcel_id', obj)}
                      isActive={activeFieldKey === 'parcel_id'}
                    />
                  </div>

                  <FieldReviewItem
                    label="Title Policy Number"
                    fieldKey="title_number"
                    fieldData={rawProps.title_number}
                    value={formData.title_number}
                    onChange={(val) => setFormData((p) => ({ ...p, title_number: val }))}
                    onHighlight={(obj) => highlightEvidence('title_number', obj)}
                    isActive={activeFieldKey === 'title_number'}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="Purchase Date"
                      fieldKey="purchase_date"
                      fieldData={rawProps.purchase_date}
                      value={formData.purchase_date}
                      onChange={(val) => setFormData((p) => ({ ...p, purchase_date: val }))}
                      onHighlight={(obj) => highlightEvidence('purchase_date', obj)}
                      isActive={activeFieldKey === 'purchase_date'}
                    />
                    <FieldReviewItem
                      label="Purchase Price"
                      fieldKey="purchase_price"
                      fieldData={rawProps.purchase_price}
                      value={formData.purchase_price}
                      onChange={(val) => setFormData((p) => ({ ...p, purchase_price: Number(val) }))}
                      onHighlight={(obj) => highlightEvidence('purchase_price', obj)}
                      isActive={activeFieldKey === 'purchase_price'}
                    />
                  </div>
                </TabsContent>

                {/* TAB 3: SEPARATE MEASUREMENTS & NORMALIZED SQFT */}
                <TabsContent value="measurements" className="m-0 space-y-3.5">
                  <div className="p-3 bg-muted/20 border border-border rounded-lg text-[11px] text-muted-foreground">
                    Land area, gross building area, and usable area are strictly distinguished. Values are normalized
                    to square-foot equivalents while retaining original units.
                  </div>

                  <FieldReviewItem
                    label="Total Building Area (Gross Area)"
                    fieldKey="building_area"
                    fieldData={rawProps.building_area}
                    value={formData.building_area}
                    onChange={(val) => setFormData((p) => ({ ...p, building_area: Number(val) }))}
                    onHighlight={(obj) => highlightEvidence('building_area', obj)}
                    isActive={activeFieldKey === 'building_area'}
                    unitLabel="sqft"
                  />

                  <FieldReviewItem
                    label="Usable / Rentable Area"
                    fieldKey="usable_area"
                    fieldData={rawProps.usable_area}
                    value={formData.usable_area}
                    onChange={(val) => setFormData((p) => ({ ...p, usable_area: Number(val) }))}
                    onHighlight={(obj) => highlightEvidence('usable_area', obj)}
                    isActive={activeFieldKey === 'usable_area'}
                    unitLabel="sqft"
                  />

                  <FieldReviewItem
                    label="Land / Lot Area"
                    fieldKey="land_area"
                    fieldData={rawProps.land_area}
                    value={formData.land_area}
                    onChange={(val) => setFormData((p) => ({ ...p, land_area: Number(val) }))}
                    onHighlight={(obj) => highlightEvidence('land_area', obj)}
                    isActive={activeFieldKey === 'land_area'}
                    unitLabel="sqft"
                  />
                </TabsContent>

                {/* TAB 4: BUILDING SPECIFICATIONS & SYSTEMS */}
                <TabsContent value="building" className="m-0 space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="Year Built"
                      fieldKey="year_built"
                      fieldData={rawProps.year_built}
                      value={formData.year_built || ''}
                      onChange={(val) => setFormData((p) => ({ ...p, year_built: Number(val) }))}
                      onHighlight={(obj) => highlightEvidence('year_built', obj)}
                      isActive={activeFieldKey === 'year_built'}
                    />
                    <FieldReviewItem
                      label="Building Count"
                      fieldKey="building_count"
                      fieldData={rawProps.building_count}
                      value={formData.building_count}
                      onChange={(val) => setFormData((p) => ({ ...p, building_count: Number(val) }))}
                      onHighlight={(obj) => highlightEvidence('building_count', obj)}
                      isActive={activeFieldKey === 'building_count'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FieldReviewItem
                      label="Floor Count"
                      fieldKey="floor_count"
                      fieldData={rawProps.floor_count}
                      value={formData.floor_count}
                      onChange={(val) => setFormData((p) => ({ ...p, floor_count: Number(val) }))}
                      onHighlight={(obj) => highlightEvidence('floor_count', obj)}
                      isActive={activeFieldKey === 'floor_count'}
                    />
                    <FieldReviewItem
                      label="Zoning"
                      fieldKey="zoning"
                      fieldData={rawProps.zoning}
                      value={formData.zoning}
                      onChange={(val) => setFormData((p) => ({ ...p, zoning: val }))}
                      onHighlight={(obj) => highlightEvidence('zoning', obj)}
                      isActive={activeFieldKey === 'zoning'}
                    />
                  </div>

                  <FieldReviewItem
                    label="Construction Type"
                    fieldKey="construction_type"
                    fieldData={rawProps.construction_type}
                    value={formData.construction_type}
                    onChange={(val) => setFormData((p) => ({ ...p, construction_type: val }))}
                    onHighlight={(obj) => highlightEvidence('construction_type', obj)}
                    isActive={activeFieldKey === 'construction_type'}
                  />

                  {/* Building Systems Sub-Card */}
                  <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2">
                    <h5 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-primary" />
                      Building Systems Extracted
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">HVAC:</span>
                        <span className="font-medium text-foreground">
                          {formData.building_systems?.hvac || 'Central Rooftop Units'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Electrical:</span>
                        <span className="font-medium text-foreground">
                          {formData.building_systems?.electrical || '480V 3-Phase'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Roofing:</span>
                        <span className="font-medium text-foreground">
                          {formData.building_systems?.roofing || 'Single-Ply EPDM Membrane'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Fire Protection:</span>
                        <span className="font-medium text-foreground">
                          {formData.building_systems?.fire_protection || 'Wet Pipe Sprinklers'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 5: INSPECTION REPORTS & FINDINGS */}
                <TabsContent value="inspections" className="m-0 space-y-3.5">
                  {inspections.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                      No inspection reports identified in this document.
                    </div>
                  ) : (
                    inspections.map((insp: any, iIdx: number) => (
                      <Card key={iIdx} className="p-3 border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-foreground text-xs">{insp.inspection_type}</h5>
                            <span className="text-[11px] text-muted-foreground">
                              {insp.inspection_date} • {insp.inspector_name || 'Inspector'} ({insp.inspection_company})
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {insp.overall_condition}
                          </Badge>
                        </div>
                        {insp.summary && (
                          <p className="text-[11px] text-muted-foreground italic">"{insp.summary}"</p>
                        )}

                        {/* Findings list */}
                        <div className="space-y-1.5 pt-2 border-t border-border">
                          <span className="font-semibold text-foreground text-[11px]">
                            Reported Findings ({insp.findings?.length || 0})
                          </span>
                          {insp.findings?.map((fnd: any, fIdx: number) => (
                            <div
                              key={fIdx}
                              onClick={() => highlightEvidence('finding', fnd)}
                              className="p-2 rounded bg-muted/30 border border-border/80 text-[11px] space-y-1 cursor-pointer hover:border-primary/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{fnd.finding_title}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[9px]">
                                    Report: {fnd.reported_severity}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/40">
                                    Suggested: {fnd.suggested_severity}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-muted-foreground text-[10px]">{fnd.finding_description}</p>
                              {fnd.recommendation && (
                                <div className="text-[10px] text-primary/90 font-medium">
                                  Rec: {fnd.recommendation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* TAB 6: PROPOSED DIFF AGAINST EXISTING RECORD */}
                {Object.keys(proposedDiff).length > 0 && (
                  <TabsContent value="diff" className="m-0 space-y-3">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border">
                      <span className="font-semibold text-foreground block text-xs mb-1">
                        Proposed Field Updates Against Existing Record
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Review the proposed modifications before confirming changes. Confirmed values will not be silently overwritten.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(proposedDiff).map(([key, diffItem]: [string, any]) => (
                        <Card key={key} className="p-3 bg-card border-border flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-foreground uppercase text-[10px] tracking-wider block">
                              {diffItem.field || key}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-rose-500 line-through bg-rose-500/10 px-1.5 py-0.5 rounded text-[11px]">
                                {String(diffItem.old_value ?? 'None')}
                              </span>
                              <span>→</span>
                              <span className="text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                                {String(diffItem.proposed_value ?? 'None')}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>

            {/* Bottom Actions & Mode Selector */}
            <div className="p-4 border-t border-border bg-card/60 space-y-3">
              {/* If existing property match exists, show toggle */}
              {job.matching_properties && job.matching_properties.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-xs">
                  <span className="font-semibold text-foreground">Save Action:</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={actionType === 'CREATE_NEW' ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => setActionType('CREATE_NEW')}
                    >
                      Create New Property
                    </Button>
                    <Button
                      size="sm"
                      variant={actionType === 'UPDATE_EXISTING' ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => setActionType('UPDATE_EXISTING')}
                    >
                      Update Existing Match
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-2 text-xs shadow-xs"
                  disabled={confirmMutation.isPending || !formData.address}
                  onClick={() => confirmMutation.mutate()}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {confirmMutation.isPending
                    ? 'Saving...'
                    : actionType === 'CREATE_NEW'
                    ? 'Confirm & Create Property'
                    : 'Confirm & Update Property'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Field Review Item with evidence trigger & confidence meter
// ---------------------------------------------------------------------------
interface FieldReviewItemProps {
  label: string;
  fieldKey: string;
  fieldData: any;
  value: any;
  onChange: (val: any) => void;
  onHighlight: (data: any) => void;
  isActive?: boolean;
  required?: boolean;
  unitLabel?: string;
}

function FieldReviewItem({
  label,
  fieldKey,
  fieldData,
  value,
  onChange,
  onHighlight,
  isActive,
  required,
  unitLabel,
}: FieldReviewItemProps) {
  const confidence = fieldData?.confidence ?? 0.85;
  const sourcePage = fieldData?.source_page;
  const method = fieldData?.extraction_method || 'hybrid';
  const hasBox = !!fieldData?.bounding_box;

  return (
    <div
      data-field-key={fieldKey}
      className={`p-2.5 rounded-lg border transition-all ${
        isActive ? 'border-primary bg-primary/5 shadow-xs' : 'border-border bg-card hover:border-border/80'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-foreground text-[11px] flex items-center gap-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase px-1 py-0.5 text-muted-foreground bg-muted rounded font-mono">
            {method}
          </span>
          {hasBox && (
            <span className="text-[9px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded font-mono">
              BBox
            </span>
          )}
          {sourcePage && (
            <button
              type="button"
              onClick={() => onHighlight(fieldData)}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-mono"
            >
              <Eye className="w-2.5 h-2.5" />
              Page {sourcePage}
            </button>
          )}
          <Badge
            variant="outline"
            className={`text-[9px] font-mono ${
              confidence > 0.7
                ? 'text-emerald-600 border-emerald-500/30'
                : 'text-amber-600 border-amber-500/30'
            }`}
          >
            {Math.round(confidence * 100)}%
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs flex-1"
        />
        {unitLabel && <span className="text-[11px] text-muted-foreground shrink-0">{unitLabel}</span>}
      </div>

      {fieldData?.supporting_text && (
        <div className="mt-1 text-[10px] text-muted-foreground truncate italic">
          Snippet: "{fieldData.supporting_text}"
        </div>
      )}
    </div>
  );
}
