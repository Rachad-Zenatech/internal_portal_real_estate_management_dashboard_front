import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bath, CalendarDays, BedDouble, Building2, CheckCircle2, Globe2, LayoutGrid, Loader2, MapPin, MapPinOff, Pencil, PencilLine, Plus, Ruler, Search, Table2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader, SectionCard, StatCard, surfaceClass } from '@/components/common/PageKit';
import PropertyForm from '@/components/RealEstate/PropertyForm';
import PropertyDocuments from '@/components/RealEstate/PropertyDocuments';
import CreatePropertyDialog from './CreatePropertyDialog';
import { useAuth } from '@/lib/AuthContext';
import { useResearchTasks } from '@/lib/ResearchTasksContext';
import type { ResearchTask } from '@/lib/ResearchTasksContext';
import { realEstateService } from '@/services/realEstateService';
import { bookingService } from '@/services/bookingService';
import { formatPropertyAddress } from '@/types/realEstate';
import type { Property, PropertyInput } from '@/types/realEstate';

const QUERY_KEY = 'real-estate-properties';
// The PropertyMap (MapLibre) is large, so it loads only when a property with a location is opened.
const PropertyMap = lazy(() => import('@/components/Dashboard/PropertyMap'));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STATUS_DOT: Record<string, string> = { active: 'bg-emerald-500', draft: 'bg-amber-500', archived: 'bg-slate-400' };

function statusTone(status?: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'draft':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return <Badge className={statusTone(status)}>{status.replace(/_/g, ' ')}</Badge>;
}

function formatArea(value: number | null | undefined, unit: string | null | undefined) {
  if (value == null) return null;
  return `${value.toLocaleString()} ${unit ?? 'sqft'}`;
}

function PropertyStats({ p }: { p: Property }) {
  const baths = (p.full_bathrooms ?? 0) + (p.half_bathrooms ?? 0) * 0.5;
  const area = formatArea(p.unit_area, p.unit_area_unit);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.bedrooms} bd</span>}
      {(p.full_bathrooms != null || p.half_bathrooms != null) && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{baths} ba</span>}
      {area && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{area}</span>}
      {p.year_built != null && <span>Built {p.year_built}</span>}
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

function PropertyList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks } = useResearchTasks();
  const [reviewTask, setReviewTask] = useState<ResearchTask | null>(null);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('REAL_ESTATE_PROPERTIES_CREATE');
  const [search, setSearch] = useState('');
  // The dashboard cards link here with ?status=active|draft|archived.
  const [status, setStatus] = useState(() => {
    const requested = searchParams.get('status');
    return requested && ['active', 'draft', 'archived'].includes(requested) ? requested : 'ALL';
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // "Review results" on a finished background search opens the dialog with that search's result.
  // "Add property" on the dashboard opens the dialog here.
  const addRequested = searchParams.get('add');
  useEffect(() => {
    if (!addRequested) return;
    setIsCreateOpen(true);
    setSearchParams({}, { replace: true });
  }, [addRequested, setSearchParams]);

  const reviewId = searchParams.get('review');
  useEffect(() => {
    if (!reviewId) return;
    const task = tasks.find((t) => t.id === reviewId);
    if (task?.result) {
      setReviewTask(task);
      setIsCreateOpen(true);
    }
    setSearchParams({}, { replace: true });
  }, [reviewId, tasks, setSearchParams]);

  const [view, setView] = useState<'cards' | 'table'>(() => {
    try { return localStorage.getItem('real-estate-properties-view') === 'table' ? 'table' : 'cards'; } catch { return 'cards'; }
  });
  const changeView = (v: 'cards' | 'table') => {
    setView(v);
    try { localStorage.setItem('real-estate-properties-view', v); } catch { /* the choice just is not remembered */ }
  };
  const { data: properties = [], isLoading, isError, error } = useQuery({
    queryKey: [QUERY_KEY, { search, status }],
    queryFn: () => realEstateService.getProperties({ search, status }),
  });
  // Unfiltered numbers for the stat cards (shared with the dashboard's query).
  const { data: all = [] } = useQuery({
    queryKey: [QUERY_KEY, 'dashboard'],
    queryFn: () => realEstateService.getProperties({ limit: 1000 }),
  });
  const counts = useMemo(() => {
    const c = { active: 0, draft: 0, archived: 0 };
    all.forEach((p) => { c[(p.record_status ?? 'active') as keyof typeof c] += 1; });
    const places = new Set(all.map((p) => `${p.country_code ?? ''}|${(p.city ?? '').toLowerCase()}`).filter((k) => k !== '|'));
    return { ...c, places: places.size, countries: new Set(all.map((p) => p.country_code).filter(Boolean)).size };
  }, [all]);
  const pills: { key: string; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: all.length },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'draft', label: 'Draft', count: counts.draft },
    { key: 'archived', label: 'Archived', count: counts.archived },
  ];

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        compact
        eyebrow="Real estate"
        title="Properties"
        description="Search the portfolio, open a property or add a new one by its address."
        actions={canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />Add property
          </Button>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="bg-indigo-500" icon={<Building2 className="h-5 w-5" />} label="Properties" value={all.length} hint="In the portfolio" />
        <StatCard tone="bg-emerald-500" icon={<CheckCircle2 className="h-5 w-5" />} label="Active" value={counts.active} hint={`${counts.archived} archived`} />
        <StatCard tone="bg-amber-500" icon={<PencilLine className="h-5 w-5" />} label="Drafts to review" value={counts.draft} hint={counts.draft ? 'Check and activate' : 'All reviewed'} />
        <StatCard tone="bg-sky-500" icon={<Globe2 className="h-5 w-5" />} label="Locations" value={counts.places} hint={`${counts.countries} ${counts.countries === 1 ? 'country' : 'countries'}`} />
      </div>

      <div className={`${surfaceClass} flex flex-wrap items-center gap-3 p-3`}>
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address, name, reference, city, postal code…"
            className="h-9 border-0 bg-muted/50 pl-9 shadow-none focus-visible:ring-1"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pills.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatus(c.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                status === c.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {c.label} <span className="tabular-nums opacity-70">{c.count}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex rounded-md border border-border p-0.5" role="group" aria-label="View">
          {([['cards', LayoutGrid, 'Card view'], ['table', Table2, 'Table view']] as const).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeView(key)}
              aria-pressed={view === key}
              aria-label={label}
              title={label}
              className={`rounded p-1.5 transition-colors ${view === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-2xl" />)}
        </div>
      )}
      {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{(error as Error).message}</div>}

      {!isLoading && !isError && properties.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Building2 className="h-6 w-6" /></div>
          <p className="text-sm font-medium">{search || status !== 'ALL' ? 'No property matches this search' : 'No properties yet'}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{search || status !== 'ALL' ? 'Try a different search or filter.' : canCreate ? 'Add the first one by entering its address.' : ''}</p>
          {canCreate && !search && status === 'ALL' && <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add property</Button>}
        </div>
      )}

      {view === 'table' && properties.length > 0 && (
        <div className={`${surfaceClass} overflow-x-auto`}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="text-xs font-semibold">Property</TableHead>
                <TableHead className="text-xs font-semibold">Street number</TableHead>
                <TableHead className="text-xs font-semibold">Street</TableHead>
                <TableHead className="text-xs font-semibold">Unit</TableHead>
                <TableHead className="text-xs font-semibold">City</TableHead>
                <TableHead className="text-xs font-semibold">State</TableHead>
                <TableHead className="text-xs font-semibold">Postal code</TableHead>
                <TableHead className="text-xs font-semibold">Country</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Holding</TableHead>
                <TableHead className="text-xs font-semibold text-right">Beds</TableHead>
                <TableHead className="text-xs font-semibold text-right">Baths</TableHead>
                <TableHead className="text-xs font-semibold text-right">Unit area</TableHead>
                <TableHead className="text-xs font-semibold">Year built</TableHead>
                <TableHead className="text-xs font-semibold">Building management</TableHead>
                <TableHead className="text-xs font-semibold">Phone</TableHead>
                <TableHead className="text-xs font-semibold">Email</TableHead>
                <TableHead className="text-xs font-semibold">Website</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => {
                const dash = <span className="text-muted-foreground/50">–</span>;
                const baths = p.full_bathrooms != null || p.half_bathrooms != null ? (p.full_bathrooms ?? 0) + (p.half_bathrooms ?? 0) * 0.5 : null;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/real-estate/properties/${p.id}`)}>
                    <TableCell className="py-2.5 text-sm font-medium">
                      <Link to={`/real-estate/properties/${p.id}`} className="hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {p.property_name || p.building_name || formatPropertyAddress(p)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{p.street_number ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.street_name ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.unit_number ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.city ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.state_province_region ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.postal_code ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.country_code ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.property_type ? cap(p.property_type) : dash}</TableCell>
                    <TableCell className="text-sm">{p.holding_type && p.holding_type !== 'unknown' ? cap(p.holding_type) : dash}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{p.bedrooms ?? dash}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{baths ?? dash}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatArea(p.unit_area, p.unit_area_unit) ?? dash}</TableCell>
                    <TableCell className="text-sm tabular-nums">{p.year_built ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.building_management ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.management_phone ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.management_email ?? dash}</TableCell>
                    <TableCell className="text-sm">{p.management_website ?? dash}</TableCell>
                    <TableCell><StatusBadge status={p.record_status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${view === 'table' ? 'hidden' : ''}`}>
        {properties.map((p) => {
          const s = STATUS_DOT[p.record_status ?? 'active'] ?? STATUS_DOT.active;
          const place = [p.city, p.state_province_region, p.country_code].filter(Boolean).join(', ');
          return (
            <Link
              key={p.id}
              to={`/real-estate/properties/${p.id}`}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${s}`} />
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold leading-snug group-hover:text-primary">{formatPropertyAddress(p)}</h2>
                    <StatusBadge status={p.record_status} />
                  </div>
                  {place && <p className="mt-0.5 truncate text-xs text-muted-foreground">{place}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                <PropertyStats p={p} />
                <span className="flex items-center gap-1.5">
                  {p.property_reference && <Badge variant="outline" className="text-[10px]">#{p.property_reference}</Badge>}
                  {p.property_type && <Badge variant="secondary" className="text-[10px]">{p.property_type}</Badge>}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <CreatePropertyDialog
        open={isCreateOpen}
        initialTask={reviewTask}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setReviewTask(null);
        }}
        onCreated={(created) => {
          setIsCreateOpen(false);
          navigate(`/real-estate/properties/${created.id}`);
        }}
      />
    </div>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function changedFields(original: Property, edited: PropertyInput): PropertyInput {
  const diff: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edited)) {
    if (key === 'address_formatted' || key === 'display_name') continue;
    if (JSON.stringify(value ?? null) !== JSON.stringify((original as unknown as Record<string, unknown>)[key] ?? null)) diff[key] = value ?? null;
  }
  return diff as PropertyInput;
}

function PropertyDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('REAL_ESTATE_PROPERTIES_UPDATE');
  const canDelete = hasPermission('REAL_ESTATE_PROPERTIES_DELETE');
  const [draft, setDraft] = useState<PropertyInput | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: property, isLoading, isError, error } = useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => realEstateService.getProperty(id),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['real-estate-units', id],
    queryFn: () => bookingService.getUnits({ property_id: id }),
  });

  const save = useMutation({
    mutationFn: (data: PropertyInput) => realEstateService.updateProperty(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEY, id], updated);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDraft(null);
      toast.success('Property updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update the property'),
  });

  const remove = useMutation({
    mutationFn: () => realEstateService.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Property deleted');
      navigate('/real-estate/properties');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete the property'),
  });

  const diff = useMemo(() => (property && draft ? changedFields(property, draft) : {}), [property, draft]);
  const hasChanges = Object.keys(diff).length > 0;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-[300px] rounded-2xl" /></div>;
  if (isError || !property) return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{(error as Error)?.message ?? 'Property not found'}</div>;

  const address = formatPropertyAddress(property);
  const mapsUrl = property.latitude != null && property.longitude != null
    ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
    : `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

  const glance: [string, string | null][] = [
    ['Type', property.property_type ?? null],
    ['Bedrooms / baths', property.bedrooms != null || property.full_bathrooms != null ? `${property.bedrooms ?? '–'} bd · ${(property.full_bathrooms ?? 0) + (property.half_bathrooms ?? 0) * 0.5} ba` : null],
    ['Unit area', formatArea(property.unit_area, property.unit_area_unit)],
    ['Year built', property.year_built != null ? String(property.year_built) : null],
    ['Floors', property.building_total_floors != null ? String(property.building_total_floors) : null],
    ['Holding', property.holding_type && property.holding_type !== 'unknown' ? cap(property.holding_type) : null],
  ];
  const place = [property.city, property.state_province_region, property.country_code].filter(Boolean).join(', ');

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Link to="/real-estate/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />All properties
      </Link>

      <PageHeader
        compact
        eyebrow={place || 'Property'}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{address}</span>
            <StatusBadge status={property.record_status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <PropertyStats p={property} />
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><MapPin className="h-3.5 w-3.5" />Open in Maps</a>
          </span>
        }
        actions={
          <>
            {canUpdate && !draft && <Button variant="outline" className="gap-2 bg-background/70 backdrop-blur" onClick={() => setDraft({ ...property })}><Pencil className="h-4 w-4" />Edit</Button>}
            {canDelete && <Button variant="destructive" className="gap-2" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4" />Delete</Button>}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[300px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          {property.latitude != null && property.longitude != null ? (
            <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
              <PropertyMap properties={[property]} compact />
            </Suspense>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <MapPinOff className="h-7 w-7" />
              <p className="text-sm font-medium text-foreground">No map location yet</p>
              <p className="max-w-xs text-xs">Coordinates are filled in when the property is added from a selected address.</p>
            </div>
          )}
        </div>
        <SectionCard title="At a glance" subtitle="The key facts">
          <dl className="space-y-2.5 text-sm">
            {glance.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={`truncate text-right font-medium ${value ? '' : 'text-muted-foreground/50'}`}>{value ?? '–'}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Stays & availability"
        subtitle="Rooms of this property that can be booked"
        actions={<Button asChild variant="outline" size="sm" className="gap-1.5"><Link to={`/real-estate/stays?property=${id}`}><CalendarDays className="h-4 w-4" />Open calendar</Link></Button>}
      >
        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookable room is linked to this property yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {units.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium">{u.unit_number} <span className="text-xs font-normal text-muted-foreground">· {u.bedrooms} bd · sleeps {u.guest_capacity}</span></span>
                <span className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{u.status.toLowerCase()}</Badge>
                  <Badge className={u.is_available_today ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}>{u.is_available_today ? 'Free today' : 'Not free today'}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <PropertyDocuments propertyId={id} canEdit={canUpdate} />

      <PropertyForm value={draft ?? property} onChange={setDraft} disabled={!draft || save.isPending} />

      {draft && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur">
          <p className="pl-2 text-xs text-muted-foreground">{hasChanges ? `${Object.keys(diff).length} unsaved change${Object.keys(diff).length === 1 ? '' : 's'}` : 'No changes yet'}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={save.isPending}>Cancel</Button>
            <Button onClick={() => save.mutate(diff)} disabled={!hasChanges || save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this property?</DialogTitle>
            <DialogDescription>{address} will be removed from the portfolio. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PropertiesPage() {
  const { propertyId } = useParams();
  return propertyId ? <PropertyDetail id={propertyId} /> : <PropertyList />;
}
