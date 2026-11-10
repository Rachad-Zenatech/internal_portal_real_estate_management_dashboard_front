import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, CalendarRange, CheckCircle2, DoorOpen, Globe2, MapPin, MapPinOff, PencilLine, Plus, Search, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { realEstateService } from '@/services/realEstateService';
import { bookingService } from '@/services/bookingService';
import { formatPropertyAddress } from '@/types/realEstate';
import type { Property } from '@/types/realEstate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader, SectionCard, StatCard } from '@/components/common/PageKit';

// The map library is large, so it loads only when the dashboard is opened.
const PropertyMap = lazy(() => import('@/components/Dashboard/PropertyMap'));

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  active: { dot: 'bg-emerald-500', label: 'Active' },
  draft: { dot: 'bg-amber-500', label: 'Draft' },
  archived: { dot: 'bg-slate-400', label: 'Archived' },
};
const statusOf = (p: Property) => (p.record_status && STATUS_STYLE[p.record_status] ? p.record_status : 'active');
const hasLocation = (p: Property) => typeof p.latitude === 'number' && typeof p.longitude === 'number';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const countryName = (code?: string | null) => {
  if (!code) return 'Unspecified';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

function tally<T>(items: T[], key: (item: T) => string): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  items.forEach((i) => counts.set(key(i), (counts.get(key(i)) ?? 0) + 1));
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function BarList({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.slice(0, 6).map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{r.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canCreate = hasPermission('REAL_ESTATE_PROPERTIES_CREATE');
  const canSeeStays = hasPermission('REAL_ESTATE_BOOKINGS_VIEW');

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['real-estate-properties', 'dashboard'],
    queryFn: () => realEstateService.getProperties({ limit: 1000 }),
  });
  const { data: rooms } = useQuery({
    queryKey: ['real-estate-units', 'available-count'],
    queryFn: () => bookingService.getUnits({ available_only: true }),
    enabled: canSeeStays,
    retry: false,
  });

  // Only rooms that belong to a property that exists, so this always agrees with the Stays page.
  const freeRooms = useMemo(() => {
    if (!rooms) return null;
    const ids = new Set(properties.map((p) => p.id));
    return rooms.filter((r) => ids.has(r.property_id));
  }, [rooms, properties]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const byStatus = { active: 0, draft: 0, archived: 0 };
    properties.forEach((p) => { byStatus[statusOf(p) as keyof typeof byStatus] += 1; });
    const places = new Set(properties.map((p) => `${p.country_code ?? ''}|${(p.city ?? '').toLowerCase()}`).filter((k) => k !== '|'));
    const countries = new Set(properties.map((p) => p.country_code).filter(Boolean));
    return { byStatus, cities: places.size, countries: countries.size, mapped: properties.filter(hasLocation).length };
  }, [properties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      if (filter !== 'all' && statusOf(p) !== filter) return false;
      if (!q) return true;
      return [formatPropertyAddress(p), p.property_reference, p.building_name, p.city, p.state_province_region, p.postal_code, p.country_code, p.property_type]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [properties, search, filter]);

  const byCountry = useMemo(() => tally(properties, (p) => countryName(p.country_code)), [properties]);
  const byType = useMemo(() => tally(properties, (p) => p.property_type || 'Unspecified'), [properties]);
  const recent = useMemo(
    () => [...properties].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 5),
    [properties],
  );

  // keep the list scrolled to the property picked on the map
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const firstName = user?.full_name?.split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const chips: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: properties.length },
    { key: 'active', label: 'Active', count: stats.byStatus.active },
    { key: 'draft', label: 'Draft', count: stats.byStatus.draft },
    { key: 'archived', label: 'Archived', count: stats.byStatus.archived },
  ];

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow={today}
        title={<>{greeting()}{firstName ? `, ${firstName}` : ''}</>}
        description="Every company property on one map. Pick a pin or a property to see its details."
        actions={
          <>
            {canSeeStays && (
              <Button variant="outline" className="gap-2 bg-background/70 backdrop-blur" onClick={() => navigate('/real-estate/stays')}>
                <CalendarRange className="h-4 w-4" />Stays &amp; availability
              </Button>
            )}
            {canCreate && (
              <Button className="gap-2 shadow-sm" onClick={() => navigate('/real-estate/properties?add=1')}>
                <Plus className="h-4 w-4" />Add property
              </Button>
            )}
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
        ) : (
          <>
            <StatCard tone="bg-indigo-500" icon={<Building2 className="h-5 w-5" />} label="Properties" to="/real-estate/properties" value={properties.length} hint={`${stats.mapped} on the map`} />
            <StatCard tone="bg-emerald-500" icon={<CheckCircle2 className="h-5 w-5" />} label="Active" to="/real-estate/properties?status=active" value={stats.byStatus.active} hint={`${stats.byStatus.archived} archived`} />
            <StatCard tone="bg-amber-500" icon={<PencilLine className="h-5 w-5" />} label="Drafts to review" to="/real-estate/properties?status=draft" value={stats.byStatus.draft} hint={stats.byStatus.draft ? 'Check and activate' : 'All reviewed'} />
            <StatCard tone="bg-sky-500" icon={<Globe2 className="h-5 w-5" />} label="Locations" to="/real-estate/properties" value={stats.cities} hint={`${stats.countries} ${stats.countries === 1 ? 'country' : 'countries'}`} />
            <StatCard tone="bg-violet-500" icon={<DoorOpen className="h-5 w-5" />} label="Rooms free today" to={canSeeStays ? '/real-estate/stays' : undefined} value={canSeeStays ? (freeRooms ? freeRooms.length : '…') : '–'} hint={canSeeStays ? 'Available to book' : 'No access to stays'} />
          </>
        )}
      </div>

      {/* Map + property list */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[460px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm sm:h-[580px]">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
            <PropertyMap
              properties={filtered}
              selectedId={selectedId}
              hoverId={hoverId}
              onSelect={setSelectedId}
              onOpen={(id) => navigate(`/real-estate/properties/${id}`)}
            />
          </Suspense>
        </div>

        <section className="flex h-[460px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm sm:h-[580px]">
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Properties</h2>
              <span className="text-xs tabular-nums text-muted-foreground">{filtered.length} shown</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search address, city, reference…" className="h-9 pl-9 text-sm" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filter === c.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {c.label} <span className="tabular-nums opacity-70">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : properties.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Building2 className="h-6 w-6" /></div>
                <p className="text-sm font-medium">No properties yet</p>
                <p className="max-w-[220px] text-xs text-muted-foreground">Add the first property by its address and it will appear on the map.</p>
                {canCreate && <Button size="sm" className="gap-1.5" onClick={() => navigate('/real-estate/properties?add=1')}><Plus className="h-3.5 w-3.5" />Add property</Button>}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">No property matches this search.</p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((p) => {
                  const located = hasLocation(p);
                  const active = selectedId === p.id;
                  const s = STATUS_STYLE[statusOf(p)];
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        data-id={p.id}
                        onClick={() => (located ? setSelectedId(active ? null : p.id) : navigate(`/real-estate/properties/${p.id}`))}
                        onMouseEnter={() => located && setHoverId(p.id)}
                        onMouseLeave={() => setHoverId(null)}
                        className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70'
                        }`}
                      >
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} title={s.label} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{formatPropertyAddress(p)}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                            {[p.city, p.country_code, p.property_type].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {located ? (
                          <MapPin className={`mt-1 h-3.5 w-3.5 shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-primary'}`} />
                        ) : (
                          <span title="No map location" className="mt-1 shrink-0 text-muted-foreground/50"><MapPinOff className="h-3.5 w-3.5" /></span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="By country" subtitle="Where the portfolio is">
          <BarList rows={byCountry} empty="Add properties to see where they are." />
        </SectionCard>
        <SectionCard title="By property type" subtitle="What the portfolio is made of">
          <BarList rows={byType} empty="Add properties to see the mix." />
        </SectionCard>
        <SectionCard title="Recently added" subtitle="Newest properties first">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Nothing added yet.</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link to={`/real-estate/properties/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500"><Sparkles className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{formatPropertyAddress(p)}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}{p.city ? ` · ${p.city}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
