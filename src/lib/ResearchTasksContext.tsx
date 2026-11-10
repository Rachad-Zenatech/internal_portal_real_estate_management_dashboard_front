import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { realEstateService } from '@/services/realEstateService';
import type { ResearchRequest, ResearchResult } from '@/types/realEstate';

export type ResearchTaskStatus = 'running' | 'done' | 'partial' | 'no_results' | 'failed';

export interface ResearchTask {
  id: string;
  jobId: string;
  /** Address shown in the progress panel. */
  label: string;
  request: ResearchRequest;
  status: ResearchTaskStatus;
  stage: string;
  progress: number;
  startedAt: number;
  finishedAt?: number;
  result?: ResearchResult;
  message?: string | null;
  retryable?: boolean;
}

interface ResearchTasksValue {
  tasks: ResearchTask[];
  /** Starts following a running research job. The same job is only ever tracked once. */
  track: (result: ResearchResult, request: ResearchRequest, label: string) => string;
  /** Removes a finished task. A task that is still running cannot be dismissed. */
  dismiss: (id: string) => void;
}

const ResearchTasksContext = createContext<ResearchTasksValue | null>(null);

const POLL_MS = 2000;
const MAX_POLL_FAILURES = 5;

const finalStatus = (r: ResearchResult): ResearchTaskStatus =>
  r.status === 'FAILED' ? 'failed' : r.status === 'NO_RESULTS' ? 'no_results' : r.status === 'PARTIAL' ? 'partial' : 'done';

/** Keeps research jobs running and visible while the user works elsewhere, so closing the dialog does not stop them. */
export function ResearchTasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const failures = useRef<Map<string, number>>(new Map());
  const tasksRef = useRef<ResearchTask[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const patch = useCallback((id: string, changes: Partial<ResearchTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }, []);

  const track = useCallback((result: ResearchResult, request: ResearchRequest, label: string) => {
    const jobId = result.job!.id;
    const existing = tasksRef.current.find((t) => t.jobId === jobId);
    if (existing) return existing.id;
    const id = `research-${jobId}`;
    setTasks((prev) => [
      ...prev,
      {
        id, jobId, label, request, status: 'running', stage: result.job?.stage ?? 'Starting', progress: result.job?.progress ?? 0,
        startedAt: Date.now(),
      },
    ]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => !(t.id === id && t.status !== 'running')));
  }, []);

  const hasRunning = tasks.some((t) => t.status === 'running');
  useEffect(() => {
    if (!hasRunning) return;
    const tick = async () => {
      for (const task of tasksRef.current.filter((t) => t.status === 'running')) {
        try {
          const r = await realEstateService.getResearchJob(task.jobId);
          failures.current.delete(task.id);
          if (r.status === 'RUNNING') {
            patch(task.id, { stage: r.job?.stage ?? task.stage, progress: r.job?.progress ?? task.progress });
          } else {
            patch(task.id, {
              status: finalStatus(r), stage: r.job?.stage ?? 'Done', progress: 100, finishedAt: Date.now(), result: r,
              message: r.message, retryable: r.retryable,
            });
          }
        } catch {
          const n = (failures.current.get(task.id) ?? 0) + 1;
          failures.current.set(task.id, n);
          if (n >= MAX_POLL_FAILURES) {
            patch(task.id, { status: 'failed', stage: 'Failed', finishedAt: Date.now(), message: 'Lost connection to the server while researching. The search may still finish; search the address again to see it.', retryable: true });
          }
        }
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [hasRunning, patch]);

  const value = useMemo(() => ({ tasks, track, dismiss }), [tasks, track, dismiss]);
  return <ResearchTasksContext.Provider value={value}>{children}</ResearchTasksContext.Provider>;
}

export function useResearchTasks(): ResearchTasksValue {
  const ctx = useContext(ResearchTasksContext);
  if (!ctx) throw new Error('useResearchTasks must be used inside ResearchTasksProvider');
  return ctx;
}
