import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { seedRegionToBlob } from "../lib/blob-sync";

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
  const regions = (process.argv[2] ?? "both").toUpperCase();

  if (regions === "BOTH" || regions === "ZA") {
    console.log("Seeding ZA to Vercel Blob...");
    const za = await seedRegionToBlob("ZA");
    console.log(`Uploaded ${za} ZA files.`);
  }

  if (regions === "BOTH" || regions === "UK") {
    console.log("Seeding UK to Vercel Blob...");
    const uk = await seedRegionToBlob("UK");
    console.log(`Uploaded ${uk} UK files.`);
  }

  console.log("Blob seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
