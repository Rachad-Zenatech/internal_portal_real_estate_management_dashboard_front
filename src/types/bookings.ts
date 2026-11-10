// Stays & Availability types
export interface Unit {
  id: string;
  property_id: string;
  unit_code?: string | null;
  unit_number: string;
  unit_type?: string;
  floor?: string | null;
  floor_area?: number | null;
  area_unit?: 'sqft' | 'sqm' | string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number | null;
  guest_capacity: number;
  max_occupants: number;
  is_bookable: boolean;
  is_archived?: boolean;
  is_available_today?: boolean;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | 'INACTIVE' | string;
  amenities?: string[];
  employee_instructions?: string | null;
  restricted_access_info?: string | null;
  monthly_rent?: number;
  annual_tax?: number;
  monthly_hoa_fees?: number;
  currency: string;
  keybox_code?: string | null;
  access_instructions?: string | null;
  floor_plan_url?: string | null;
  notes?: string | null;
  property_name?: string;
  property_code?: string | null;
  city?: string;
  address?: string;
  country?: string;
  property_timezone?: string;
  current_stay?: Stay | null;
  active_maintenance?: MaintenanceBlock | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceBlock {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
}


export interface Stay {
  id: string;
  unit_id: string;
  employee_user_id?: string | null;
  user_id?: string | null;
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  purpose_of_stay?: string | null;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | string;
  special_requests?: string | null;
  notes?: string | null;
  is_my_stay?: boolean;
  property_id?: string | null;
  property_name?: string;
  property_city?: string;
  city?: string;
  address?: string;
  property_timezone?: string;
  unit_number?: string;
  unit_type?: string;
  unit_floor?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StayCreateRequest {
  unit_id: string;
  employee_user_id?: string | null;
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  check_in_date: string;
  check_out_date: string;
  guest_count?: number;
  purpose_of_stay?: string;
  status?: string;
  special_requests?: string;
  notes?: string;
}


/** "Unit 2605" for a bare number, and a label that already says what it is ("Unit 1", "Suite 4B", "#12") is left alone. */
export function formatUnitLabel(unitNumber?: string | null): string {
  const n = (unitNumber ?? '').trim();
  if (!n) return 'Unit N/A';
  return /^(unit|apt|apartment|suite|ste|flat|room|rm|#)/i.test(n) ? n : `Unit ${n}`;
}
