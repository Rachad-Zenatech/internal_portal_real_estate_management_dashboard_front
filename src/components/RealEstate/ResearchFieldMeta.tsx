import { AlertTriangle, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import type { ResearchClaim } from '@/types/realEstate';

const host = (url?: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : null;
  } catch {
    return null;
  }
};

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);

export function formatClaimValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString();
  return String(value);
}

function SourceLink({ claim }: { claim: ResearchClaim }) {
  const name = claim.source_name || host(claim.source_url) || 'source';
  const date = day(claim.retrieved_at);
  const title = [claim.evidence, claim.match_level ? `matched at ${claim.match_level} level` : null].filter(Boolean).join(' — ');
  const label = `${name}${date ? ` · ${date}` : ''}`;
  return claim.source_url && /^https?:/i.test(claim.source_url) ? (
    <a href={claim.source_url} target="_blank" rel="noreferrer" title={title} className="inline-flex items-center gap-0.5 text-primary hover:underline">
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  ) : (
    <span title={title}>{label}</span>
  );
}

interface Props {
  claim: ResearchClaim;
  /** Called with the alternative's value when the user picks one of several conflicting values. */
  onUseValue?: (value: unknown, alternative: ResearchClaim) => void;
}

/** Status, source and conflicts for one researched field, shown under the form field. */
export default function ResearchFieldMeta({ claim, onUseValue }: Props) {
  const conflicting = claim.status === 'conflicting';
  // Sources disagree: the most likely value is already filled in (older saved results may have none).
  const picked = conflicting && claim.value !== null && claim.value !== undefined;
  const original = claim.original_unit ? `${formatClaimValue(claim.value)} ${claim.original_unit}` : null;
  return (
    <div className="mt-1 min-w-0 space-y-1 break-words text-[11px] leading-snug text-muted-foreground">
      {conflicting ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Sources disagree
          </span>
          {picked ? (
            <>
              <span>Filled in the most likely value.</span>
              {claim.currency && <span className="rounded bg-muted px-1 font-medium">{claim.currency}</span>}
              {original && <span>{original}</span>}
              {(claim.source_url || claim.source_name) && <SourceLink claim={claim} />}
            </>
          ) : (
            <span>Pick the right value or enter your own.</span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {claim.status === 'confirmed' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
              <Sparkles className="h-3 w-3" />
              AI-suggested, unverified
            </span>
          )}
          {claim.currency && <span className="rounded bg-muted px-1 font-medium">{claim.currency}</span>}
          {original && <span>{original}</span>}
          {(claim.source_url || claim.source_name) && <SourceLink claim={claim} />}
          {claim.differs_from_saved && <span className="text-amber-600 dark:text-amber-400">differs from the saved value</span>}
        </div>
      )}
      {claim.conflicts.length > 0 && conflicting && picked && <p className="font-medium text-foreground">Other values found:</p>}
      {claim.conflicts.length > 0 && (
        <ul className="space-y-1 rounded-md border border-border bg-muted/30 p-1.5">
          {claim.conflicts.map((alt, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="min-w-0 break-words">
                <span className="font-medium text-foreground">
                  {formatClaimValue(alt.value)}
                  {alt.original_unit ? ` ${alt.original_unit}` : ''}
                  {alt.currency ? ` ${alt.currency}` : ''}
                </span>{' '}
                · <SourceLink claim={alt} />
              </span>
              {onUseValue && alt.status !== 'confirmed' && (
                <button type="button" onClick={() => onUseValue(alt.value, alt)} className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted">
                  Use this
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
