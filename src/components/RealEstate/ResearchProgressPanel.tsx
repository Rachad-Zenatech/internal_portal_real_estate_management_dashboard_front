import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw } from 'lucide-react';
import { useResearchTasks } from '@/lib/ResearchTasksContext';
import type { ResearchTask } from '@/lib/ResearchTasksContext';
import { realEstateService } from '@/services/realEstateService';

const elapsed = (from: number, to: number) => {
  const s = Math.max(0, Math.round((to - from) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function TaskCard({ task }: { task: ResearchTask }) {
  const { dismiss, track } = useResearchTasks();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const running = task.status === 'running';

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const retry = async () => {
    dismiss(task.id);
    try {
      const r = await realEstateService.researchProperty({ ...task.request, force_refresh: false });
      if (r.status === 'RUNNING' && r.job) track(r, task.request, task.label);
    } catch {
      /* the dialog shows errors; here a failed retry simply leaves nothing behind */
    }
  };

  const tone =
    task.status === 'done' ? { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, title: 'Research complete', bar: 'bg-emerald-500' }
    : task.status === 'partial' ? { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, title: 'Finished with some limitations', bar: 'bg-amber-500' }
    : task.status === 'no_results' ? { icon: <Info className="h-4 w-4 text-muted-foreground" />, title: 'No information found', bar: 'bg-muted-foreground' }
    : task.status === 'failed' ? { icon: <AlertCircle className="h-4 w-4 text-destructive" />, title: 'Research failed', bar: 'bg-destructive' }
    : { icon: <Loader2 className="h-4 w-4 animate-spin text-sky-500" />, title: 'Researching property', bar: 'bg-sky-500' };
  const found = task.result?.job?.claims_saved ?? 0;

  return (
    <div
      role={running ? 'status' : 'button'}
      tabIndex={running ? -1 : 0}
      aria-live="polite"
      title={running ? 'The search is still running' : 'Click to dismiss'}
      onClick={running ? undefined : () => dismiss(task.id)}
      onKeyDown={running ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && dismiss(task.id)}
      className={`w-80 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/5 transition-colors ${
        running ? 'cursor-default' : 'cursor-pointer hover:bg-muted/60'
      }`}
    >
      <div className="flex items-center gap-2">
        {tone.icon}
        <span className="text-sm font-semibold">{tone.title}</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{elapsed(task.startedAt, task.finishedAt ?? now)}</span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={task.label}>{task.label}</p>

      {running ? (
        <p className="mt-2 text-xs text-foreground">{task.stage}…</p>
      ) : task.status === 'failed' ? (
        <p className="mt-2 line-clamp-3 text-xs text-destructive" title={task.message ?? undefined}>{task.message ?? 'Research failed.'}</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {task.status === 'no_results' ? 'Nothing was found for this address.' : `${found} detail${found === 1 ? '' : 's'} found and saved.`}
        </p>
      )}

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={`h-full rounded-full transition-all duration-500 ${tone.bar} ${running && task.progress < 100 ? 'animate-pulse' : ''}`} style={{ width: `${Math.max(task.progress, running ? 8 : 100)}%` }} />
      </div>

      {!running && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">Click anywhere to dismiss</span>
          <span className="flex gap-1.5">
            {task.status === 'failed' && task.retryable !== false && (
              <button type="button" onClick={(e) => { e.stopPropagation(); void retry(); }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted">
                <RefreshCw className="h-3 w-3" />Retry
              </button>
            )}
            {task.status !== 'failed' && task.result && (
              <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/real-estate/properties?review=${encodeURIComponent(task.id)}`); }}
                className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90">
                Review results
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** Small progress cards in the bottom-right corner. Running searches cannot be dismissed; finished ones can. */
export default function ResearchProgressPanel() {
  const { tasks } = useResearchTasks();
  if (tasks.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-h-[80vh] flex-col items-end gap-2 overflow-y-auto">
      {tasks.map((t) => (
        <div key={t.id} className="pointer-events-auto"><TaskCard task={t} /></div>
      ))}
    </div>
  );
}
