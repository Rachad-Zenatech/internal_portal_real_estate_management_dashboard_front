import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ResearchFieldMeta from './ResearchFieldMeta';
import PropertyTypeAutocomplete from './PropertyTypeAutocomplete';
import type { AreaUnit, PropertyFields, PropertyInput, ResearchClaim } from '@/types/realEstate';

/** One badge per item. Type an item and press Enter or comma to add it (a pasted comma-separated list becomes several). */
function TagList({ id, items, disabled, onChange }: { id: string; items: string[]; disabled?: boolean; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = (text: string) => {
    const incoming = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (!incoming.length) return;
    const known = new Set(items.map((i) => i.toLowerCase()));
    onChange([...items, ...incoming.filter((t, i) => !known.has(t.toLowerCase()) && incoming.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              {item}
              {!disabled && (
                <button type="button" aria-label={`Remove ${item}`} className="rounded-full p-0.5 hover:bg-foreground/10" onClick={() => onChange(items.filter((i) => i !== item))}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <Input
          id={id}
          value={draft}
          placeholder="Add an amenity and press Enter"
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(draft); }
            else if (e.key === 'Backspace' && !draft && items.length) onChange(items.slice(0, -1));
          }}
          onBlur={() => add(draft)}
        />
      )}
      {disabled && items.length === 0 && <p className="text-sm text-muted-foreground/60">–</p>}
    </div>
  );
}

type FieldKind = 'text' | 'int' | 'decimal' | 'area' | 'select' | 'textarea' | 'list';

interface FieldDef {
  key: keyof PropertyFields;
  label: string;
  kind?: FieldKind;
  wide?: boolean;
  options?: { value: string; label: string }[];
  /** For areas: the column holding the unit the area was recorded in. */
  unitKey?: keyof PropertyFields;
  hint?: string;
  /** Technical fields, shown in a collapsed group at the end of the section. */
  advanced?: boolean;
  required?: boolean;
  /** Required, but the system fills it in (from the selected address). */
  automatic?: boolean;
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
  advancedLabel?: string;
}

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: 'sqft', label: 'sq ft' },
  { value: 'sqm', label: 'm²' },
  { value: 'acres', label: 'acres' },
  { value: 'hectares', label: 'hectares' },
  { value: 'tsubo', label: 'tsubo' },
];

export const PROPERTY_SECTIONS: SectionDef[] = [
  {
    title: 'Identity',
    fields: [
      { key: 'property_name', label: 'Property name', wide: true, required: true },
      { key: 'property_reference', label: 'Internal reference', hint: 'For example 009. Never used as a unit number.' },
      { key: 'property_type', label: 'Property type', hint: 'Pick a common type or type your own.' },
      { key: 'holding_type', label: 'Holding type', kind: 'select', options: opts(['owned', 'leased', 'managed', 'unknown']) },
      { key: 'record_status', label: 'Record status', kind: 'select', options: opts(['draft', 'active', 'archived']) },
    ],
  },
  {
    title: 'Address',
    advancedLabel: 'Original address, coordinates and geocoding (filled in automatically from the address)',
    fields: [
      { key: 'country_code', label: 'Country code', hint: 'For example CA, US, DE', required: true },
      { key: 'state_province_region', label: 'State / province / region', required: true },
      { key: 'city', label: 'City', required: true },
      { key: 'district_neighbourhood', label: 'District / neighbourhood' },
      { key: 'postal_code', label: 'Postal code', required: true },
      { key: 'street_number', label: 'Street number', required: true },
      { key: 'street_name', label: 'Street name', required: true },
      { key: 'unit_number', label: 'Unit / apartment', required: true },
      { key: 'building_name', label: 'Building / development name' },
      { key: 'address_original', label: 'Address as entered', wide: true, advanced: true, required: true, automatic: true },
      { key: 'address_formatted', label: 'Standardized address', wide: true, advanced: true, required: true, automatic: true },
      { key: 'latitude', label: 'Latitude', kind: 'decimal', advanced: true, required: true, automatic: true },
      { key: 'longitude', label: 'Longitude', kind: 'decimal', advanced: true, required: true, automatic: true },
      { key: 'geocoding_provider', label: 'Geocoding provider', advanced: true, required: true, automatic: true },
      { key: 'geocoding_id', label: 'Geocoding ID', advanced: true, required: true, automatic: true },
    ],
  },
  {
    title: 'Details',
    fields: [
      { key: 'bedrooms', label: 'Bedrooms', kind: 'int' },
      { key: 'dens', label: 'Dens', kind: 'int' },
      { key: 'full_bathrooms', label: 'Full bathrooms', kind: 'int' },
      { key: 'half_bathrooms', label: 'Half bathrooms', kind: 'int' },
      { key: 'floor_number', label: 'Floor number', hint: 'A number or a label such as Ground' },
      { key: 'building_total_floors', label: 'Building total floors', kind: 'int' },
      { key: 'year_built', label: 'Year built', kind: 'int' },
      { key: 'unit_area', label: 'Unit area', kind: 'area', unitKey: 'unit_area_unit' },
      { key: 'building_floor_area', label: 'Building floor area', kind: 'area', unitKey: 'building_floor_area_unit' },
      { key: 'land_area', label: 'Land area', kind: 'area', unitKey: 'land_area_unit' },
      { key: 'parking_spaces', label: 'Parking spaces', kind: 'int' },
      { key: 'parking_type', label: 'Parking type', hint: 'Underground, garage, outdoor…' },
      { key: 'storage_details', label: 'Storage details', hint: 'Locker identifier and description' },
      { key: 'furnished_status', label: 'Furnished status', kind: 'select', options: opts(['furnished', 'partial', 'unfurnished', 'unknown']) },
      { key: 'heating_type', label: 'Heating type' },
      { key: 'cooling_type', label: 'Cooling type' },
      { key: 'parcel_title_number', label: 'Parcel / title number' },
      { key: 'amenities', label: 'Amenities', kind: 'list', wide: true },
    ],
  },
  {
    title: 'Management',
    fields: [
      { key: 'building_management', label: 'Building management', hint: 'Management company or on-site management office' },
      { key: 'management_phone', label: 'Phone' },
      { key: 'management_email', label: 'Email' },
      { key: 'management_website', label: 'Website' },
    ],
  },
];

/** Required fields a person has to fill in. The others that are required (map location, address text) are filled in from the address. */
export function missingRequired(v: PropertyInput): { key: keyof PropertyFields; label: string }[] {
  const blank = (x: unknown) => x === null || x === undefined || (typeof x === 'string' && x.trim() === '');
  const out: { key: keyof PropertyFields; label: string }[] = [];
  for (const section of PROPERTY_SECTIONS) {
    for (const f of section.fields) {
      if (!f.required || f.automatic || !blank(v[f.key])) continue;
      if (f.key === 'unit_number' && v.no_unit) continue;
      if (f.key === 'postal_code' && v.no_postal_code) continue;
      out.push({ key: f.key, label: f.label });
    }
  }
  return out;
}

/** A starting name for a new property: the building (with the unit), else the street address (with the unit). */
export function defaultPropertyName(v: PropertyInput): string | null {
  const unit = v.unit_number ? ` – Unit ${v.unit_number}` : '';
  if (v.building_name) return `${v.building_name}${unit}`;
  const street = [v.street_number, v.street_name].filter(Boolean).join(' ');
  return street ? `${street}${unit}` : null;
}

interface PropertyFormProps {
  value: PropertyInput;
  onChange: (next: PropertyInput) => void;
  /** Fields that were filled in by research; they get a marker. */
  autoFilled?: ReadonlySet<string>;
  /** Research provenance by field: status, source, retrieval date and conflicting values. */
  fieldMeta?: Record<string, ResearchClaim>;
  /** Called when the user picks one of several conflicting researched values. */
  onUseValue?: (field: keyof PropertyFields, value: unknown, claim: ResearchClaim) => void;
  disabled?: boolean;
  /** Columns on wide screens: 2 inside the dialog, 3 on a full page. */
  columns?: 2 | 3;
  /** Fields to highlight as missing. */
  errors?: ReadonlySet<string>;
  /** Show the "no unit" / "no postal code" switches (when adding a property). */
  allowNoneFlags?: boolean;
}

const selectClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm';

export default function PropertyForm({ value, onChange, autoFilled, fieldMeta, onUseValue, disabled, columns = 3, errors, allowNoneFlags }: PropertyFormProps) {
  const grid = `grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-2${columns === 3 ? ' lg:grid-cols-3' : ''}`;
  const set = (key: keyof PropertyFields, next: unknown) => onChange({ ...value, [key]: next } as PropertyInput);
  const setNumber = (key: keyof PropertyFields, text: string, integer: boolean) => {
    const parsed = integer ? parseInt(text, 10) : parseFloat(text);
    set(key, Number.isNaN(parsed) ? null : parsed);
  };

  const renderField = ({ key, label, kind = 'text', wide, options, unitKey, hint, required, automatic }: FieldDef) => {
    const raw = value[key];
    const id = `property-field-${key}`;
    const marked = autoFilled?.has(key);
    let control;
    if (kind === 'select') {
      control = (
        <select id={id} disabled={disabled} value={(raw as string) ?? ''} onChange={(e) => set(key, e.target.value)} className={selectClass}>
          {options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    } else if (kind === 'textarea') {
      control = <Textarea id={id} rows={4} disabled={disabled} value={(raw as string) ?? ''} onChange={(e) => set(key, e.target.value || null)} />;
    } else if (kind === 'int' || kind === 'decimal') {
      control = (
        <Input id={id} type="number" step={kind === 'int' ? 1 : 'any'} disabled={disabled} value={(raw as number | null) ?? ''}
          onChange={(e) => setNumber(key, e.target.value, kind === 'int')} />
      );
    } else if (kind === 'area') {
      control = (
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
          <Input id={id} type="number" step="any" min={0} disabled={disabled} value={(raw as number | null) ?? ''}
            onChange={(e) => setNumber(key, e.target.value, false)} className="min-w-0" />
          <select aria-label={`${label} unit`} disabled={disabled} value={(value[unitKey!] as string) ?? ''} onChange={(e) => set(unitKey!, e.target.value || null)}
            className={selectClass}>
            <option value="">unit…</option>
            {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      );
    } else if (key === 'property_type') {
      control = <PropertyTypeAutocomplete id={id} value={(raw as string | null) ?? null} disabled={disabled} onChange={(next) => set(key, next)} />;
    } else if (kind === 'list') {
      control = <TagList id={id} items={(raw as string[] | null) ?? []} disabled={disabled} onChange={(next) => set(key, next)} />;
    } else {
      const noneFlag = key === 'unit_number' ? 'no_unit' : key === 'postal_code' ? 'no_postal_code' : null;
      control = (
        <Input
          id={id}
          disabled={disabled || (noneFlag !== null && allowNoneFlags && !!value[noneFlag])}
          value={(raw as string) ?? ''}
          aria-invalid={errors?.has(key) || undefined}
          className={errors?.has(key) ? 'border-destructive focus-visible:ring-destructive/30' : undefined}
          onChange={(e) => set(key, e.target.value || null)}
        />
      );
    }
    const noneFlagKey = key === 'unit_number' ? 'no_unit' : key === 'postal_code' ? 'no_postal_code' : null;
    return (
      <div key={key} className={`min-w-0 ${wide ? 'col-span-full' : ''}`}>
        <Label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {label}
          {required && <span className="text-destructive" title={automatic ? 'Required. Filled in automatically from the address.' : 'Required'}>*</span>}
          {marked && (
            <span className="rounded bg-sky-500/10 px-1 py-px text-[10px] font-medium text-sky-600 dark:text-sky-400">auto-filled</span>
          )}
        </Label>
        {control}
        {allowNoneFlags && noneFlagKey && (
          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              disabled={disabled}
              checked={!!value[noneFlagKey]}
              onChange={(e) => onChange({ ...value, [noneFlagKey]: e.target.checked, ...(e.target.checked ? { [key]: null } : {}) })}
            />
            {key === 'unit_number' ? 'This property has no unit (for example a house)' : 'This location has no postal code'}
          </label>
        )}
        {errors?.has(key) && <p className="mt-1 text-[11px] text-destructive">Required</p>}
        {hint && !fieldMeta?.[key] && <p className="mt-1 text-[11px] text-muted-foreground/80">{hint}</p>}
        {fieldMeta?.[key] && (
          <ResearchFieldMeta claim={fieldMeta[key]} onUseValue={onUseValue ? (v, alt) => onUseValue(key, v, alt) : undefined} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {PROPERTY_SECTIONS.map((section) => {
        const main = section.fields.filter((f) => !f.advanced);
        const advanced = section.fields.filter((f) => f.advanced);
        return (
          <section key={section.title} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">{section.title}</h3>
            <div className={grid}>{main.map(renderField)}</div>
            {advanced.length > 0 && (
              <details className="mt-4 rounded-md border border-dashed border-border px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{section.advancedLabel ?? 'More fields'}</summary>
                <div className={`${grid} mt-3`}>{advanced.map(renderField)}</div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
