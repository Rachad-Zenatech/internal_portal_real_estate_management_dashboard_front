import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import type { Property, PropertyExtractionJob } from '@/types/realEstate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Sparkles,
  ArrowRight,
  Eye,
  X,
  MapPin,
  Building,
  Check,
  GitCompare,
  Save,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatExactFileSize } from '@/lib/utils';
import { CurrencyAutocomplete } from '@/components/ui/CurrencyAutocomplete';

export interface DocumentCandidate {
  jobId: string;
  docName: string;
  docSizeBytes?: number | null;
  value: any;
  formattedValue: string;
  sourcePage?: number | null;
  snippet?: string | null;
}

export interface FieldConflict {
  fieldKey: string;
  fieldLabel: string;
  category: 'Location' | 'Ownership' | 'Measurements' | 'Financials' | 'Building';
  currentValue: any;
  chosenJobId?: string;
  sources: DocumentCandidate[];
  hasConflict: boolean;
}

export interface ExtractedPropertyRecord {
  id: string;
  name: string;
  address: string;
  unit_number: string;
  city: string;
  state_province: string;
  country: string;
  postal_code: string;
  property_type: string;
  property_category: string;
  ownership_type: string;
  legal_owner: string;
  owning_company: string;
  ownership_interest: number;
  building_area: number;
  building_area_unit: string;
  usable_area: number;
  usable_area_unit: string;
  land_area: number;
  land_area_unit: string;
  year_built?: number;
  purchase_price: number;
  purchase_currency: string;
  purchase_date?: string;
  parcel_id: string;
  title_number?: string;
  floor_count?: number;
  construction_type?: string;
  zoning?: string;
  // Multi-doc tracking & matching
  sourceJobs: PropertyExtractionJob[];
  sourceDocumentNames: string[];
  matchingProperty: Property | null;
  saveActionType: 'CREATE_NEW' | 'UPDATE_EXISTING';
  isSelected: boolean;
  validationWarnings: string[];
  inspectionsCount: number;
  conflicts: FieldConflict[];
}

interface AddPropertyDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyCreated: (property: Property) => void;
  onOpenReviewDetail?: (job: PropertyExtractionJob) => void;
}

function getFieldValue(f: any): any {
  if (f === null || f === undefined) return '';
  if (typeof f === 'object') return f.value ?? f.normalized_value ?? '';
  return f;
}

function getSqftValue(f: any): number {
  if (f === null || f === undefined) return 0;
  if (typeof f === 'object') {
    const val = f.normalized_sqft ?? f.value;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }
  const num = Number(f);
  return isNaN(num) ? 0 : num;
}

function normalizeAddress(addr: string = ''): string {
  return addr
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(street|st\b)\b/g, 'st')
    .replace(/\b(avenue|ave\b)\b/g, 'ave')
    .replace(/\b(boulevard|blvd\b)\b/g, 'blvd')
    .replace(/\b(road|rd\b)\b/g, 'rd')
    .replace(/\b(drive|dr\b)\b/g, 'dr')
    .replace(/\b(court|ct\b)\b/g, 'ct')
    .replace(/\b(lane|ln\b)\b/g, 'ln')
    .replace(/\b(highway|hwy\b)\b/g, 'hwy')
    .replace(/\b(suite|ste|unit|apt|#)\s*[a-z0-9-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function areSameAddress(
  addr1: string,
  city1: string,
  parcel1: string,
  addr2: string,
  city2: string,
  parcel2: string
): boolean {
  // 1. Parcel PIN check
  const cP1 = (parcel1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cP2 = (parcel2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cP1.length > 3 && cP1 === cP2) return true;

  // 2. Normalized address comparison
  const n1 = normalizeAddress(addr1);
  const n2 = normalizeAddress(addr2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  if (n1.length > 5 && n2.length > 5) {
    if (n1.includes(n2) || n2.includes(n1)) {
      const c1 = (city1 || '').toLowerCase().trim();
      const c2 = (city2 || '').toLowerCase().trim();
      if (!c1 || !c2 || c1 === c2) return true;
    }
  }
  return false;
}

// Field definitions for diff calculation and multi-document consolidation
const FIELD_DEFINITIONS: {
  key: string;
  label: string;
  category: 'Location' | 'Ownership' | 'Measurements' | 'Financials' | 'Building';
  format?: (v: any) => string;
}[] = [
  { key: 'name', label: 'Property / Building Name', category: 'Location' },
  { key: 'address', label: 'Street Address', category: 'Location' },
  { key: 'unit_number', label: 'Unit / Suite #', category: 'Location' },
  { key: 'city', label: 'City', category: 'Location' },
  { key: 'state_province', label: 'State / Province', category: 'Location' },
  { key: 'postal_code', label: 'Postal / Zip Code', category: 'Location' },
  { key: 'country', label: 'Country', category: 'Location' },
  { key: 'parcel_id', label: 'Parcel / PIN Identifier', category: 'Location' },
  { key: 'legal_owner', label: 'Legal Owner', category: 'Ownership' },
  { key: 'owning_company', label: 'Owning Company', category: 'Ownership' },
  { key: 'ownership_interest', label: 'Ownership Interest %', category: 'Ownership', format: (v) => `${v}%` },
  { key: 'property_type', label: 'Property Type', category: 'Ownership' },
  { key: 'property_category', label: 'Category', category: 'Ownership' },
  { key: 'building_area', label: 'Gross Building Area (sqft)', category: 'Measurements', format: (v) => Number(v) ? `${Number(v).toLocaleString()} sqft` : '0 sqft' },
  { key: 'usable_area', label: 'Usable / Rentable Area (sqft)', category: 'Measurements', format: (v) => Number(v) ? `${Number(v).toLocaleString()} sqft` : '0 sqft' },
  { key: 'land_area', label: 'Land / Lot Area (sqft)', category: 'Measurements', format: (v) => Number(v) ? `${Number(v).toLocaleString()} sqft` : '0 sqft' },
  { key: 'year_built', label: 'Year Built', category: 'Building' },
  { key: 'floor_count', label: 'Floor Count', category: 'Building' },
  { key: 'construction_type', label: 'Construction Type', category: 'Building' },
  { key: 'zoning', label: 'Zoning Classification', category: 'Building' },
  { key: 'purchase_price', label: 'Purchase Price', category: 'Financials', format: (v) => Number(v) ? `$${Number(v).toLocaleString()}` : '$0' },
  { key: 'purchase_currency', label: 'Purchase Currency', category: 'Financials' },
  { key: 'purchase_date', label: 'Purchase / Closing Date', category: 'Financials' },
];

function extractFieldValueFromJob(job: PropertyExtractionJob, fieldKey: string): { value: any; rawObj: any } {
  const raw = job.raw_extracted_data || {};
  const props = raw.properties || job.extracted_properties || [];
  const p = Array.isArray(props) && props.length > 0 ? props[0] : raw;

  if (!p) return { value: '', rawObj: null };

  const rawObj = p[fieldKey];
  let val: any = '';

  if (['building_area', 'usable_area', 'land_area'].includes(fieldKey)) {
    val = getSqftValue(rawObj);
  } else if (['purchase_price', 'ownership_interest', 'year_built', 'floor_count'].includes(fieldKey)) {
    const rawVal = getFieldValue(rawObj);
    const num = Number(rawVal);
    val = isNaN(num) ? 0 : num;
  } else if (fieldKey === 'name') {
    val = getFieldValue(p.property_name) || getFieldValue(p.address) || '';
  } else {
    val = getFieldValue(rawObj);
  }

  return { value: val, rawObj };
}

function computeConflictsForRecord(rec: ExtractedPropertyRecord): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  for (const def of FIELD_DEFINITIONS) {
    const sources: DocumentCandidate[] = [];

    for (const job of rec.sourceJobs) {
      const docName =
        job.document_filename ||
        job.document_title ||
        (job as any).filename ||
        'Document.pdf';

      const { value, rawObj } = extractFieldValueFromJob(job, def.key);

      // Check if value is non-empty
      const isPresent =
        value !== '' &&
        value !== null &&
        value !== undefined &&
        !(typeof value === 'number' && value === 0 && !['ownership_interest'].includes(def.key));

      if (isPresent) {
        sources.push({
          jobId: job.id,
          docName,
          docSizeBytes: job.file_size_bytes,
          value,
          formattedValue: def.format ? def.format(value) : String(value),
          sourcePage: rawObj && typeof rawObj === 'object' ? rawObj.source_page : null,
          snippet: rawObj && typeof rawObj === 'object' ? rawObj.supporting_text : null,
        });
      }
    }

    if (sources.length > 0) {
      // Determine if there is a conflict between multiple distinct sources
      let hasConflict = false;
      if (sources.length > 1) {
        const uniqueValues = new Set(
          sources.map((s) =>
            typeof s.value === 'string'
              ? s.value.toLowerCase().trim().replace(/\s+/g, ' ')
              : String(s.value)
          )
        );
        hasConflict = uniqueValues.size > 1;
      }

      conflicts.push({
        fieldKey: def.key,
        fieldLabel: def.label,
        category: def.category,
        currentValue: (rec as any)[def.key],
        chosenJobId: rec.sourceJobs[0]?.id,
        sources,
        hasConflict,
      });
    }
  }

  return conflicts;
}

function groupJobsIntoPropertyRecords(jobs: PropertyExtractionJob[]): ExtractedPropertyRecord[] {
  const records: ExtractedPropertyRecord[] = [];

  for (const job of jobs) {
    const raw = job.raw_extracted_data || {};
    const props = raw.properties || job.extracted_properties || [];
    const docName =
      (job as any).filename ||
      job.document_filename ||
      job.document_title ||
      (job as any).original_filename ||
      (job as any).title ||
      'Document.pdf';
    const inspections = raw.inspections || [];

    const propItemsToProcess = Array.isArray(props) && props.length > 0 ? props : [raw];

    for (let i = 0; i < propItemsToProcess.length; i++) {
      const p = propItemsToProcess[i];
      const addr = getFieldValue(p.address) || '';
      const city = getFieldValue(p.city) || 'Chicago';
      const parcel = getFieldValue(p.parcel_id) || '';
      const name = getFieldValue(p.property_name) || addr || `Property from ${docName}`;

      // Check if this property matches any previously grouped record
      let matchedRecord = records.find((r) =>
        areSameAddress(r.address, r.city, r.parcel_id, addr, city, parcel)
      );

      if (matchedRecord) {
        // Same property identified across multiple documents!
        if (!matchedRecord.sourceJobs.some((sj) => sj.id === job.id)) {
          matchedRecord.sourceJobs.push(job);
        }
        if (!matchedRecord.sourceDocumentNames.includes(docName)) {
          matchedRecord.sourceDocumentNames.push(docName);
        }

        // Merge in any missing or more complete fields
        if (!matchedRecord.unit_number && getFieldValue(p.unit_number)) {
          matchedRecord.unit_number = getFieldValue(p.unit_number);
        }
        if (!matchedRecord.state_province && getFieldValue(p.state_province)) {
          matchedRecord.state_province = getFieldValue(p.state_province);
        }
        if (!matchedRecord.postal_code && getFieldValue(p.postal_code)) {
          matchedRecord.postal_code = getFieldValue(p.postal_code);
        }
        if (!matchedRecord.legal_owner && getFieldValue(p.legal_owner)) {
          matchedRecord.legal_owner = getFieldValue(p.legal_owner);
        }
        if (!matchedRecord.owning_company && getFieldValue(p.owning_company)) {
          matchedRecord.owning_company = getFieldValue(p.owning_company);
        }
        if (!matchedRecord.parcel_id && parcel) {
          matchedRecord.parcel_id = parcel;
        }
        if (!matchedRecord.building_area && getSqftValue(p.building_area)) {
          matchedRecord.building_area = getSqftValue(p.building_area);
        }
        if (!matchedRecord.usable_area && getSqftValue(p.usable_area)) {
          matchedRecord.usable_area = getSqftValue(p.usable_area);
        }
        if (!matchedRecord.land_area && getSqftValue(p.land_area)) {
          matchedRecord.land_area = getSqftValue(p.land_area);
        }
        if (!matchedRecord.year_built && Number(getFieldValue(p.year_built))) {
          matchedRecord.year_built = Number(getFieldValue(p.year_built));
        }
        if (!matchedRecord.purchase_price && Number(getFieldValue(p.purchase_price))) {
          matchedRecord.purchase_price = Number(getFieldValue(p.purchase_price));
          matchedRecord.purchase_currency = getFieldValue(p.purchase_currency) || 'USD';
        }
        if (!matchedRecord.purchase_date && getFieldValue(p.purchase_date)) {
          matchedRecord.purchase_date = getFieldValue(p.purchase_date);
        }
        if (job.matching_properties && job.matching_properties.length > 0 && !matchedRecord.matchingProperty) {
          matchedRecord.matchingProperty = job.matching_properties[0];
          matchedRecord.saveActionType = 'UPDATE_EXISTING';
        }
        matchedRecord.inspectionsCount += inspections.length;
      } else {
        // Different property identified! Create distinct record
        const matchingProp =
          job.matching_properties && job.matching_properties.length > 0
            ? job.matching_properties[0]
            : null;

        const newRec: ExtractedPropertyRecord = {
          id: `prop-${records.length + 1}`,
          name: name,
          address: addr,
          unit_number: getFieldValue(p.unit_number) || '',
          city: city,
          state_province: getFieldValue(p.state_province) || '',
          country: getFieldValue(p.country) || 'USA',
          postal_code: getFieldValue(p.postal_code) || '',
          property_type: getFieldValue(p.property_type) || 'Office',
          property_category: getFieldValue(p.property_category) || 'OWNED_HQ',
          ownership_type: 'OWNED',
          legal_owner: getFieldValue(p.legal_owner) || '',
          owning_company: getFieldValue(p.owning_company) || '',
          ownership_interest: Number(getFieldValue(p.ownership_interest)) || 100,
          building_area: getSqftValue(p.building_area),
          building_area_unit: 'sqft',
          usable_area: getSqftValue(p.usable_area),
          usable_area_unit: 'sqft',
          land_area: getSqftValue(p.land_area),
          land_area_unit: 'sqft',
          year_built: Number(getFieldValue(p.year_built)) || undefined,
          purchase_price: Number(getFieldValue(p.purchase_price)) || 0,
          purchase_currency: getFieldValue(p.purchase_currency) || 'USD',
          purchase_date: getFieldValue(p.purchase_date) || '',
          parcel_id: parcel,
          sourceJobs: [job],
          sourceDocumentNames: [docName],
          matchingProperty: matchingProp,
          saveActionType: matchingProp ? 'UPDATE_EXISTING' : 'CREATE_NEW',
          isSelected: true,
          validationWarnings: (job.validation_warnings || []).map((w: any) => typeof w === 'string' ? w : w.message || JSON.stringify(w)),
          inspectionsCount: inspections.length,
          conflicts: [],
        };
        records.push(newRec);
      }
    }
  }

  // Calculate field diffs & conflicts for all consolidated records
  for (const rec of records) {
    rec.conflicts = computeConflictsForRecord(rec);
  }

  return records;
}

export default function AddPropertyDocumentModal({
  isOpen,
  onClose,
  onPropertyCreated,
  onOpenReviewDetail,
}: AddPropertyDocumentModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files & Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'extracting' | 'extracted' | 'saving'>('select');
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Multi-Property records extracted and grouped by address
  const [, setExtractedJobs] = useState<PropertyExtractionJob[]>([]);
  const [propertyRecords, setPropertyRecords] = useState<ExtractedPropertyRecord[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<string>('');

  // Active sub-tab inside the review panel: 'merged' | 'diffs' | 'documents'
  const [activeReviewTab, setActiveReviewTab] = useState<'merged' | 'diffs' | 'documents'>('merged');

  // Active property record currently being viewed/edited in right panel
  const activeRecord = useMemo(() => {
    return propertyRecords.find((r) => r.id === activeRecordId) || propertyRecords[0] || null;
  }, [propertyRecords, activeRecordId]);

  const selectedCount = useMemo(() => {
    return propertyRecords.filter((r) => r.isSelected).length;
  }, [propertyRecords]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const pdfs = newFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      toast.error('Please upload PDF files (Deeds, Leases, Tax Assessments, Surveys, or Inspection Reports).');
      return;
    }
    setSelectedFiles((prev) => [...prev, ...pdfs]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload and Extract Mutation
  const extractMutation = useMutation({
    mutationFn: async () => {
      setUploadStep('extracting');
      setExtractionProgress(15);

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('engine_mode', 'HYBRID_PYMUPDF_TESSERACT');
      formData.append('ocr_languages', 'eng');

      setExtractionProgress(30);
      const initialJobs = await realEstateService.uploadAndExtractDocuments(formData);
      setExtractionProgress(55);

      // Poll ALL jobs concurrently until all reach a terminal state
      let activeJobs = [...initialJobs];
      let attempts = 0;
      while (attempts < 25) {
        const pendingJobs = activeJobs.filter(
          (j) => j.status === 'PROCESSING' || j.status === 'UPLOADED'
        );
        if (pendingJobs.length === 0) break;

        await new Promise((r) => setTimeout(r, 1200));
        activeJobs = await Promise.all(
          activeJobs.map(async (job) => {
            if (job.status === 'PROCESSING' || job.status === 'UPLOADED') {
              try {
                return await realEstateService.getPropertyExtractionJob(job.id);
              } catch {
                return job;
              }
            }
            return job;
          })
        );

        attempts++;
        setExtractionProgress(Math.min(95, 55 + attempts * 2));
      }

      return activeJobs;
    },
    onSuccess: (completedJobs) => {
      setExtractionProgress(100);
      setExtractedJobs(completedJobs);

      // Group completed jobs by identified address
      const grouped = groupJobsIntoPropertyRecords(completedJobs);
      setPropertyRecords(grouped);

      if (grouped.length > 0) {
        setActiveRecordId(grouped[0].id);
        const hasAnyConflicts = grouped[0].conflicts.some((c) => c.hasConflict);
        setActiveReviewTab(hasAnyConflicts ? 'diffs' : 'merged');
      }

      setUploadStep('extracted');

      if (grouped.length > 1) {
        toast.info(
          `Identified ${grouped.length} distinct properties from your ${selectedFiles.length} uploaded documents.`
        );
      } else {
        toast.success(
          `Successfully analyzed ${selectedFiles.length} document(s) for ${grouped[0]?.name || 'property'}.`
        );
      }
    },
    onError: (err: any) => {
      setUploadStep('select');
      toast.error(err.response?.data?.detail || 'Extraction failed. Please try again.');
    },
  });

  // Update a field on the currently active property record
  const updateActiveRecordField = (field: keyof ExtractedPropertyRecord, value: any) => {
    if (!activeRecord) return;
    setPropertyRecords((prev) =>
      prev.map((r) => (r.id === activeRecord.id ? { ...r, [field]: value } : r))
    );
  };

  // User chooses a specific document's candidate value for a conflicting field
  const handleTakeConflictValue = (
    recordId: string,
    fieldKey: string,
    chosenJobId: string,
    chosenValue: any,
    docName: string
  ) => {
    setPropertyRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== recordId) return rec;

        const updatedConflicts = rec.conflicts.map((conf) => {
          if (conf.fieldKey === fieldKey) {
            return {
              ...conf,
              chosenJobId,
              currentValue: chosenValue,
            };
          }
          return conf;
        });

        return {
          ...rec,
          [fieldKey]: chosenValue,
          conflicts: updatedConflicts,
        };
      })
    );

    toast.success(`Updated '${fieldKey}' to value from ${docName}`);
  };

  // Toggle whether an extracted property record should be included when confirming
  const toggleRecordSelection = (recordId: string) => {
    setPropertyRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, isSelected: !r.isSelected } : r))
    );
  };

  // Select/Deselect all records
  const setAllRecordsSelection = (select: boolean) => {
    setPropertyRecords((prev) => prev.map((r) => ({ ...r, isSelected: select })));
  };


  // Track individual saved records
  const [savedRecordIds, setSavedRecordIds] = useState<Set<string>>(new Set());
  const [savingRecordId, setSavingRecordId] = useState<string | null>(null);

  // Helper to save a single record
  const saveSinglePropertyRecord = async (rec: ExtractedPropertyRecord): Promise<Property | null> => {
    const payloadData = {
      name: rec.name,
      address: rec.address,
      unit_number: rec.unit_number,
      city: rec.city,
      state_province: rec.state_province,
      country: rec.country,
      postal_code: rec.postal_code,
      property_type: rec.property_type,
      property_category: rec.property_category,
      ownership_type: rec.ownership_type,
      legal_owner: rec.legal_owner,
      owning_company: rec.owning_company,
      ownership_interest: rec.ownership_interest,
      building_area: rec.building_area,
      building_area_unit: rec.building_area_unit,
      building_area_sqft: rec.building_area,
      square_feet: rec.usable_area || rec.building_area,
      total_square_feet: rec.building_area,
      usable_area: rec.usable_area,
      usable_area_unit: rec.usable_area_unit,
      land_area: rec.land_area,
      land_area_unit: rec.land_area_unit,
      year_built: rec.year_built,
      purchase_price: rec.purchase_price,
      purchase_currency: rec.purchase_currency,
      purchase_date: rec.purchase_date,
      parcel_id: rec.parcel_id,
    };

    const primaryJob = rec.sourceJobs[0];
    if (!primaryJob) return null;

    const isUpdate = rec.saveActionType === 'UPDATE_EXISTING' && rec.matchingProperty;
    const targetPropId = isUpdate ? rec.matchingProperty!.id : null;

    const savedProp = await realEstateService.confirmPropertyExtractionJob(primaryJob.id, {
      action_type: rec.saveActionType,
      target_property_id: targetPropId,
      property_data: payloadData,
      create_inspections: true,
    });

    const resolvedPropId = savedProp.id;
    for (let j = 1; j < rec.sourceJobs.length; j++) {
      const secondaryJob = rec.sourceJobs[j];
      try {
        await realEstateService.confirmPropertyExtractionJob(secondaryJob.id, {
          action_type: 'UPDATE_EXISTING',
          target_property_id: resolvedPropId,
          property_data: payloadData,
          create_inspections: true,
        });
      } catch (secondaryErr) {
        console.warn('Note on linking secondary job:', secondaryErr);
      }
    }

    return savedProp;
  };

  // Save an individual record (one by one)
  const handleSaveIndividualProperty = async (rec: ExtractedPropertyRecord) => {
    if (savingRecordId || confirmMutation.isPending) return;
    setSavingRecordId(rec.id);
    try {
      const savedProp = await saveSinglePropertyRecord(rec);
      if (savedProp) {
        setSavedRecordIds((prev) => {
          const next = new Set(prev);
          next.add(rec.id);
          return next;
        });

        queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
        queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
        queryClient.invalidateQueries({ queryKey: ['property-extraction-jobs'] });

        toast.success(`Property '${savedProp.name || rec.name}' saved to portfolio!`);

        const allSaved = propertyRecords.every((r) => r.id === rec.id || savedRecordIds.has(r.id));
        if (allSaved) {
          onClose();
          onPropertyCreated(savedProp);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to save property');
    } finally {
      setSavingRecordId(null);
    }
  };

  // Confirm and Save Mutation (supports saving selected or all properties at once)
  const confirmMutation = useMutation({
    mutationFn: async (saveMode: 'selected' | 'all' = 'selected') => {
      const targetList =
        saveMode === 'all'
          ? propertyRecords.filter((r) => !savedRecordIds.has(r.id))
          : propertyRecords.filter((r) => r.isSelected && !savedRecordIds.has(r.id));

      if (targetList.length === 0) {
        throw new Error('No unsaved properties selected to save.');
      }

      setUploadStep('saving');
      const savedProperties: Property[] = [];
      const newSavedIds = new Set(savedRecordIds);

      for (const rec of targetList) {
        try {
          const savedProp = await saveSinglePropertyRecord(rec);
          if (savedProp) {
            savedProperties.push(savedProp);
            newSavedIds.add(rec.id);
          }
        } catch (itemErr: any) {
          console.error(`Error saving property ${rec.name}:`, itemErr);
          toast.error(`Error saving ${rec.name}: ${itemErr.response?.data?.detail || itemErr.message}`);
        }
      }

      setSavedRecordIds(newSavedIds);
      return savedProperties;
    },
    onSuccess: (savedProps) => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      queryClient.invalidateQueries({ queryKey: ['property-extraction-jobs'] });

      if (savedProps.length === 1) {
        toast.success(`Property '${savedProps[0].name}' saved successfully!`);
      } else if (savedProps.length > 1) {
        toast.success(`Successfully saved ${savedProps.length} properties to your portfolio!`);
      }

      const allSaved = propertyRecords.every(
        (r) => savedRecordIds.has(r.id) || savedProps.some((p) => p.name === r.name)
      );
      if (allSaved) {
        onClose();
        if (savedProps.length > 0) {
          onPropertyCreated(savedProps[0]);
        }
      } else {
        setUploadStep('extracted');
      }
    },
    onError: (err: any) => {
      setUploadStep('extracted');
      toast.error(err.response?.data?.detail || err.message || 'Failed to save properties.');
    },
  });

  const resetAll = () => {
    setSelectedFiles([]);
    setPropertyRecords([]);
    setActiveRecordId('');
    setActiveReviewTab('merged');
    setUploadStep('select');
    setExtractionProgress(0);
    setSavedRecordIds(new Set());
    setSavingRecordId(null);
  };

  const handleModalClose = () => {
    resetAll();
    onClose();
  };

  const activeConflicts = useMemo(() => {
    return activeRecord?.conflicts.filter((c) => c.hasConflict) || [];
  }, [activeRecord]);

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[1550px] 2xl:max-w-[1700px] h-[92vh] max-h-[92vh] flex flex-col p-5 overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>Add Property via Document Extraction</span>
                {propertyRecords.length > 1 && uploadStep === 'extracted' && (
                  <Badge variant="secondary" className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                    <Layers className="w-3 h-3 mr-1" />
                    {propertyRecords.length} Properties Identified
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Upload Deeds, Closing Statements, Leases, Surveys, or Inspection PDFs. Documents matching the same address
                are merged into a single property with automated diff detection and conflict resolution.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: SELECT & UPLOAD DOCUMENTS */}
        {uploadStep === 'select' && (
          <div className="flex-1 overflow-y-auto space-y-4 py-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-base font-semibold text-foreground">Click to upload or drag & drop property PDFs</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                Upload one or multiple PDF documents (Deeds, Buyer Closing Statements, Leases, Inspection Reports).
                Documents belonging to the same address or property are automatically merged with live diff detection.
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Selected Documents ({selectedFiles.length})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFiles([]);
                    }}
                    className="text-muted-foreground hover:text-foreground text-[11px]"
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {formatExactFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0 ml-2"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PROCESSING & EXTRACTING PROGRESS */}
        {uploadStep === 'extracting' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Analyzing Documents & Merging Property Data</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Extracting structured addresses, deeds, purchase prices, and square footage across your documents.
                Documents matching the same address are automatically consolidated.
              </p>
            </div>
            <div className="w-full max-w-md space-y-1.5">
              <Progress value={extractionProgress} className="h-2" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Multi-Document Extraction Pipeline</span>
                <span>{extractionProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2.5: SAVING PROPERTIES IN PROGRESS */}
        {uploadStep === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Saving Confirmed Properties to Portfolio</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Writing property records, linking all source documents, and establishing portfolio metrics...
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: EXTRACTED VIEW WITH TABS (MERGED DATA, DIFFS & SELECTION, SOURCE DOCUMENTS) */}
        {uploadStep === 'extracted' && propertyRecords.length > 0 && activeRecord && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3 pt-1">
            {/* Multi-Property vs Single Property Top Intelligence Banner */}
            {propertyRecords.length > 1 ? (
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/30 text-xs shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>Multiple Distinct Properties Identified ({propertyRecords.length})</span>
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {selectedFiles.length} Documents Analyzed
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Different addresses were identified across your documents. Select each property on the left to review
                        and edit its merged fields and resolve any document differences.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] px-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                      onClick={() => setAllRecordsSelection(selectedCount !== propertyRecords.length)}
                    >
                      {selectedCount === propertyRecords.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {activeRecord.sourceJobs.length > 1 ? (
                      <>
                        <strong>{activeRecord.sourceJobs.length} documents</strong> share the same address (
                        <strong>{activeRecord.address || 'Identified Address'}</strong>) and have been merged into this property.
                      </>
                    ) : (
                      <>
                        Information extracted accurately from <strong>{activeRecord.sourceDocumentNames[0]}</strong>.
                      </>
                    )}
                  </span>
                </div>
                {activeConflicts.length > 0 && (
                  <Badge className="bg-amber-500 text-white border-0 text-[11px] gap-1 shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    {activeConflicts.length} Document Diff{activeConflicts.length > 1 ? 's' : ''} to Confirm
                  </Badge>
                )}
              </div>
            )}

            {/* Expansive Split Layout */}
            <div className={`flex-1 overflow-hidden grid gap-4 ${propertyRecords.length > 1 ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1'}`}>
              {/* LEFT COLUMN: IDENTIFIED PROPERTIES LIST (when multiple properties exist) */}
              {propertyRecords.length > 1 && (
                <div className="md:col-span-4 lg:col-span-3 h-full overflow-y-auto space-y-2 border-r border-border pr-3">
                  <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Identified Properties</span>
                    <span>{selectedCount} of {propertyRecords.length} selected</span>
                  </div>

                  <div className="space-y-2">
                    {propertyRecords.map((rec, idx) => {
                      const isActive = rec.id === activeRecord.id;
                      const hasConf = rec.conflicts.some((c) => c.hasConflict);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => setActiveRecordId(rec.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                            isActive
                              ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRecordSelection(rec.id);
                              }}
                              className="pt-0.5"
                            >
                              <Checkbox checked={rec.isSelected} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                {savedRecordIds.has(rec.id) ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 font-bold">
                                    ✓ Saved
                                  </Badge>
                                ) : hasConf ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10">
                                    Diffs Detected
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                    Merged Clean
                                  </Badge>
                                )}
                              </div>

                              <h5 className="font-semibold text-xs text-foreground truncate">
                                {rec.name || rec.address || `Property #${idx + 1}`}
                              </h5>

                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0 text-primary" />
                                <span className="truncate">{rec.address || 'Address pending'}</span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                <span className="flex items-center gap-1 font-mono">
                                  <FileText className="w-2.5 h-2.5 text-primary" />
                                  {rec.sourceJobs.length} doc{rec.sourceJobs.length > 1 ? 's' : ''}
                                </span>
                                <span>
                                  {rec.city}
                                  {rec.building_area ? ` • ${rec.building_area.toLocaleString()} sqft` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RIGHT / MAIN REVIEW PANEL (Widescreen Expansive Layout with Tabs) */}
              <div className={`${propertyRecords.length > 1 ? 'md:col-span-8 lg:col-span-9' : 'w-full'} flex flex-col h-full overflow-hidden space-y-3`}>
                {/* Active Property Sub-header & Source Document Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/20 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {activeRecord.name || activeRecord.address || 'Property Record'}
                      </h4>
                      {savedRecordIds.has(activeRecord.id) && (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 font-bold">
                          ✓ Saved to Portfolio
                        </Badge>
                      )}
                      {activeRecord.matchingProperty && !savedRecordIds.has(activeRecord.id) && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Matches Existing Portfolio Property
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">Source Documents:</span>
                      {activeRecord.sourceJobs.map((j, dIdx) => (
                        <span
                          key={dIdx}
                          className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-mono flex items-center gap-1.5 text-foreground shadow-2xs"
                        >
                          <FileText className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {j.document_filename || j.document_title || `Doc #${dIdx + 1}`}
                          </span>
                          {j.file_size_bytes != null && (
                            <span className="text-muted-foreground font-mono text-[9px]">
                              • {formatExactFileSize(j.file_size_bytes)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenReviewDetail && activeRecord.sourceJobs.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => onOpenReviewDetail(activeRecord.sourceJobs[0])}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Side-by-Side Review
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1.5 font-semibold shadow-2xs"
                      disabled={
                        savedRecordIds.has(activeRecord.id) ||
                        savingRecordId === activeRecord.id ||
                        confirmMutation.isPending ||
                        !activeRecord.address
                      }
                      onClick={() => handleSaveIndividualProperty(activeRecord)}
                    >
                      {savingRecordId === activeRecord.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : savedRecordIds.has(activeRecord.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save This Property</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Sub-Tabs: Merged Details | Document Diffs | Source Documents */}
                <Tabs
                  value={activeReviewTab}
                  onValueChange={(val: any) => setActiveReviewTab(val)}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="border-b border-border pb-2 shrink-0">
                    <TabsList className="grid grid-cols-3 w-full sm:w-[480px] h-8 text-xs">
                      <TabsTrigger value="merged" className="gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Merged Details</span>
                      </TabsTrigger>
                      <TabsTrigger value="diffs" className="gap-1.5">
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Document Diffs</span>
                        {activeConflicts.length > 0 ? (
                          <Badge className="ml-1 px-1.5 py-0 h-4 text-[9px] bg-amber-500 text-white">
                            {activeConflicts.length}
                          </Badge>
                        ) : activeRecord.sourceJobs.length > 1 ? (
                          <Badge variant="outline" className="ml-1 px-1.5 py-0 h-4 text-[9px] text-emerald-600">
                            Merged
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Source Docs ({activeRecord.sourceJobs.length})</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* TAB 1: MERGED PROPERTY FORM FIELDS */}
                  <TabsContent value="merged" className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-2">
                    {/* Notice if diffs exist between documents */}
                    {activeConflicts.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>
                            <strong>{activeConflicts.length} field difference(s)</strong> detected between the uploaded documents.
                            Values have been intelligently pre-selected, but you can choose specific document values in the Diffs tab.
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] gap-1 border-amber-500/40 text-amber-800 dark:text-amber-200 shrink-0"
                          onClick={() => setActiveReviewTab('diffs')}
                        >
                          <GitCompare className="w-3 h-3" />
                          Review Diffs ({activeConflicts.length})
                        </Button>
                      </div>
                    )}

                    {/* Section 1: Location & Identification */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground pb-1 border-b border-border">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>1. Location & Identification</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                          <label className="font-semibold text-foreground flex items-center justify-between">
                            <span>Property / Building Name *</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Consolidated</span>
                          </label>
                          <Input
                            value={activeRecord.name}
                            onChange={(e) => updateActiveRecordField('name', e.target.value)}
                            className="h-8 text-xs font-medium"
                            placeholder="e.g. Century Park East Unit 2605"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-semibold text-foreground flex items-center justify-between">
                            <span>Full Street Address *</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Consolidated</span>
                          </label>
                          <Input
                            value={activeRecord.address}
                            onChange={(e) => updateActiveRecordField('address', e.target.value)}
                            className="h-8 text-xs font-medium"
                            placeholder="Street Address"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Unit / Suite Number</label>
                          <Input
                            value={activeRecord.unit_number}
                            onChange={(e) => updateActiveRecordField('unit_number', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. Unit 2605 (or blank)"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">City *</label>
                          <Input
                            value={activeRecord.city}
                            onChange={(e) => updateActiveRecordField('city', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">State / Province</label>
                          <Input
                            value={activeRecord.state_province}
                            onChange={(e) => updateActiveRecordField('state_province', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. CA"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Postal / Zip Code</label>
                          <Input
                            value={activeRecord.postal_code}
                            onChange={(e) => updateActiveRecordField('postal_code', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. 90067"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Country *</label>
                          <Input
                            value={activeRecord.country}
                            onChange={(e) => updateActiveRecordField('country', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Parcel / PIN Identifier</label>
                          <Input
                            value={activeRecord.parcel_id}
                            onChange={(e) => updateActiveRecordField('parcel_id', e.target.value)}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 4320-001-135"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Ownership & Legal Classification */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground pb-1 border-b border-border">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span>2. Ownership & Classification</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-semibold text-foreground">Legal Owner / Owning Entity</label>
                          <Input
                            value={activeRecord.legal_owner || activeRecord.owning_company}
                            onChange={(e) => {
                              updateActiveRecordField('legal_owner', e.target.value);
                              updateActiveRecordField('owning_company', e.target.value);
                            }}
                            className="h-8 text-xs"
                            placeholder="e.g. Shaun Passley"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Ownership Interest (%)</label>
                          <Input
                            type="number"
                            value={activeRecord.ownership_interest}
                            onChange={(e) => updateActiveRecordField('ownership_interest', Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Ownership Type</label>
                          <Select
                            value={activeRecord.ownership_type}
                            onValueChange={(val) => updateActiveRecordField('ownership_type', val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNED">Owned (Direct)</SelectItem>
                              <SelectItem value="LEASED">Leased (Tenant)</SelectItem>
                              <SelectItem value="MORTGAGED">Mortgaged</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-semibold text-foreground">Property Type</label>
                          <Select
                            value={activeRecord.property_type}
                            onValueChange={(val) => updateActiveRecordField('property_type', val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Office">Commercial Office</SelectItem>
                              <SelectItem value="Condo">Executive Condo</SelectItem>
                              <SelectItem value="Residential">Residential</SelectItem>
                              <SelectItem value="Industrial">Industrial / Warehouse</SelectItem>
                              <SelectItem value="Retail">Retail Plaza</SelectItem>
                              <SelectItem value="Land">Development Land</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-semibold text-foreground">Portfolio Category</label>
                          <Select
                            value={activeRecord.property_category}
                            onValueChange={(val) => updateActiveRecordField('property_category', val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="COMPANY_CONDO">Company Condo</SelectItem>
                              <SelectItem value="OWNED_HQ">Owned HQ</SelectItem>
                              <SelectItem value="LEASED_OFFICE">Leased Office</SelectItem>
                              <SelectItem value="RD_FACILITY">R&D Facility</SelectItem>
                              <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                              <SelectItem value="CO_WORKING">Co-Working Hub</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Measurements & Building Specs */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground pb-1 border-b border-border">
                        <Building className="w-3.5 h-3.5 text-primary" />
                        <span>3. Dimensions, Year Built & Financials</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Building Area (sqft)</label>
                          <Input
                            type="number"
                            value={activeRecord.building_area || ''}
                            onChange={(e) => updateActiveRecordField('building_area', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1250"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Usable Area (sqft)</label>
                          <Input
                            type="number"
                            value={activeRecord.usable_area || ''}
                            onChange={(e) => updateActiveRecordField('usable_area', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1250"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Year Built</label>
                          <Input
                            type="number"
                            value={activeRecord.year_built || ''}
                            onChange={(e) => updateActiveRecordField('year_built', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1966"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Closing / Purchase Date</label>
                          <Input
                            type="date"
                            value={activeRecord.purchase_date || ''}
                            onChange={(e) => updateActiveRecordField('purchase_date', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-semibold text-foreground">Purchase / Acquisition Price</label>
                          <Input
                            type="number"
                            value={activeRecord.purchase_price || ''}
                            onChange={(e) => updateActiveRecordField('purchase_price', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1800000"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="font-semibold text-foreground">Currency</label>
                          <CurrencyAutocomplete
                            value={activeRecord.purchase_currency}
                            onChange={(val) => updateActiveRecordField('purchase_currency', val)}
                          />
                        </div>
                      </div>

                      {activeRecord.inspectionsCount > 0 && (
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-foreground flex items-center gap-2 mt-2">
                          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>
                            <strong>{activeRecord.inspectionsCount}</strong> inspection and condition finding(s) detected in the
                            attached documents will be linked to this property record.
                          </span>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB 2: DOCUMENT DIFFS & FIELD-BY-FIELD SELECTION */}
                  <TabsContent value="diffs" className="flex-1 overflow-y-auto space-y-4 pr-1 mt-2">
                    {activeRecord.sourceJobs.length <= 1 ? (
                      <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/20 space-y-2">
                        <FileText className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                        <h5 className="font-bold text-sm text-foreground">Single Document Analyzed</h5>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          This property currently has data from only 1 document (<strong>{activeRecord.sourceDocumentNames[0]}</strong>).
                          When you upload multiple documents for the same address, any field conflicts and side-by-side differences will
                          appear here for interactive confirmation.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Diff Overview Explanation */}
                        <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GitCompare className="w-4 h-4 text-primary" />
                              <h5 className="font-bold text-xs text-foreground">
                                Multi-Document Consolidation & Conflict Resolution
                              </h5>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {activeRecord.sourceJobs.length} documents merged
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            The system consolidated data from all {activeRecord.sourceJobs.length} documents. Where different documents
                            reported conflicting values, you can compare them side-by-side below and click <strong>"Take This Value"</strong> to
                            instantly choose which document to trust.
                          </p>
                        </div>

                        {/* List of Conflicting Fields First */}
                        {activeConflicts.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Conflicting Fields Requiring Selection ({activeConflicts.length})</span>
                            </div>

                            {activeConflicts.map((diff) => (
                              <div
                                key={diff.fieldKey}
                                className="p-4 rounded-xl border-2 border-amber-500/40 bg-card space-y-3 shadow-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-foreground">{diff.fieldLabel}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {diff.category}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-muted-foreground">Current Merged Value:</span>
                                    <Badge className="bg-primary text-primary-foreground font-mono text-[11px]">
                                      {String((activeRecord as any)[diff.fieldKey] || 'Empty')}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Comparison Grid: 1 Card per Candidate Document */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {diff.sources.map((src, sIdx) => {
                                    const isCurrentlyChosen =
                                      String((activeRecord as any)[diff.fieldKey]) === String(src.value);
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`p-3 rounded-lg border flex flex-col justify-between space-y-2.5 transition-all ${
                                          isCurrentlyChosen
                                            ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-2xs'
                                            : 'border-border bg-muted/20 hover:border-border/80'
                                        }`}
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-start justify-between gap-1.5">
                                            <span className="font-semibold text-[11px] text-foreground truncate max-w-[190px]">
                                              {src.docName}
                                            </span>
                                            {isCurrentlyChosen && (
                                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 gap-1 shrink-0">
                                                <Check className="w-2.5 h-2.5" />
                                                Active
                                              </Badge>
                                            )}
                                          </div>
                                          {src.docSizeBytes != null && (
                                            <span className="text-[10px] text-muted-foreground font-mono block">
                                              {formatExactFileSize(src.docSizeBytes)}
                                            </span>
                                          )}
                                        </div>

                                        <div className="p-2 rounded bg-background border border-border/60">
                                          <span className="text-[10px] text-muted-foreground block font-medium">Extracted Value:</span>
                                          <span className="font-bold text-xs text-foreground font-mono break-all">
                                            {src.formattedValue || '—'}
                                          </span>
                                          {src.snippet && (
                                            <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-2">
                                              "{src.snippet}"
                                            </p>
                                          )}
                                        </div>

                                        <Button
                                          size="sm"
                                          variant={isCurrentlyChosen ? 'secondary' : 'default'}
                                          className="h-7 text-xs w-full gap-1"
                                          disabled={isCurrentlyChosen}
                                          onClick={() =>
                                            handleTakeConflictValue(
                                              activeRecord.id,
                                              diff.fieldKey,
                                              src.jobId,
                                              src.value,
                                              src.docName
                                            )
                                          }
                                        >
                                          {isCurrentlyChosen ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Using This Value</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>Take This Value</span>
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>No direct conflicts found!</strong> All extracted fields across the{' '}
                              {activeRecord.sourceJobs.length} documents were consistent and complementary.
                            </span>
                          </div>
                        )}

                        {/* All Consolidating Fields Table */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <h6 className="font-semibold text-xs text-foreground">
                            Complete Field Consolidation Matrix
                          </h6>
                          <div className="rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                                <tr>
                                  <th className="p-2.5">Field</th>
                                  <th className="p-2.5">Merged Result</th>
                                  <th className="p-2.5">Contributing Source(s)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {activeRecord.conflicts.map((diff) => (
                                  <tr key={diff.fieldKey} className="hover:bg-muted/20">
                                    <td className="p-2.5 font-medium text-foreground">{diff.fieldLabel}</td>
                                    <td className="p-2.5 font-mono font-bold text-foreground">
                                      {String((activeRecord as any)[diff.fieldKey] || '—')}
                                    </td>
                                    <td className="p-2.5 text-muted-foreground text-[11px]">
                                      {diff.sources.map((s, idx) => (
                                        <span key={idx} className="inline-block mr-2">
                                          {s.docName}
                                          {s.docSizeBytes != null ? ` (${formatExactFileSize(s.docSizeBytes)})` : ''}
                                        </span>
                                      ))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* TAB 3: SOURCE DOCUMENTS DETAILED LIST */}
                  <TabsContent value="documents" className="flex-1 overflow-y-auto space-y-3 pr-1 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeRecord.sourceJobs.map((job, idx) => {
                        const docName =
                          job.document_filename ||
                          job.document_title ||
                          (job as any).filename ||
                          `Document #${idx + 1}`;
                        return (
                          <div
                            key={job.id}
                            className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                  <FileText className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-xs text-foreground truncate">{docName}</h5>
                                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    Exact Size: {formatExactFileSize(job.file_size_bytes)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                                {job.document_type || 'PDF'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 p-2.5 rounded-lg border border-border/60">
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Pages:</span>
                                <span className="font-semibold text-foreground">{job.page_count || 1} Page(s)</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Status:</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {job.status}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground block text-[10px]">Extraction Pipeline:</span>
                                <span className="font-mono text-[10px] text-foreground truncate block">
                                  {job.pipeline_version || 'hybrid-v2.0'} ({job.extractor_provider || 'Hybrid OCR'})
                                </span>
                              </div>
                            </div>

                            {onOpenReviewDetail && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs gap-1.5"
                                onClick={() => onOpenReviewDetail(job)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Open Side-by-Side Review
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border shrink-0">
          {uploadStep === 'select' && (
            <>
              <Button variant="ghost" size="sm" onClick={handleModalClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-2 text-xs"
                disabled={selectedFiles.length === 0 || extractMutation.isPending}
                onClick={() => extractMutation.mutate()}
              >
                {extractMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Extract Information ({selectedFiles.length})
              </Button>
            </>
          )}

          {uploadStep === 'extracting' && (
            <div className="w-full text-center text-xs text-muted-foreground">
              Processing multi-document layout analysis and address consolidation...
            </div>
          )}

          {uploadStep === 'saving' && (
            <div className="w-full text-center text-xs text-muted-foreground">
              Saving confirmed property records to your portfolio...
            </div>
          )}

          {uploadStep === 'extracted' && (
            <>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetAll} className="text-xs">
                  Upload Different Files
                </Button>
                {propertyRecords.length > 1 && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {savedRecordIds.size} of {propertyRecords.length} saved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {savedRecordIds.size >= propertyRecords.length && propertyRecords.length > 0 ? (
                  <Button
                    size="sm"
                    className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleModalClose}
                  >
                    <Check className="w-3.5 h-3.5" />
                    All Properties Saved • Done
                  </Button>
                ) : (
                  <>
                    {propertyRecords.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        disabled={
                          confirmMutation.isPending ||
                          savingRecordId !== null ||
                          propertyRecords.filter((r) => !savedRecordIds.has(r.id)).length === 0
                        }
                        onClick={() => confirmMutation.mutate('all')}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        Save All ({propertyRecords.filter((r) => !savedRecordIds.has(r.id)).length})
                      </Button>
                    )}

                    <Button
                      size="sm"
                      className="gap-2 text-xs shadow-xs"
                      disabled={
                        confirmMutation.isPending ||
                        savingRecordId !== null ||
                        propertyRecords.filter((r) => r.isSelected && !savedRecordIds.has(r.id)).length === 0 ||
                        !activeRecord?.address
                      }
                      onClick={() => confirmMutation.mutate('selected')}
                    >
                      {confirmMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Building className="w-3.5 h-3.5" />
                      )}
                      {propertyRecords.length === 1
                        ? activeRecord?.saveActionType === 'CREATE_NEW'
                          ? 'Save Property to Portfolio'
                          : 'Confirm Update & Save'
                        : `Save Selected (${propertyRecords.filter((r) => r.isSelected && !savedRecordIds.has(r.id)).length})`}
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
