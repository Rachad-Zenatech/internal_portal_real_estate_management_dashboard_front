import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Clock,
  Inbox,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  FileText,
  ArrowRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { realEstateService } from "@/services/realEstateService";
import type { PropertyExtractionJob } from "@/types/realEstate";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useClearAllNotifications,
  type Notification,
} from "@/hooks/useNotifications";

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationDropdownContent({
  onClose,
  onOpenPreview,
}: {
  onClose: () => void;
  onOpenPreview?: (job: PropertyExtractionJob, allJobs?: PropertyExtractionJob[]) => void;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCountData } = useUnreadNotificationCount();
  const unreadCount = unreadCountData?.count ?? 0;

  // Real-time polling for background document extraction jobs
  const { data: extractionJobs = [] } = useQuery<PropertyExtractionJob[]>({
    queryKey: ["property-extraction-jobs"],
    queryFn: () => realEstateService.getPropertyExtractionJobs(),
    refetchInterval: (query) => {
      const jobs = (query.state.data as PropertyExtractionJob[]) || [];
      const hasActive = jobs.some(
        (j) => j.status === "PROCESSING" || j.status === "UPLOADED"
      );
      return hasActive ? 1500 : 8000;
    },
  });

  const activeExtractionJobs = useMemo(() => {
    return extractionJobs.filter(
      (j) => j.status === "PROCESSING" || j.status === "UPLOADED"
    );
  }, [extractionJobs]);

  const allReviewExtractionJobs = useMemo(() => {
    return extractionJobs.filter(
      (j) => j.status === "NEEDS_REVIEW" || j.status === "COMPLETED"
    );
  }, [extractionJobs]);

  const reviewExtractionJobs = useMemo(() => {
    return allReviewExtractionJobs;
  }, [allReviewExtractionJobs]);

  const queryClient = useQueryClient();

  const clearAllReadyMutation = useMutation({
    mutationFn: () => realEstateService.clearAllExtractionJobs(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-extraction-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      toast.success(`Cleared ${data?.cleared_count || 0} extraction preview(s)`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to clear preview notifications");
    },
  });

  const dismissSingleJobMutation = useMutation({
    mutationFn: (jobId: string) => realEstateService.deleteExtractionJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-extraction-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Preview notification removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to dismiss preview notification");
    },
  });

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const clearAllMutation = useClearAllNotifications();

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleNotificationClick = (item: Notification) => {
    if (!item.is_read) {
      markAsReadMutation.mutate(Number(item.id));
    }
    if (item.link_url) {
      onClose();
      navigate(item.link_url);
    }
  };

  return (
    <div className="flex flex-col max-h-[82vh] h-[560px] overflow-hidden">
      {/* Header (Sticky Top) */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">
              {unreadCount} new
            </Badge>
          )}
          {activeExtractionJobs.length > 0 && (
            <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>{activeExtractionJobs.length} Extracting</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              title="Clear all notifications"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Dialog Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col">
        {/* Background Document Extractions - Live Progress Bar & Stage */}
        {activeExtractionJobs.length > 0 && (
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Background Document Extraction ({activeExtractionJobs.length})</span>
              </div>
              <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                Processing with AI
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 overscroll-contain">
              {activeExtractionJobs.map((job) => {
                const docLabel =
                  job.document_filename ||
                  job.document_title ||
                  job.file_name ||
                  (job as any).filename ||
                  "Document.pdf";
                const stageLabel =
                  (job as any).progress_stage ||
                  job.current_stage ||
                  "Extracting properties & specifications...";
                return (
                  <div
                    key={job.id}
                    className="p-2.5 rounded-xl bg-card border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold truncate text-foreground" title={docLabel}>
                          {docLabel}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 font-mono">
                        {job.progress || 10}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <Progress value={job.progress || 10} className="h-1.5 bg-indigo-100 dark:bg-indigo-950" />

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="truncate text-indigo-900 dark:text-indigo-200 font-medium">
                        {stageLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 shrink-0 ml-2">
                        Background Task
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Extractions Ready for Preview */}
        {allReviewExtractionJobs.length > 0 && (
          <div className="p-3 bg-muted/30 border-b border-border/70 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">Extracted Documents Ready for Preview</span>
                <Badge variant="outline" className="text-[10px] bg-background shrink-0">
                  {allReviewExtractionJobs.length} Ready
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearAllReadyMutation.mutate()}
                  disabled={clearAllReadyMutation.isPending}
                  className="h-6 text-[11px] text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 px-1.5 gap-1 cursor-pointer"
                  title="Clear all preview notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    if (onOpenPreview) {
                      onOpenPreview(allReviewExtractionJobs[0], allReviewExtractionJobs);
                    }
                  }}
                  className="h-6 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white gap-1 font-semibold px-2 cursor-pointer shadow-xs"
                >
                  <span>Review All ({allReviewExtractionJobs.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 overscroll-contain">
              {reviewExtractionJobs.map((job) => {
                const docLabel =
                  job.document_filename ||
                  job.document_title ||
                  job.file_name ||
                  (job as any).filename ||
                  "Document.pdf";
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-card border border-border shadow-2xs gap-2 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate" title={docLabel}>
                          {docLabel}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Extraction complete • {job.extracted_properties?.length || 1} property record(s) ready
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          if (onOpenPreview) {
                            onOpenPreview(job, allReviewExtractionJobs);
                          }
                        }}
                        className="h-7 text-xs border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1 font-medium cursor-pointer"
                      >
                        <span>Review & Preview</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissSingleJobMutation.mutate(job.id);
                        }}
                        disabled={dismissSingleJobMutation.isPending}
                        title="Dismiss this preview notification"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border/40 px-4 pt-2 gap-4 text-xs font-medium bg-card sticky top-0 z-10 shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              filter === "all"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              filter === "unread"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="divide-y divide-border/40">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs font-medium">No notifications to display</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 hover:bg-muted/40 transition-colors cursor-pointer flex gap-3 items-start ${
                  !n.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                <div className="mt-1">
                  {!n.is_read ? (
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-semibold text-foreground truncate">{n.title}</h4>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                  {n.link_url && (
                    <div className="mt-1.5 flex items-center text-[10px] text-primary font-medium gap-1">
                      <span>View details</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
