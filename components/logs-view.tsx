"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface JobRun {
  id: number;
  region: string;
  action: string;
  status: string;
  message: string | null;
  period_label: string | null;
  period_from: string | null;
  period_to: string | null;
  started_at: string;
  finished_at: string | null;
}

function formatPeriod(job: JobRun): string {
  if (job.period_from && job.period_to) {
    const from = new Date(job.period_from).toLocaleString("en-GB", {
      timeZone: "Africa/Nairobi",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const to = new Date(job.period_to).toLocaleString("en-GB", {
      timeZone: "Africa/Nairobi",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${from} → ${to}`;
  }
  return job.period_label ?? "—";
}

function statusVariant(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "running") return "warning" as const;
  return "outline" as const;
}

function formatDuration(started: string, finished: string | null): string {
  if (!finished) return "—";
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

function SummaryCard({
  title,
  job,
}: {
  title: string;
  job: JobRun | undefined;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {job ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {job.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : job.status === "failed" ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {job.finished_at
                ? new Date(job.finished_at).toLocaleString()
                : new Date(job.started_at).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {job.region} · {job.action}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No runs yet</p>
        )}
      </CardContent>
    </Card>
  );
}

export function LogsView() {
  const [jobs, setJobs] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/status");
      const data = await res.json();
      if (res.ok) setJobs(data.jobs ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageJobs = useMemo(
    () => jobs.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [jobs, currentPage]
  );

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const lastUk = jobs.find((j) => j.region === "UK");
  const lastZa = jobs.find((j) => j.region === "ZA");
  const lastCron = jobs.find((j) => j.action === "cron" || j.action === "email");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Execution Logs</h2>
        <p className="text-sm text-muted-foreground">
          Track report run history and success status. Auto-refreshes every 10 seconds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Last UK Run" job={lastUk} />
        <SummaryCard title="Last ZA Run" job={lastZa} />
        <SummaryCard title="Last Email / Cron" job={lastCron} />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">All Executions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">Loading logs...</p>
          ) : jobs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No executions recorded yet. Run a report from the Reports tab.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "hsl(var(--table-header))" }}
                  >
                    <th className="px-4 py-3 text-foreground/70">#</th>
                    <th className="px-4 py-3 text-foreground/70">Region</th>
                    <th className="px-4 py-3 text-foreground/70">Action</th>
                    <th className="px-4 py-3 text-foreground/70">Status</th>
                    <th className="px-4 py-3 text-foreground/70">Period</th>
                    <th className="px-4 py-3 text-foreground/70">Started</th>
                    <th className="px-4 py-3 text-foreground/70">Finished</th>
                    <th className="px-4 py-3 text-foreground/70">Duration</th>
                    <th className="px-4 py-3 text-foreground/70">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {pageJobs.map((job, i) => (
                    <Fragment key={job.id}>
                      <tr
                        className={cn(
                          "border-t",
                          i % 2 === 0 ? "bg-white" : "bg-muted/30"
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground">#{job.id}</td>
                        <td className="px-4 py-3 font-medium">{job.region}</td>
                        <td className="px-4 py-3 capitalize">{job.action}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatPeriod(job)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(job.started_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {job.finished_at
                            ? new Date(job.finished_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDuration(job.started_at, job.finished_at)}
                        </td>
                        <td className="px-4 py-3">
                          {job.message && (
                            <button
                              onClick={() =>
                                setExpandedId(expandedId === job.id ? null : job.id)
                              }
                              className="flex items-center gap-1 text-xs text-secondary hover:underline"
                            >
                              {expandedId === job.id ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> View
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === job.id && job.message && (
                        <tr className="border-t bg-muted/20">
                          <td colSpan={9} className="px-6 py-3">
                            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                              {job.message}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && jobs.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {currentPage * PAGE_SIZE + 1}–
                {Math.min((currentPage + 1) * PAGE_SIZE, jobs.length)} of {jobs.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
