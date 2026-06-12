import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

function loadEnvFile() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();
  const url = process.env.MixUsers ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Set MixUsers or DATABASE_URL environment variable");
    process.exit(1);
  }

  const sql = neon(url);
  const schema = readFileSync(join(process.cwd(), "lib", "schema.sql"), "utf-8");

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql(statement);
    console.log("OK:", statement.split("\n")[0].slice(0, 60) + "...");
  }

  await sql`ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS period_label TEXT`;
  console.log("OK: ALTER TABLE job_runs period_label");
  await sql`ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS period_from TIMESTAMPTZ`;
  console.log("OK: ALTER TABLE job_runs period_from");
  await sql`ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS period_to TIMESTAMPTZ`;
  console.log("OK: ALTER TABLE job_runs period_to");

  await sql`
    CREATE TABLE IF NOT EXISTS report_settings (
      id         SERIAL PRIMARY KEY,
      from_time  TIME NOT NULL DEFAULT '00:00:00',
      from_date  DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("OK: CREATE TABLE report_settings");

  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
