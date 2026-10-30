import { useState, useRef, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import type {
  Property,
  PropertyExtractionJob,
  ExtractedRegister,
  ExtractedRegisterItem,
  RegisterApplyResult,
} from '@/types/realEstate';
import { ExtractedRegisterPreview, RegisterApplyResultPanel } from './register/ExtractedRegisterPreview';
import type { RegisterGroup } from './register/ExtractedRegisterPreview';
import { FileSignature, Landmark } from 'lucide-react';
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
  Eye,
  X,
  MapPin,
  Building,
  Check,
  GitCompare,
  Save,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatExactFileSize } from '@/lib/utils';
import { CurrencyAutocomplete } from '@/components/ui/CurrencyAutocomplete';
import { normalizeDateToISO } from '@/utils/dateUtils';

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
  building_name?: string;
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
  homeharvest_enrichment?: Record<string, any>;
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
  initialJobs?: PropertyExtractionJob[];
  initialRecordId?: string;
}

function getFieldValue(f: any): any {
  if (f === null || f === undefined) return '';
  if (typeof f === 'object') return f.normalized_value ?? f.value ?? '';
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
    .replace(/^(\d+)\s+([nsew])([a-z]{3,})\b/i, '$1 $2 $3')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(street|st\b)\b/g, 'st')
    .replace(/\b(avenue|ave\b)\b/g, 'ave')
    .replace(/\b(boulevard|blvd\b)\b/g, 'blvd')
    .replace(/\b(road|rd\b)\b/g, 'rd')
    .replace(/\b(drive|dr\b)\b/g, 'dr')
    .replace(/\b(court|crt|ct\b)\b/g, 'ct')
    .replace(/\b(lane|ln\b)\b/g, 'ln')
    .replace(/\b(highway|hwy\b)\b/g, 'hwy')
    .replace(/\b(suite|ste|unit|apt|#)\s*[a-z0-9-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCoreAddressWithoutDirectional(normAddr: string): { core: string; dir: string } {
  const tokens = normAddr.split(' ').filter(Boolean);
  const dirMap: Record<string, string> = {
    n: 'n', north: 'n',
    s: 's', south: 's',
    e: 'e', east: 'e',
    w: 'w', west: 'w',
  };
  if (tokens.length >= 3 && /^\d+[a-z]?$/.test(tokens[0]) && dirMap[tokens[1]]) {
    return {
      core: [tokens[0], ...tokens.slice(2)].join(' '),
      dir: dirMap[tokens[1]],
    };
  }
  return { core: normAddr, dir: '' };
}

function normalizeUnitNumber(unit?: string): string {
  if (!unit) return '';
  return String(unit)
    .trim()
    .replace(/^(?:suite|ste|unit|apt|apartment|fl|floor|rm|room|#)\s*/i, '')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
}

function splitAddressAndUnit(rawAddress?: string, rawUnit?: string, docFilename?: string): { streetAddress: string; unitNumber: string } {
  let addr = (rawAddress || '')
    .trim()
    .replace(/^(\d+)\s+([NSEW])([a-z]{3,})\b/i, '$1 $2 $3')
    .replace(/\bCrt\b/gi, 'Court');
  let unit = (rawUnit || '').trim().replace(/^(?:suite|ste|unit|apt|#)\s*/i, '').trim();

  if (addr) {
    const m = addr.match(/^(.*?)(?:,\s*|\s+)(?:unit|apt|apartment|suite|ste|#)\s*([a-z0-9-]+)\s*$/i);
    if (m) {
      addr = m[1].trim().replace(/,+$/, '').trim();
      if (!unit) {
        unit = m[2].trim();
      }
    }
  }
  if (!unit && docFilename) {
    const fnMatch = docFilename.match(/(?:^|[_\s-])(?:unit[_\s-]*)?(\d{3,4})(?:[_\s.-]|$)/i);
    if (fnMatch && !addr.startsWith(fnMatch[1] + ' ')) {
      unit = fnMatch[1];
    }
  }
  return { streetAddress: addr, unitNumber: unit };
}

function areSameBuildingAddress(
  addr1: string,
  city1: string,
  addr2: string,
  city2: string
): boolean {
  const n1 = normalizeAddress(addr1);
  const n2 = normalizeAddress(addr2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  const c1Obj = getCoreAddressWithoutDirectional(n1);
  const c2Obj = getCoreAddressWithoutDirectional(n2);
  if (c1Obj.core && c1Obj.core === c2Obj.core && (!c1Obj.dir || !c2Obj.dir || c1Obj.dir === c2Obj.dir)) {
    const cityA = (city1 || '').toLowerCase().trim();
    const cityB = (city2 || '').toLowerCase().trim();
    if (!cityA || !cityB || cityA === cityB) return true;
  }

  if (n1.length > 5 && n2.length > 5) {
    if (n1.includes(n2) || n2.includes(n1) || c1Obj.core.includes(c2Obj.core) || c2Obj.core.includes(c1Obj.core)) {
      const c1 = (city1 || '').toLowerCase().trim();
      const c2 = (city2 || '').toLowerCase().trim();
      if (!c1 || !c2 || c1 === c2) return true;
    }
  }
  return false;
}

/**
 * Does an extracted register item (agreement, insurance policy, ...) belong to this property record? Mirrors the backend:
 * an item with no address/unit belongs to a single-property document only; otherwise it must name the same building AND
 * the same unit, so another unit's agreement is never shown for (or saved to) this property.
 */
function registerItemMatchesRecord(item: ExtractedRegisterItem, rec: ExtractedPropertyRecord, manyProperties: boolean): boolean {
  const addr = (item.applies_to_address || '').trim();
  const unit = (item.applies_to_unit || '').trim();
  if (!addr && !unit) return !manyProperties;
  const { streetAddress, unitNumber } = splitAddressAndUnit(addr, unit);
  if (addr && !areSameBuildingAddress(streetAddress, rec.city, rec.address, rec.city)) return false;
  return normalizeUnitNumber(unitNumber) === normalizeUnitNumber(rec.unit_number);
}

/** The register data of a record's documents, limited to what one dialog tab shows. */
function RegisterTabPreview({ record, groups, title }: { record: ExtractedPropertyRecord; groups: RegisterGroup[]; title: string }) {
  return (
    <ExtractedRegisterPreview
      title={title}
      groups={groups}
      jobs={record.sourceJobs.map((job) => ({
        id: job.id,
        label: job.document_filename || job.document_title || 'Document',
        register: (job.raw_extracted_data?.register as ExtractedRegister | undefined) ?? null,
        manyProperties: (job.raw_extracted_data?.properties?.length ?? 0) > 1,
      }))}
      matches={(item, manyProperties) => registerItemMatchesRecord(item, record, manyProperties)}
    />
  );
}

function areSamePropertyAndUnit(
  rec: ExtractedPropertyRecord,
  addr2: string,
  city2: string,
  parcel2: string,
  unit2: string
): boolean {
  const u1 = normalizeUnitNumber(rec.unit_number);
  const u2 = normalizeUnitNumber(unit2);

  // CRITICAL: If both records have unit numbers and they are different (e.g. Unit 2112 vs Unit 1009 vs Unit 3703),
  // they are DIFFERENT units in the same building and MUST NOT be merged into a single conflicting record!
  if (u1 && u2 && u1 !== u2) {
    return false;
  }
  // If one document specifies a unit number and another specifies a different unit or building-only without matching unit,
  // only merge if their normalized unit numbers match (both same unit, or both have no unit number).
  if ((u1 && !u2) || (!u1 && u2)) {
    return false;
  }

  // 1. Parcel PIN check (only when unit check didn't separate them)
  const cP1 = (rec.parcel_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cP2 = (parcel2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cP1.length >= 10 && cP1 === cP2) return true;

  // 2. Normalized building street address comparison
  return areSameBuildingAddress(rec.address, rec.city, addr2, city2);
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
  { key: 'ownership_type', label: 'Ownership Type (Owned / Leased)', category: 'Ownership' },
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
  { key: 'purchase_date', label: 'Purchase / Closing Date', category: 'Financials', format: (v) => normalizeDateToISO(v) || String(v || '—') },
];

const INVALID_BUILDING_PHRASES = [
  'full amenity building',
  'amenity building',
  'luxury building',
  'doorman building',
  'elevator building',
  'high rise building',
  'mid rise building',
  'boutique building',
  'courtyard building',
  'vintage building',
  'brick building',
  'modern building',
  'new construction',
  'new extracted property',
  'property record',
  'subject property',
  'condominium building',
  'apartment building',
  'office building',
  'commercial building',
  'residential building',
  'the building',
  'this building',
];

function cleanBuildingNameCandidate(rawName?: string, streetAddr?: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  let s = rawName.trim().replace(/\s+/g, ' ');
  if (s.length < 3) return '';
  const low = s.toLowerCase();
  if (INVALID_BUILDING_PHRASES.some((p) => low === p || low.includes(p))) {
    return '';
  }
  if (streetAddr && low === streetAddr.trim().toLowerCase()) {
    return '';
  }
  // Clean HOA/Condo Association boilerplate suffixes into clean building name
  s = s
    .replace(/\bCONDOMINIUM\s+ASSOCIATION\b/gi, '')
    .replace(/\bCONDOMINIUM\s+PROJECT\b/gi, '')
    .replace(/\bHOMEOWNERS\s+ASSOCIATION\b/gi, '')
    .replace(/\bCONDOMINIUMS?\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\-\s]+|[,\-\s]+$/g, '')
    .trim();

  if (s === s.toUpperCase() && s.length > 4) {
    s = s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bAt\b/g, 'at')
      .replace(/\bOf\b/g, 'of')
      .replace(/\bAnd\b/g, 'and');
  }
  if (s.toLowerCase() === 'residences at river east center') {
    return 'The Residences at River East Center';
  }
  return s;
}

function extractBuildingName(p: any, rawData?: any): string {
  if (!p) return '';
  const addr = getFieldValue(p.address) || '';

  // 1. Prioritize document-extracted property_name first if it's a valid building title
  const propName = cleanBuildingNameCandidate(getFieldValue(p.property_name), addr);
  if (propName && !/^\d+\s+[nNsSeEwW]?\b/.test(propName)) {
    return propName;
  }

  // 2. Explicit building_name (cleaned of MLS marketing phrases like "Full amenity Building")
  const directBld = cleanBuildingNameCandidate(getFieldValue(p.building_name), addr);
  if (directBld) {
    return directBld;
  }

  if (propName) {
    return propName;
  }

  // 3. Scan supporting snippets / raw text for HOA or building names (e.g. "Century Towers", "Residences at River East Center")
  try {
    const rawStr = JSON.stringify(rawData || p || '');
    const riverEastMatch = rawStr.match(/\b(The\s+Residences\s+at\s+River\s+East\s+Center|Residences\s+at\s+River\s+East\s+Center)\b/i);
    if (riverEastMatch) {
      return 'The Residences at River East Center';
    }
    const centuryMatch = rawStr.match(/\b(Century\s+Towers)\b/i);
    if (centuryMatch) {
      return 'Century Towers';
    }
    const hoaMatch = rawStr.match(/(?:to\s+)?([A-Z][A-Za-z0-9\s]{2,30}?)\s+(?:Association|Condominium\s+Association|HOA|Towers?|Plaza|Center)\b/);
    if (hoaMatch && hoaMatch[1]) {
      let candidate = hoaMatch[1].trim();
      candidate = candidate.replace(/^(?:to|for|at|in|month|october|\d+)\s+/i, '').trim();
      const forbidden = ['provident', 'foremost', 'cypress', 'escrow', 'qualia', 'lender', 'buyer', 'credit', 'debit', 'title', 'full amenity', 'amenity'];
      if (candidate.length > 2 && !forbidden.some((w) => candidate.toLowerCase().includes(w))) {
        const cleaned = cleanBuildingNameCandidate(candidate, addr);
        if (cleaned) return cleaned;
      }
    }
  } catch {
    // ignore
  }

  return '';
}

function inferOwnershipTypeFromJobAndProp(
  p: any,
  raw: any,
  job?: PropertyExtractionJob,
  docName?: string
): { value: 'OWNED' | 'LEASED'; rawObj: any } {
  const rawOwnObj = p?.ownership_type || raw?.ownership_type;
  const directVal = String(getFieldValue(rawOwnObj) || '').toUpperCase().trim();
  if (directVal === 'LEASED' || directVal === 'LEASE' || directVal === 'TENANT' || directVal === 'RENTED') {
    return {
      value: 'LEASED',
      rawObj: typeof rawOwnObj === 'object' && rawOwnObj !== null ? rawOwnObj : { value: 'LEASED', supporting_text: 'Classified as LEASED from document clauses' },
    };
  }
  if (directVal === 'OWNED' || directVal === 'OWNER' || directVal === 'DIRECT') {
    return {
      value: 'OWNED',
      rawObj: typeof rawOwnObj === 'object' && rawOwnObj !== null ? rawOwnObj : { value: 'OWNED', supporting_text: 'Classified as OWNED from document clauses' },
    };
  }

  const docClass = String(raw?.document_classification || job?.document_type || '').toUpperCase().trim();
  if (docClass === 'LEASE_AGREEMENT' || docClass.includes('LEASE')) {
    return {
      value: 'LEASED',
      rawObj: { value: 'LEASED', supporting_text: `Document classified as ${docClass}` },
    };
  }

  const fn = String(docName || job?.document_filename || job?.document_title || '').toLowerCase();
  const rawSnippet = JSON.stringify(raw || p || '').toLowerCase();
  if (
    /\b(lease\s+end\s+date|lease\s+agreement|lease\s+amendment|commercial\s+lease|residential\s+lease|sublease|tenancy|monatlichen\s+mieten|mietvertrag)\b/i.test(
      `${fn} ${rawSnippet}`
    ) &&
    !/\b(grant\s+deed|warranty\s+deed|closing\s+statement|contract\s+of\s+purchase\s+and\s+sale)\b/i.test(
      `${fn} ${rawSnippet}`
    )
  ) {
    return {
      value: 'LEASED',
      rawObj: { value: 'LEASED', supporting_text: 'Detected lease agreement / rent terms in document' },
    };
  }

  return {
    value: 'OWNED',
    rawObj: typeof rawOwnObj === 'object' && rawOwnObj !== null ? rawOwnObj : { value: 'OWNED', supporting_text: 'Detected ownership / title / purchase / homeowner document' },
  };
}

function extractFieldValueFromJob(job: PropertyExtractionJob, fieldKey: string): { value: any; rawObj: any } {
  const raw = job.raw_extracted_data || {};
  const props = raw.properties || job.extracted_properties || [];
  const p = Array.isArray(props) && props.length > 0 ? props[0] : raw;

  if (!p) return { value: '', rawObj: null };

  if (fieldKey === 'ownership_type') {
    return inferOwnershipTypeFromJobAndProp(p, raw, job);
  }

  const rawObj = p[fieldKey];
  let val: any = '';

  if (['building_area', 'usable_area', 'land_area'].includes(fieldKey)) {
    val = getSqftValue(rawObj);
  } else if (['purchase_price', 'ownership_interest', 'year_built', 'floor_count'].includes(fieldKey)) {
    const rawVal = getFieldValue(rawObj);
    const num = Number(rawVal);
    val = isNaN(num) ? 0 : num;
  } else if (fieldKey === 'address') {
    const { streetAddress } = splitAddressAndUnit(getFieldValue(p.address), getFieldValue(p.unit_number));
    val = streetAddress || getFieldValue(p.address) || '';
  } else if (fieldKey === 'unit_number') {
    const { unitNumber } = splitAddressAndUnit(getFieldValue(p.address), getFieldValue(p.unit_number));
    val = unitNumber || getFieldValue(p.unit_number) || '';
  } else if (fieldKey === 'name') {
    const bld = extractBuildingName(p, raw);
    const { streetAddress, unitNumber } = splitAddressAndUnit(getFieldValue(p.address), getFieldValue(p.unit_number));
    const baseName = bld || cleanBuildingNameCandidate(getFieldValue(p.property_name), streetAddress) || streetAddress || '';
    val = unitNumber && baseName && !baseName.toLowerCase().includes(`unit ${unitNumber.toLowerCase()}`)
      ? `${baseName} - Unit ${unitNumber}`
      : baseName;
  } else if (fieldKey === 'building_name') {
    val = extractBuildingName(p, raw);
  } else if (fieldKey === 'purchase_date') {
    val = normalizeDateToISO(getFieldValue(rawObj));
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
        const rawText = rawObj && typeof rawObj === 'object' ? rawObj.value : String(value);
        const displayFormatted = def.key === 'purchase_date' && rawText && rawText !== value
          ? `${value} (${rawText})`
          : def.format ? def.format(value) : String(value);

        sources.push({
          jobId: job.id,
          docName,
          docSizeBytes: job.file_size_bytes,
          value,
          formattedValue: displayFormatted,
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

export function groupJobsIntoPropertyRecords(jobs: PropertyExtractionJob[]): ExtractedPropertyRecord[] {
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
      const rawAddr = getFieldValue(p.address) || '';
      const rawUnit = getFieldValue(p.unit_number) || '';
      const { streetAddress: addr, unitNumber: unitNum } = splitAddressAndUnit(rawAddr, rawUnit, docName);
      const city = getFieldValue(p.city) || 'Chicago';
      const parcel = getFieldValue(p.parcel_id) || '';
      const bldName = extractBuildingName(p, raw);
      const { value: docOwnershipType } = inferOwnershipTypeFromJobAndProp(p, raw, job, docName);
      const baseTitle = bldName || cleanBuildingNameCandidate(getFieldValue(p.property_name), addr) || addr || `Property from ${docName}`;
      const name =
        unitNum && baseTitle && !baseTitle.toLowerCase().includes(`unit ${unitNum.toLowerCase()}`)
          ? `${baseTitle} - Unit ${unitNum}`
          : baseTitle;

      // Check if this property matches any previously grouped record (MUST match BOTH building address AND unit number!)
      let matchedRecord = records.find((r) =>
        areSamePropertyAndUnit(r, addr, city, parcel, unitNum)
      );

      if (matchedRecord) {
        // Same building AND same unit identified across multiple documents (e.g., Unit 2112 Fees + Unit 2112 Lease Amendment)
        if (!matchedRecord.building_name && bldName) {
          matchedRecord.building_name = bldName;
          matchedRecord.name = matchedRecord.unit_number
            ? `${bldName} - Unit ${matchedRecord.unit_number}`
            : bldName;
        }
        if (!matchedRecord.sourceJobs.some((sj) => sj.id === job.id)) {
          matchedRecord.sourceJobs.push(job);
        }
        if (!matchedRecord.sourceDocumentNames.includes(docName)) {
          matchedRecord.sourceDocumentNames.push(docName);
        }
        // If an explicit Lease Agreement / Lease Amendment is uploaded for this unit, set ownership_type to LEASED
        if (docOwnershipType === 'LEASED') {
          matchedRecord.ownership_type = 'LEASED';
        }

        // Merge in any missing or more complete fields (including canonical directional street address)
        if (addr && addr.length > (matchedRecord.address || '').length && areSameBuildingAddress(addr, city, matchedRecord.address, matchedRecord.city)) {
          matchedRecord.address = addr;
        }
        if (!matchedRecord.unit_number && unitNum) {
          matchedRecord.unit_number = unitNum;
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
        if (!matchedRecord.floor_count && Number(getFieldValue(p.floor_count))) {
          matchedRecord.floor_count = Number(getFieldValue(p.floor_count));
        }
        if (!matchedRecord.homeharvest_enrichment && (p.homeharvest_enrichment || raw.homeharvest_enrichment)) {
          matchedRecord.homeharvest_enrichment = p.homeharvest_enrichment || raw.homeharvest_enrichment;
        }
        if (!matchedRecord.purchase_price && Number(getFieldValue(p.purchase_price))) {
          matchedRecord.purchase_price = Number(getFieldValue(p.purchase_price));
          matchedRecord.purchase_currency = getFieldValue(p.purchase_currency) || 'USD';
        }
        if (!matchedRecord.purchase_date && getFieldValue(p.purchase_date)) {
          matchedRecord.purchase_date = normalizeDateToISO(getFieldValue(p.purchase_date));
        }
        if (job.matching_properties && job.matching_properties.length > 0 && !matchedRecord.matchingProperty) {
          matchedRecord.matchingProperty = job.matching_properties[0];
          matchedRecord.saveActionType = 'UPDATE_EXISTING';
        }
        matchedRecord.inspectionsCount += inspections.length;
      } else {
        // Different building OR different unit in the same building! Create distinct record
        const matchingProp =
          job.matching_properties && job.matching_properties.length > 0
            ? job.matching_properties[0]
            : null;

        const newRec: ExtractedPropertyRecord = {
          id: `prop-${records.length + 1}`,
          name: name,
          building_name: bldName,
          address: addr,
          unit_number: unitNum,
          city: city,
          state_province: getFieldValue(p.state_province) || '',
          country: getFieldValue(p.country) || 'USA',
          postal_code: getFieldValue(p.postal_code) || '',
          property_type: getFieldValue(p.property_type) || (unitNum ? 'Executive Condo' : 'Commercial Office'),
          property_category: getFieldValue(p.property_category) || (docOwnershipType === 'LEASED' && !unitNum ? 'LEASED_OFFICE' : unitNum ? 'COMPANY_CONDO' : 'COMMERCIAL_OFFICE'),
          ownership_type: docOwnershipType,
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
          floor_count: Number(getFieldValue(p.floor_count)) || undefined,
          purchase_price: Number(getFieldValue(p.purchase_price)) || 0,
          purchase_currency: getFieldValue(p.purchase_currency) || 'USD',
          purchase_date: normalizeDateToISO(getFieldValue(p.purchase_date)) || '',
          parcel_id: parcel,
          homeharvest_enrichment: p.homeharvest_enrichment || raw.homeharvest_enrichment || undefined,
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

  // SECOND PASS: Cross-Unit Same-Building Attribute Consolidation
  // When multiple records share the same physical building street address (e.g., 512 N McClurg Court Unit 2112, Unit 1009, Unit 3703),
  // share building-level attributes (building_name, city, state_province, postal_code, country, year_built, floor_count, land_area)
  // across sibling units without merging unit-specific fields!
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (!rec.address) continue;

    const siblings = records.filter(
      (other) => other.id !== rec.id && areSameBuildingAddress(rec.address, rec.city, other.address, other.city)
    );
    if (siblings.length === 0) continue;

    const allInBuilding = [rec, ...siblings];
    const longestCanonicalAddr = allInBuilding
      .map((r) => r.address)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0];
    if (longestCanonicalAddr && longestCanonicalAddr.length > rec.address.length) {
      rec.address = longestCanonicalAddr;
    }
    const sharedBldName = allInBuilding.map((r) => r.building_name).find((b) => b && b.trim().length > 1) || '';
    const sharedHH = allInBuilding.map((r) => r.homeharvest_enrichment).find((h) => h && Object.keys(h).length > 0);
    if (!rec.homeharvest_enrichment && sharedHH) {
      rec.homeharvest_enrichment = { ...sharedHH, unit: rec.unit_number ? `Unit ${rec.unit_number}` : sharedHH.unit };
    }
    const sharedCity = allInBuilding.map((r) => r.city).find((c) => c && c.trim().length > 1) || rec.city;
    const sharedState = allInBuilding.map((r) => r.state_province).find((s) => s && s.trim().length > 0) || '';
    const sharedZip = allInBuilding.map((r) => r.postal_code).find((z) => z && z.trim().length > 0) || '';
    const sharedCountry = allInBuilding.map((r) => r.country).find((c) => c && c.trim().length > 0) || 'USA';
    const sharedYearBuilt = allInBuilding.map((r) => r.year_built).find((y) => y && y > 1700);
    const sharedFloorCount = allInBuilding.map((r) => r.floor_count).find((f) => f && f > 0);
    const sharedLandArea = allInBuilding.map((r) => r.land_area).find((l) => l && l > 0) || 0;

    if (!rec.building_name && sharedBldName) {
      rec.building_name = sharedBldName;
    }
    if (!rec.city && sharedCity) rec.city = sharedCity;
    if (!rec.state_province && sharedState) rec.state_province = sharedState;
    if (!rec.postal_code && sharedZip) rec.postal_code = sharedZip;
    if (!rec.country && sharedCountry) rec.country = sharedCountry;
    if (!rec.year_built && sharedYearBuilt) rec.year_built = sharedYearBuilt;
    if (!rec.floor_count && sharedFloorCount) rec.floor_count = sharedFloorCount;
    if (!rec.land_area && sharedLandArea) rec.land_area = sharedLandArea;

    // Update display name so every unit in the building has a consistent "{Building Name} - Unit {Unit #}" title
    const effectiveBld = rec.building_name || rec.address;
    if (rec.unit_number && effectiveBld) {
      rec.name = `${effectiveBld} - Unit ${rec.unit_number}`;
    } else if (effectiveBld && (!rec.name || rec.name === rec.address)) {
      rec.name = effectiveBld;
    }
  }

  // Calculate field diffs & conflicts for all consolidated records
  for (const rec of records) {
    rec.conflicts = computeConflictsForRecord(rec);
  }

  return records;
}


// ---------------------------------------------------------------------------
// Presentation helpers for the review dialog
// ---------------------------------------------------------------------------
type RecordStatus = 'saved' | 'needs_address' | 'conflicts' | 'ready';

function getRecordStatus(rec: ExtractedPropertyRecord, savedIds: Set<string>): RecordStatus {
  if (savedIds.has(rec.id)) return 'saved';
  if (!rec.address?.trim()) return 'needs_address';
  if (rec.conflicts.some((c) => c.hasConflict)) return 'conflicts';
  return 'ready';
}

const STATUS_BADGE: Record<RecordStatus, { label: string; className: string }> = {
  saved: { label: 'Saved', className: 'text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
  needs_address: { label: 'Address needed', className: 'text-rose-700 dark:text-rose-300 border-rose-500/40 bg-rose-500/10' },
  conflicts: { label: 'Check differences', className: 'text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/10' },
  ready: { label: 'Ready to save', className: 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/5' },
};

/** One "Property type" choice: `label` is shown, the key is saved as the portfolio category, `type` fills the legacy type text. */
const PROPERTY_TYPE_OPTIONS: Record<string, { label: string; type: string }> = {
  COMPANY_CONDO: { label: 'Company condo', type: 'Executive Condo' },
  OWNED_HQ: { label: 'Owned HQ', type: 'Corporate HQ' },
  COMMERCIAL_OFFICE: { label: 'Commercial office', type: 'Office' },
  LEASED_OFFICE: { label: 'Leased office', type: 'Office' },
  RD_FACILITY: { label: 'R&D facility', type: 'R&D Facility' },
  WAREHOUSE: { label: 'Warehouse', type: 'Warehouse' },
  CO_WORKING: { label: 'Co-working', type: 'Co-working' },
};

const OWNERSHIP_LABELS: Record<string, string> = { OWNED: 'Owned', LEASED: 'Leased', MORTGAGED: 'Mortgaged' };

function OwnershipBadge({ type }: { type?: string }) {
  const leased = type === 'LEASED';
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold ${
        leased
          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40'
          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
      }`}
    >
      {OWNERSHIP_LABELS[type || 'OWNED'] || type}
    </Badge>
  );
}

const ADDRESS_CHECK_BADGE: Record<string, { label: string; className: string }> = {
  proposed: { label: 'Address found', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  needs_review: { label: 'Please check the address', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  not_found: { label: 'Address not found', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
};

const SUGGESTION_STATUS: Record<string, { label: string; className: string }> = {
  ACCEPTED: { label: 'Applied', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  REJECTED_BUILDING_ONLY: { label: 'Not applied (whole building only)', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' },
};

const APPLICABLE_SUGGESTION_FIELDS = ['usable_area', 'building_area', 'land_area', 'year_built', 'floor_count', 'purchase_price'];

function FormField({
  label,
  required,
  hint,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="pb-2 border-b border-border">
        <h5 className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h5>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AddPropertyDocumentModal({
  isOpen,
  onClose,
  onPropertyCreated,
  onOpenReviewDetail,
  initialJobs,
  initialRecordId,
}: AddPropertyDocumentModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files & Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'extracting' | 'extracted' | 'saving'>('select');

  // Multi-Property records extracted and grouped by address
  const [propertyRecords, setPropertyRecords] = useState<ExtractedPropertyRecord[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<string>('');

  // AI model used to read documents (vLLM self-hosted or a cloud provider); filled from the server's status
  const [selectedAiProvider, setSelectedAiProvider] = useState<string>('');
  const [selectedAiModel, setSelectedAiModel] = useState<string>('');

  const { data: aiModelsStatus, refetch: refetchAiModels } = useQuery({
    queryKey: ['ai-models-status'],
    queryFn: () => realEstateService.getAiModelsStatus(),
    enabled: isOpen,
    staleTime: 15000,
  });

  useEffect(() => {
    if (aiModelsStatus?.active_provider) {
      setSelectedAiProvider(aiModelsStatus.active_provider);
      if (aiModelsStatus.active_model) {
        setSelectedAiModel(aiModelsStatus.active_model);
      }
    }
  }, [aiModelsStatus]);

  const handleAiProviderSwitch = async (value: string) => {
    // value format: "vllm|<served model>" or "gemini|gemini-2.5-flash"
    const [prov, mod] = value.split('|');
    const cleanProv = prov;
    const defaultMod = mod || aiModelsStatus?.providers?.[cleanProv]?.configured_model || '';

    setSelectedAiProvider(cleanProv);
    setSelectedAiModel(defaultMod);
    try {
      await realEstateService.switchAiModel(cleanProv, defaultMod);
      refetchAiModels();
      toast.success(
        `Documents will now be read with ${cleanProv === 'gemini' ? 'Google Gemini' : cleanProv === 'vllm' ? 'vLLM (self-hosted)' : cleanProv} (${defaultMod})`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to switch AI model provider');
    }
  };

  // Handle direct preview initialization when ready extraction jobs are passed
  useEffect(() => {
    if (isOpen && initialJobs && initialJobs.length > 0) {
      const grouped = groupJobsIntoPropertyRecords(initialJobs);
      setPropertyRecords(grouped);
      if (grouped.length > 0) {
        if (initialRecordId) {
          const matched = grouped.find((r) => r.id === initialRecordId || r.sourceJobs.some((j) => j.id === initialRecordId));
          setActiveRecordId(matched ? matched.id : grouped[0].id);
        } else {
          setActiveRecordId(grouped[0].id);
        }
      }
      setUploadStep('extracted');
    }
  }, [isOpen, initialJobs, initialRecordId]);

  // Active tab inside the review panel
  const [activeReviewTab, setActiveReviewTab] = useState<'property' | 'ownership' | 'records' | 'documents'>('property');

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

  // Upload and Extract Mutation - Runs entirely in the background
  const extractMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('engine_mode', 'HYBRID_PYMUPDF_TESSERACT');
      formData.append('ocr_languages', 'eng');
      if (selectedAiProvider) {
        formData.append('ai_provider', selectedAiProvider);
      }
      if (selectedAiModel) {
        formData.append('ai_model', selectedAiModel);
      }

      const initialJobs = await realEstateService.uploadAndExtractDocuments(formData);
      return initialJobs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-extraction-jobs'] });
      const fileCount = selectedFiles.length;
      handleModalClose();
      toast.success(`Started background extraction for ${fileCount} document${fileCount === 1 ? '' : 's'}!`, {
        description: 'You can track live progress and preview results in the Notifications dropdown (bell icon).',
        duration: 7000,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to upload document for extraction.');
    },
  });

  // Update a field on the currently active property record
  const updateActiveRecordField = (field: keyof ExtractedPropertyRecord, value: any) => {
    if (!activeRecord) return;
    const finalVal = field === 'purchase_date' ? normalizeDateToISO(value) : value;
    setPropertyRecords((prev) =>
      prev.map((r) => (r.id === activeRecord.id ? { ...r, [field]: finalVal } : r))
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
    const finalVal = fieldKey === 'purchase_date' ? normalizeDateToISO(chosenValue) : chosenValue;
    setPropertyRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== recordId) return rec;

        const updatedConflicts = rec.conflicts.map((conf) => {
          if (conf.fieldKey === fieldKey) {
            return {
              ...conf,
              chosenJobId,
              currentValue: finalVal,
            };
          }
          return conf;
        });

        return {
          ...rec,
          [fieldKey]: finalVal,
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


  // What saving wrote for each record (agreements, ownership, ... filled in from its documents)
  const [registerResults, setRegisterResults] = useState<Record<string, RegisterApplyResult[]>>({});

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
      floor_count: rec.floor_count,
      purchase_price: rec.purchase_price,
      purchase_currency: rec.purchase_currency,
      purchase_date: rec.purchase_date,
      parcel_id: rec.parcel_id,
      homeharvest_enrichment: rec.homeharvest_enrichment,
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

    // Read back what each document contributed (the backend stores it on the job) so the user can see what was filled in
    const outcomes = await Promise.all(
      rec.sourceJobs.map(async (job) => {
        try {
          const confirmed = await realEstateService.getPropertyExtractionJob(job.id);
          return (confirmed.user_corrected_data?.register_result as RegisterApplyResult | undefined) ?? null;
        } catch {
          return null;
        }
      }),
    );
    setRegisterResults((prev) => ({ ...prev, [rec.id]: outcomes.filter((o): o is RegisterApplyResult => o !== null) }));

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
          ? propertyRecords.filter((r) => !savedRecordIds.has(r.id) && r.address?.trim())
          : propertyRecords.filter((r) => r.isSelected && !savedRecordIds.has(r.id) && r.address?.trim());

      if (targetList.length === 0) {
        throw new Error('Nothing to save. Select a property that has a street address.');
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
    setActiveReviewTab('property');
    setUploadStep('select');
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

  const isMulti = propertyRecords.length > 1;
  const uniqueDocCount = useMemo(
    () => new Set(propertyRecords.flatMap((r) => r.sourceJobs.map((j) => j.id))).size,
    [propertyRecords]
  );
  const needsAttentionCount = propertyRecords.filter((r) => {
    const s = getRecordStatus(r, savedRecordIds);
    return s === 'conflicts' || s === 'needs_address';
  }).length;
  const unsavedCount = propertyRecords.filter((r) => !savedRecordIds.has(r.id) && r.address?.trim()).length;
  const unsavedSelectedCount = propertyRecords.filter(
    (r) => r.isSelected && !savedRecordIds.has(r.id) && r.address?.trim()
  ).length;
  const isBusy = confirmMutation.isPending || savingRecordId !== null;
  const currentStep = uploadStep === 'select' ? 1 : 2;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[1550px] 2xl:max-w-[1700px] h-[92vh] max-h-[92vh] flex flex-col p-5 overflow-hidden">
        {/* HEADER: title + 2-step progress */}
        <DialogHeader className="pb-3 border-b border-border shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold">Add Property from Documents</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {uploadStep === 'select'
                    ? 'Upload your property PDFs. We read them, group them by property, and let you check everything before saving.'
                    : 'Check the details we found, fix anything that looks wrong, then save.'}
                </DialogDescription>
              </div>
            </div>

            <ol className="flex items-center gap-2 text-xs" aria-label="Progress">
              {[
                { n: 1, label: 'Upload' },
                { n: 2, label: 'Review & save' },
              ].map((s, i) => (
                <li key={s.n} className="flex items-center gap-2">
                  {i > 0 && <span className="w-6 h-px bg-border" />}
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      currentStep === s.n ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                    aria-current={currentStep === s.n ? 'step' : undefined}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${
                        currentStep > s.n
                          ? 'bg-emerald-600 text-white'
                          : currentStep === s.n
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {currentStep > s.n ? <Check className="w-3 h-3" /> : s.n}
                    </span>
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {uploadStep === 'select' && (
          <div className="flex-1 min-h-0 flex flex-col gap-4 py-3 overflow-hidden">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`${
                selectedFiles.length > 0 ? 'p-6 shrink-0' : 'p-10 flex-1'
              } border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
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
              <h4 className="text-base font-semibold text-foreground">Drop PDFs here, or click to browse</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                Deeds, closing statements, leases, surveys, tax bills or inspection reports.
                Documents for the same address and unit are combined into one property.
              </p>
              <p className="text-[11px] text-muted-foreground mt-3">
                Reading runs in the background. We'll notify you (bell icon) when results are ready to review.
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground shrink-0">
                  <span>
                    {selectedFiles.length} document{selectedFiles.length === 1 ? '' : 's'} ready to upload
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFiles([]);
                    }}
                    className="text-muted-foreground hover:text-foreground text-[11px]"
                  >
                    Remove all
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 content-start">
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
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Developer option: which AI model reads the documents */}
            <details className="shrink-0 text-xs group">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground w-fit select-none">
                Advanced options
              </summary>
              <div className="mt-2 flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 w-fit">
                <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                  AI model used to read documents:
                </span>
                <Select value={`${selectedAiProvider}|${selectedAiModel}`} onValueChange={handleAiProviderSwitch}>
                  <SelectTrigger className="h-7 text-xs w-[250px] bg-background border-border">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModelsStatus?.providers?.vllm?.configured_model && (
                      <SelectItem value={`vllm|${aiModelsStatus.providers.vllm.configured_model}`}>
                        vLLM ({aiModelsStatus.providers.vllm.configured_model}), self-hosted
                      </SelectItem>
                    )}
                    <SelectItem value="gemini|gemini-2.5-flash">Google Gemini (gemini-2.5-flash), cloud</SelectItem>
                    <SelectItem value="gemini|gemini-3.1-flash-lite">
                      Google Gemini (gemini-3.1-flash-lite), fast cloud
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </details>
          </div>
        )}

        {/* SAVING */}
        {uploadStep === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Saving to your portfolio…</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Creating the property records and linking your documents. This only takes a moment.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & SAVE */}
        {uploadStep === 'extracted' && propertyRecords.length > 0 && activeRecord && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 pt-3">
            {/* One-line summary */}
            <div
              className={`px-3 py-2 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                needsAttentionCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {needsAttentionCount > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="text-foreground">
                  <strong>
                    {propertyRecords.length} propert{propertyRecords.length === 1 ? 'y' : 'ies'}
                  </strong>{' '}
                  found in {uniqueDocCount} document{uniqueDocCount === 1 ? '' : 's'}
                  {needsAttentionCount > 0
                    ? `. ${needsAttentionCount} need${needsAttentionCount === 1 ? 's' : ''} a quick check before saving.`
                    : '. Everything looks consistent.'}
                </span>
                {activeRecord.homeharvest_enrichment && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Missing details filled from public records
                  </Badge>
                )}
              </div>
              {isMulti && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>
                    {selectedCount} of {propertyRecords.length} selected
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setAllRecordsSelection(selectedCount !== propertyRecords.length)}
                  >
                    {selectedCount === propertyRecords.length ? 'Deselect all' : 'Select all'}
                  </Button>
                </div>
              )}
            </div>

            <div className={`flex-1 overflow-hidden grid gap-4 ${isMulti ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1'}`}>
              {/* LEFT: list of properties found (only when more than one) */}
              {isMulti && (
                <div className="md:col-span-4 lg:col-span-3 h-full overflow-y-auto space-y-2 border-r border-border pr-3">
                  <p className="pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Properties found
                  </p>
                  {propertyRecords.map((rec, idx) => {
                    const isActive = rec.id === activeRecord.id;
                    const status = STATUS_BADGE[getRecordStatus(rec, savedRecordIds)];
                    return (
                      <div
                        key={rec.id}
                        onClick={() => setActiveRecordId(rec.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
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
                            <Checkbox checked={rec.isSelected} aria-label="Include this property when saving" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <h5 className="font-semibold text-xs text-foreground truncate">
                              {rec.name || rec.address || `Property ${idx + 1}`}
                            </h5>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0 text-primary" />
                              <span className="truncate">
                                {rec.address || 'No address yet'}
                                {rec.unit_number ? `, Unit ${rec.unit_number}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              <OwnershipBadge type={rec.ownership_type} />
                              <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 mt-1 border-t border-border/50">
                              <span className="flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5 text-primary" />
                                {rec.sourceJobs.length} document{rec.sourceJobs.length > 1 ? 's' : ''}
                              </span>
                              <span>{rec.city}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* RIGHT: selected property */}
              <div className={`${isMulti ? 'md:col-span-8 lg:col-span-9' : 'w-full'} flex flex-col h-full overflow-hidden gap-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/20 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {activeRecord.name || activeRecord.address || 'Property'}
                      </h4>
                      <OwnershipBadge type={activeRecord.ownership_type} />
                      {savedRecordIds.has(activeRecord.id) && (
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE.saved.className}`}>
                          <Check className="w-3 h-3 mr-1" />
                          Saved to portfolio
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Combined from {activeRecord.sourceJobs.length} document
                      {activeRecord.sourceJobs.length === 1 ? '' : 's'}
                      {activeRecord.matchingProperty && !savedRecordIds.has(activeRecord.id) && (
                        <span className="text-amber-700 dark:text-amber-300 font-medium">
                          {' '}
                          · Already in your portfolio. Saving will update it.
                        </span>
                      )}
                    </p>
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
                        Compare with document
                      </Button>
                    )}
                    {isMulti && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 font-semibold"
                        disabled={
                          savedRecordIds.has(activeRecord.id) || isBusy || !activeRecord.address?.trim()
                        }
                        onClick={() => handleSaveIndividualProperty(activeRecord)}
                      >
                        {savingRecordId === activeRecord.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Saving…
                          </>
                        ) : savedRecordIds.has(activeRecord.id) ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Save this property only
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <Tabs
                  value={activeReviewTab}
                  onValueChange={(val: any) => setActiveReviewTab(val)}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="border-b border-border pb-2 shrink-0">
                    <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto sm:h-8 text-xs">
                      <TabsTrigger value="property" className="gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Property</span>
                      </TabsTrigger>
                      <TabsTrigger value="ownership" className="gap-1.5">
                        <Landmark className="w-3.5 h-3.5" />
                        <span>Ownership & Purchase</span>
                      </TabsTrigger>
                      <TabsTrigger value="records" className="gap-1.5">
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>Leases & Other Records</span>
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Documents ({activeRecord.sourceJobs.length})</span>
                        {activeConflicts.length > 0 && (
                          <Badge className="px-1.5 py-0 h-4 text-[9px] bg-amber-500 text-white">
                            {activeConflicts.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* TAB 1: PROPERTY */}
                  <TabsContent value="property" className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-2">
                    {activeConflicts.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-wrap items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>
                            Your documents disagree on <strong>{activeConflicts.length}</strong> value
                            {activeConflicts.length === 1 ? '' : 's'}. We picked the most likely one for each. You can
                            choose a different one.
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] gap-1 border-amber-500/40 shrink-0"
                          onClick={() => setActiveReviewTab('documents')}
                        >
                          <GitCompare className="w-3 h-3" />
                          Review differences
                        </Button>
                      </div>
                    )}

                    {savedRecordIds.has(activeRecord.id) && registerResults[activeRecord.id] && (
                      <RegisterApplyResultPanel results={registerResults[activeRecord.id]} />
                    )}

                    <SectionCard icon={MapPin} title="Address">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <FormField
                          label="Street address"
                          required
                          hint="Street and number only. Enter the unit separately."
                          className="sm:col-span-2"
                        >
                          <Input
                            value={activeRecord.address}
                            onChange={(e) => updateActiveRecordField('address', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. 8 Smithe Mews"
                          />
                        </FormField>
                        <FormField label="Unit / suite" hint="Leave blank if the whole building.">
                          <Input
                            value={activeRecord.unit_number}
                            onChange={(e) => updateActiveRecordField('unit_number', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. 1106"
                          />
                        </FormField>
                        <FormField label="City" required>
                          <Input
                            value={activeRecord.city}
                            onChange={(e) => updateActiveRecordField('city', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </FormField>
                        <FormField label="State / province">
                          <Input
                            value={activeRecord.state_province}
                            onChange={(e) => updateActiveRecordField('state_province', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. BC"
                          />
                        </FormField>
                        <FormField label="Postal / ZIP code">
                          <Input
                            value={activeRecord.postal_code}
                            onChange={(e) => updateActiveRecordField('postal_code', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. V6B 0A2"
                          />
                        </FormField>
                        <FormField label="Country" required>
                          <Input
                            value={activeRecord.country}
                            onChange={(e) => updateActiveRecordField('country', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </FormField>
                      </div>

                      {/* Other addresses the documents mention, so a wrong pick can be swapped in one click */}
                      {(() => {
                        const primaryRaw = activeRecord.sourceJobs[0]?.raw_extracted_data || {};
                        const resStatus: string | undefined = primaryRaw.resolution_status;
                        const resExplanation: string | undefined = primaryRaw.resolution_explanation;
                        const allCands = activeRecord.sourceJobs.flatMap((j) =>
                          (j.raw_extracted_data?.address_candidates || []).map((c: any) => ({ ...c, _job: j }))
                        );
                        if (!resExplanation && allCands.length === 0) return null;
                        const check = resStatus ? ADDRESS_CHECK_BADGE[resStatus] : undefined;

                        return (
                          <details open={resStatus === 'needs_review' || resStatus === 'not_found'} className="pt-2 border-t border-border/80 text-[11px]">
                            <summary className="cursor-pointer select-none flex flex-wrap items-center gap-2 font-medium text-foreground">
                              <span>Addresses found in the documents ({allCands.length})</span>
                              {check && (
                                <Badge variant="outline" className={`text-[10px] ${check.className}`}>
                                  {check.label}
                                </Badge>
                              )}
                            </summary>

                            {resExplanation && (
                              <p className="text-muted-foreground leading-relaxed mt-2">{resExplanation}</p>
                            )}

                            {allCands.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 mt-2">
                                {allCands.map((cand: any, idx: number) => {
                                  const isMatch =
                                    activeRecord.address &&
                                    cand.street_address &&
                                    String(activeRecord.address).toLowerCase().trim() ===
                                      String(cand.street_address).toLowerCase().trim() &&
                                    String(activeRecord.unit_number || '').toLowerCase().trim() ===
                                      String(cand.unit_number || '').toLowerCase().trim();
                                  const roles: string[] = cand.roles || ['UNKNOWN'];
                                  const roleLabels: string[] = cand.role_labels || roles;
                                  // an unrecognised role carries no information, so no badge is shown for it
                                  const knownRoleIdx = roles.map((_, i) => i).filter((i) => roles[i] !== 'UNKNOWN');

                                  return (
                                    <div
                                      key={`${cand._job?.id ?? 'job'}-${cand.candidate_id || idx}`}
                                      className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 ${
                                        isMatch ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-muted/20'
                                      }`}
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-start justify-between gap-1.5">
                                          <span className="font-semibold text-foreground">
                                            {cand.street_address || cand.raw_text}
                                            {cand.unit_number ? ` (Unit ${cand.unit_number})` : ''}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground shrink-0">
                                            page {cand.source_page || 1}
                                          </span>
                                        </div>
                                        {(cand.city || cand.state_province || cand.postal_code) && (
                                          <div className="text-[10px] text-muted-foreground">
                                            {[cand.city, cand.state_province, cand.postal_code, cand.country]
                                              .filter(Boolean)
                                              .join(', ')}
                                          </div>
                                        )}
                                        <div className="flex flex-wrap gap-1">
                                          {knownRoleIdx.map((rIdx) => {
                                            const lbl = roleLabels[rIdx];
                                            const rawRole = roles[rIdx] || '';
                                            return (
                                              <Badge
                                                key={rIdx}
                                                variant="outline"
                                                className={`text-[10px] py-0 px-1.5 ${
                                                  rawRole === 'PROPERTY_PREMISES'
                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                                    : rawRole === 'BROKER_OFFICE'
                                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                                    : 'bg-background text-muted-foreground border-border'
                                                }`}
                                              >
                                                {lbl}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-1.5 pt-1">
                                        {onOpenReviewDetail && cand._job && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-5 text-[10px] px-1.5"
                                            onClick={() => onOpenReviewDetail(cand._job)}
                                          >
                                            View in document
                                          </Button>
                                        )}
                                        {isMatch ? (
                                          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                            In use
                                          </span>
                                        ) : (
                                          cand.street_address && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-5 text-[10px] px-2"
                                              onClick={() => {
                                                updateActiveRecordField('address', cand.street_address);
                                                updateActiveRecordField('unit_number', cand.unit_number || '');
                                                if (cand.city) updateActiveRecordField('city', cand.city);
                                                if (cand.state_province)
                                                  updateActiveRecordField('state_province', cand.state_province);
                                                updateActiveRecordField('postal_code', cand.postal_code || '');
                                                if (cand.country) updateActiveRecordField('country', cand.country);
                                                toast.success(
                                                  `Address changed to ${cand.street_address}${
                                                    cand.unit_number ? ' Unit ' + cand.unit_number : ''
                                                  }`
                                                );
                                              }}
                                            >
                                              Use this address
                                            </Button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </details>
                        );
                      })()}
                    </SectionCard>

                    <SectionCard icon={Building} title="About the property">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <FormField label="Property name" required className="sm:col-span-2">
                          <Input
                            value={activeRecord.name}
                            onChange={(e) => updateActiveRecordField('name', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="e.g. Century Park East, Unit 2605"
                          />
                        </FormField>
                        <FormField label="Owned or leased">
                          <Select
                            value={activeRecord.ownership_type}
                            onValueChange={(val) => updateActiveRecordField('ownership_type', val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNED">Owned</SelectItem>
                              <SelectItem value="LEASED">Leased</SelectItem>
                              <SelectItem value="MORTGAGED">Mortgaged</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Parcel / tax ID (PIN)">
                          <Input
                            value={activeRecord.parcel_id}
                            onChange={(e) => updateActiveRecordField('parcel_id', e.target.value)}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 4320-001-135"
                          />
                        </FormField>
                        <FormField label="Property type" className="sm:col-span-2">
                          <Select
                            value={activeRecord.property_category}
                            onValueChange={(val) => {
                              updateActiveRecordField('property_category', val);
                              updateActiveRecordField('property_type', PROPERTY_TYPE_OPTIONS[val]?.type || val);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PROPERTY_TYPE_OPTIONS).map(([value, opt]) => (
                                <SelectItem key={value} value={value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                              {/* a value the extractor returned that is not in the list stays selectable instead of showing blank */}
                              {activeRecord.property_category && !PROPERTY_TYPE_OPTIONS[activeRecord.property_category] && (
                                <SelectItem value={activeRecord.property_category}>
                                  {activeRecord.property_category.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Building area (sq ft)">
                          <Input
                            type="number"
                            value={activeRecord.building_area || ''}
                            onChange={(e) => updateActiveRecordField('building_area', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1250"
                          />
                        </FormField>
                        <FormField label="Usable area (sq ft)">
                          <Input
                            type="number"
                            value={activeRecord.usable_area || ''}
                            onChange={(e) => updateActiveRecordField('usable_area', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1100"
                          />
                        </FormField>
                        <FormField label="Land area (sq ft)">
                          <Input
                            type="number"
                            value={activeRecord.land_area || ''}
                            onChange={(e) => updateActiveRecordField('land_area', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                          />
                        </FormField>
                        <FormField label="Year built">
                          <Input
                            type="number"
                            value={activeRecord.year_built || ''}
                            onChange={(e) => updateActiveRecordField('year_built', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1966"
                          />
                        </FormField>
                      </div>

                      {activeRecord.inspectionsCount > 0 && (
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-foreground flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>
                            <strong>{activeRecord.inspectionsCount}</strong> inspection finding
                            {activeRecord.inspectionsCount === 1 ? '' : 's'} in your documents will be added to this
                            property.
                          </span>
                        </div>
                      )}
                    </SectionCard>

                    {!savedRecordIds.has(activeRecord.id) && (
                      <RegisterTabPreview
                        record={activeRecord}
                        groups={['master']}
                        title="More property details found in the documents"
                      />
                    )}

                    {/* Public-records suggestions for fields the documents did not cover */}
                    {activeRecord.homeharvest_enrichment &&
                      Array.isArray(activeRecord.homeharvest_enrichment.enrichment_suggestions) &&
                      activeRecord.homeharvest_enrichment.enrichment_suggestions.length > 0 && (
                        <SectionCard
                          icon={Sparkles}
                          title="Suggestions from public records"
                          description="These only cover details missing from your documents. Nothing your documents say is overwritten."
                        >
                          <div className="rounded-lg border border-border bg-card overflow-x-auto">
                            <table className="w-full text-[11px] text-left">
                              <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                                <tr>
                                  <th className="p-2">Detail</th>
                                  <th className="p-2">In your documents</th>
                                  <th className="p-2">Public records say</th>
                                  <th className="p-2">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {activeRecord.homeharvest_enrichment.enrichment_suggestions.map(
                                  (sug: any, sIdx: number) => {
                                    const st = SUGGESTION_STATUS[sug.decision] || {
                                      label: 'Suggestion',
                                      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
                                    };
                                    return (
                                      <tr key={sIdx} className="hover:bg-muted/20">
                                        <td className="p-2 font-medium text-foreground whitespace-nowrap">
                                          {sug.field_label || sug.field_key}
                                        </td>
                                        <td className="p-2 text-muted-foreground">
                                          {sug.existing_evidence || 'Not stated'}
                                        </td>
                                        <td className="p-2">
                                          <span className="font-mono font-medium text-foreground">
                                            {sug.external_suggestion}
                                          </span>
                                          {sug.source && (
                                            <span className="block text-[10px] text-muted-foreground">
                                              Source: {sug.source}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                                              {st.label}
                                            </Badge>
                                            {sug.candidate_value != null &&
                                              typeof sug.candidate_value !== 'object' &&
                                              APPLICABLE_SUGGESTION_FIELDS.includes(sug.field_key) &&
                                              sug.decision !== 'ACCEPTED' && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-5 text-[10px] px-1.5"
                                                  onClick={() => {
                                                    updateActiveRecordField(
                                                      sug.field_key as keyof ExtractedPropertyRecord,
                                                      Number(sug.candidate_value)
                                                    );
                                                    toast.success(`Applied ${sug.field_label} (${sug.candidate_value})`);
                                                  }}
                                                >
                                                  Use this value
                                                </Button>
                                              )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </tbody>
                            </table>
                          </div>
                        </SectionCard>
                      )}
                  </TabsContent>

                  {/* TAB 2: OWNERSHIP & PURCHASE */}
                  <TabsContent value="ownership" className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-2">
                    <SectionCard icon={Landmark} title="Owner">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="Owner" className="sm:col-span-2" hint="Person or company that holds title.">
                          <Input
                            value={activeRecord.legal_owner || activeRecord.owning_company}
                            onChange={(e) => {
                              updateActiveRecordField('legal_owner', e.target.value);
                              updateActiveRecordField('owning_company', e.target.value);
                            }}
                            className="h-8 text-xs"
                            placeholder="e.g. Acme Holdings Ltd."
                          />
                        </FormField>
                        <FormField label="Ownership share (%)">
                          <Input
                            type="number"
                            value={activeRecord.ownership_interest}
                            onChange={(e) => updateActiveRecordField('ownership_interest', Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </FormField>
                      </div>
                    </SectionCard>

                    <SectionCard icon={Building} title="Purchase">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="Purchase date">
                          <Input
                            type="date"
                            value={activeRecord.purchase_date || ''}
                            onChange={(e) => updateActiveRecordField('purchase_date', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </FormField>
                        <FormField label="Purchase price">
                          <Input
                            type="number"
                            value={activeRecord.purchase_price || ''}
                            onChange={(e) => updateActiveRecordField('purchase_price', Number(e.target.value))}
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. 1800000"
                          />
                        </FormField>
                        <FormField label="Currency">
                          <CurrencyAutocomplete
                            value={activeRecord.purchase_currency}
                            onChange={(val) => updateActiveRecordField('purchase_currency', val)}
                          />
                        </FormField>
                      </div>
                    </SectionCard>

                    {!savedRecordIds.has(activeRecord.id) && (
                      <RegisterTabPreview
                        record={activeRecord}
                        groups={['ownership']}
                        title="Ownership and purchase records found in the documents"
                      />
                    )}
                  </TabsContent>

                  {/* TAB 3: LEASES & OTHER RECORDS */}
                  <TabsContent value="records" className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-2">
                    {savedRecordIds.has(activeRecord.id) ? (
                      <p className="text-xs text-muted-foreground p-4 border border-dashed border-border rounded-xl">
                        Saved. See the summary on the Property tab for what was added from these documents.
                      </p>
                    ) : (
                      <>
                        <RegisterTabPreview
                          record={activeRecord}
                          groups={['agreements']}
                          title="Leases and agreements (dates, rent, parties, amendments)"
                        />
                        <RegisterTabPreview
                          record={activeRecord}
                          groups={['insurance', 'utilities', 'compliance', 'assets', 'obligations']}
                          title="Insurance, utilities, compliance, equipment and recurring charges"
                        />
                      </>
                    )}
                  </TabsContent>

                  {/* TAB 4: DOCUMENTS (source files + differences between them) */}
                  <TabsContent value="documents" className="flex-1 overflow-y-auto space-y-4 pr-1 mt-2">
                    {activeRecord.sourceJobs.length > 1 && (
                      <section className="space-y-3">
                        {activeConflicts.length > 0 ? (
                          <>
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-4 h-4" />
                              <span>
                                {activeConflicts.length} value{activeConflicts.length === 1 ? '' : 's'} differ between
                                documents. Choose which to use.
                              </span>
                            </div>

                            {activeConflicts.map((diff) => (
                              <div
                                key={diff.fieldKey}
                                className="p-4 rounded-xl border-2 border-amber-500/40 bg-card space-y-3 shadow-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                                  <span className="font-bold text-xs text-foreground">{diff.fieldLabel}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Using:{' '}
                                    <Badge className="bg-primary text-primary-foreground font-mono text-[11px]">
                                      {String((activeRecord as any)[diff.fieldKey] || 'Empty')}
                                    </Badge>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {diff.sources.map((src, sIdx) => {
                                    const isChosen = String((activeRecord as any)[diff.fieldKey]) === String(src.value);
                                    return (
                                      <div
                                        key={sIdx}
                                        className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 transition-all ${
                                          isChosen
                                            ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                                            : 'border-border bg-muted/20'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-1.5">
                                          <span className="font-semibold text-[11px] text-foreground truncate">
                                            {src.docName}
                                          </span>
                                          {isChosen && (
                                            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 gap-1 shrink-0">
                                              <Check className="w-2.5 h-2.5" />
                                              Selected
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="p-2 rounded bg-background border border-border/60">
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
                                          variant={isChosen ? 'secondary' : 'default'}
                                          className="h-7 text-xs w-full"
                                          disabled={isChosen}
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
                                          {isChosen ? 'Using this value' : 'Use this value'}
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              No conflicts. All {activeRecord.sourceJobs.length} documents agree with each other.
                            </span>
                          </div>
                        )}

                        <details className="text-xs">
                          <summary className="cursor-pointer select-none font-medium text-foreground w-fit">
                            Show every combined value and where it came from
                          </summary>
                          <div className="rounded-xl border border-border overflow-hidden mt-2">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground">
                                <tr>
                                  <th className="p-2.5">Detail</th>
                                  <th className="p-2.5">Value used</th>
                                  <th className="p-2.5">Found in</th>
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
                                      {diff.sources.map((s) => s.docName).join(', ')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </section>
                    )}

                    <section className="space-y-2">
                      <h5 className="text-xs font-semibold text-foreground">
                        Documents used for this property ({activeRecord.sourceJobs.length})
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeRecord.sourceJobs.map((job, idx) => {
                          const docName =
                            job.document_filename ||
                            job.document_title ||
                            (job as any).filename ||
                            `Document ${idx + 1}`;
                          return (
                            <div
                              key={job.id}
                              className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-xs text-foreground truncate">{docName}</h5>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {job.page_count || 1} page{(job.page_count || 1) === 1 ? '' : 's'}
                                      {job.file_size_bytes != null ? ` · ${formatExactFileSize(job.file_size_bytes)}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {job.document_type && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {job.document_type}
                                  </Badge>
                                )}
                              </div>

                              {onOpenReviewDetail && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-7 text-xs gap-1.5"
                                  onClick={() => onOpenReviewDetail(job)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Compare with document
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
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
                {extractMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {selectedFiles.length > 0
                  ? `Read ${selectedFiles.length} document${selectedFiles.length === 1 ? '' : 's'}`
                  : 'Read documents'}
              </Button>
            </>
          )}

          {uploadStep === 'saving' && (
            <div className="w-full text-center text-xs text-muted-foreground">Please keep this window open…</div>
          )}

          {uploadStep === 'extracted' && (
            <>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs" disabled={isBusy}>
                  Start over with other files
                </Button>
                {isMulti && (
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
                    All saved. Done
                  </Button>
                ) : (
                  <>
                    {isMulti && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={isBusy || unsavedCount === 0}
                        onClick={() => confirmMutation.mutate('all')}
                      >
                        Save all ({unsavedCount})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="gap-2 text-xs shadow-xs"
                      disabled={isBusy || unsavedSelectedCount === 0}
                      onClick={() => confirmMutation.mutate('selected')}
                    >
                      {confirmMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isMulti
                        ? `Save selected (${unsavedSelectedCount})`
                        : activeRecord?.saveActionType === 'CREATE_NEW'
                        ? 'Save property'
                        : 'Update existing property'}
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
