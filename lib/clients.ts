import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import type { Region } from "@/lib/db";
import { getRegionWorkDir } from "@/lib/blob-sync";

function templatePath(region: Region): string {
  const filename = `mix_report_template_${region.toLowerCase()}.xlsx`;
  const workPath = join(getRegionWorkDir(region), filename);
  if (existsSync(workPath)) return workPath;
  return join(process.cwd(), "mix", region, filename);
}

export function listClients(region: Region): string[] {
  const path = templatePath(region);
  if (!existsSync(path)) {
    throw new Error(`Report template not found for ${region}: ${path}`);
  }

  const buffer = readFileSync(path);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets["Reports"];
  if (!sheet) {
    throw new Error("Reports sheet not found in report template");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const names = new Set<string>();

  for (const row of rows) {
    const name = String(row.report_name ?? "").trim();
    if (name) names.add(name);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
