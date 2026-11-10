import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle2, Database, ExternalLink, Loader2, MapPin, RefreshCw, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PropertyForm, { defaultPropertyName, missingRequired } from '@/components/RealEstate/PropertyForm';
import { formatClaimValue } from '@/components/RealEstate/ResearchFieldMeta';
import ManagementResearchPanel from '@/components/RealEstate/ManagementResearchPanel';
import { useAuth } from '@/lib/AuthContext';
import { useResearchTasks } from '@/lib/ResearchTasksContext';
import type { ResearchTask } from '@/lib/ResearchTasksContext';
import { realEstateService } from '@/services/realEstateService';
import type {
  AddressSuggestion, Property, PropertyFields, PropertyInput, ResearchClaim, ResearchRequest, ResearchResult,
} from '@/types/realEstate';

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (property: Property) => void;
  /** A finished background search to review: its result fills the form when the dialog opens. */
  initialTask?: ResearchTask | null;
}

// Defaults for a new record. The enum fields always have a value (unknown is a real value), so the selects are never blank.
const FORM_DEFAULTS: PropertyInput = {
  record_status: 'active', holding_type: 'unknown', furnished_status: 'unknown', amenities: [],
};
const AREA_FIELDS = ['unit_area', 'building_floor_area', 'land_area'] as const;
const hasValue = (v: unknown) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : null);
const host = (url?: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
};

export default function CreatePropertyDialog({ open, onOpenChange, onCreated, initialTask }: CreatePropertyDialogProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canRefresh = hasPermission('REAL_ESTATE_PROPERTIES_UPDATE');

  const [address, setAddress] = useState('');
  const [unit, setUnit] = useState('');
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [form, setForm] = useState<PropertyInput | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState<ReadonlySet<string>>(new Set());
  const [debounced, setDebounced] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // Fields the user typed or changed. Research results never overwrite them, and they are saved as confirmed.
  const dirty = useRef<Set<string>>(new Set());
  const lastRequest = useRef<ResearchRequest | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const { tasks, track, dismiss } = useResearchTasks();
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const appliedInitial = useRef<string | null>(null);
  const unitInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(address.trim()), 300);
    return () => clearTimeout(t);
  }, [address]);

  // Typeahead only: free OpenStreetMap lookups. Paid research starts after a suggestion is chosen.
  const { data: suggestions = [], isFetching: isSuggesting, isError: suggestError } = useQuery({
    queryKey: ['real-estate-address-suggestions', debounced],
    queryFn: () => realEstateService.suggestAddresses(debounced),
    enabled: open && showSuggestions && debounced.length >= 3 && !selected,
    staleTime: 60_000,
    retry: false,
  });

  const reset = () => {
    setAddress('');
    setUnit('');
    setSelected(null);
    setForm(null);
    setResult(null);
    setTaskId(null); // a search that is still running keeps going in the background
    setAutoFilled(new Set());
    setDebounced('');
    setShowSuggestions(false);
    setHighlight(-1);
    dirty.current = new Set();
    lastRequest.current = null;
    setShowErrors(false);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  /** Merges research into the form without touching anything the user has edited. */
  const applyResult = useCallback((r: ResearchResult) => {
    setResult(r);
    const incoming = Object.entries(r.suggested ?? {}).filter(([k, v]) => hasValue(v) && !dirty.current.has(k));
    setForm((prev) => {
      const merged: PropertyInput = { ...FORM_DEFAULTS, ...(prev ?? {}), ...Object.fromEntries(incoming) };
      // a starting name from the building or address, unless the user already typed one
      if (!merged.property_name && !dirty.current.has('property_name')) merged.property_name = defaultPropertyName(merged);
      return merged;
    });
    setAutoFilled((prev) => new Set([...prev, ...incoming.map(([k]) => k)]));
  }, []);

  const research = useMutation({
    mutationFn: (req: ResearchRequest) => {
      lastRequest.current = req;
      return realEstateService.researchProperty(req);
    },
    onSuccess: (r) => {
      applyResult(r);
      if (r.status === 'RUNNING' && r.job && lastRequest.current) {
        const req = lastRequest.current;
        track(r, req, [req.address, req.unit ? `unit ${req.unit}` : null].filter(Boolean).join(', ') || 'Property');
        // The search continues in the background; its progress card lets the user reopen the result when it finishes.
        close(false);
      } else {
        setTaskId(null);
      }
    },
    onError: (err: Error) => {
      setResult(null);
      toast.error(err.message || 'Property research failed');
    },
  });

  // The search runs in the background (see ResearchTasksContext). When it finishes while this dialog is still showing it,
  // the result is applied here and the progress card is removed; otherwise the card stays so it can be reviewed later.
  useEffect(() => {
    if (!task || task.status === 'running' || !task.result) return;
    applyResult(task.result);
    setTaskId(null);
    dismiss(task.id);
  }, [task, applyResult, dismiss]);
  useEffect(() => {
    if (task && task.status === 'failed' && !task.result) {
      toast.error(task.message ?? 'Research failed');
      setTaskId(null);
      dismiss(task.id);
    }
  }, [task, dismiss]);

  // Opening a finished background search from the progress card fills the form with its result.
  useEffect(() => {
    if (!open || !initialTask?.result || appliedInitial.current === initialTask.id) return;
    appliedInitial.current = initialTask.id;
    lastRequest.current = initialTask.request;
    setAddress(initialTask.request.address ?? '');
    setUnit(initialTask.request.unit ?? '');
    applyResult(initialTask.result);
    dismiss(initialTask.id);
  }, [open, initialTask, applyResult, dismiss]);

  const providerStatus = useQuery({
    queryKey: ['research-status'],
    queryFn: () => realEstateService.getResearchStatus(),
    enabled: open,
    staleTime: 30_000,
    retry: false,
  });

  const buildRequest = (s: AddressSuggestion | null, text: string, force = false): ResearchRequest => ({
    ...(s && s.exact
      ? {
          street: s.street_name ?? s.street, building_number: s.building_number, postal_code: s.postal_code, city: s.city,
          state: s.state, country: s.country, country_code: s.country_code, geocode_id: s.geocode_id,
          latitude: s.latitude, longitude: s.longitude, address: s.lookup_query,
        }
      : { address: s ? s.lookup_query : text }),
    unit: unit.trim() || null,
    force_refresh: force,
  });

  const startResearch = (s: AddressSuggestion | null, force = false) => {
    if (!force) {
      dirty.current = new Set();
      setForm(null);
      setAutoFilled(new Set());
    }
    setResult(null);
    research.mutate(buildRequest(s, address.trim(), force));
  };

  // Choosing an address only fills it in. Research (which may call paid providers) starts when the user confirms with
  // Find property details, after they have had the chance to enter a unit number.
  const pick = (s: AddressSuggestion) => {
    setSelected(s);
    setAddress(s.lookup_query);
    setShowSuggestions(false);
    setHighlight(-1);
    setResult(null);
    setTimeout(() => unitInput.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listOpen = showSuggestions && suggestions.length > 0;
    if (e.key === 'ArrowDown' && listOpen) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && listOpen) {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter' && listOpen && highlight >= 0) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === 'Escape' && showSuggestions) {
      e.stopPropagation();
      setShowSuggestions(false);
    }
  };

  const onFormChange = (next: PropertyInput) => {
    setForm((prev) => {
      for (const key of Object.keys(next) as (keyof PropertyFields)[]) {
        if (JSON.stringify(next[key] ?? null) !== JSON.stringify(prev?.[key] ?? null)) dirty.current.add(key);
      }
      return next;
    });
  };

  const useAlternative = (field: keyof PropertyFields, value: unknown, claim: ResearchClaim) => {
    dirty.current.add(field);
    const patch: PropertyInput = { [field]: value };
    if ((AREA_FIELDS as readonly string[]).includes(field) && claim.original_unit) {
      patch[`${field}_unit` as keyof PropertyFields] = claim.original_unit as never; // an area is used together with its unit
      dirty.current.add(`${field}_unit`);
    }
    setForm((prev) => ({ ...(prev ?? {}), ...patch }));
  };

  const save = useMutation({
    mutationFn: async (data: PropertyInput) => {
      const created = await realEstateService.createProperty(data);
      if (result?.identity) {
        // An area is confirmed together with its unit, so either one being edited sends both.
        const edited = new Set(dirty.current);
        for (const a of AREA_FIELDS) if (edited.has(a) || edited.has(`${a}_unit`)) { edited.add(a); edited.add(`${a}_unit`); }
        const confirmed = Object.fromEntries(
          [...edited]
            .filter((k) => hasValue(data[k as keyof PropertyFields]) && (!Array.isArray(data[k as keyof PropertyFields]) || (data[k as keyof PropertyFields] as unknown[]).length > 0))
            .map((k) => [k, data[k as keyof PropertyFields]]),
        );
        // Reviewed or typed values become confirmed; everything left as suggested stays unverified.
        await realEstateService.confirmResearch({ cache_key: result.identity.cache_key, property_id: created.id, fields: confirmed }).catch(() => {
          toast.warning('The property was saved, but its review status could not be recorded.');
        });
      }
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['real-estate-properties'] });
      toast.success('Property added');
      reset();
      onCreated(created);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save the property'),
  });

  const researching = research.isPending || task?.status === 'running';
  const missing = form ? missingRequired(form) : [];
  const trySave = () => {
    if (!form) return;
    if (missing.length > 0) {
      setShowErrors(true);
      toast.error('Please fill in the required fields.');
      return;
    }
    save.mutate(form);
  };
  const status = result?.status;
  const suggestionOpen = showSuggestions && debounced.length >= 3 && !selected;
  const ambiguous = status === 'AMBIGUOUS' || status === 'UNRESOLVED';
  const claims = Object.values(result?.fields ?? {}).flatMap((c) => [c, ...c.conflicts]).filter((c) => c.source_url);
  const uniqueSources = [...new Map(claims.map((c) => [c.source_url, c])).values()];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90vh] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="space-y-3 border-b border-border px-5 pb-4 pt-5">
        <DialogHeader>
          <DialogTitle>Add property</DialogTitle>
          <DialogDescription>
            Choose an address. Saved research is reused when it is fresh; otherwise public sources are searched and the
            details are filled in as unverified suggestions for you to review.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setShowSuggestions(false);
            if (address.trim().length >= 5 && !researching) startResearch(selected);
          }}
        >
          <div className="relative flex-1">
            <Input
              autoFocus
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setSelected(null);
                setShowSuggestions(true);
                setHighlight(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={onKeyDown}
              placeholder="Start typing an address, in any country"
              disabled={researching}
              aria-label="Property address"
              aria-autocomplete="list"
              aria-expanded={suggestionOpen}
              autoComplete="off"
            />
            {suggestionOpen && (
              <ul role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                {suggestions.length === 0 && isSuggesting && (
                  <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching addresses…
                  </li>
                )}
                {suggestions.length === 0 && !isSuggesting && (
                  <li className="px-2 py-2 text-xs text-muted-foreground">
                    {suggestError ? 'Address suggestions are unavailable.' : 'No matching addresses.'} Type the full address and click Find property details.
                  </li>
                )}
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.text}-${s.latitude}-${s.longitude}`}
                    role="option"
                    aria-selected={i === highlight}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(s);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm ${i === highlight ? 'bg-muted' : ''}`}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">
                      {s.user_input ? <>Search “{s.text}”</> : s.lookup_query}
                      {s.user_input && s.needs_postal_code && (
                        <span className="block text-xs text-muted-foreground">Add the postal code to identify the unit.</span>
                      )}
                    </span>
                    {s.country_code && <span className="text-[10px] text-muted-foreground">{s.country_code}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input
            ref={unitInput}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit / apt (optional)"
            disabled={researching}
            aria-label="Unit or apartment number"
            className="sm:w-48"
          />
          <Button type="submit" disabled={address.trim().length < 5 || researching} className="shrink-0 gap-2">
            {researching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find property details
          </Button>
        </form>
        {selected && !researching && (!result || (result.identity && (result.identity.unit ?? '') !== unit.trim())) && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Address selected. If this is an apartment or suite, enter the unit number, then click Find property details. Each unit of a
            building is researched and cached separately.
          </p>
        )}

        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {providerStatus.data && !providerStatus.data.ready && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Web research is not available right now</p>
              <p className="mt-0.5 text-xs">{providerStatus.data.message} You can still enter the details by hand.</p>
            </div>
          </div>
        )}
        {researching && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {result?.source === 'shared_job'
              ? 'Another search for this address is already running. Waiting for it…'
              : 'Researching this property from public sources. This can take a few minutes. You can close this window: the search keeps running and its progress shows in the bottom-right corner.'}
          </div>
        )}

        {ambiguous && result && (
          <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {result.message}
            </div>
            {result.suggestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {result.suggestions.map((s) => (
                  <button
                    key={`${s.text}-${s.latitude}`}
                    type="button"
                    onClick={() => pick({ ...s, lookup_query: s.lookup_query ?? s.text, exact: true })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    {s.lookup_query ?? s.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {status && !ambiguous && !researching && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
              {result?.source === 'database' ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground"><Database className="h-3.5 w-3.5" />Retrieved from database</span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-foreground"><Sparkles className="h-3.5 w-3.5" />New research</span>
              )}
              {result?.researched_at && <span className="text-muted-foreground">Last researched {when(result.researched_at)}</span>}
              {status === 'PARTIAL' && <span className="font-medium text-amber-600 dark:text-amber-400">Partial results</span>}
              {status === 'CACHED' && !result?.review_required && (
                <span className="inline-flex items-center gap-1 text-muted-foreground"><CheckCircle2 className="h-3 w-3" />No AI or search calls were made</span>
              )}
              {result?.job && result.source !== 'database' && result.job.search_calls > 0 && (
                <span className="text-muted-foreground">
                  {result.job.search_calls} searches
                  {result.job.input_tokens + result.job.output_tokens > 0 ? ` · ${(result.job.input_tokens + result.job.output_tokens).toLocaleString()} tokens` : ''}
                  {result.job.cost_usd != null ? ` · about $${result.job.cost_usd.toFixed(4)} (estimate)` : ''}
                </span>
              )}
              <span className="ml-auto flex gap-2">
                {status === 'FAILED' && result?.retryable !== false && (
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => lastRequest.current && research.mutate({ ...lastRequest.current, force_refresh: false })}>
                    <RefreshCw className="h-3 w-3" />Retry
                  </Button>
                )}
                {canRefresh && status !== 'FAILED' && result?.identity && (
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => startResearch(selected, true)}>
                    <RefreshCw className="h-3 w-3" />Refresh information
                  </Button>
                )}
              </span>
            </div>

            {status === 'FAILED' && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {result?.message ?? 'Research failed.'} Nothing was saved from this attempt. You can still enter the details manually.
              </div>
            )}
            {status === 'NO_RESULTS' && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {result?.message ?? 'No information was found for this address.'}
              </div>
            )}
            {result?.review_required && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Some sources disagree. For those fields the most likely value is filled in, and the other values are listed below each field. Please check them before saving.
              </div>
            )}
            <ManagementResearchPanel management={result?.management} />
            {(result?.limitations?.length ?? 0) > 0 && (
              <details className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">Notes and limitations ({result!.limitations.length})</summary>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">{result!.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
              </details>
            )}
          </div>
        )}

        {form && !researching && (
          <>
            {autoFilled.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400">
                <Sparkles className="h-3.5 w-3.5" />
                {autoFilled.size} fields filled automatically as unverified suggestions. Edit anything before saving; values you change are saved as confirmed.
              </div>
            )}
            {showErrors && missing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Please fill in: {missing.map((m) => m.label.toLowerCase()).join(', ')}.</span>
              </div>
            )}
            <PropertyForm value={form} onChange={onFormChange} autoFilled={autoFilled} fieldMeta={result?.fields} onUseValue={useAlternative} disabled={save.isPending} columns={2}
              errors={showErrors ? new Set<string>(missing.map((m) => m.key)) : undefined} allowNoneFlags />

            {(result?.unmapped?.length ?? 0) > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Other findings (no matching field)</h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {result!.unmapped.map((u, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{(u.concept ?? '').replace(/_/g, ' ')}:</span> {formatClaimValue(u.value)} {u.original_unit ?? ''} · {u.source_name ?? host(u.source_url)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {uniqueSources.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Sources</h3>
                <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {uniqueSources.map((c) => (
                    <li key={c.source_url} className="truncate">
                      <a href={c.source_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {c.source_name || host(c.source_url)}<ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <span className="text-muted-foreground"> · retrieved {c.retrieved_at ? new Date(c.retrieved_at).toLocaleDateString() : ''}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {!form && !researching && !result && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Choose an address above to look up the property details, or use Enter manually to type them in.
          </p>
        )}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-border bg-muted/30 px-5 py-3">
          <Button variant="outline" onClick={() => close(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              dirty.current = new Set();
              setForm({ ...FORM_DEFAULTS, address_original: address.trim() || null });
            }}
            disabled={!!form || researching}
          >
            Enter manually
          </Button>
          <Button onClick={trySave} disabled={!form || save.isPending || researching}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
