import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import type { Region } from "@/lib/db";
import { getReportSettingsRow, upsertReportSettings } from "@/lib/db";

export interface ReportPeriod {
  label: string;
  from: string;
  to: string;
  fromDisplay: string;
  toDisplay: string;
  fromDate: string | null;
  fromTime: string;
  rollsDaily: boolean;
}

const EAT = "Africa/Nairobi";

function templatePath(region: Region): string {
  const filename = `mix_report_template_${region.toLowerCase()}.xlsx`;
  return join(process.cwd(), "mix", region, filename);
}

function eatParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function eatDateString(date: Date): string {
  const p = eatParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function parseTimeString(time: string): { hour: number; minute: number; second: number } {
  const [h, m, s] = time.split(":").map(Number);
  return { hour: h ?? 0, minute: m ?? 0, second: s ?? 0 };
}

function buildEatDateTime(dateStr: string, timeStr: string): Date {
  const { hour, minute, second } = parseTimeString(timeStr);
  const [y, mo, d] = dateStr.split("-").map(Number);
  // EAT is UTC+3 — build UTC instant for that local wall time
  return new Date(Date.UTC(y, mo - 1, d, hour - 3, minute, second));
}

function subtractDaysEat(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function formatEAT(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: EAT,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function periodLabel(from: Date): string {
  return from.toLocaleString("en-US", {
    timeZone: EAT,
    month: "short",
    year: "numeric",
  });
}

function dateToTimeRow(date: Date) {
  const p = eatParts(date);
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
  };
}

function writeTimeSheet(workbook: XLSX.WorkBook, from: Date, to: Date) {
  const fromRow = { Name: "FROM", ...dateToTimeRow(from) };
  const toRow = { Name: "TO", ...dateToTimeRow(to) };
  const sheet = XLSX.utils.json_to_sheet([fromRow, toRow]);
  workbook.Sheets["Time"] = sheet;
  if (!workbook.SheetNames.includes("Time")) {
    workbook.SheetNames.push("Time");
  }
}

export function syncPeriodToTemplates(from: Date, to: Date): void {
  for (const region of ["UK", "ZA"] as Region[]) {
    const path = templatePath(region);
    if (!existsSync(path)) continue;
    const buffer = readFileSync(path);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    writeTimeSheet(workbook, from, to);
    const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    writeFileSync(path, out);
  }
}

export async function getActivePeriod(): Promise<ReportPeriod> {
  const settings = await getReportSettingsRow();
  const now = new Date();
  const todayEat = eatDateString(now);

  const rollsDaily = !settings.from_date;
  const fromDateStr = settings.from_date ?? subtractDaysEat(todayEat, 14);
  const fromTime = settings.from_time.slice(0, 8);

  const fromDate = buildEatDateTime(fromDateStr, fromTime);
  const toDate = now;

  return {
    label: periodLabel(fromDate),
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    fromDisplay: formatEAT(fromDate),
    toDisplay: formatEAT(toDate),
    fromDate: settings.from_date,
    fromTime,
    rollsDaily,
  };
}

export async function savePeriod(fromDateTime: string): Promise<ReportPeriod> {
  const dt = new Date(fromDateTime);
  if (Number.isNaN(dt.getTime())) {
    throw new Error("Invalid from datetime");
  }

  const dateStr = eatDateString(dt);
  const p = eatParts(dt);
  const timeStr = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}`;

  await upsertReportSettings(timeStr, dateStr);

  const period = await getActivePeriod();
  syncPeriodToTemplates(new Date(period.from), new Date(period.to));
  return period;
}

export async function syncActivePeriodToTemplates(): Promise<ReportPeriod> {
  const period = await getActivePeriod();
  syncPeriodToTemplates(new Date(period.from), new Date(period.to));
  return period;
}
