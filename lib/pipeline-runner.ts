import { spawn } from "child_process";
import { join } from "path";
import type { Region } from "@/lib/db";
import { getRegionWorkDir } from "@/lib/blob-sync";

export interface PipelineResult {
  ok: boolean;
  message: string;
}

export interface PipelineOptions {
  clients?: string[];
  from?: string;
  to?: string;
}

function buildPipelineArgs(region: Region, workDir: string, options?: PipelineOptions): string[] {
  const args = ["-u", join(process.cwd(), "scripts", "pipeline", "run.py"), "--region", region, "--work-dir", workDir];

  if (options?.clients && options.clients.length > 0) {
    args.push("--clients", options.clients.join(","));
  }
  if (options?.from) {
    args.push("--from", options.from);
  }
  if (options?.to) {
    args.push("--to", options.to);
  }

  return args;
}

async function runPythonLocally(
  region: Region,
  workDir: string,
  options?: PipelineOptions
): Promise<PipelineResult> {
  return new Promise((resolve) => {
    const python = process.platform === "win32" ? "python" : "python3";
    const args = buildPipelineArgs(region, workDir, options);

    const child = spawn(python, args, {
        cwd: process.cwd(),
        env: { ...process.env, MIX_WORK_DIR: join(process.cwd(), "tmp", "mix") },
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, message: stdout.trim() || "Pipeline completed" });
      } else {
        resolve({
          ok: false,
          message: stderr.trim() || stdout.trim() || `Pipeline exited with code ${code}`,
        });
      }
    });
  });
}

async function runPythonViaApi(region: Region, options?: PipelineOptions): Promise<PipelineResult> {
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {};
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  const params = new URLSearchParams({ region });
  if (options?.clients?.length) {
    params.set("clients", options.clients.join(","));
  }
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);

  const response = await fetch(`${base}/api/run-pipeline?${params.toString()}`, {
    method: "POST",
    headers,
  });

  const body = (await response.json()) as PipelineResult & { trace?: string };
  if (!response.ok || !body.ok) {
    return {
      ok: false,
      message: body.message ?? body.trace ?? `Pipeline failed (${response.status})`,
    };
  }

  return { ok: true, message: body.message };
}

export async function runPipeline(
  region: Region,
  options?: PipelineOptions
): Promise<PipelineResult> {
  const workDir = getRegionWorkDir(region);

  if (process.env.VERCEL) {
    return runPythonViaApi(region, options);
  }

  return runPythonLocally(region, workDir, options);
}
