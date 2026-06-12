import { NextRequest, NextResponse } from "next/server";
import type { Region } from "@/lib/db";
import { executeReportRun } from "@/lib/report-service";

export const maxDuration = 800;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const region = body.region as Region;
    const mode = body.mode as "execute" | "email";
    const clients = Array.isArray(body.clients)
      ? (body.clients as string[]).filter((c) => typeof c === "string" && c.trim())
      : undefined;

    if (region !== "UK" && region !== "ZA") {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }

    if (mode !== "execute" && mode !== "email") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const result = await executeReportRun({
      region,
      action: mode,
      clients: clients && clients.length > 0 ? clients : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { jobId: result.jobId, ok: false, message: result.message, period: result.period },
        { status: 500 }
      );
    }

    if (mode === "execute" && result.zipBuffer) {
      const filename = `MIX_${region}_Reports_${result.period.replace(/\s+/g, "_")}.zip`;
      return new NextResponse(new Uint8Array(result.zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Job-Id": String(result.jobId),
          "X-Report-Message": encodeURIComponent(result.message),
        },
      });
    }

    return NextResponse.json({
      jobId: result.jobId,
      ok: true,
      message: result.message,
      period: result.period,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
