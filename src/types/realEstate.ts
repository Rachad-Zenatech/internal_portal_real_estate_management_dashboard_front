export type PropertyCategory = 
  | 'LEASED_OFFICE' 
  | 'OWNED_HQ' 
  | 'COMPANY_CONDO' 
  | 'RD_FACILITY' 
  | 'WAREHOUSE' 
  | 'CO_WORKING';

export interface Property {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  postal_code?: string | null;
  property_category?: PropertyCategory | string;
  property_type: string;
  status: 'ACTIVE' | 'ACQUISITION_IN_PROGRESS' | 'MAINTENANCE' | 'DISPOSED' | string;
  
  // Physical & Occupancy Specs
  square_feet?: number;
  max_capacity?: number;
  current_occupancy?: number;
  utilization_rate?: number;
  floor_count?: number;
  floor_plan_url?: string | null;
  floor_plans?: Array<{ title?: string; url?: string; floor_number?: number; sq_ft?: number }>;
  
  // Financials & Operating Costs
  monthly_rent?: number;
  monthly_cam?: number;
  annual_property_tax?: number;
  monthly_utilities_other?: number;
  total_monthly_cost_usd?: number;
  currency?: string;
  
  // Lease Terms & Critical Dates
  lease_type?: string;
  lease_commencement_date?: string | null;
  lease_expiration_date?: string | null;
  renewal_notice_deadline?: string | null;
  break_option_date?: string | null;
  landlord_name?: string | null;
  landlord_contact?: string | null;
  
  // M&A Impact & Acquisitions Context (Pat, CEO)
  is_ma_acquisition?: boolean;
  acquisition_entity_name?: string | null;
  acquisition_date?: string | null;
  integration_status?: 'INTEGRATED' | 'TRANSITIONING' | 'EXIT_EVALUATION' | string;
  
  // Key Stakeholders & Tracking
  primary_contact?: string | null;
  source_spreadsheet_ref?: string | null;
  notes?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  unit_count?: number;
  available_units?: number;
  units?: Unit[];
  documents?: PropertyDocument[];
  obligations?: PropertyObligation[];
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number | null;
  floor_plan_url?: string | null;
  max_occupants: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | string;
  monthly_rent?: number;
  annual_tax?: number;
  monthly_hoa_fees?: number;
  currency: string;
  keybox_code?: string | null;
  access_instructions?: string | null;
  notes?: string | null;
  property_name?: string;
  city?: string;
  country?: string;
  address?: string;
  stays?: Stay[];
  documents?: PropertyDocument[];
  obligations?: PropertyObligation[];
  created_at?: string;
  updated_at?: string;
}

export interface Stay {
  id: string;
  unit_id: string;
  user_id?: string | null;
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  purpose_of_stay?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  special_requests?: string | null;
  unit_number?: string;
  property_name?: string;
  city?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StayCreateRequest {
  unit_id: string;
  employee_name: string;
  employee_email: string;
  employee_department?: string;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  purpose_of_stay?: string;
  special_requests?: string;
  status?: string;
}

export interface PropertyDocument {
  id: string;
  property_id?: string | null;
  unit_id?: string | null;
  title: string;
  document_type: 'DEED' | 'CLOSING_STATEMENT' | 'LEASE' | 'FLOOR_PLAN' | 'INSURANCE' | 'INSPECTION' | 'TAX_RECEIPT' | 'SEPA' | 'OTHER' | string;
  file_url: string;
  file_size_bytes?: number | null;
  mime_type?: string;
  uploaded_by_name?: string | null;
  uploaded_date?: string | null;
  notes?: string | null;
  property_name?: string | null;
  unit_number?: string | null;
  city?: string | null;
  created_at?: string;
}

export interface PropertyObligation {
  id: string;
  property_id?: string | null;
  unit_id?: string | null;
  obligation_type: 'RENT' | 'ANNUAL_TAX' | 'HOA_CONDO_FEE' | 'CAM_ASSESSMENT' | 'INSPECTION_FEE' | 'INSURANCE_PREMIUM' | string;
  frequency?: 'MONTHLY' | 'ANNUALLY' | 'ONE_TIME' | 'QUARTERLY';
  amount: number;
  currency: string;
  due_date: string;
  paid_date?: string | null;
  paid_by?: string | null;
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE' | 'UPCOMING';
  is_paid?: boolean;
  reference_number?: string | null;
  reference_invoice?: string | null;
  notes?: string | null;
  unit_number?: string;
  property_name?: string;
  city?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CriticalDateItem {
  property_id: string;
  property_name: string;
  city: string;
  country: string;
  date_type: 'LEASE_EXPIRATION' | 'RENEWAL_DEADLINE' | 'BREAK_OPTION' | string;
  target_date: string;
  days_remaining: number;
  monthly_cost: number;
  landlord_name?: string | null;
}

export interface MAImpactSummary {
  total_ma_properties: number;
  total_acquired_sqft: number;
  total_acquired_capacity: number;
  active_acquisitions: Array<{
    acquisition_entity_name: string;
    properties_count: number;
    total_sqft: number;
    total_capacity: number;
    deal_date?: string | null;
  }>;
}

export interface RealEstateSummary {
  // Global Asset Metrics
  total_properties: number;
  total_square_feet: number;
  total_headcount_capacity: number;
  total_current_occupancy: number;
  global_utilization_rate: number;
  
  // Financial Commitments
  total_monthly_rent_usd: number;
  total_monthly_cam_usd: number;
  total_annual_obligations_usd: number;
  total_monthly_obligations_usd?: number;
  average_cost_per_sqft_annual: number;
  
  // Category Counts
  offices_count: number;
  condos_count: number;
  labs_facilities_count: number;
  owned_hq_count: number;
  cities_count: number;
  countries_count?: number;
  cities?: string[];
  
  // M&A Impact (Pat, CEO)
  ma_impact: MAImpactSummary;
  upcoming_critical_dates: CriticalDateItem[];
  overdue_payments_count: number;
  
  // Stays & Condos
  total_units: number;
  available_units: number;
  occupied_units?: number;
  maintenance_units?: number;
  active_stays_count: number;
  upcoming_stays_count: number;
  pending_payments_count?: number;
}

export interface SpreadsheetRowImport {
  name: string;
  city: string;
  country: string;
  address: string;
  property_category?: PropertyCategory | string;
  square_feet?: number;
  max_capacity?: number;
  current_occupancy?: number;
  monthly_rent?: number;
  monthly_cam?: number;
  annual_property_tax?: number;
  lease_type?: string;
  lease_commencement_date?: string;
  lease_expiration_date?: string;
  renewal_notice_deadline?: string;
  landlord_name?: string;
  is_ma_acquisition?: boolean;
  acquisition_entity_name?: string;
  primary_contact?: string;
  notes?: string;
}

export interface BulkImportPayload {
  source_filename: string;
  rows: SpreadsheetRowImport[];
}

export interface BulkImportResponse {
  success: boolean;
  imported_count: number;
  updated_count: number;
  total_processed: number;
  message: string;
}
