// Property record: identity, address, details and management fields (see backend models/real_estate/real_estate_model.py).

export type HoldingType = 'owned' | 'leased' | 'managed' | 'unknown';
export type RecordStatus = 'draft' | 'active' | 'archived';
export type FurnishedStatus = 'furnished' | 'partial' | 'unfurnished' | 'unknown';
export type OccupancyStatus = 'vacant' | 'occupied' | 'unavailable' | 'unknown';
export type AreaUnit = 'sqft' | 'sqm' | 'acres' | 'hectares' | 'tsubo';

export interface PropertyFields {
  // Identity
  property_reference: string | null;
  property_name: string | null;
  property_type: string | null;
  holding_type: HoldingType;
  record_status: RecordStatus;

  // Address
  address_original: string | null;
  address_formatted: string | null;
  country_code: string | null;
  state_province_region: string | null;
  city: string | null;
  district_neighbourhood: string | null;
  postal_code: string | null;
  street_number: string | null;
  street_name: string | null;
  unit_number: string | null;
  building_name: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoding_provider: string | null;
  geocoding_id: string | null;

  // Details (each area keeps its original unit)
  bedrooms: number | null;
  dens: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  floor_number: string | null;
  building_total_floors: number | null;
  year_built: number | null;
  unit_area: number | null;
  unit_area_unit: AreaUnit | null;
  building_floor_area: number | null;
  building_floor_area_unit: AreaUnit | null;
  land_area: number | null;
  land_area_unit: AreaUnit | null;
  parking_spaces: number | null;
  parking_type: string | null;
  storage_details: string | null;
  furnished_status: FurnishedStatus;
  amenities: string[];
  heating_type: string | null;
  cooling_type: string | null;
  parcel_title_number: string | null;

  // Management
  building_management: string | null;
  management_phone: string | null;
  management_email: string | null;
  management_website: string | null;
}

export interface Property extends Partial<PropertyFields> {
  id: string;
  /** The system-generated unique id (same as id). */
  property_id?: string;
  /** Property name, else formatted address. */
  display_name?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Fields sent when creating or editing a property. no_unit / no_postal_code are request-only switches, not columns. */
export type PropertyInput = Partial<PropertyFields> & { no_unit?: boolean; no_postal_code?: boolean };

export interface AddressSuggestion {
  text: string;
  /** Street, city, state ZIP string, a readable one-line form of the address. */
  lookup_query: string;
  street?: string | null; // building number + street
  street_name?: string | null; // street without the number
  building_number?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocode_id?: string | null;
  /** True when the suggestion names one building, so research will not assume a property. */
  exact?: boolean;
  /** The typed text offered back as "search this address" because no suggestion matches it. */
  user_input?: boolean;
  /** The typed address has a unit number but no postal code: ask for the postal code to identify the unit. */
  needs_postal_code?: boolean;
}

// ─── Address research ────────────────────────────────────────────────────────

export type ResearchStatus =
  | 'RUNNING' | 'CACHED' | 'RESEARCHED' | 'PARTIAL' | 'NO_RESULTS' | 'FAILED' | 'AMBIGUOUS' | 'UNRESOLVED';
export type ClaimStatus = 'ai_suggested' | 'confirmed' | 'conflicting' | 'rejected';

export interface ResearchClaim {
  id?: string;
  value: unknown;
  status: ClaimStatus;
  source_type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  retrieved_at?: string | null;
  evidence?: string | null;
  match_level?: 'unit' | 'building' | 'address' | null;
  original_value?: string | null;
  original_unit?: string | null;
  currency?: string | null;
  normalized_unit?: string | null;
  expires_at?: string | null;
  conflicts: ResearchClaim[];
  differs_from_saved?: boolean;
  corroborating_sources?: number;
  /** The model's own confidence (0-1) and whether it marked this claim as the most reliable when sources disagree. */
  confidence?: number | null;
  preferred?: boolean;
  /** Sources disagree: this value was chosen by default as the most likely; the others are in `conflicts`. */
  auto_selected?: boolean;
  concept?: string;
}

export interface ResearchJobInfo {
  id: string;
  status: string;
  provider?: string | null;
  model?: string | null;
  search_calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd?: number | null;
  cost_is_estimate: boolean;
  finished_at?: string | null;
  error?: string | null;
  claims_saved?: number;
  /** What the running job is doing right now, and how far along it is (0-100). */
  stage?: string | null;
  progress?: number;
}

/** Whether web research can run right now, and what to fix if not. */
export interface ResearchStatusInfo {
  provider: string;
  ready: boolean;
  message: string | null;
  retry_after_seconds: number | null;
}

export type ManagementFieldName = 'building_management' | 'management_phone' | 'management_email' | 'management_website';
export type ManagementFieldStatus = 'found' | 'not_found' | 'conflicting' | 'search_failed';

export type ManagementRejectionCategory = 'wrong_building' | 'source_not_retrieved' | 'inaccessible' | 'unsupported';

/** Outcome of the dedicated building-management research. complete = it finished and all four fields have a documented outcome. */
export interface ManagementResearch {
  version: string;
  complete: boolean;
  attempted_at: string;
  /** "incomplete" when no source page could be retrieved (or the search tool failed): not the same as "contacts not found". */
  research_status: 'complete' | 'incomplete';
  reason?: string | null;
  fields: Record<ManagementFieldName, { value: string | null; status: ManagementFieldStatus; source_url: string | null; evidence: string | null }>;
  queries_executed: string[];
  pages_inspected: { url: string; status: 'opened' | 'inaccessible'; title?: string; discovered?: boolean }[];
  /** Candidates that were not used. Their values are never stored or shown. */
  rejected_candidates?: { field: ManagementFieldName; category: ManagementRejectionCategory; reason: string; source_url?: string | null }[];
  building_name_used?: string | null;
  building_name_rejections?: { name: string; category: string; reason: string }[];
  limitations: string[];
  provider?: string;
  model?: string;
  failure?: string | null;
}

export interface ResearchResult {
  status: ResearchStatus;
  /** database = served from the cache with no AI/search calls; new_research; shared_job = joined a running job */
  source: 'database' | 'new_research' | 'shared_job' | 'none';
  identity: { cache_key: string; property_id?: string | null; normalized_address: string; unit?: string | null } | null;
  researched_at: string | null;
  expires_at: string | null;
  review_required: boolean;
  suggested: Partial<PropertyFields>;
  fields: Record<string, ResearchClaim>;
  unmapped: ResearchClaim[];
  limitations: string[];
  management?: ManagementResearch | null;
  suggestions: AddressSuggestion[];
  message: string | null;
  retryable?: boolean;
  /** A provider that is missing, disabled or out of quota: a person has to fix it, the address is not the problem. */
  setup_required?: boolean;
  job: ResearchJobInfo | null;
}

export interface ResearchRequest {
  address?: string;
  country?: string | null;
  country_code?: string | null;
  street?: string | null;
  building_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  unit?: string | null;
  geocode_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  force_refresh?: boolean;
}

/** The name to show for a property: its name, else its formatted address, else the address assembled from its parts. */
export function formatPropertyAddress(
  p: Partial<Pick<PropertyFields, 'property_name' | 'address_formatted' | 'street_number' | 'street_name' | 'unit_number' | 'city' | 'state_province_region' | 'postal_code'>> & { display_name?: string },
): string {
  if (p.display_name) return p.display_name;
  if (p.property_name) return p.property_name;
  if (p.address_formatted) return p.address_formatted;
  const street = [p.street_number, p.street_name].filter(Boolean).join(' ');
  const locality = [p.city, [p.state_province_region, p.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [street, p.unit_number ? `Unit ${p.unit_number}` : null, locality].filter(Boolean).join(', ') || 'Unnamed property';
}

/** A file attached to a property (the bytes are fetched separately, for preview or download). */
export interface PropertyDocument {
  id: string;
  property_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by?: string | null;
  created_at: string;
}
