import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { realEstateService } from '@/services/realEstateService';
import type {
  Property,
  Unit,
  Location,
  PropertyExtractionJob,
  PropertyInspectionFinding,
  DuplicateMatchItem,
} from '@/types/realEstate';
import { formatPropertyCategory } from '@/types/realEstate';
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
  ArrowLeft,
  GitMerge,
  Trash2,
  FileSignature,
  Wallet,
  Wrench,
  Umbrella,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import PropertyMergeModal from '@/components/RealEstate/PropertyMergeModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import PropertyDetailMap from '@/components/RealEstate/PropertyDetailMap';
import PropertyWarningsBanner from './register/PropertyWarningsBanner';
import RegisterOverviewStrip from './register/RegisterOverviewStrip';
import LocationPhysicalPanel from './register/LocationPhysicalPanel';
import OwnershipAcquisitionPanel from './register/OwnershipAcquisitionPanel';
import AgreementsTab from './register/AgreementsTab';
import FinancialsTab from './register/FinancialsTab';
import LeasePaymentsTab from './register/LeasePaymentsTab';
import { MaintenanceAssetsTab, UtilitiesInsuranceTab, ComplianceTab } from './register/OperationsTabs';
import { StatusBadge, fmtDate, humanize } from './register/registerUi';

import { formatExactFileSize } from '@/lib/utils';
const formatFileSize = formatExactFileSize;

const HOMEHARVEST_SCHEMA_COLUMNS: { key: string; label: string; group: string }[] = [
  { key: 'property_url', label: 'Property URL', group: 'Listing & Identity' },
  { key: 'property_id', label: 'Property ID', group: 'Listing & Identity' },
  { key: 'listing_id', label: 'Listing ID', group: 'Listing & Identity' },
  { key: 'permalink', label: 'Permalink', group: 'Listing & Identity' },
  { key: 'mls', label: 'MLS Code', group: 'Listing & Identity' },
  { key: 'mls_id', label: 'MLS Listing #', group: 'Listing & Identity' },
  { key: 'mls_status', label: 'MLS Status', group: 'Listing & Identity' },
  { key: 'status', label: 'Listing Status', group: 'Listing & Identity' },
  { key: 'style', label: 'Property Style', group: 'Listing & Identity' },
  { key: 'new_construction', label: 'New Construction', group: 'Listing & Identity' },
  { key: 'days_on_mls', label: 'Days on MLS', group: 'Listing & Identity' },
  { key: 'formatted_address', label: 'Formatted Address', group: 'Address & Geography' },
  { key: 'full_street_line', label: 'Full Street Line', group: 'Address & Geography' },
  { key: 'street', label: 'Street', group: 'Address & Geography' },
  { key: 'unit', label: 'Unit / Suite', group: 'Address & Geography' },
  { key: 'city', label: 'City', group: 'Address & Geography' },
  { key: 'state', label: 'State', group: 'Address & Geography' },
  { key: 'zip_code', label: 'Zip Code', group: 'Address & Geography' },
  { key: 'county', label: 'County', group: 'Address & Geography' },
  { key: 'neighborhoods', label: 'Neighborhoods', group: 'Address & Geography' },
  { key: 'latitude', label: 'Latitude', group: 'Address & Geography' },
  { key: 'longitude', label: 'Longitude', group: 'Address & Geography' },
  { key: 'flood_zone_code', label: 'Flood Zone Code', group: 'Address & Geography' },
  { key: 'land_use_code', label: 'Land Use Code', group: 'Address & Geography' },
  { key: 'nearby_schools', label: 'Nearby Schools', group: 'Address & Geography' },
  { key: 'beds', label: 'Bedrooms', group: 'Physical Specs' },
  { key: 'full_baths', label: 'Full Bathrooms', group: 'Physical Specs' },
  { key: 'half_baths', label: 'Half Bathrooms', group: 'Physical Specs' },
  { key: 'sqft', label: 'Interior Area (sqft)', group: 'Physical Specs' },
  { key: 'lot_sqft', label: 'Lot Area (sqft)', group: 'Physical Specs' },
  { key: 'year_built', label: 'Year Built', group: 'Physical Specs' },
  { key: 'stories', label: 'Stories / Floors', group: 'Physical Specs' },
  { key: 'parking_garage', label: 'Parking Garage Spaces', group: 'Physical Specs' },
  { key: 'text', label: 'Listing Description', group: 'Physical Specs' },
  { key: 'list_price', label: 'List Price', group: 'Pricing & Valuation' },
  { key: 'list_price_min', label: 'List Price Min', group: 'Pricing & Valuation' },
  { key: 'list_price_max', label: 'List Price Max', group: 'Pricing & Valuation' },
  { key: 'list_date', label: 'List Date', group: 'Pricing & Valuation' },
  { key: 'pending_date', label: 'Pending Date', group: 'Pricing & Valuation' },
  { key: 'sold_price', label: 'Last Sold Price', group: 'Pricing & Valuation' },
  { key: 'last_sold_date', label: 'Last Sold Date', group: 'Pricing & Valuation' },
  { key: 'last_sold_price', label: 'Historical Sold Price', group: 'Pricing & Valuation' },
  { key: 'price_per_sqft', label: 'Price per Sqft', group: 'Pricing & Valuation' },
  { key: 'estimated_value', label: 'Estimated Value', group: 'Pricing & Valuation' },
  { key: 'assessed_value', label: 'County Assessed Value', group: 'Pricing & Valuation' },
  { key: 'annual_tax', label: 'Annual Property Tax', group: 'Pricing & Valuation' },
  { key: 'hoa_fee', label: 'Monthly HOA / CAM Fee', group: 'Pricing & Valuation' },
  { key: 'monthly_fees', label: 'Monthly Fees Breakdown', group: 'Pricing & Valuation' },
  { key: 'one_time_fees', label: 'One-Time Fees', group: 'Pricing & Valuation' },
  { key: 'tax_history', label: 'Historical Tax & Assessments', group: 'Pricing & Valuation' },
  { key: 'agent_id', label: 'Agent ID', group: 'Agent, Broker & Office' },
  { key: 'agent_name', label: 'Listing Agent Name', group: 'Agent, Broker & Office' },
  { key: 'agent_email', label: 'Agent Email', group: 'Agent, Broker & Office' },
  { key: 'agent_phones', label: 'Agent Phones', group: 'Agent, Broker & Office' },
  { key: 'agent_mls_set', label: 'Agent MLS Set', group: 'Agent, Broker & Office' },
  { key: 'broker_id', label: 'Broker ID', group: 'Agent, Broker & Office' },
  { key: 'broker_name', label: 'Broker Name', group: 'Agent, Broker & Office' },
  { key: 'office_id', label: 'Office ID', group: 'Agent, Broker & Office' },
  { key: 'office_mls_set', label: 'Office MLS Set', group: 'Agent, Broker & Office' },
  { key: 'office_name', label: 'Brokerage Office Name', group: 'Agent, Broker & Office' },
  { key: 'office_email', label: 'Office Email', group: 'Agent, Broker & Office' },
  { key: 'office_phones', label: 'Office Phones', group: 'Agent, Broker & Office' },
  { key: 'builder_id', label: 'Builder ID', group: 'Agent, Broker & Office' },
  { key: 'builder_name', label: 'Builder Name', group: 'Agent, Broker & Office' },
  { key: 'primary_photo', label: 'Primary Photo URL', group: 'Media' },
  { key: 'alt_photos', label: 'Gallery Photo URLs', group: 'Media' },
];

const AREA_UNIT_TO_SQFT: Record<string, number> = { sqft: 1, sqm: 10.7639 };

const optionalNumber = (value: string): number | undefined => (value === '' ? undefined : Number(value));

/**
 * Builds the create payload: one measurement unit for every area, normalized square feet for each area
 * (the API stores them as sent), and no empty strings.
 */
function buildCreatePayload(form: Partial<Property>): Partial<Property> {
  const unit = form.measurement_unit === 'sqm' ? 'sqm' : 'sqft';
  const toSqft = (value?: number | null) => (value ? Math.round(value * AREA_UNIT_TO_SQFT[unit] * 100) / 100 : undefined);
  const buildingSqft = toSqft(form.building_area);
  const payload: Partial<Property> = {
    ...form,
    measurement_unit: unit,
    building_area_unit: unit,
    usable_area_unit: unit,
    land_area_unit: unit,
    building_area_sqft: buildingSqft,
    usable_area_sqft: toSqft(form.usable_area),
    land_area_sqft: toSqft(form.land_area),
    total_square_feet: buildingSqft ? Math.round(buildingSqft) : undefined,
    square_feet: buildingSqft ? Math.round(buildingSqft) : undefined,
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '')) as Partial<Property>;
}

const TAB_TRIGGER_CLASS =
  'py-2 px-3 text-xs font-semibold rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs transition-all cursor-pointer';

function formatHHFieldValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (Array.isArray(val)) {
    if (val.length === 0) return '—';
    if (typeof val[0] === 'object') {
      return val
        .map((item) => {
          if (item.number) return `${item.number}${item.type ? ` (${item.type})` : ''}`;
          if (item.year) return `${item.year}: $${Number(item.tax || 0).toLocaleString()}`;
          return JSON.stringify(item);
        })
        .join(', ');
    }
    return val.join(', ');
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/** First value that is actually present (not null / empty / zero). */
function pick<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find((v) => v !== null && v !== undefined && (v as unknown) !== '' && (v as unknown) !== 0) ?? undefined;
}

const money = (n: unknown, symbol = '$'): string | undefined =>
  n === null || n === undefined || n === '' || Number.isNaN(Number(n)) ? undefined : `${symbol}${Number(n).toLocaleString()}`;

const withUnit = (n: unknown, unit: string): string | undefined =>
  n === null || n === undefined || n === '' || Number(n) === 0 ? undefined : `${Number(n).toLocaleString()} ${unit}`;

/** Label above a value; shows "—" when there is no value and a small "public records" note when the value was filled from them. */
function Fact({
  label,
  value,
  fromPublicRecords,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  fromPublicRecords?: boolean;
  className?: string;
}) {
  const empty = value === null || value === undefined || value === '' || value === '—';
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="text-muted-foreground block text-[11px]">{label}</span>
      <span
        className={`block text-sm font-semibold truncate ${empty ? 'text-muted-foreground/50' : 'text-foreground'}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {empty ? '—' : value}
      </span>
      {fromPublicRecords && !empty && <span className="text-[10px] text-primary/80 block">from public records</span>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 border-border bg-card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-border">
        <div>
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
          </h4>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

const toList = (val: unknown): string[] =>
  Array.isArray(val)
    ? (val as string[])
    : typeof val === 'string' && val
    ? val.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

/**
 * Everything found online for the property's address (HomeHarvest 0.8.18 + county assessor data), grouped by topic.
 * Documents always take priority; this only fills gaps, and "Refresh" re-runs the lookup by full address.
 */
function PublicRecordsPanel({
  property,
  canRefresh,
  isRefreshing,
  onRefresh,
}: {
  property: Property;
  canRefresh: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const hh = (property.homeharvest_data || {}) as Record<string, any>;
  const hasHH = HOMEHARVEST_SCHEMA_COLUMNS.some((c) => {
    const v = hh[c.key];
    return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  });
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const primaryPhoto = activePhoto || hh.primary_photo || property.image_url || null;
  const altPhotos = toList(hh.alt_photos);
  const schools = toList(hh.nearby_schools);
  const taxHistory: Array<{ year?: number; tax?: number; assessment?: { building?: number; land?: number; total?: number } }> =
    Array.isArray(hh.tax_history) ? hh.tax_history : [];
  const description = pick<string>(hh.text, hh.description, property.description);
  const listingStatus = pick<string>(hh.mls_status, hh.status);

  const refreshButton = canRefresh ? (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer" disabled={isRefreshing} onClick={onRefresh}>
      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Looking up…' : 'Refresh from public records'}
    </Button>
  ) : null;

  const header = (
    <SectionCard
      icon={Sparkles}
      title="Public records & listing data"
      description="Found online for this address. Your documents always take priority; this only fills gaps."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {listingStatus && (
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              {String(listingStatus).replace(/_/g, ' ')}
            </Badge>
          )}
          {hh.property_url && (
            <a
              href={hh.property_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5"
            >
              View listing ↗
            </a>
          )}
          {refreshButton}
        </div>
      }
    >
      {!hasHH && (
        <div className="p-5 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-1">
          <p className="font-medium text-foreground">Nothing found online for this address yet.</p>
          <p>
            Public records mostly cover US and Canadian properties that are, or recently were, listed for sale or rent.
            Everything shown on the other tabs comes from your documents.
          </p>
        </div>
      )}
    </SectionCard>
  );

  if (!hasHH) return header;

  return (
    <div className="space-y-4">
      {header}

      {(primaryPhoto || description) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {primaryPhoto && (
            <div className="lg:col-span-5 space-y-2">
              <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-video">
                <img
                  src={primaryPhoto}
                  alt={property.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              {altPhotos.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {altPhotos.slice(0, 8).map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhoto(url)}
                      className={`relative w-14 h-10 rounded-md overflow-hidden border shrink-0 cursor-pointer transition-all ${
                        primaryPhoto === url ? 'border-primary ring-2 ring-primary/30' : 'border-border opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {description && (
            <div className={`${primaryPhoto ? 'lg:col-span-7' : 'lg:col-span-12'} p-3 rounded-lg bg-muted/20 border border-border`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Listing description</span>
              <p className="text-xs text-foreground/90 leading-relaxed">{description}</p>
            </div>
          )}
        </div>
      )}

      <SectionCard icon={Building} title="Property facts">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Fact label="Type" value={hh.style ? String(hh.style).replace(/_/g, ' ') : undefined} />
          <Fact label="Bedrooms" value={hh.beds} />
          <Fact
            label="Bathrooms"
            value={hh.full_baths != null ? `${hh.full_baths} full${hh.half_baths ? ` + ${hh.half_baths} half` : ''}` : undefined}
          />
          <Fact label="Parking (garage)" value={hh.parking_garage} />
          <Fact label="Interior area" value={withUnit(hh.sqft, 'sq ft')} />
          <Fact label="Lot area" value={withUnit(hh.lot_sqft, 'sq ft')} />
          <Fact label="Year built" value={hh.year_built} />
          <Fact label="Stories" value={hh.stories} />
        </div>
      </SectionCard>

      <SectionCard icon={Wallet} title="Value & tax">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Fact label="Estimated value" value={money(hh.estimated_value)} />
          <Fact label="Assessed value" value={money(hh.assessed_value)} />
          <Fact label="Annual property tax" value={money(pick(hh.annual_tax, hh.tax))} />
          <Fact label="Monthly HOA / fees" value={money(hh.hoa_fee)} />
          <Fact label="List price" value={money(hh.list_price)} />
          <Fact label="Last sold price" value={money(pick(hh.last_sold_price, hh.sold_price))} />
          <Fact label="Last sold date" value={hh.last_sold_date ? String(hh.last_sold_date).slice(0, 10) : undefined} />
          <Fact label="Price per sq ft" value={money(hh.price_per_sqft)} />
        </div>

        {taxHistory.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border text-xs font-semibold text-foreground">
              Tax and assessment history ({taxHistory.length} years)
            </div>
            <div className="overflow-x-auto max-h-52">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
                    <th className="py-2 px-3">Year</th>
                    <th className="py-2 px-3">Tax paid</th>
                    <th className="py-2 px-3">Building</th>
                    <th className="py-2 px-3">Land</th>
                    <th className="py-2 px-3">Total assessed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {taxHistory.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="py-1.5 px-3 font-bold text-foreground">{row.year ?? '—'}</td>
                      <td className="py-1.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{money(row.tax) ?? '—'}</td>
                      <td className="py-1.5 px-3 text-muted-foreground">{money(row.assessment?.building) ?? '—'}</td>
                      <td className="py-1.5 px-3 text-muted-foreground">{money(row.assessment?.land) ?? '—'}</td>
                      <td className="py-1.5 px-3 font-medium text-foreground">{money(row.assessment?.total) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard icon={MapPin} title="Location & neighbourhood">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Fact className="col-span-2" label="Matched address" value={pick<string>(hh.formatted_address, hh.matched_address)} />
          <Fact label="County" value={hh.county} />
          <Fact label="County code (FIPS)" value={hh.fips_code} />
          <Fact className="col-span-2" label="Neighbourhood" value={hh.neighborhoods} />
          <Fact label="Parcel / APN" value={pick<string>(hh.parcel_id, property.parcel_id)} />
          <Fact
            label="Coordinates"
            value={hh.latitude != null && hh.longitude != null ? `${Number(hh.latitude).toFixed(5)}, ${Number(hh.longitude).toFixed(5)}` : undefined}
          />
        </div>
        {schools.length > 0 && (
          <div>
            <span className="text-muted-foreground block text-[11px] mb-1">Nearby schools</span>
            <div className="flex flex-wrap gap-1.5">
              {schools.map((sch, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] bg-background">
                  {sch}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {(hh.agent_name || hh.office_name || hh.broker_name || hh.builder_name) && (
        <SectionCard icon={FileSignature} title="Listing contacts">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Fact label="Listing agent" value={hh.agent_name} />
            <Fact label="Agent email" value={hh.agent_email} />
            <Fact label="Agent phone" value={hh.agent_phones ? formatHHFieldValue(hh.agent_phones) : undefined} />
            <Fact label="Office / brokerage" value={pick<string>(hh.office_name, hh.broker_name)} />
            <Fact label="Office email" value={hh.office_email} />
            <Fact label="Office phone" value={hh.office_phones ? formatHHFieldValue(hh.office_phones) : undefined} />
            <Fact label="Builder" value={hh.builder_name} />
            <Fact label="MLS" value={hh.mls ? `${hh.mls}${hh.mls_id ? ` #${hh.mls_id}` : ''}` : undefined} />
          </div>
        </SectionCard>
      )}

      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-semibold text-foreground">
          View every field returned (technical)
        </summary>
        <div className="p-4 pt-1 space-y-4 border-t border-border">
          {Array.from(new Set(HOMEHARVEST_SCHEMA_COLUMNS.map((c) => c.group))).map((group) => (
            <div key={group} className="space-y-2">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {HOMEHARVEST_SCHEMA_COLUMNS.filter((c) => c.group === group).map((col) => {
                  const formatted = formatHHFieldValue(hh[col.key]);
                  return (
                    <div key={col.key} className="p-2 rounded-lg bg-muted/20 border border-border/70">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">{col.label}</span>
                        <code className="text-[9px] text-muted-foreground/80 bg-muted px-1 rounded">{col.key}</code>
                      </div>
                      <span className="text-xs font-medium text-foreground truncate block mt-1" title={formatted}>
                        {formatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function DetailTab({
  value,
  icon: Icon,
  label,
  badge,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <TabsTrigger value={value} className={TAB_TRIGGER_CLASS}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {badge}
    </TabsTrigger>
  );
}

function CountBadge({ count, tone }: { count: number; tone?: 'alert' }) {
  if (tone === 'alert' && count === 0) return null;
  return (
    <Badge
      variant={tone === 'alert' ? undefined : 'secondary'}
      className={`ml-0.5 px-1.5 py-0 text-[10px] h-4 min-w-4 flex items-center justify-center ${
        tone === 'alert' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' : ''
      }`}
    >
      {count}
    </Badge>
  );
}

function TabGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

export default function PropertiesPage() {
  const { propertyId } = useParams<{ propertyId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [selectedOccupancy, setSelectedOccupancy] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Detail Page State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    propertyId || searchParams.get('property_id') || searchParams.get('propId') || null
  );
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

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
    queryKey: ['real-estate-properties', selectedCity, selectedCategory, selectedOwnership, selectedInvStatus, selectedOccupancy, searchQuery],
    queryFn: () =>
      realEstateService.getProperties({
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        tenure: selectedOwnership !== 'ALL' ? selectedOwnership : undefined,
        occupancy_status: selectedOccupancy !== 'ALL' ? selectedOccupancy : undefined,
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

  // Public-records values used to fill details the documents did not state
  const hh = (selectedProperty?.homeharvest_data || {}) as Record<string, any>;

  // Register data (tenure, ownership/acquisition, agreements, financial schedules, operations, compliance, warnings).
  // Keyed under the details key so existing invalidations of the property also refresh it.
  const { data: register } = useQuery({
    queryKey: ['real-estate-property-details', selectedPropertyId, 'register'],
    queryFn: () => realEstateService.getPropertyRegister(selectedPropertyId!),
    enabled: !!selectedPropertyId,
  });

  // Duplicate Property Detection for Selected Property
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedDuplicateItem, setSelectedDuplicateItem] = useState<DuplicateMatchItem | null>(null);

  const { data: duplicatesData, refetch: refetchDuplicates } = useQuery({
    queryKey: ['property-duplicates', selectedProperty?.id],
    queryFn: () => realEstateService.getPropertyDuplicates(selectedProperty!.id),
    enabled: !!selectedProperty?.id,
  });

  // URL Route & Deep Link Sync
  useEffect(() => {
    const effectiveId = propertyId || searchParams.get('property_id') || searchParams.get('propId');
    setSelectedPropertyId(effectiveId || null);
  }, [propertyId, searchParams]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && isManager) {
      setIsAddPropertyOpen(true);
    }
  }, [searchParams, isManager]);

  const handleOpenDetail = (prop: Property) => {
    setSelectedPropertyId(prop.id);
    navigate(`/real-estate/properties/${prop.id}`);
  };

  const handleBackToList = () => {
    setSelectedPropertyId(null);
    navigate('/real-estate/properties');
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
      navigate(`/real-estate/properties/${data.id}`);
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

  const enrichMutation = useMutation({
    mutationFn: () => realEstateService.enrichPropertyWithHomeHarvest(selectedPropertyId!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      if (res.enriched) toast.success('Public records updated. Missing details were filled in.');
      else toast.info(res.message || 'No public records matched this address.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Could not look up public records');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (archive: boolean) => realEstateService.archiveProperty(selectedPropertyId!, archive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      toast.success('Property archive status updated');
      handleBackToList();
    },
  });

  const deletePropMutation = useMutation({
    mutationFn: (id: string) => realEstateService.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
      toast.success('Property deleted successfully');
      setIsDeleteDialogOpen(false);
      const deletedId = propertyToDelete?.id;
      setPropertyToDelete(null);
      if (selectedPropertyId === deletedId) {
        handleBackToList();
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete property');
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
      {!selectedPropertyId ? (
        <>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-center">
          {/* Search bar */}
          <div className="sm:col-span-2 lg:col-span-2 relative">
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
              <SelectItem value="COMMERCIAL_OFFICE">Commercial Office</SelectItem>
              <SelectItem value="CORPORATE_HQ">Corporate HQ</SelectItem>
              <SelectItem value="COMPANY_CONDO">Corporate Condo</SelectItem>
              <SelectItem value="RD_FACILITY">R&D Facility</SelectItem>
              <SelectItem value="WAREHOUSE">Warehouse / Logistics</SelectItem>
              <SelectItem value="CO_WORKING">Co-Working Space</SelectItem>
            </SelectContent>
          </Select>

          {/* Tenure (derived from ownership and agreement records) */}
          <Select value={selectedOwnership} onValueChange={setSelectedOwnership}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Tenure" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tenure</SelectItem>
              <SelectItem value="OWNED">Owned</SelectItem>
              <SelectItem value="LEASED">Leased</SelectItem>
              <SelectItem value="SUBLEASED">Subleased</SelectItem>
              <SelectItem value="LEASE_TO_OWN">Lease-to-own</SelectItem>
              <SelectItem value="MIXED">Mixed arrangements</SelectItem>
              <SelectItem value="OTHER">Other contract</SelectItem>
            </SelectContent>
          </Select>

          {/* Occupancy */}
          <Select value={selectedOccupancy} onValueChange={setSelectedOccupancy}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="All Occupancy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Occupancy</SelectItem>
              <SelectItem value="OCCUPIED">Occupied</SelectItem>
              <SelectItem value="PARTIALLY_OCCUPIED">Partially occupied</SelectItem>
              <SelectItem value="VACANT">Vacant</SelectItem>
              <SelectItem value="UNDER_RENOVATION">Under renovation</SelectItem>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
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
                      {(prop.property_type || prop.property_subtype || prop.usage_type) && (
                        <p className="text-muted-foreground text-[11px] truncate max-w-xs">
                          {[prop.property_type, prop.property_subtype, prop.usage_type ? humanize(prop.usage_type) : null]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant={(prop.derived_tenure ?? prop.ownership_type) === 'OWNED' ? 'default' : 'secondary'}
                          className="text-[11px]"
                        >
                          {humanize(String(prop.derived_tenure ?? prop.ownership_type ?? 'LEASED'))}
                        </Badge>
                        {prop.property_category && (
                          <Badge variant="outline" className="text-[10px]">
                            {formatPropertyCategory(prop.property_category, prop.ownership_type)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {prop.occupancy_status && prop.occupancy_status !== 'UNKNOWN' && <StatusBadge value={prop.occupancy_status} />}
                        {prop.status && prop.status !== 'ACTIVE' && <StatusBadge value={prop.status} />}
                      </div>
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
                      <div className="flex items-center justify-end gap-1">
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
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-70 group-hover:opacity-100"
                            title="Delete Property"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPropertyToDelete(prop);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      ) : (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
          {/* Detail Navigation & Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-semibold hover:bg-muted cursor-pointer"
                onClick={handleBackToList}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Properties
              </Button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link to="/real-estate" className="hover:text-foreground transition-colors">Real Estate</Link>
                <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                <button onClick={handleBackToList} className="hover:text-foreground transition-colors cursor-pointer">Properties</button>
                <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                <span className="font-semibold text-foreground truncate max-w-[220px]">
                  {selectedProperty?.name || 'Property Detail'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isManager && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium cursor-pointer"
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium cursor-pointer"
                    onClick={() => setIsAddUnitOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Unit
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs font-semibold bg-linear-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground shadow-sm cursor-pointer"
                    onClick={() => setIsAddDocModalOpen(true)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Add via Documents
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 cursor-pointer"
                    onClick={() => {
                      setPropertyToDelete(selectedProperty || null);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Property
                  </Button>
                </>
              )}
            </div>
          </div>

          {isDetailsLoading ? (
            <div className="py-24 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-base font-medium">Loading property details...</span>
            </div>
          ) : !selectedProperty ? (
            <Card className="p-12 text-center border-dashed">
              <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">Property not found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                The requested property could not be loaded or may have been deleted.
              </p>
              <Button size="sm" onClick={handleBackToList} className="gap-2 text-xs">
                <ArrowLeft className="w-4 h-4" />
                Return to Properties Register
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Hero Header Card */}
              <Card className="p-6 bg-card border-border shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                      <Building className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                          {selectedProperty.name}
                        </h1>
                        {selectedProperty.property_code && (
                          <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                            {selectedProperty.property_code}
                          </Badge>
                        )}
                        <Badge variant={(register?.tenure?.derived_tenure ?? selectedProperty.ownership_type) === 'OWNED' ? 'default' : 'secondary'}>
                          {humanize(String(register?.tenure?.derived_tenure ?? selectedProperty.ownership_type ?? 'LEASED'))}
                        </Badge>
                        {selectedProperty.occupancy_status && selectedProperty.occupancy_status !== 'UNKNOWN' && (
                          <StatusBadge value={selectedProperty.occupancy_status} />
                        )}
                        {selectedProperty.property_category && (
                          <Badge variant="outline" className="text-xs">
                            {formatPropertyCategory(selectedProperty.property_category, selectedProperty.ownership_type)}
                          </Badge>
                        )}
                        {selectedProperty.is_geocoded && (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs flex items-center gap-1">
                            <Compass className="w-3 h-3" />
                            Geocoded
                          </Badge>
                        )}
                        {selectedProperty.inventory_verification_status === 'VERIFIED' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </Badge>
                        ) : selectedProperty.inventory_verification_status === 'IN_PROGRESS' ? (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Unconfirmed Specs
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-4 h-4 shrink-0 text-primary" />
                        {selectedProperty.address}
                        {selectedProperty.unit_number ? `, Unit ${selectedProperty.unit_number}` : ''}, {selectedProperty.city}
                        {selectedProperty.state_province ? `, ${selectedProperty.state_province}` : ''} {selectedProperty.postal_code || ''}, {selectedProperty.country}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duplicate Property Alert Banner */}
                {duplicatesData?.has_duplicates && duplicatesData.duplicates.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-500/40 bg-linear-to-r from-amber-500/15 via-amber-500/10 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">Duplicate Property Match Detected</span>
                          <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px]">
                            {duplicatesData.duplicates.length} Match Found
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Shares {duplicatesData.duplicates[0].match_reasons.join(', ')} with duplicate record &apos;{duplicatesData.duplicates[0].duplicate_property.name}&apos; (PIN: {duplicatesData.duplicates[0].duplicate_property.parcel_id || 'N/A'}).
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDuplicateItem(duplicatesData.duplicates[0]);
                        setMergeModalOpen(true);
                      }}
                      className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-semibold shadow-xs"
                    >
                      <GitMerge className="w-4 h-4" />
                      Review Differences & Merge
                    </Button>
                  </div>
                )}

                {/* Quick Metrics KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground text-[11px] block">Total Area</span>
                    <span className="text-base font-bold text-foreground block mt-0.5">
                      {selectedProperty.building_area
                        ? `${selectedProperty.building_area.toLocaleString()} ${selectedProperty.building_area_unit || 'sqft'}`
                        : (selectedProperty.square_feet ? `${selectedProperty.square_feet.toLocaleString()} sqft` : '—')}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground text-[11px] block">Configured Units</span>
                    <span className="text-base font-bold text-foreground block mt-0.5">
                      {selectedProperty.units?.length || selectedProperty.unit_count || 1} units
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground text-[11px] block">Owner / Entity</span>
                    <span className="text-sm font-semibold text-foreground truncate block mt-0.5">
                      {selectedProperty.legal_owner || selectedProperty.owning_company || selectedProperty.responsible_legal_entity || '—'}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground text-[11px] block">
                      {selectedProperty.ownership_type === 'LEASED' ? 'Monthly Rent' : 'Acquisition Price'}
                    </span>
                    <span className="text-base font-bold text-foreground block mt-0.5">
                      {selectedProperty.ownership_type === 'LEASED' && selectedProperty.current_lease
                        ? `${selectedProperty.current_lease.currency || 'USD'} ${selectedProperty.current_lease.rent_amount?.toLocaleString() || '—'}`
                        : (selectedProperty.purchase_price
                            ? `${selectedProperty.purchase_currency || 'USD'} ${selectedProperty.purchase_price.toLocaleString()}`
                            : (selectedProperty.monthly_rent ? `${selectedProperty.currency || 'USD'} ${selectedProperty.monthly_rent.toLocaleString()}/mo` : '—'))}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Expired agreements, renewal deadlines, max-term review, missing/expired documents, overdue obligations, compliance */}
              {register && <PropertyWarningsBanner warnings={register.warnings} onNavigate={setActiveTab} />}

              {/* Detail Tabs - 11 register sections */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border border-border bg-card/70 backdrop-blur-xs rounded-xl p-1 shadow-2xs mb-2">
                  <TabsList className="flex flex-wrap items-start justify-start gap-x-6 gap-y-3 w-full !h-auto bg-transparent p-1.5">
                    <TabGroup title="Property">
                      <DetailTab value="overview" icon={Compass} label="Overview" />
                      <DetailTab value="building" icon={Layers} label="Property & Location" />
                      <DetailTab value="ownership" icon={ShieldCheck} label="Ownership & Purchase" />
                    </TabGroup>
                    <TabGroup title="Money & contracts">
                      <DetailTab value="agreements" icon={FileSignature} label="Leases & Agreements" badge={<CountBadge count={register?.agreements.length ?? 0} />} />
                      <DetailTab value="financials" icon={Wallet} label="Financials" />
                      <DetailTab value="lease-payments" icon={CalendarClock} label="Lease Payments" />
                    </TabGroup>
                    <TabGroup title="Operations">
                      <DetailTab value="maintenance" icon={Wrench} label="Maintenance & Assets" badge={<CountBadge count={(register?.work_orders.length ?? 0) + (register?.assets.length ?? 0)} />} />
                      <DetailTab value="inspections" icon={AlertTriangle} label="Inspections" badge={<CountBadge count={selectedProperty.inspections?.length || 0} />} />
                      <DetailTab value="utilities" icon={Umbrella} label="Utilities & Insurance" />
                      <DetailTab value="compliance" icon={ShieldAlert} label="Compliance" badge={<CountBadge count={register?.compliance_issues.length ?? 0} tone="alert" />} />
                    </TabGroup>
                    <TabGroup title="Records">
                      <DetailTab value="documents" icon={FileText} label="Documents" badge={<CountBadge count={selectedProperty.documents?.length || 0} />} />
                      <DetailTab value="activity" icon={Activity} label="History" badge={<CountBadge count={selectedProperty.activity_logs?.length || 0} />} />
                    </TabGroup>
                  </TabsList>
                </div>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="mt-4 text-xs">
                  <RegisterOverviewStrip property={selectedProperty} register={register} />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 flex flex-col gap-4">
                      <SectionCard
                        icon={Layers}
                        title="At a glance"
                        description="Key facts. Anything marked 'from public records' was filled in because your documents did not state it."
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <Fact
                            label="Building area"
                            value={
                              selectedProperty.building_area
                                ? `${selectedProperty.building_area.toLocaleString()} ${selectedProperty.building_area_unit || 'sq ft'}`
                                : withUnit(pick(selectedProperty.square_feet, hh.sqft), 'sq ft')
                            }
                            fromPublicRecords={!selectedProperty.building_area && !selectedProperty.square_feet && !!hh.sqft}
                          />
                          <Fact
                            label="Usable area"
                            value={
                              selectedProperty.usable_area
                                ? `${selectedProperty.usable_area.toLocaleString()} ${selectedProperty.usable_area_unit || 'sq ft'}`
                                : undefined
                            }
                          />
                          <Fact
                            label="Land area"
                            value={
                              selectedProperty.land_area
                                ? `${selectedProperty.land_area.toLocaleString()} ${selectedProperty.land_area_unit || 'sq ft'}`
                                : withUnit(hh.lot_sqft, 'sq ft')
                            }
                            fromPublicRecords={!selectedProperty.land_area && !!hh.lot_sqft}
                          />
                          <Fact
                            label="Year built"
                            value={pick(selectedProperty.year_built, hh.year_built)}
                            fromPublicRecords={!selectedProperty.year_built && !!hh.year_built}
                          />
                          <Fact
                            label="Floors"
                            value={pick(selectedProperty.floor_count, hh.stories)}
                            fromPublicRecords={!selectedProperty.floor_count && !!hh.stories}
                          />
                          <Fact label="Units" value={selectedProperty.unit_count || selectedProperty.units?.length || 1} />
                          <Fact
                            label="Owner"
                            value={selectedProperty.legal_owner || selectedProperty.owning_company || selectedProperty.responsible_legal_entity}
                          />
                          <Fact
                            label="Ownership share"
                            value={selectedProperty.ownership_interest != null ? `${selectedProperty.ownership_interest}%` : '100%'}
                          />
                          <Fact label="Estimated value" value={money(hh.estimated_value)} fromPublicRecords />
                          <Fact label="Site contact" value={selectedProperty.local_contact_name} />
                          <Fact label="Contact email" value={selectedProperty.local_contact_email} />
                          <Fact label="Time zone" value={selectedProperty.timezone} />
                        </div>
                      </SectionCard>

                      {selectedProperty.is_geocoded && (
                        <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex items-start gap-3">
                          <Compass className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-xs flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Location confirmed on the map</span>
                              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                                {selectedProperty.latitude?.toFixed(6)}, {selectedProperty.longitude?.toFixed(6)}
                              </span>
                            </div>
                            {selectedProperty.geocoded_matched_address && (
                              <div className="text-[11px] text-muted-foreground leading-relaxed">
                                Matched address: <em>{selectedProperty.geocoded_matched_address}</em>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <SectionCard
                        icon={ShieldCheck}
                        title="Inventory check"
                        description="On-site verification, separate from the review of extracted documents."
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={selectedProperty.inventory_verification_status === 'VERIFIED' ? 'default' : 'outline'}>
                            {selectedProperty.inventory_verification_status || 'UNVERIFIED'}
                          </Badge>
                          {selectedProperty.inventory_verified_by_name && (
                            <span className="text-muted-foreground text-[11px]">
                              By {selectedProperty.inventory_verified_by_name} on {selectedProperty.inventory_verified_date}
                            </span>
                          )}
                        </div>

                        {isManager && (
                          <div className="flex gap-2 pt-3 border-t border-border">
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
                              placeholder="Notes or inspection record..."
                              value={verifyNotes}
                              onChange={(e) => setVerifyNotes(e.target.value)}
                              className="h-8 text-xs flex-1"
                            />
                            <Button
                              size="sm"
                              className="h-8 text-xs cursor-pointer"
                              onClick={() => verifyMutation.mutate()}
                              disabled={verifyMutation.isPending}
                            >
                              Update
                            </Button>
                          </div>
                        )}
                      </SectionCard>

                      {isManager && (
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20 border border-border">
                          <span className="text-muted-foreground text-xs">Remove this property from active inventory counts:</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-rose-600 dark:text-rose-400 gap-1 hover:bg-rose-500/10 hover:border-rose-500/30 cursor-pointer"
                            onClick={() => archiveMutation.mutate(true)}
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive property
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 flex flex-col gap-4">
                      <PropertyDetailMap property={selectedProperty} />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Building Details */}
                <TabsContent value="building" className="mt-4 space-y-4 text-xs">
                  <LocationPhysicalPanel property={selectedProperty} register={register} />
                  <SectionCard icon={Building} title="Building">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Fact label="Year built" value={pick(selectedProperty.year_built, hh.year_built)} fromPublicRecords={!selectedProperty.year_built && !!hh.year_built} />
                      <Fact label="Floors" value={pick(selectedProperty.floor_count, hh.stories)} fromPublicRecords={!selectedProperty.floor_count && !!hh.stories} />
                      <Fact label="Buildings" value={selectedProperty.building_count || 1} />
                      <Fact label="Total units" value={selectedProperty.unit_count || selectedProperty.units?.length || 0} />
                      <Fact label="Construction" value={selectedProperty.construction_type} />
                      <Fact label="Zoning" value={selectedProperty.zoning} />
                      <Fact label="County" value={hh.county} fromPublicRecords />
                      <Fact label="Parcel / APN" value={pick(selectedProperty.parcel_id, hh.parcel_id)} fromPublicRecords={!selectedProperty.parcel_id && !!hh.parcel_id} />
                    </div>
                  </SectionCard>

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
                  <PublicRecordsPanel
                    property={selectedProperty}
                    canRefresh={isManager}
                    isRefreshing={enrichMutation.isPending}
                    onRefresh={() => enrichMutation.mutate()}
                  />
                </TabsContent>

                {/* Tab 3: Ownership */}
                <TabsContent value="ownership" className="mt-4 space-y-4 text-xs">
                  <OwnershipAcquisitionPanel register={register} propertyId={selectedProperty.id} canManage={isManager} />
                  <SectionCard icon={ShieldCheck} title="Property record" description="Owner and identifiers as saved on the property.">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <Fact label="Legal owner" value={selectedProperty.legal_owner} />
                      <Fact label="Owning company" value={selectedProperty.owning_company || selectedProperty.responsible_legal_entity} />
                      <Fact label="Ownership share" value={selectedProperty.ownership_interest != null ? `${selectedProperty.ownership_interest}%` : '100%'} />
                      <Fact label="Owned or leased" value={selectedProperty.ownership_type || 'OWNED'} />
                      <Fact label="Parcel ID (PIN)" value={pick(selectedProperty.parcel_id, hh.parcel_id)} fromPublicRecords={!selectedProperty.parcel_id && !!hh.parcel_id} />
                      <Fact label="Title / folio number" value={selectedProperty.title_number} />
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={Wallet}
                    title="Value & tax"
                    description="From public records for this address."
                    action={
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] cursor-pointer" onClick={() => setActiveTab('building')}>
                        See all public records
                      </Button>
                    }
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Fact label="Estimated value" value={money(hh.estimated_value)} />
                      <Fact label="Assessed value" value={money(hh.assessed_value)} />
                      <Fact label="Annual property tax" value={money(pick(selectedProperty.annual_property_tax, hh.annual_tax, hh.tax))} />
                      <Fact
                        label="Last sold"
                        value={
                          [money(pick(hh.last_sold_price, hh.sold_price)), hh.last_sold_date ? String(hh.last_sold_date).slice(0, 10) : null]
                            .filter(Boolean)
                            .join(' on ') || undefined
                        }
                      />
                    </div>
                  </SectionCard>

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

                {/* Tab: Lease & Agreements */}
                <TabsContent value="agreements" className="mt-4 text-xs">
                  <AgreementsTab register={register} propertyId={selectedProperty.id} canManage={isManager} />
                </TabsContent>

                {/* Tab: Financials */}
                <TabsContent value="financials" className="mt-4 text-xs">
                  <FinancialsTab property={selectedProperty} register={register} propertyId={selectedProperty.id} canManage={isManager} />
                </TabsContent>

                {/* Tab: Lease Payments */}
                <TabsContent value="lease-payments" className="mt-4 text-xs">
                  <LeasePaymentsTab propertyId={selectedProperty.id} restricted={register?.financials_restricted ?? true} canManage={isManager} />
                </TabsContent>

                {/* Tab: Maintenance & Assets */}
                <TabsContent value="maintenance" className="mt-4 text-xs">
                  <MaintenanceAssetsTab register={register} propertyId={selectedProperty.id} canManage={isManager} />
                </TabsContent>

                {/* Tab: Utilities & Insurance */}
                <TabsContent value="utilities" className="mt-4 text-xs">
                  <UtilitiesInsuranceTab register={register} propertyId={selectedProperty.id} canManage={isManager} />
                </TabsContent>

                {/* Tab: Compliance */}
                <TabsContent value="compliance" className="mt-4 text-xs">
                  <ComplianceTab register={register} propertyId={selectedProperty.id} canManage={isManager} />
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
                                {doc.signature_status && doc.signature_status !== 'UNKNOWN' && doc.signature_status !== 'NOT_APPLICABLE' && (
                                  <StatusBadge value={doc.signature_status} />
                                )}
                                {doc.expiry_date && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] ${doc.expiry_date < new Date().toISOString().slice(0, 10) ? 'border-rose-500/40 text-rose-600' : ''}`}
                                  >
                                    {doc.expiry_date < new Date().toISOString().slice(0, 10) ? 'Expired' : 'Expires'} {fmtDate(doc.expiry_date)}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                                <span>Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</span>
                                {doc.document_date && <span>• Document date: {fmtDate(doc.document_date)}</span>}
                                {doc.version != null && <span>• v{doc.version}</span>}
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
                                {insp.status && <StatusBadge value={insp.status} />}
                                {insp.follow_up_required && (
                                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                    Follow-up required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Date: {insp.inspection_date} • Inspector: {insp.inspector_name || 'Licensed Inspector'} ({insp.inspection_company || 'Independent'})
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Scheduled: {fmtDate(insp.scheduled_date)} • Completed: {fmtDate(insp.completed_date)} • Next inspection: {fmtDate(insp.next_inspection_date)}
                                {insp.document_title ? ` • Report: ${insp.document_title}` : ''}
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
                              By <strong>{log.actor_name || 'System'}</strong> • Action: {humanize(log.activity_type)}
                              {log.event_date ? ` • Event date: ${fmtDate(log.event_date)}` : ''}
                              {log.related_record_type ? ` • Related: ${humanize(log.related_record_type)}` : ''}
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
        </div>
      )}



      {/* Add Property via Document Extraction Modal */}
      <AddPropertyDocumentModal
        isOpen={isAddDocModalOpen}
        onClose={() => setIsAddDocModalOpen(false)}
        onPropertyCreated={(newProp) => {
          queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
          queryClient.invalidateQueries({ queryKey: ['real-estate-portfolio-summary'] });
          setSelectedPropertyId(newProp.id);
          navigate(`/real-estate/properties/${newProp.id}`);
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
            navigate(`/real-estate/properties/${savedProp.id}`);
          }}
        />
      )}

      {/* Add Property Manual Dialog */}
      <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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

            {/* Register details */}
            <h4 className="col-span-2 pt-2 font-bold text-foreground border-t border-border">Classification & status</h4>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Property Subtype</label>
              <Input
                placeholder="e.g. High-rise, Strata unit"
                value={newProp.property_subtype || ''}
                onChange={(e) => setNewProp({ ...newProp, property_subtype: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Usage Type</label>
              <Input
                placeholder="e.g. Headquarters, Staff housing"
                value={newProp.usage_type || ''}
                onChange={(e) => setNewProp({ ...newProp, usage_type: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Property Status</label>
              <Select
                value={newProp.status || 'ACTIVE'}
                onValueChange={(val) => setNewProp({ ...newProp, status: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Occupancy Status</label>
              <Select
                value={newProp.occupancy_status || 'UNKNOWN'}
                onValueChange={(val) => setNewProp({ ...newProp, occupancy_status: val as Property['occupancy_status'] })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OCCUPIED">Occupied</SelectItem>
                  <SelectItem value="PARTIALLY_OCCUPIED">Partially occupied</SelectItem>
                  <SelectItem value="VACANT">Vacant</SelectItem>
                  <SelectItem value="UNDER_RENOVATION">Under renovation</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="font-medium text-foreground">Description</label>
              <Textarea
                rows={2}
                value={newProp.description || ''}
                onChange={(e) => setNewProp({ ...newProp, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <h4 className="col-span-2 pt-2 font-bold text-foreground border-t border-border">Identifiers</h4>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Parcel ID</label>
              <Input
                value={newProp.parcel_id || ''}
                onChange={(e) => setNewProp({ ...newProp, parcel_id: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Lot Number</label>
              <Input
                value={newProp.lot_number || ''}
                onChange={(e) => setNewProp({ ...newProp, lot_number: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Building Identifier</label>
              <Input
                value={newProp.building_identifier || ''}
                onChange={(e) => setNewProp({ ...newProp, building_identifier: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Unit Identifier</label>
              <Input
                value={newProp.unit_number || ''}
                onChange={(e) => setNewProp({ ...newProp, unit_number: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="font-medium text-foreground">Legal Property Description</label>
              <Textarea
                rows={2}
                placeholder="e.g. Lot 9, Block 2, Plan 1234"
                value={newProp.legal_description || ''}
                onChange={(e) => setNewProp({ ...newProp, legal_description: e.target.value })}
                className="text-xs"
              />
            </div>

            <h4 className="col-span-2 pt-2 font-bold text-foreground border-t border-border">Physical details</h4>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Area Measurement Unit</label>
              <Select
                value={newProp.measurement_unit || 'sqft'}
                onValueChange={(val) => setNewProp({ ...newProp, measurement_unit: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqft">Square feet</SelectItem>
                  <SelectItem value="sqm">Square metres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Building Area</label>
              <Input
                type="number"
                min={0}
                value={newProp.building_area ?? ''}
                onChange={(e) => setNewProp({ ...newProp, building_area: optionalNumber(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Usable / Rentable Area</label>
              <Input
                type="number"
                min={0}
                value={newProp.usable_area ?? ''}
                onChange={(e) => setNewProp({ ...newProp, usable_area: optionalNumber(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Land Area</label>
              <Input
                type="number"
                min={0}
                value={newProp.land_area ?? ''}
                onChange={(e) => setNewProp({ ...newProp, land_area: optionalNumber(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Year Built</label>
              <Input
                type="number"
                min={1000}
                max={2200}
                value={newProp.year_built ?? ''}
                onChange={(e) => setNewProp({ ...newProp, year_built: optionalNumber(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Number of Floors</label>
              <Input
                type="number"
                min={0}
                value={newProp.floor_count ?? ''}
                onChange={(e) => setNewProp({ ...newProp, floor_count: optionalNumber(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Parking Spaces</label>
              <Input
                type="number"
                min={0}
                value={newProp.parking_spaces ?? ''}
                onChange={(e) => setNewProp({ ...newProp, parking_spaces: optionalNumber(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>

            {/* Owned properties: ownership & acquisition */}
            {newProp.ownership_type === 'OWNED' && (
              <>
                <h4 className="col-span-2 pt-2 font-bold text-foreground border-t border-border">Ownership & acquisition</h4>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Legal Owner</label>
                  <Input
                    value={newProp.legal_owner || ''}
                    onChange={(e) => setNewProp({ ...newProp, legal_owner: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Owning Company</label>
                  <Input
                    value={newProp.owning_company || ''}
                    onChange={(e) => setNewProp({ ...newProp, owning_company: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Ownership Interest (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={newProp.ownership_interest ?? ''}
                    onChange={(e) => setNewProp({ ...newProp, ownership_interest: optionalNumber(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Title Reference</label>
                  <Input
                    value={newProp.title_number || ''}
                    onChange={(e) => setNewProp({ ...newProp, title_number: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Purchase Date</label>
                  <Input
                    type="date"
                    value={newProp.purchase_date || ''}
                    onChange={(e) => setNewProp({ ...newProp, purchase_date: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Purchase Price ({newProp.purchase_currency || 'USD'})</label>
                  <Input
                    type="number"
                    min={0}
                    value={newProp.purchase_price ?? ''}
                    onChange={(e) => setNewProp({ ...newProp, purchase_price: optionalNumber(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            {/* Leased properties: lease terms */}
            {newProp.ownership_type !== 'OWNED' && (
              <>
                <h4 className="col-span-2 pt-2 font-bold text-foreground border-t border-border">Lease details</h4>

                <div className="col-span-2 space-y-1">
                  <label className="font-medium text-foreground">Landlord</label>
                  <Input
                    value={newProp.landlord_name || ''}
                    onChange={(e) => setNewProp({ ...newProp, landlord_name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Lease Commencement</label>
                  <Input
                    type="date"
                    value={newProp.lease_commencement_date || ''}
                    onChange={(e) => setNewProp({ ...newProp, lease_commencement_date: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Lease End</label>
                  <Input
                    type="date"
                    value={newProp.lease_expiration_date || ''}
                    onChange={(e) => setNewProp({ ...newProp, lease_expiration_date: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Renewal Notice Deadline</label>
                  <Input
                    type="date"
                    value={newProp.renewal_notice_deadline || ''}
                    onChange={(e) => setNewProp({ ...newProp, renewal_notice_deadline: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Monthly Rent ({newProp.currency || 'USD'})</label>
                  <Input
                    type="number"
                    min={0}
                    value={newProp.monthly_rent ?? ''}
                    onChange={(e) => setNewProp({ ...newProp, monthly_rent: optionalNumber(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            <p className="col-span-2 text-[11px] text-muted-foreground">
              These details are stored on the property record. Detailed ownership and agreement records (multiple
              parties, amendments, maximum lease term) are shown in the property&apos;s detail tabs.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddPropertyOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newProp.name || !newProp.address || createPropMutation.isPending}
              onClick={() => createPropMutation.mutate(buildCreatePayload(newProp))}
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

      {/* Duplicate Property Merge & Resolution Modal */}
      {selectedProperty && selectedDuplicateItem && (
        <PropertyMergeModal
          isOpen={mergeModalOpen}
          onClose={() => setMergeModalOpen(false)}
          primaryProperty={selectedProperty}
          duplicateItem={selectedDuplicateItem}
          onMerged={(updatedProp) => {
            refetchDuplicates();
            queryClient.invalidateQueries({ queryKey: ['real-estate-property-details', selectedProperty.id] });
            queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
            setSelectedPropertyId(updatedProp.id);
          }}
        />
      )}

      {/* Delete Property Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Delete Property
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  This action is permanent and cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 text-xs space-y-2">
            <p className="text-foreground">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground font-semibold">{propertyToDelete?.name}</strong>?
            </p>
            {propertyToDelete?.address && (
              <p className="text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border text-[11px]">
                📍 {propertyToDelete.address}
                {propertyToDelete.unit_number ? `, Unit ${propertyToDelete.unit_number}` : ''}, {propertyToDelete.city}
              </p>
            )}
            <p className="text-muted-foreground text-[11px]">
              This will remove this property record and all its associated child data (configured units, inspections, and documents).
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deletePropMutation.isPending}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deletePropMutation.isPending || !propertyToDelete}
              onClick={() => {
                if (propertyToDelete) {
                  deletePropMutation.mutate(propertyToDelete.id);
                }
              }}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletePropMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
