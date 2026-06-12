import { neon } from "@neondatabase/serverless";
import { ensureSchema } from "@/lib/db-init";
import type { ReportPeriod } from "@/lib/report-settings";

export type Region = "UK" | "ZA";
export type JobAction = "execute" | "email" | "cron";
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface EmailRecipient {
  id: number;
  email: string;
  enabled: boolean;
  created_at: string;
}

export interface JobRun {
  id: number;
  region: Region;
  action: JobAction;
  status: JobStatus;
  message: string | null;
  period_label: string | null;
  period_from: string | null;
  period_to: string | null;
  started_at: string;
  finished_at: string | null;
}

function getSql() {
  const url = process.env.MixUsers ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("MixUsers database URL is not configured");
  }
  return neon(url);
}

async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema();
  return fn();
}

export async function listEmailRecipients(): Promise<EmailRecipient[]> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      SELECT id, email, enabled, created_at::text
      FROM email_recipients
      ORDER BY email
    `;
    return rows as EmailRecipient[];
  });
}

export async function addEmailRecipient(email: string): Promise<EmailRecipient> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO email_recipients (email)
      VALUES (${email.toLowerCase().trim()})
      ON CONFLICT (email) DO UPDATE SET enabled = true
      RETURNING id, email, enabled, created_at::text
    `;
    return rows[0] as EmailRecipient;
  });
}

export async function setEmailRecipientEnabled(
  id: number,
  enabled: boolean
): Promise<EmailRecipient | null> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      UPDATE email_recipients
      SET enabled = ${enabled}
      WHERE id = ${id}
      RETURNING id, email, enabled, created_at::text
    `;
    return (rows[0] as EmailRecipient) ?? null;
  });
}

export async function deleteEmailRecipient(id: number): Promise<boolean> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`DELETE FROM email_recipients WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  });
}

export async function getEnabledEmails(): Promise<string[]> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      SELECT email FROM email_recipients
      WHERE enabled = true
      ORDER BY email
    `;
    return rows.map((r) => (r as { email: string }).email);
  });
}

export async function createJobRun(
  region: Region,
  action: JobAction,
  period?: ReportPeriod
): Promise<JobRun> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO job_runs (region, action, status, period_label, period_from, period_to)
      VALUES (
        ${region},
        ${action},
        'running',
        ${period?.label ?? null},
        ${period?.from ?? null},
        ${period?.to ?? null}
      )
      RETURNING id, region, action, status, message,
        period_label, period_from::text, period_to::text,
        started_at::text, finished_at::text
    `;
    return rows[0] as JobRun;
  });
}

export async function updateJobRun(
  id: number,
  status: JobStatus,
  message?: string
): Promise<void> {
  return withSchema(async () => {
    const sql = getSql();
    await sql`
      UPDATE job_runs
      SET status = ${status},
          message = ${message ?? null},
          finished_at = NOW()
      WHERE id = ${id}
    `;
  });
}

export async function getJobRun(id: number): Promise<JobRun | null> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      SELECT id, region, action, status, message,
        period_label, period_from::text, period_to::text,
        started_at::text, finished_at::text
      FROM job_runs WHERE id = ${id}
    `;
    return (rows[0] as JobRun) ?? null;
  });
}

export async function getLatestJobRuns(limit = 50): Promise<JobRun[]> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      SELECT id, region, action, status, message,
        period_label, period_from::text, period_to::text,
        started_at::text, finished_at::text
      FROM job_runs
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
    return rows as JobRun[];
  });
}

export interface ReportSettingsRow {
  id: number;
  from_time: string;
  from_date: string | null;
  updated_at: string;
}

export async function getReportSettingsRow(): Promise<ReportSettingsRow> {
  return withSchema(async () => {
    const sql = getSql();
    const rows = await sql`
      SELECT id, from_time::text, from_date::text, updated_at::text
      FROM report_settings
      ORDER BY id
      LIMIT 1
    `;

    if (rows.length > 0) {
      return rows[0] as ReportSettingsRow;
    }

    const inserted = await sql`
      INSERT INTO report_settings (from_time)
      VALUES ('00:00:00')
      RETURNING id, from_time::text, from_date::text, updated_at::text
    `;
    return inserted[0] as ReportSettingsRow;
  });
}

export async function upsertReportSettings(
  fromTime: string,
  fromDate: string | null
): Promise<ReportSettingsRow> {
  return withSchema(async () => {
    const sql = getSql();
    const existing = await sql`
      SELECT id FROM report_settings ORDER BY id LIMIT 1
    `;

    if (existing.length === 0) {
      const rows = await sql`
        INSERT INTO report_settings (from_time, from_date, updated_at)
        VALUES (${fromTime}, ${fromDate}, NOW())
        RETURNING id, from_time::text, from_date::text, updated_at::text
      `;
      return rows[0] as ReportSettingsRow;
    }

    const id = (existing[0] as { id: number }).id;
    const rows = await sql`
      UPDATE report_settings
      SET from_time = ${fromTime},
          from_date = ${fromDate},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, from_time::text, from_date::text, updated_at::text
    `;
    return rows[0] as ReportSettingsRow;
  });
}
