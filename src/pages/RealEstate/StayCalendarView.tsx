import { useState, useMemo, memo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfDay,
  differenceInCalendarDays,
  parseISO,
  isValid,
} from 'date-fns';
import type { Stay, Unit } from '@/types/realEstate';
import { exportToCsv, type ExportColumn } from '@/lib/exportUtils';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  MapPin,
  CalendarDays,
  Download,
  X,
  AlertTriangle,
  Clock3,
  CircleCheck,
  CheckCircle2,
  LogIn,
  LogOut,
  XCircle,
  Key,
  Building2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export type StayStatusBucket = 'checkedIn' | 'arrivingSoon' | 'upcoming';

export const DUE_WINDOW_DAYS = 7;

export const STATUS_LABEL: Record<StayStatusBucket, string> = {
  checkedIn: 'Active / Checked In',
  arrivingSoon: 'Arriving This Week',
  upcoming: 'Upcoming Reservations',
};

/** Pill styling for calendar cells, matching M&A portal design exactly */
export const STATUS_PILL: Record<StayStatusBucket, string> = {
  checkedIn:
    'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/70',
  arrivingSoon:
    'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/70',
  upcoming:
    'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/70',
};

export const STATUS_ACCENT: Record<StayStatusBucket, string> = {
  checkedIn: 'text-emerald-600 dark:text-emerald-400',
  arrivingSoon: 'text-amber-600 dark:text-amber-400',
  upcoming: 'text-blue-600 dark:text-blue-400',
};

export const STATUS_RING: Record<StayStatusBucket, string> = {
  checkedIn: 'ring-2 ring-emerald-500',
  arrivingSoon: 'ring-2 ring-amber-500',
  upcoming: 'ring-2 ring-blue-500',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_OPTS = { weekStartsOn: 1 } as const;
const MAX_PILLS = 3;

interface StayCalendarProps {
  units: Unit[];
  bookings: Stay[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  onOpenBookingModal: (prefill?: { unit_id?: string; check_in_date?: string }) => void;
  onUpdateStatus: (stayId: string, status: string) => void;
}

export default function StayCalendarView({
  units,
  bookings,
  selectedCity,
  onCityChange,
  onOpenBookingModal,
  onUpdateStatus,
}: StayCalendarProps) {
  const [search, setSearch] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StayStatusBucket | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dayInPopup, setDayInPopup] = useState<Date | null>(null);
  const [selectedStayForDetail, setSelectedStayForDetail] = useState<Stay | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);

  // Compute status category for a stay
  const getStayCategory = (stay: Stay): StayStatusBucket => {
    if (stay.status === 'CHECKED_IN') return 'checkedIn';
    if (stay.check_in_date <= todayStr && stay.check_out_date >= todayStr) return 'checkedIn';

    const cin = parseISO(stay.check_in_date);
    if (isValid(cin)) {
      const daysUntil = differenceInCalendarDays(cin, today);
      if (daysUntil >= 0 && daysUntil <= DUE_WINDOW_DAYS) return 'arrivingSoon';
    }
    return 'upcoming';
  };

  // Scoped list of active/non-cancelled stays
  const scopedStays = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status === 'CANCELLED') return false;
      if (selectedCity !== 'ALL' && b.city?.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedUnitId !== 'ALL' && b.unit_id !== selectedUnitId) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matches =
          b.employee_name?.toLowerCase().includes(q) ||
          b.employee_email?.toLowerCase().includes(q) ||
          b.property_name?.toLowerCase().includes(q) ||
          b.city?.toLowerCase().includes(q) ||
          b.unit_number?.toLowerCase().includes(q) ||
          b.purpose_of_stay?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [bookings, selectedCity, selectedUnitId, search]);

  // Buckets for the 3 Status Cards
  const buckets = useMemo(() => {
    const result: Record<StayStatusBucket, Stay[]> = {
      checkedIn: [],
      arrivingSoon: [],
      upcoming: [],
    };
    scopedStays.forEach((stay) => {
      const cat = getStayCategory(stay);
      result[cat].push(stay);
    });
    return result;
  }, [scopedStays, todayStr, today]);

  // Stays overdue for checkout (checked in past checkout date)
  const overdueCheckouts = useMemo(() => {
    return scopedStays.filter(
      (s) => s.status === 'CHECKED_IN' && s.check_out_date && s.check_out_date < todayStr
    );
  }, [scopedStays, todayStr]);

  // Stays rendered in the calendar (filtered by card if clicked)
  const visibleStays = useMemo(() => {
    if (statusFilter) {
      return buckets[statusFilter];
    }
    return scopedStays;
  }, [statusFilter, buckets, scopedStays]);

  // Month stats & day grid
  const monthStart = startOfMonth(month);

  const { days, staysByDay, monthCount } = useMemo(() => {
    const grid = eachDayOfInterval({
      start: startOfWeek(monthStart, WEEK_OPTS),
      end: endOfWeek(endOfMonth(monthStart), WEEK_OPTS),
    });

    const byDay = new Map<string, Array<{ stay: Stay; status: StayStatusBucket }>>();
    const monthPrefix = format(monthStart, 'yyyy-MM');
    const inMonthSet = new Set<string>();

    visibleStays.forEach((stay) => {
      const category = getStayCategory(stay);
      const start = parseISO(stay.check_in_date);
      const end = parseISO(stay.check_out_date);

      if (!isValid(start) || !isValid(end)) return;

      const stayDays = eachDayOfInterval({ start, end });
      stayDays.forEach((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const entries = byDay.get(key);
        if (entries) {
          entries.push({ stay, status: category });
        } else {
          byDay.set(key, [{ stay, status: category }]);
        }

        if (key.startsWith(monthPrefix)) {
          inMonthSet.add(stay.id);
        }
      });
    });

    return { days: grid, staysByDay: byDay, monthCount: inMonthSet.size };
  }, [monthStart, visibleStays, todayStr, today]);

  // Stays for clicked day in popup
  const popupStays = useMemo(() => {
    if (!dayInPopup) return [];
    const key = format(dayInPopup, 'yyyy-MM-dd');
    const entries = staysByDay.get(key) || [];
    return entries.map((e) => e.stay);
  }, [dayInPopup, staysByDay]);

  // Unique cities & units
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.city) set.add(u.city);
    });
    return Array.from(set).sort();
  }, [units]);

  const hasFilters = Boolean(search || statusFilter || selectedCity !== 'ALL' || selectedUnitId !== 'ALL');

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(null);
    onCityChange('ALL');
    setSelectedUnitId('ALL');
  };

  // CSV Export matching M&A portal pattern
  const handleExportCsv = () => {
    try {
      const dataToExport = visibleStays.length > 0 ? visibleStays : bookings;
      const cols: ExportColumn<Stay>[] = [
        { header: 'Guest Name', accessor: (r) => r.employee_name || '' },
        { header: 'Email', accessor: (r) => r.employee_email || '' },
        { header: 'Department', accessor: (r) => r.employee_department || '' },
        { header: 'Condo Property', accessor: (r) => r.property_name || '' },
        { header: 'Unit Number', accessor: (r) => r.unit_number || '' },
        { header: 'City', accessor: (r) => r.city || '' },
        { header: 'Check-in Date', accessor: (r) => r.check_in_date || '' },
        { header: 'Check-out Date', accessor: (r) => r.check_out_date || '' },
        { header: 'Guests', accessor: (r) => r.guest_count || 1 },
        { header: 'Status', accessor: (r) => r.status || '' },
        { header: 'Purpose of Stay', accessor: (r) => r.purpose_of_stay || '' },
        { header: 'Special Requests', accessor: (r) => r.special_requests || '' },
      ];
      exportToCsv(dataToExport, cols, 'condo_stays_schedule');
      toast.success('Condo stays calendar exported to CSV');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export CSV');
    }
  };

  const statusCards: Array<{
    key: StayStatusBucket;
    count: number;
    caption: string;
    icon: typeof CheckCircle2;
  }> = [
    {
      key: 'checkedIn',
      count: buckets.checkedIn.length,
      caption: buckets.checkedIn.length
        ? `${buckets.checkedIn.length} currently occupying corporate condos`
        : 'No guests currently checked in',
      icon: CheckCircle2,
    },
    {
      key: 'arrivingSoon',
      count: buckets.arrivingSoon.length,
      caption: buckets.arrivingSoon.length
        ? `${buckets.arrivingSoon.length} check-ins within ${DUE_WINDOW_DAYS} days`
        : `Clear for ${DUE_WINDOW_DAYS} days`,
      icon: Clock3,
    },
    {
      key: 'upcoming',
      count: buckets.upcoming.length,
      caption: `Confirmed reservations beyond ${DUE_WINDOW_DAYS} days`,
      icon: CircleCheck,
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Search and Filters Bar (Matching M&A Follow-ups) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b pb-4">
        {/* Search */}
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-8.5 sm:h-9 text-xs sm:text-sm"
            placeholder="Search guest, property, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* City Filter */}
        <Select value={selectedCity} onValueChange={onCityChange}>
          <SelectTrigger className="w-[170px] sm:w-[190px] h-8.5 sm:h-9 text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1.5" />
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Global Cities</SelectItem>
            {availableCities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Unit Selector */}
        <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
          <SelectTrigger className="w-[180px] sm:w-[210px] h-8.5 sm:h-9 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1.5" />
            <SelectValue placeholder="All Units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Condo Units</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.city} • #{u.unit_number} ({u.property_name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Export CSV */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="h-8.5 sm:h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Export CSV</span>
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1 h-8.5 text-xs" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Overdue Checkout Alert Banner (Matching M&A Past Due Alert) */}
      {overdueCheckouts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-red-700 dark:text-red-300">
                {overdueCheckouts.length} stay{overdueCheckouts.length === 1 ? ' is' : 's are'} overdue for checkout
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {overdueCheckouts.slice(0, 3).map((stay, i) => (
                  <span key={stay.id}>
                    {i > 0 && ', '}
                    <button
                      className="underline-offset-2 hover:underline text-foreground/80 font-medium"
                      onClick={() => setSelectedStayForDetail(stay)}
                    >
                      {stay.employee_name} ({stay.city} #{stay.unit_number})
                    </button>
                  </span>
                ))}
                {overdueCheckouts.length > 3 && ` and ${overdueCheckouts.length - 3} more`}
                {' — verify departure or extend reservation.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 Interactive Status Filter Cards (Matching M&A Pipeline Follow-ups exactly) */}
      <div className="grid gap-3 sm:grid-cols-3">
        {statusCards.map(({ key, count, caption, icon: Icon }) => (
          <div
            key={key}
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === key}
            className={`cursor-pointer rounded-lg border bg-card p-3 sm:p-4 transition hover:shadow-xs ${
              statusFilter === key ? STATUS_RING[key] : ''
            }`}
            onClick={() => setStatusFilter((prev) => (prev === key ? null : key))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter((prev) => (prev === key ? null : key));
              }
            }}
          >
            <div className={`flex items-center gap-1.5 ${STATUS_ACCENT[key]}`}>
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{STATUS_LABEL[key]}</span>
            </div>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{count}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>
          </div>
        ))}
      </div>

      {/* The Calendar (Matching FollowUpCalendar.tsx exactly) */}
      <FollowUpCalendarGrid
        monthStart={monthStart}
        monthCount={monthCount}
        days={days}
        staysByDay={staysByDay}
        onMonthChange={setMonth}
        onDayClick={setDayInPopup}
      />

      {/* Day Popup Modal (Matching M&A Day Popup) */}
      <Dialog open={dayInPopup !== null} onOpenChange={(open) => !open && setDayInPopup(null)}>
        <DialogContent className="max-w-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dayInPopup ? format(dayInPopup, 'EEEE, MMMM d, yyyy') : ''}</DialogTitle>
            <DialogDescription>
              {popupStays.length} condo stay{popupStays.length === 1 ? '' : 's'} scheduled on this date.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2.5 overflow-auto py-1">
            {popupStays.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                No bookings on this day. Condos are available.
              </div>
            ) : (
              popupStays.map((stay) => {
                const category = getStayCategory(stay);
                return (
                  <div
                    key={stay.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3.5 transition-colors hover:bg-muted/50"
                  >
                    <button
                      className="min-w-0 flex-1 text-left cursor-pointer"
                      onClick={() => {
                        setDayInPopup(null);
                        setSelectedStayForDetail(stay);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="truncate font-semibold text-sm text-foreground">{stay.employee_name}</p>
                        <span
                          className={`inline-block rounded-sm border px-2 py-0.5 text-[10px] font-medium ${STATUS_PILL[category]}`}
                        >
                          {STATUS_LABEL[category]}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {stay.property_name || 'Corporate Condo'} • Unit #{stay.unit_number} ({stay.city})
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Dates: <span className="font-medium text-foreground">{stay.check_in_date} → {stay.check_out_date}</span> • {stay.guest_count} Guest{stay.guest_count === 1 ? '' : 's'}
                      </p>
                      {stay.purpose_of_stay && (
                        <p className="text-[11px] text-muted-foreground italic mt-0.5">
                          Purpose: {stay.purpose_of_stay}
                        </p>
                      )}
                    </button>

                    <div className="flex items-center gap-1 shrink-0 pt-1">
                      {stay.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onUpdateStatus(stay.id, 'CHECKED_IN');
                            setDayInPopup(null);
                          }}
                          className="h-7 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <LogIn className="w-3 h-3 mr-1" /> Check In
                        </Button>
                      )}
                      {stay.status === 'CHECKED_IN' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onUpdateStatus(stay.id, 'CHECKED_OUT');
                            setDayInPopup(null);
                          }}
                          className="h-7 text-[11px] text-slate-600 hover:text-slate-700"
                        >
                          <LogOut className="w-3 h-3 mr-1" /> Check Out
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex items-center justify-between pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const dateStr = dayInPopup ? format(dayInPopup, 'yyyy-MM-dd') : undefined;
                setDayInPopup(null);
                onOpenBookingModal({ check_in_date: dateStr });
              }}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Condo on this Date</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDayInPopup(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stay Details Modal */}
      <Dialog open={!!selectedStayForDetail} onOpenChange={(open) => !open && setSelectedStayForDetail(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">Condo Stay Details</DialogTitle>
                  <DialogDescription className="text-xs">
                    Booking ref #{selectedStayForDetail?.id?.slice(-8).toUpperCase()}
                  </DialogDescription>
                </div>
              </div>
              {selectedStayForDetail && (
                <span className={`rounded-sm border px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[getStayCategory(selectedStayForDetail)]}`}>
                  {selectedStayForDetail.status}
                </span>
              )}
            </div>
          </DialogHeader>

          {selectedStayForDetail && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5">
                  <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Traveler Information
                  </div>
                  <div className="font-bold text-sm text-foreground">{selectedStayForDetail.employee_name}</div>
                  <div className="text-muted-foreground">{selectedStayForDetail.employee_email}</div>
                  {selectedStayForDetail.employee_department && (
                    <div className="text-muted-foreground">Department: {selectedStayForDetail.employee_department}</div>
                  )}
                  <div className="text-muted-foreground pt-1">
                    Guests: <span className="font-semibold text-foreground">{selectedStayForDetail.guest_count}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5">
                  <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Condo Property
                  </div>
                  <div className="font-bold text-sm text-foreground">{selectedStayForDetail.property_name || 'Corporate Condo'}</div>
                  <div className="text-muted-foreground font-mono font-medium">
                    Unit #{selectedStayForDetail.unit_number} • {selectedStayForDetail.city}
                  </div>
                  {selectedStayForDetail.address && (
                    <div className="text-muted-foreground text-[11px]">{selectedStayForDetail.address}</div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Check-in Date</span>
                    <span className="font-bold text-sm text-foreground">{selectedStayForDetail.check_in_date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Check-out Date</span>
                    <span className="font-bold text-sm text-foreground">{selectedStayForDetail.check_out_date}</span>
                  </div>
                </div>
                <div className="border-t border-border/50 pt-2">
                  <span className="text-muted-foreground block text-[11px]">Purpose of Stay</span>
                  <span className="font-medium text-foreground">{selectedStayForDetail.purpose_of_stay || 'Business Travel'}</span>
                </div>
                {selectedStayForDetail.special_requests && (
                  <div className="border-t border-border/50 pt-2 text-amber-600 dark:text-amber-400">
                    <span className="font-semibold block text-[11px]">Special Requests:</span>
                    <span>{selectedStayForDetail.special_requests}</span>
                  </div>
                )}
              </div>

              {/* Check for unit keybox */}
              {(() => {
                const u = units.find((x) => x.id === selectedStayForDetail.unit_id);
                if (!u?.keybox_code) return null;
                return (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">Lockbox Access Code</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                        {u.keybox_code}
                      </div>
                      {u.access_instructions && (
                        <p className="text-[11px] text-muted-foreground pt-1">{u.access_instructions}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {selectedStayForDetail?.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdateStatus(selectedStayForDetail.id, 'CHECKED_IN');
                    setSelectedStayForDetail(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Check In Guest</span>
                </Button>
              )}
              {selectedStayForDetail?.status === 'CHECKED_IN' && (
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdateStatus(selectedStayForDetail.id, 'CHECKED_OUT');
                    setSelectedStayForDetail(null);
                  }}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-xs gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Check Out Guest</span>
                </Button>
              )}
              {['CONFIRMED', 'PENDING'].includes(selectedStayForDetail?.status || '') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedStayForDetail) {
                      onUpdateStatus(selectedStayForDetail.id, 'CANCELLED');
                      setSelectedStayForDetail(null);
                    }
                  }}
                  className="text-rose-600 hover:bg-rose-50 text-xs gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Stay</span>
                </Button>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => setSelectedStayForDetail(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Memoized calendar grid component exactly replicating FollowUpCalendar.tsx from M&A portal */
const FollowUpCalendarGrid = memo(function FollowUpCalendarGrid({
  monthStart,
  monthCount,
  days,
  staysByDay,
  onMonthChange,
  onDayClick,
}: {
  monthStart: Date;
  monthCount: number;
  days: Date[];
  staysByDay: Map<string, Array<{ stay: Stay; status: StayStatusBucket }>>;
  onMonthChange: (month: Date) => void;
  onDayClick: (day: Date) => void;
}) {
  return (
    <div>
      {/* Month Header (Matching M&A FollowUpCalendar exactly) */}
      <div className="flex items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{format(monthStart, 'MMMM yyyy')}</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {monthCount} stay{monthCount === 1 ? '' : 's'} this month
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => onMonthChange(startOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider"
            onClick={() => onMonthChange(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => onMonthChange(startOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid (Matching M&A FollowUpCalendar layout and styling) */}
      <div className="mt-6 grid grid-cols-7 border-l border-t">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="border-r border-b bg-card px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const entries = staysByDay.get(key) ?? [];
          const outside = !isSameMonth(day, monthStart);
          const today = isToday(day);
          const hidden = entries.length - MAX_PILLS;

          return (
            <div
              key={key}
              className={`min-h-[96px] sm:min-h-[105px] border-r border-b p-2 ${
                outside ? 'bg-muted/40' : 'bg-background'
              } ${entries.length ? 'cursor-pointer transition-colors hover:bg-muted/60' : ''}`}
              onClick={entries.length ? () => onDayClick(day) : undefined}
              role={entries.length ? 'button' : undefined}
              tabIndex={entries.length ? 0 : undefined}
              aria-label={entries.length ? `${format(day, 'MMMM d')} — ${entries.length} stays` : undefined}
              onKeyDown={
                entries.length
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDayClick(day);
                      }
                    }
                  : undefined
              }
            >
              {today ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                  {format(day, 'd')}
                </span>
              ) : (
                <span
                  className={`flex size-6 items-center justify-center text-xs font-medium ${
                    outside ? 'text-muted-foreground/60' : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              )}

              <div className="mt-1 space-y-1">
                {entries.slice(0, MAX_PILLS).map(({ stay, status }) => (
                  <div
                    key={stay.id}
                    title={`${stay.employee_name} (${stay.property_name || 'Condo'} #${stay.unit_number})`}
                    className={`truncate rounded-sm border px-2 py-1 text-[11px] leading-tight ${
                      outside ? 'border-border bg-muted text-muted-foreground' : STATUS_PILL[status]
                    }`}
                  >
                    {stay.employee_name}
                  </div>
                ))}
                {hidden > 0 && (
                  <div className="px-1 text-[11px] font-medium text-muted-foreground">+{hidden} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
