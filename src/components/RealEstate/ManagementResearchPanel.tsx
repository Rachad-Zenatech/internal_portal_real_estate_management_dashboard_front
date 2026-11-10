import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ManagementResearch, ManagementFieldName, ManagementFieldStatus, ManagementRejectionCategory } from '@/types/realEstate';

const LABELS: Record<ManagementFieldName, string> = {
  building_management: 'Building management',
  management_phone: 'Phone',
  management_email: 'Email',
  management_website: 'Website',
};
const ORDER = Object.keys(LABELS) as ManagementFieldName[];
const REJECTION: Record<ManagementRejectionCategory, string> = {
  wrong_building: 'wrong building',
  source_not_retrieved: 'source not retrieved',
  inaccessible: 'page not accessible',
  unsupported: 'not supported by the page',
};
const STATUS: Record<ManagementFieldStatus, { text: string; tone: string }> = {
  found: { text: 'Found', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  not_found: { text: 'Not found', tone: 'bg-muted text-muted-foreground' },
  conflicting: { text: 'Conflicting', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  search_failed: { text: 'Not searched', tone: 'bg-destructive/10 text-destructive' },
};

/** The outcome of the dedicated building-management research: one row per field, then what was actually searched. */
export default function ManagementResearchPanel({ management }: { management: ManagementResearch | null | undefined }) {
  if (!management) return null;
  const incomplete = management.research_status === 'incomplete';
  const failed = incomplete || ORDER.some((k) => management.fields[k]?.status === 'search_failed');
  const rejected = management.rejected_candidates ?? [];
  const rejectedCounts = rejected.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + 1 }), {});
  return (
    <details className="rounded-md border border-border px-3 py-2 text-xs" open={failed || undefined}>
      <summary className="cursor-pointer font-medium text-foreground">
        Building management research
        {!management.complete && <span className="ml-2 font-normal text-amber-600 dark:text-amber-400">incomplete, will be retried</span>}
      </summary>
      {incomplete && (
        <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400" data-testid="management-incomplete">
          Research incomplete: {management.reason || 'No relevant source pages successfully retrieved'}. This is not a result of "not found"; it will be tried again on the next search.
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {ORDER.map((key) => {
          const f = management.fields[key];
          if (!f) return null;
          const s = STATUS[f.status] ?? STATUS.not_found;
          return (
            <li key={key} className="space-y-0.5" data-testid={`management-${key}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-36 shrink-0 text-muted-foreground">{LABELS[key]}</span>
                <Badge className={`${s.tone} text-[10px]`}>{s.text}</Badge>
                {f.value && <span className="break-all font-medium text-foreground">{f.value}</span>}
                {f.source_url && /^https?:/i.test(f.source_url) && (
                  <a href={f.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                    source<ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              {f.evidence && <p className="pl-[9.5rem] text-muted-foreground">“{f.evidence}”</p>}
            </li>
          );
        })}
      </ul>
      {rejected.length > 0 && (
        <p className="mt-2 text-muted-foreground" data-testid="management-rejected">
          Candidates not used ({rejected.length}):{' '}
          {Object.entries(rejectedCounts).map(([c, n]) => `${n} ${REJECTION[c as ManagementRejectionCategory] ?? c}`).join(', ')}
        </p>
      )}
      {(management.building_name_rejections?.length ?? 0) > 0 && (
        <p className="mt-2 text-muted-foreground" data-testid="management-name-rejected">
          Building name not used: {management.building_name_rejections!.map((r) => `“${r.name}” (${r.reason})`).join('; ')}
        </p>
      )}
      {management.queries_executed.length > 0 && (
        <div className="mt-2 text-muted-foreground">
          <p className="font-medium text-foreground">Searches run ({management.queries_executed.length})</p>
          <ul className="list-disc pl-4">{management.queries_executed.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
      )}
      {management.pages_inspected.length > 0 && (
        <div className="mt-2 text-muted-foreground">
          <p className="font-medium text-foreground">Pages inspected ({management.pages_inspected.length})</p>
          <ul className="list-disc pl-4">
            {management.pages_inspected.map((p) => (
              <li key={p.url} className="break-all">{p.url} <span className="opacity-70">({p.status === 'opened' ? 'opened' : 'could not be opened'}{p.discovered ? ', followed from another page' : ''})</span></li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
