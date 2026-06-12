import { list, put } from "@vercel/blob";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";
import type { Region } from "@/lib/db";

const BLOB_PREFIX = "mix-data";

export function getRegionWorkDir(region: Region): string {
  const base = process.env.MIX_WORK_DIR ?? join(process.cwd(), "tmp", "mix");
  return join(base, region);
}

function blobKey(region: Region, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return `${BLOB_PREFIX}/${region}/${normalized}`;
}

async function listAllBlobs(region: Region) {
  const prefix = `${BLOB_PREFIX}/${region}/`;
  const allBlobs: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({ prefix, cursor, limit: 1000 });
    for (const blob of result.blobs) {
      allBlobs.push({ pathname: blob.pathname, url: blob.url });
    }
    cursor = result.cursor;
  } while (cursor);

  return allBlobs;
}

export function ensureRegionTemplate(region: Region): void {
  const filename = `mix_report_template_${region.toLowerCase()}.xlsx`;
  const src = join(process.cwd(), "mix", region, filename);
  const workDir = getRegionWorkDir(region);
  const dest = join(workDir, filename);

  if (!existsSync(src)) {
    throw new Error(`Report template missing in repo: ${src}`);
  }

  mkdirSync(workDir, { recursive: true });
  writeFileSync(dest, readFileSync(src));
}

export async function downloadRegionFromBlob(region: Region): Promise<string> {
  const workDir = getRegionWorkDir(region);
  mkdirSync(workDir, { recursive: true });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    seedFromLocalRepo(region, workDir);
    return workDir;
  }

  try {
    const blobs = await listAllBlobs(region);
    const prefix = `${BLOB_PREFIX}/${region}/`;

    for (const blob of blobs) {
      const rel = blob.pathname.slice(prefix.length);
      if (!rel) continue;

      const dest = join(workDir, rel);
      mkdirSync(dirname(dest), { recursive: true });

      const response = await fetch(blob.url);
      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(dest, buffer);
    }

    if (!existsSync(workDir) || readdirSync(workDir).length === 0) {
      seedFromLocalRepo(region, workDir);
    }
  } catch {
    seedFromLocalRepo(region, workDir);
  }

  ensureRegionTemplate(region);
  return workDir;
}

function seedFromLocalRepo(region: Region, workDir: string) {
  const repoDir = join(process.cwd(), "mix", region);
  if (!existsSync(repoDir)) return;
  copyDir(repoDir, workDir);
}

function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, readFileSync(srcPath));
    }
  }
}

function walkDir(dir: string, baseDir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkDir(full, baseDir, files);
    } else {
      files.push(relative(baseDir, full));
    }
  }
  return files;
}

const SYNC_PATTERNS = [
  /^mix_report_template_/,
  /^Bridges\//,
  /^Results\//,
  /\/Trips\//,
  /\/Events\//,
  /report_details\.xlsx$/,
];

function shouldSync(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return SYNC_PATTERNS.some((p) => p.test(normalized));
}

export async function uploadRegionToBlob(region: Region): Promise<number> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return 0;

  const workDir = getRegionWorkDir(region);
  if (!existsSync(workDir)) return 0;

  const files = walkDir(workDir, workDir).filter(shouldSync);
  let uploaded = 0;

  for (const rel of files) {
    const fullPath = join(workDir, rel);
    const content = readFileSync(fullPath);
    await put(blobKey(region, rel), content, {
      access: "public",
      addRandomSuffix: false,
    });
    uploaded++;
  }

  return uploaded;
}

export async function seedRegionToBlob(region: Region): Promise<number> {
  const repoDir = join(process.cwd(), "mix", region);
  const workDir = getRegionWorkDir(region);

  if (!existsSync(repoDir)) {
    throw new Error(`Local mix/${region} folder not found`);
  }

  copyDir(repoDir, workDir);
  return uploadRegionToBlob(region);
}

export function getResultsPath(region: Region): string {
  return join(getRegionWorkDir(region), "Results");
}

export function getCurrentPeriod(): string {
  const now = new Date();
  return now.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
}
