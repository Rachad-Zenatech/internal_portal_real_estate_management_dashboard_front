import { Building2, MapPin, Ruler, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Property, PropertyAddressRecord, PropertyRegister } from '@/types/realEstate';
import {
  EMPTY, Field, FieldGrid, Section, SimpleTable, StatusBadge, fmtDateTime, fmtNumber, humanize,
} from './registerUi';
import type { TableColumn } from './registerUi';

function areaLine(value?: number | null, unit?: string | null, sqft?: number | null): string {
  if (!value) return EMPTY;
  const base = fmtNumber(value, unit || 'sqft');
  const normalized = sqft && unit && unit !== 'sqft' ? ` (${fmtNumber(sqft, 'sqft')})` : '';
  return `${base}${normalized}`;
}

function legacyAddress(property: Property): PropertyAddressRecord {
  return {
    id: 'legacy-physical',
    property_id: property.id,
    address_type: 'PHYSICAL',
    address_line1: property.address,
    address_line2: property.unit_number ? `Unit ${property.unit_number}` : null,
    city: property.city,
    state_province: property.state_province,
    postal_code: property.postal_code,
    country: property.country,
    latitude: property.latitude,
    longitude: property.longitude,
    is_primary: true,
  };
}

const ADDRESS_COLUMNS: TableColumn<PropertyAddressRecord>[] = [
  { header: 'Type', cell: (a) => <StatusBadge value={a.address_type} /> },
  {
    header: 'Address',
    cell: (a) => (
      <div>
        <div className="text-foreground">{a.address_line1}</div>
        {a.address_line2 && <div className="text-muted-foreground">{a.address_line2}</div>}
      </div>
    ),
  },
  { header: 'City', cell: (a) => a.city || EMPTY },
  { header: 'State / province', cell: (a) => a.state_province || EMPTY },
  { header: 'Postal code', cell: (a) => a.postal_code || EMPTY },
  { header: 'Country', cell: (a) => [a.country, a.country_code].filter(Boolean).join(' • ') || EMPTY },
  {
    header: 'Coordinates',
    cell: (a) =>
      a.latitude != null && a.longitude != null ? (
        <span className="font-mono">{Number(a.latitude).toFixed(5)}, {Number(a.longitude).toFixed(5)}</span>
      ) : (
        EMPTY
      ),
  },
  { header: 'Primary', cell: (a) => (a.is_primary ? <Badge variant="outline" className="text-[10px]">Primary</Badge> : EMPTY) },
];

export default function LocationPhysicalPanel({
  property,
  register,
}: {
  property: Property;
  register: PropertyRegister | undefined;
}) {
  const addresses = register && register.addresses.length > 0 ? register.addresses : [legacyAddress(property)];
  const characteristics = Object.entries(property.physical_characteristics ?? {});

  return (
    <div className="space-y-4">
      <Section title="Identification" icon={<Building2 className="w-4 h-4 text-primary" />}>
        <FieldGrid>
          <Field label="Property ID" value={property.id} mono />
          <Field label="Internal property code" value={property.property_code} mono />
          <Field label="Property name" value={property.name} />
          <Field label="Property type" value={property.property_type} />
          <Field label="Property subtype" value={property.property_subtype} />
          <Field label="Category" value={humanize(property.property_category)} />
          <Field label="Property status"><StatusBadge value={property.status} /></Field>
          <Field label="Occupancy status"><StatusBadge value={property.occupancy_status} /></Field>
          <Field label="Usage type" value={property.usage_type ? humanize(property.usage_type) : null} />
          <Field label="Parcel ID" value={property.parcel_id} mono />
          <Field label="Lot number" value={property.lot_number} mono />
          <Field label="Building identifier" value={property.building_identifier} mono />
          <Field label="Unit identifier" value={property.unit_number} mono />
          <Field label="Description" value={property.description} wide />
          <Field label="Legal property description" value={property.legal_description} wide />
        </FieldGrid>
      </Section>

      <Section title="Areas & parking" icon={<Ruler className="w-4 h-4 text-primary" />}>
        <FieldGrid>
          <Field label="Building area" value={areaLine(property.building_area, property.building_area_unit, property.building_area_sqft)} />
          <Field label="Usable / rentable area" value={areaLine(property.usable_area, property.usable_area_unit, property.usable_area_sqft)} />
          <Field label="Land area" value={areaLine(property.land_area, property.land_area_unit, property.land_area_sqft)} />
          <Field label="Area measurement unit" value={property.measurement_unit} />
          <Field label="Number of floors" value={property.floor_count} />
          <Field label="Year built" value={property.year_built} />
          <Field label="Parking spaces" value={property.parking_spaces} />
        </FieldGrid>
      </Section>

      <Section title="Addresses" icon={<MapPin className="w-4 h-4 text-primary" />}>
        <SimpleTable
          columns={ADDRESS_COLUMNS}
          rows={addresses}
          getKey={(a) => a.id}
          empty="No addresses recorded."
        />
        {register && register.addresses.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Showing the address stored on the property record. Legal, mailing and billing addresses can be added as separate address records.
          </p>
        )}
      </Section>

      <Section title="Physical characteristics" icon={<Settings2 className="w-4 h-4 text-primary" />}>
        {characteristics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {characteristics.map(([key, value]) => (
              <div key={key} className="p-2.5 bg-muted/30 rounded border border-border">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-medium text-foreground text-xs mt-0.5 block break-words">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No additional physical characteristics recorded.</p>
        )}
      </Section>

      <Section title="Administration">
        <FieldGrid>
          <Field label="Created" value={fmtDateTime(property.created_at)} />
          <Field label="Last updated" value={fmtDateTime(property.updated_at)} />
          <Field
            label="Archived"
            value={property.archived_at ? fmtDateTime(property.archived_at) : property.is_archived ? 'Yes' : 'No'}
          />
          <Field label="Internal notes" value={property.notes} wide />
        </FieldGrid>
      </Section>
    </div>
  );
}
