CREATE TABLE IF NOT EXISTS email_recipients (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_runs (
  id            SERIAL PRIMARY KEY,
  region        TEXT NOT NULL CHECK (region IN ('UK', 'ZA')),
  action        TEXT NOT NULL CHECK (action IN ('execute', 'email', 'cron')),
  status        TEXT NOT NULL DEFAULT 'pending',
  message       TEXT,
  period_label  TEXT,
  period_from   TIMESTAMPTZ,
  period_to     TIMESTAMPTZ,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON job_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS report_settings (
  id         SERIAL PRIMARY KEY,
  from_time  TIME NOT NULL DEFAULT '00:00:00',
  from_date  DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
