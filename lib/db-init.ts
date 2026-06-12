import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | null = null;

function getSql() {
  const url = process.env.MixUsers ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("MixUsers database URL is not configured");
  }
  return neon(url);
}

async function runSchema() {
  const sql = getSql();
  const schema = readFileSync(join(process.cwd(), "lib", "schema.sql"), "utf-8");

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql(statement);
  }
}

async function migrateJobRunsColumns() {
  const sql = getSql();
  await sql`ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS period_label TEXT`;
  await sql`ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS period_from TIMESTAMPTZ`;
  await sql`ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS period_to TIMESTAMPTZ`;
}

async function migrateReportSettings() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS report_settings (
      id         SERIAL PRIMARY KEY,
      from_time  TIME NOT NULL DEFAULT '00:00:00',
      from_date  DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      const rows = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'email_recipients'
        ) AS exists
      `;
      const exists = (rows[0] as { exists: boolean }).exists;
      if (!exists) {
        await runSchema();
      } else {
        await migrateJobRunsColumns();
        await migrateReportSettings();
      }
    })();
  }
  await schemaReady;
}
