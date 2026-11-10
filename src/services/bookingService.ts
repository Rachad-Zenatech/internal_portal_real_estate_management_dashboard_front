import { apiClient } from './apiClient';
import type { MaintenanceBlock, Stay, StayCreateRequest, Unit } from '@/types/bookings';

export const bookingService = {
  // Units & Availability
  async getUnits(params?: {
    property_id?: string;
    city?: string;
    unit_type?: string;
    status?: string;
    is_bookable?: boolean;
    check_in?: string;
    check_out?: string;
    guest_count?: number;
    bedrooms?: number;
    available_only?: boolean;
    include_archived?: boolean;
  }): Promise<Unit[]> {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.unit_type && params.unit_type !== 'ALL') query.set('unit_type', params.unit_type);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.is_bookable !== undefined) query.set('is_bookable', String(params.is_bookable));
    if (params?.check_in) query.set('check_in', params.check_in);
    if (params?.check_out) query.set('check_out', params.check_out);
    if (params?.guest_count) query.set('guest_count', String(params.guest_count));
    if (params?.bedrooms) query.set('bedrooms', String(params.bedrooms));
    if (params?.available_only) query.set('available_only', 'true');
    if (params?.include_archived) query.set('include_archived', 'true');
    const qs = query.toString();
    return apiClient.get<Unit[]>(`/api/real-estate/units${qs ? `?${qs}` : ''}`);
  },

  async createUnit(data: Partial<Unit>): Promise<Unit> {
    return apiClient.post<Unit>('/api/real-estate/units', data);
  },

  async updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
    return apiClient.put<Unit>(`/api/real-estate/units/${id}`, data);
  },

  async archiveUnit(id: string, archive: boolean = true): Promise<Unit> {
    return apiClient.put<Unit>(`/api/real-estate/units/${id}/archive?archive=${archive}`, {});
  },

  // Maintenance Blocks
  async getMaintenanceBlocks(unitId?: string): Promise<MaintenanceBlock[]> {
    return apiClient.get<MaintenanceBlock[]>(`/api/real-estate/maintenance-blocks${unitId ? `?unit_id=${unitId}` : ''}`);
  },

  async createMaintenanceBlock(data: { unit_id: string; start_date: string; end_date: string; reason: string; notes?: string }): Promise<MaintenanceBlock> {
    return apiClient.post<MaintenanceBlock>('/api/real-estate/maintenance-blocks', data);
  },

  async deleteMaintenanceBlock(blockId: string): Promise<void> {
    return apiClient.delete(`/api/real-estate/maintenance-blocks/${blockId}`);
  },

  // Stays & Bookings
  async getStays(params?: {
    city?: string;
    unit_id?: string;
    property_id?: string;
    status?: string;
  }): Promise<Stay[]> {
    const query = new URLSearchParams();
    if (params?.city && params.city !== 'ALL') query.set('city', params.city);
    if (params?.unit_id) query.set('unit_id', params.unit_id);
    if (params?.property_id) query.set('property_id', params.property_id);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    const qs = query.toString();
    return apiClient.get<Stay[]>(`/api/real-estate/bookings${qs ? `?${qs}` : ''}`);
  },

  async createStay(data: StayCreateRequest): Promise<Stay> {
    return apiClient.post<Stay>('/api/real-estate/bookings', data);
  },

  async updateStayStatus(stayId: string, status: string, notes?: string): Promise<Stay> {
    return apiClient.put<Stay>(`/api/real-estate/bookings/${stayId}/status`, { status, notes });
  },
};
