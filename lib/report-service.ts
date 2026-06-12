import type { JobAction, Region } from "@/lib/db";
import { createJobRun, getEnabledEmails, updateJobRun } from "@/lib/db";
import {
  downloadRegionFromBlob,
  ensureRegionTemplate,
  getResultsPath,
  uploadRegionToBlob,
} from "@/lib/blob-sync";
import { sendReportEmail, sendScheduledReportEmail } from "@/lib/email";
import { syncActivePeriodToTemplates } from "@/lib/report-settings";
import { runPipeline } from "@/lib/pipeline-runner";
import { zipResultsFolder } from "@/lib/zip";

export interface ReportRunResult {
  jobId: number;
  ok: boolean;
  message: string;
  zipBuffer?: Buffer;
  period: string;
}

export async function executeReportRun(options: {
  region: Region;
  action: JobAction;
  clients?: string[];
  skipEmail?: boolean;
}): Promise<ReportRunResult> {
  const { region, action, clients, skipEmail } = options;
  const periodInfo = await syncActivePeriodToTemplates();
  const job = await createJobRun(region, action, periodInfo);

  try {
    if (process.env.VERCEL) {
      process.env.MIX_WORK_DIR = "/tmp/mix";
    }

    if (!process.env.VERCEL) {
      await downloadRegionFromBlob(region);
    } else {
      ensureRegionTemplate(region);
    }

    const pipeline = await runPipeline(region, {
      clients,
      from: periodInfo.from,
      to: periodInfo.to,
    });
    if (!pipeline.ok) {
      await updateJobRun(job.id, "failed", pipeline.message);
      return { jobId: job.id, ok: false, message: pipeline.message, period: periodInfo.label };
    }

    if (!process.env.VERCEL) {
      await uploadRegionToBlob(region);
    }

    if (process.env.VERCEL) {
      await downloadRegionFromBlob(region);
    }

    const resultsPath = getResultsPath(region);
    const zipBuffer = await zipResultsFolder(resultsPath, region);

    const summary = pipeline.message;

    if (!skipEmail && (action === "email" || action === "cron")) {
      const recipients = await getEnabledEmails();

      if (recipients.length === 0) {
        const msg = `${summary}\nNo enabled email recipients configured.`;
        await updateJobRun(job.id, "failed", msg);
        return { jobId: job.id, ok: false, message: msg, period: periodInfo.label };
      }

      await sendReportEmail({
        region,
        recipients,
        zipBuffer,
        period: periodInfo.label,
      });
      const msg = `${summary}\nEmailed ${region} report to ${recipients.length} recipient(s).`;
      await updateJobRun(job.id, "completed", msg);
      return { jobId: job.id, ok: true, message: msg, period: periodInfo.label };
    }

    await updateJobRun(job.id, "completed", summary);
    return {
      jobId: job.id,
      ok: true,
      message: summary,
      zipBuffer,
      period: periodInfo.label,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateJobRun(job.id, "failed", message);
    return { jobId: job.id, ok: false, message, period: periodInfo.label };
  }
}

export async function executeScheduledCron(): Promise<{
  ok: boolean;
  message: string;
  results: Record<string, unknown>;
}> {
  const periodInfo = await syncActivePeriodToTemplates();
  const recipients = await getEnabledEmails();

  if (recipients.length === 0) {
    return {
      ok: false,
      message: "No enabled email recipients configured.",
      results: {},
    };
  }

  const results: Record<string, unknown> = {};
  const zips: Partial<Record<Region, Buffer>> = {};

  for (const region of ["ZA", "UK"] as Region[]) {
    const run = await executeReportRun({ region, action: "cron", skipEmail: true });
    results[region] = { ok: run.ok, message: run.message, jobId: run.jobId };

    if (!run.ok || !run.zipBuffer) {
      return {
        ok: false,
        message: `${region} pipeline failed: ${run.message}`,
        results,
      };
    }
    zips[region] = run.zipBuffer;
  }

  try {
    await sendScheduledReportEmail({
      recipients,
      ukZip: zips.UK!,
      zaZip: zips.ZA!,
      period: periodInfo.label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email failed";
    return { ok: false, message, results };
  }

  return {
    ok: true,
    message: `Scheduled reports emailed to ${recipients.length} recipient(s).`,
    results,
  };
}
