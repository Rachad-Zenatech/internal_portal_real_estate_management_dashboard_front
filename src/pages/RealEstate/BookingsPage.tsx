import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realEstateService } from '@/services/realEstateService';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  // New Booking State
  const [newBooking, setNewBooking] = useState({
    unit_id: '',
    employee_name: user?.full_name || '',
    employee_email: user?.email || '',
    employee_department: user?.department || 'Operations',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    guest_count: 1,
    purpose_of_stay: 'Business Travel',
    special_requests: '',
  });

  const handleOpenBookingModal = (prefill?: { unit_id?: string; check_in_date?: string }) => {
    if (prefill?.unit_id) {
      const checkIn = prefill.check_in_date || new Date().toISOString().split('T')[0];
      const checkOut = new Date(new Date(checkIn).getTime() + 4 * 86400000).toISOString().split('T')[0];
      setNewBooking((prev) => ({
        ...prev,
        unit_id: prefill.unit_id!,
        check_in_date: checkIn,
        check_out_date: checkOut,
      }));
    } else if (units.length > 0 && !newBooking.unit_id) {
      setNewBooking((prev) => ({ ...prev, unit_id: units[0].id }));
    }
    setIsBookModalOpen(true);
  };

  // Load Bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['real-estate-bookings', selectedCity, selectedStatus],
    queryFn: () => realEstateService.getBookings({ city: selectedCity, status: selectedStatus }),
  });

  // Load Units for the booking modal dropdown
  const { data: units = [] } = useQuery({
    queryKey: ['real-estate-units-all'],
    queryFn: () => realEstateService.getUnits(),
  });

  // Create Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: typeof newBooking) => realEstateService.createBooking(data),
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
      realEstateService.updateBookingStatus(stayId, status, notes),
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
          <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 font-medium">
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

  const selectedUnitDetails = units.find((u) => u.id === newBooking.unit_id);

  const stayNights = useMemo(() => {
    if (!newBooking.check_in_date || !newBooking.check_out_date) return 0;
    const cin = new Date(newBooking.check_in_date).getTime();
    const cout = new Date(newBooking.check_out_date).getTime();
    if (cout <= cin) return 0;
    return Math.round((cout - cin) / 86400000);
  }, [newBooking.check_in_date, newBooking.check_out_date]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 text-white border border-indigo-800/40 shadow-xl">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-indigo-200">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
            <span>Employee Stays & Desk-Booking Style Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Condo Availability & Bookings</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Reserve stays at company condos across Los Angeles, Dubai, London, Vancouver, Chicago,
            Dublin, Berlin, and Singapore for corporate business trips.
          </p>
        </div>

        <Button
          onClick={() => handleOpenBookingModal()}
          className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2 font-semibold shadow-lg shadow-indigo-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Book a Condo Stay</span>
        </Button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Availability & Stay Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>All Stays Directory ({filteredBookings.length})</span>
          </button>
        </div>
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
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
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
          <Card className="border border-border/70 overflow-hidden shadow-xs">
            <CardHeader className="py-3.5 px-4 bg-muted/20 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span>Registered Stays ({filteredBookings.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Click actions to Check In, Check Out, or Cancel a stay.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
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
                                {b.property_name || 'Corporate Condo'}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono font-bold">
                                Unit #{b.unit_number || 'N/A'}
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
                                  className="h-7 text-[11px] text-slate-600 hover:text-slate-700"
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
            </CardContent>
          </Card>
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
            {/* Unit Selector */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Condo / Unit</label>
              <Select
                value={newBooking.unit_id}
                onValueChange={(val) => setNewBooking({ ...newBooking, unit_id: val })}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Choose unit..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.city} • {u.property_name} (Unit #{u.unit_number}) - {u.bedrooms} Bed / {u.max_occupants} Guests max
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedUnitDetails && (
                <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>{selectedUnitDetails.property_name} • Unit #{selectedUnitDetails.unit_number}</span>
                    <Badge variant="outline" className="text-[10px] bg-background">
                      {selectedUnitDetails.city}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px]">{selectedUnitDetails.address}</div>
                  <div className="flex gap-3 text-[11px] text-indigo-600 dark:text-indigo-300 pt-0.5">
                    <span>{selectedUnitDetails.bedrooms} Bedrooms</span>
                    <span>•</span>
                    <span>{selectedUnitDetails.bathrooms} Bathrooms</span>
                    {selectedUnitDetails.square_feet && (
                      <>
                        <span>•</span>
                        <span>{selectedUnitDetails.square_feet} sq ft</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Max {selectedUnitDetails.max_occupants} Guests</span>
                  </div>
                </div>
              )}
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
                  max={selectedUnitDetails?.max_occupants || 6}
                  value={newBooking.guest_count}
                  onChange={(e) => setNewBooking({ ...newBooking, guest_count: parseInt(e.target.value) || 1 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Stay Dates
                </span>
                {stayNights > 0 && (
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
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Check-out Date</label>
                  <Input
                    type="date"
                    value={newBooking.check_out_date}
                    onChange={(e) => setNewBooking({ ...newBooking, check_out_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
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
