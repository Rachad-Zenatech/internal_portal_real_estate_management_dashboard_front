import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
import { bookingService } from '@/services/bookingService';
import { formatPropertyAddress } from '@/types/realEstate';
import { formatUnitLabel } from '@/types/bookings';
import { useAuth } from '@/lib/AuthContext';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  CalendarDays,
  XCircle,
  LogIn,
  LogOut,
  Sparkles,
  Filter,
  Building2,
  DoorOpen,
  BedDouble,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionCard, StatCard, surfaceClass } from '@/components/common/PageKit';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

import StayCalendarView from './StayCalendarView';

export default function BookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'calendar' | 'table'>('calendar');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // Opened from a property (?property=<id>): only that property's rooms and stays are shown.
  const propertyFilter = searchParams.get('property');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyFilter ?? '');

  // New Booking State
  const [newBooking, setNewBooking] = useState(() => ({
    unit_id: '',
    employee_name: user?.full_name || '',
    employee_email: user?.email || '',
    employee_department: user?.department || 'Operations',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    guest_count: 1,
    purpose_of_stay: 'Business Travel',
    special_requests: '',
  }));

  // Load Bookings
  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ['real-estate-bookings', selectedCity, selectedStatus],
    queryFn: () => bookingService.getStays({ city: selectedCity, status: selectedStatus }),
  });

  // Load All Units
  const { data: allUnits = [] } = useQuery({
    queryKey: ['real-estate-units-all'],
    queryFn: () => bookingService.getUnits(),
  });

  // Load All Existing Properties
  const { data: properties = [] } = useQuery({
    queryKey: ['real-estate-properties-all'],
    queryFn: () => realEstateService.getProperties(),
  });

  // Rooms and stays always belong to a property that exists in the portfolio; anything else is left out.
  const propertyIds = useMemo(() => new Set(properties.map((p) => p.id)), [properties]);
  const units = useMemo(
    () => allUnits.filter((u) => propertyIds.has(u.property_id) && (!propertyFilter || u.property_id === propertyFilter)),
    [allUnits, propertyIds, propertyFilter],
  );
  const bookings = useMemo(
    () => allBookings.filter((b) => !!b.property_id && propertyIds.has(b.property_id) && (!propertyFilter || b.property_id === propertyFilter)),
    [allBookings, propertyIds, propertyFilter],
  );
  const filteredProperty = propertyFilter ? properties.find((p) => p.id === propertyFilter) : undefined;

  const handleOpenBookingModal = (prefill?: { unit_id?: string; check_in_date?: string }) => {
    let targetUnitId = prefill?.unit_id || newBooking.unit_id;
    let targetPropId = selectedPropertyId;

    if (prefill?.unit_id) {
      targetUnitId = prefill.unit_id;
      const foundUnit = units.find((u) => u.id === prefill.unit_id);
      if (foundUnit) {
        targetPropId = foundUnit.property_id;
      }
    } else if (!targetPropId && properties.length > 0) {
      const firstCondo = properties[0];
      targetPropId = firstCondo.id;
      const propUnit = units.find((u) => u.property_id === targetPropId);
      if (propUnit) {
        targetUnitId = propUnit.id;
      }
    }

    if (targetPropId) {
      setSelectedPropertyId(targetPropId);
    }

    const checkIn = prefill?.check_in_date || newBooking.check_in_date || new Date().toISOString().split('T')[0];
    const checkOut = new Date(new Date(checkIn).getTime() + 4 * 86400000).toISOString().split('T')[0];

    setNewBooking((prev) => ({
      ...prev,
      unit_id: targetUnitId || '',
      check_in_date: checkIn,
      check_out_date: checkOut,
    }));
    setIsBookModalOpen(true);
  };

  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    const propUnits = units.filter((u) => u.property_id === propId);
    if (propUnits.length > 0) {
      setNewBooking((prev) => ({ ...prev, unit_id: propUnits[0].id }));
    } else {
      setNewBooking((prev) => ({ ...prev, unit_id: '' }));
    }
  };

  // Units belonging to the currently selected property
  const unitsForSelectedProperty = useMemo(() => {
    if (!selectedPropertyId) return units;
    return units.filter((u) => u.property_id === selectedPropertyId);
  }, [units, selectedPropertyId]);

  const selectedUnitDetails = useMemo(() => {
    if (newBooking.unit_id) {
      return units.find((u) => u.id === newBooking.unit_id) || null;
    }
    return unitsForSelectedProperty.length > 0 ? unitsForSelectedProperty[0] : null;
  }, [units, newBooking.unit_id, unitsForSelectedProperty]);

  const selectedPropertyDetails = useMemo(() => {
    if (selectedPropertyId) {
      return properties.find((p) => p.id === selectedPropertyId) || null;
    }
    if (selectedUnitDetails) {
      return properties.find((p) => p.id === selectedUnitDetails.property_id) || null;
    }
    return null;
  }, [properties, selectedPropertyId, selectedUnitDetails]);

  // Active bookings on the selected unit to prevent overlapping dates
  const activeBookingsForUnit = useMemo(() => {
    if (!newBooking.unit_id) return [];
    return bookings.filter((b) => b.unit_id === newBooking.unit_id && b.status !== 'CANCELLED');
  }, [bookings, newBooking.unit_id]);

  // Standard booking platform conflict check
  const bookingConflict = useMemo(() => {
    if (!newBooking.unit_id || !newBooking.check_in_date || !newBooking.check_out_date) {
      return null;
    }
    if (newBooking.check_out_date <= newBooking.check_in_date) {
      return {
        type: 'invalid_range',
        message: 'Check-out date must be strictly after check-in date (at least 1 night stay).',
      };
    }
    const overlapping = activeBookingsForUnit.find(
      (b) => newBooking.check_in_date < b.check_out_date && newBooking.check_out_date > b.check_in_date
    );
    if (overlapping) {
      return {
        type: 'overlap',
        stay: overlapping,
        message: `Unavailable: This condo is already booked by ${overlapping.employee_name} from ${overlapping.check_in_date} to ${overlapping.check_out_date}. Like other booking platforms, overlapping dates cannot be reserved.`,
      };
    }
    return null;
  }, [activeBookingsForUnit, newBooking.unit_id, newBooking.check_in_date, newBooking.check_out_date]);

  // Create Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: typeof newBooking) => bookingService.createStay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-summary'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      toast.success('Condo stay booked successfully!');
      setIsBookModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to book stay');
    },
  });

  // Update Booking Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ stayId, status, notes }: { stayId: string; status: string; notes?: string }) =>
      bookingService.updateStayStatus(stayId, status, notes),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-summary'] });
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      toast.success(`Booking status updated to ${vars.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update booking status');
    },
  });

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.employee_name.toLowerCase().includes(q) ||
      b.employee_email.toLowerCase().includes(q) ||
      (b.property_name && b.property_name.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.unit_number && b.unit_number.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
            <LogIn className="w-3 h-3 mr-1" /> Checked In
          </Badge>
        );
      case 'CONFIRMED':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed
          </Badge>
        );
      case 'CHECKED_OUT':
        return (
          <Badge className="bg-muted text-muted-foreground border-border font-medium">
            <LogOut className="w-3 h-3 mr-1" /> Checked Out
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-medium">
            <XCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground font-medium">
            <Clock className="w-3 h-3 mr-1" /> {status}
          </Badge>
        );
    }
  };

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      rooms: units.length,
      freeToday: units.filter((u) => u.is_available_today ?? u.status === 'AVAILABLE').length,
      inProgress: bookings.filter((b) => b.status === 'CHECKED_IN').length,
      upcoming: bookings.filter((b) => b.status === 'CONFIRMED' && b.check_in_date >= todayStr).length,
      maintenance: units.filter((u) => u.status === 'MAINTENANCE' || !!u.active_maintenance).length,
    };
  }, [units, bookings]);

  const stayNights = useMemo(() => {
    if (!newBooking.check_in_date || !newBooking.check_out_date) return 0;
    const cin = new Date(newBooking.check_in_date).getTime();
    const cout = new Date(newBooking.check_out_date).getTime();
    if (cout <= cin) return 0;
    return Math.round((cout - cin) / 86400000);
  }, [newBooking.check_in_date, newBooking.check_out_date]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        compact
        title="Stays & availability"
        description="Reserve stays at company condos for corporate business trips and see which rooms are free."
        actions={
          <Button onClick={() => handleOpenBookingModal()} className="gap-2 font-semibold cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Book a Condo Stay</span>
          </Button>
        }
      />

      {propertyFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Building2 className="h-4 w-4 text-primary" />
          <span>Showing only <strong>{filteredProperty ? formatPropertyAddress(filteredProperty) : 'the selected property'}</strong></span>
          <button type="button" className="ml-auto text-xs font-medium text-primary hover:underline" onClick={() => setSearchParams({})}>Show all properties</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<DoorOpen className="h-5 w-5" />} label="Rooms" value={stats.rooms} hint={`${stats.freeToday} free today`} tone="bg-indigo-500" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Free today" value={stats.freeToday} hint="Available to book now" tone="bg-emerald-500" />
        <StatCard icon={<BedDouble className="h-5 w-5" />} label="Stays in progress" value={stats.inProgress} hint={`${stats.upcoming} upcoming`} tone="bg-sky-500" />
        <StatCard icon={<Wrench className="h-5 w-5" />} label="Maintenance" value={stats.maintenance} hint="Rooms blocked for work" tone="bg-amber-500" />
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { key: 'calendar', label: 'Availability & Stay Calendar', Icon: CalendarDays },
          { key: 'table', label: `All Stays Directory (${filteredBookings.length})`, Icon: CalendarIcon },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              activeTab === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Availability & Stay Calendar */}
      {activeTab === 'calendar' && (
        <StayCalendarView
          units={units}
          bookings={bookings}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          onOpenBookingModal={handleOpenBookingModal}
          onUpdateStatus={(stayId, status) => updateStatusMutation.mutate({ stayId, status })}
        />
      )}

      {/* TAB 2: All Stays Directory Table */}
      {activeTab === 'table' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 ${surfaceClass}`}>
            <div className="flex flex-wrap items-center gap-2">
              {/* City Filter */}
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Cities" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Global Cities</SelectItem>
                  <SelectItem value="Los Angeles">🇺🇸 Los Angeles</SelectItem>
                  <SelectItem value="Chicago">🇺🇸 Chicago</SelectItem>
                  <SelectItem value="Vancouver">🇨🇦 Vancouver</SelectItem>
                  <SelectItem value="Berlin">🇩🇪 Berlin</SelectItem>
                  <SelectItem value="London">🇬🇧 London</SelectItem>
                  <SelectItem value="Dubai">🇦🇪 Dubai</SelectItem>
                  <SelectItem value="Dublin">🇮🇪 Dublin</SelectItem>
                  <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                  <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employee or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          {/* Bookings Table */}
          <SectionCard
            flush
            title={
              <span className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                <span>Registered Stays ({filteredBookings.length})</span>
              </span>
            }
            subtitle="Click actions to Check In, Check Out, or Cancel a stay."
            className="overflow-hidden"
          >
            <div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="text-xs font-semibold">Employee / Guest</TableHead>
                    <TableHead className="text-xs font-semibold">Property & Unit</TableHead>
                    <TableHead className="text-xs font-semibold">City</TableHead>
                    <TableHead className="text-xs font-semibold">Dates & Duration</TableHead>
                    <TableHead className="text-xs font-semibold">Purpose</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                        Loading condo bookings...
                      </TableCell>
                    </TableRow>
                  ) : filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                        No bookings found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((b) => {
                      const checkIn = new Date(b.check_in_date);
                      const checkOut = new Date(b.check_out_date);
                      const days = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

                      return (
                        <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                          {/* 1. Employee */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {b.employee_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-foreground">{b.employee_name}</div>
                                <div className="text-[11px] text-muted-foreground">{b.employee_email}</div>
                                {b.employee_department && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5">
                                    {b.employee_department}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. Property & Unit */}
                          <TableCell className="py-3">
                            <div>
                              <div className="font-medium text-xs text-foreground truncate max-w-[200px]">
                                {properties.find((p) => p.id === b.property_id)?.property_name || b.property_name || 'Property'}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono font-bold">
                                {formatUnitLabel(b.unit_number)}
                              </div>
                            </div>
                          </TableCell>

                          {/* 3. City */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{b.city || 'Global'}</span>
                            </div>
                          </TableCell>

                          {/* 4. Dates */}
                          <TableCell className="py-3">
                            <div className="text-xs space-y-0.5">
                              <div className="font-medium text-foreground">
                                {b.check_in_date} → {b.check_out_date}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {days} {days === 1 ? 'Night' : 'Nights'} • {b.guest_count}{' '}
                                {b.guest_count === 1 ? 'Guest' : 'Guests'}
                              </div>
                            </div>
                          </TableCell>

                          {/* 5. Purpose */}
                          <TableCell className="py-3">
                            <div className="text-xs text-muted-foreground max-w-[160px] truncate" title={b.purpose_of_stay || ''}>
                              {b.purpose_of_stay || 'Business Travel'}
                            </div>
                            {b.special_requests && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 italic truncate max-w-[160px]" title={b.special_requests}>
                                Note: {b.special_requests}
                              </div>
                            )}
                          </TableCell>

                          {/* 6. Status */}
                          <TableCell className="py-3">{getStatusBadge(b.status)}</TableCell>

                          {/* 7. Actions */}
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {b.status === 'CONFIRMED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ stayId: b.id, status: 'CHECKED_IN' })}
                                  className="h-7 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <LogIn className="w-3 h-3 mr-1" /> Check In
                                </Button>
                              )}
                              {b.status === 'CHECKED_IN' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ stayId: b.id, status: 'CHECKED_OUT' })}
                                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                  <LogOut className="w-3 h-3 mr-1" /> Check Out
                                </Button>
                              )}
                              {['CONFIRMED', 'PENDING'].includes(b.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateStatusMutation.mutate({ stayId: b.id, status: 'CANCELLED' })}
                                  className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Book Condo Modal - Generous & Spacious */}
      <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>Reserve a Company Condo Stay</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select an available condo unit, enter travel dates and employee details for instant confirmation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Property Selector (Mapping all existing properties) */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Select Property</span>
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {properties.length} Properties in Portfolio
                </span>
              </label>
              <Select
                value={selectedPropertyId}
                onValueChange={handleSelectProperty}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Choose a property or condo..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatPropertyAddress(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Unit Selector for Selected Property (if multiple units exist) */}
            {unitsForSelectedProperty.length > 1 && (
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Select Condo Unit / Suite</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {unitsForSelectedProperty.length} units at this location
                  </span>
                </label>
                <Select
                  value={newBooking.unit_id}
                  onValueChange={(val) => setNewBooking({ ...newBooking, unit_id: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Choose unit..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {unitsForSelectedProperty.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {formatUnitLabel(u.unit_number)} {u.unit_type ? `(${u.unit_type})` : ''} - {u.bedrooms} Bed / {u.guest_capacity || u.max_occupants || 2} Guests max
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selected Property & Unit Details Card */}
            {(selectedUnitDetails || selectedPropertyDetails) && (
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {(selectedPropertyDetails ? formatPropertyAddress(selectedPropertyDetails) : null) || selectedUnitDetails?.property_name || 'Property'}
                      {selectedUnitDetails?.unit_number ? ` • ${formatUnitLabel(selectedUnitDetails.unit_number)}` : ''}
                    </span>
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    {selectedPropertyDetails?.city || selectedUnitDetails?.city || 'Location'}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {selectedUnitDetails?.address || 'Corporate Executive Condo'}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-indigo-600 dark:text-indigo-300 pt-0.5">
                  <span>{selectedUnitDetails?.bedrooms || 2} Bedrooms</span>
                  <span>•</span>
                  <span>{selectedUnitDetails?.bathrooms || 1.5} Bathrooms</span>
                  {selectedUnitDetails?.square_feet && (
                    <>
                      <span>•</span>
                      <span>{selectedUnitDetails.square_feet} sq ft</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Max {selectedUnitDetails?.guest_capacity || selectedUnitDetails?.max_occupants || 4} Guests</span>
                </div>
              </div>
            )}

            {/* Currently Booked Dates (Transparency for user) */}
            {activeBookingsForUnit.length > 0 && (
              <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Existing Booked Ranges for this Condo:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeBookingsForUnit.map((b) => (
                    <Badge
                      key={b.id}
                      variant="outline"
                      className="text-[10px] border-amber-500/40 text-amber-900 dark:text-amber-200 bg-amber-500/10"
                    >
                      {b.check_in_date} → {b.check_out_date} ({b.employee_name})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dates with Live Conflict Checking */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Stay Dates (Check-in & Check-out)</span>
                </span>
                {stayNights > 0 && !bookingConflict && (
                  <Badge className="bg-indigo-600 text-white text-[10px]">
                    {stayNights} {stayNights === 1 ? 'Night' : 'Nights'} Duration
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Check-in Date</label>
                  <Input
                    type="date"
                    value={newBooking.check_in_date}
                    onChange={(e) => setNewBooking({ ...newBooking, check_in_date: e.target.value })}
                    className={`h-9 text-xs ${bookingConflict ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Check-out Date</label>
                  <Input
                    type="date"
                    value={newBooking.check_out_date}
                    onChange={(e) => setNewBooking({ ...newBooking, check_out_date: e.target.value })}
                    className={`h-9 text-xs ${bookingConflict ? 'border-rose-500 focus-visible:ring-rose-500' : ''}`}
                  />
                </div>
              </div>

              {/* Conflict Alert or Availability Confirmation */}
              {bookingConflict ? (
                <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-800 dark:text-rose-200">Dates Unavailable</p>
                    <p className="text-[11px] leading-relaxed">{bookingConflict.message}</p>
                  </div>
                </div>
              ) : stayNights > 0 ? (
                <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Dates available! No conflicting bookings detected.</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {newBooking.check_in_date} to {newBooking.check_out_date}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="font-semibold text-foreground block mb-1">Employee Name</label>
                <Input
                  value={newBooking.employee_name}
                  onChange={(e) => setNewBooking({ ...newBooking, employee_name: e.target.value })}
                  placeholder="Full name"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Email Address</label>
                <Input
                  value={newBooking.employee_email}
                  onChange={(e) => setNewBooking({ ...newBooking, employee_email: e.target.value })}
                  placeholder="corporate email"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="font-semibold text-foreground block mb-1">Department</label>
                <Input
                  value={newBooking.employee_department}
                  onChange={(e) => setNewBooking({ ...newBooking, employee_department: e.target.value })}
                  placeholder="e.g. Sales, Operations, Executive"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Guest Count</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedUnitDetails?.guest_capacity || selectedUnitDetails?.max_occupants || 6}
                  value={newBooking.guest_count}
                  onChange={(e) => setNewBooking({ ...newBooking, guest_count: parseInt(e.target.value) || 1 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Purpose & Special Requests */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Purpose of Stay</label>
              <Input
                value={newBooking.purpose_of_stay}
                onChange={(e) => setNewBooking({ ...newBooking, purpose_of_stay: e.target.value })}
                placeholder="e.g. Client Onsite, Executive Summit, Acquisition Review, Relocation"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Special Requests / Arrival Notes</label>
              <Input
                value={newBooking.special_requests}
                onChange={(e) => setNewBooking({ ...newBooking, special_requests: e.target.value })}
                placeholder="e.g. Late arrival, parking pass required, quiet floor"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsBookModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !newBooking.unit_id ||
                !newBooking.employee_name ||
                !newBooking.check_in_date ||
                !newBooking.check_out_date ||
                !!bookingConflict ||
                createBookingMutation.isPending
              }
              onClick={() => createBookingMutation.mutate(newBooking)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createBookingMutation.isPending ? 'Confirming...' : 'Confirm Reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
