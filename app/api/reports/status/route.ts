import { NextRequest, NextResponse } from "next/server";
import { getJobRun, getLatestJobRuns } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const job = await getJobRun(Number(id));
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    const jobs = await getLatestJobRuns(50);
    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
