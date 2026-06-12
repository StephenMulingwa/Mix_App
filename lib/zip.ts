import archiver from "archiver";
import { createWriteStream, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import type { Region } from "@/lib/db";

function addDirectoryToArchive(archive: archiver.Archiver, dirPath: string, archivePath: string) {
  if (!existsSync(dirPath)) return;

  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const destPath = archivePath ? `${archivePath}/${entry}` : entry;
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      addDirectoryToArchive(archive, fullPath, destPath);
    } else {
      archive.file(fullPath, { name: destPath });
    }
  }
}

export async function zipResultsFolder(resultsPath: string, region: Region): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    if (existsSync(resultsPath)) {
      addDirectoryToArchive(archive, resultsPath, `${region}/Results`);
    }

    archive.finalize();
  });
}

export async function zipResultsToFile(
  resultsPath: string,
  region: Region,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 6 } });

    output.on("close", () => resolve());
    archive.on("error", reject);

    archive.pipe(output);

    if (existsSync(resultsPath)) {
      addDirectoryToArchive(archive, resultsPath, `${region}/Results`);
    }

    archive.finalize();
  });
}

export function bufferToReadable(buffer: Buffer): Readable {
  return Readable.from(buffer);
}
