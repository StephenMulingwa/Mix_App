import { NextRequest, NextResponse } from "next/server";
import { getActivePeriod, savePeriod } from "@/lib/report-settings";

export async function GET() {
  try {
    const period = await getActivePeriod();
    return NextResponse.json(period);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read report period";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const from = body.from as string | undefined;

    if (!from) {
      return NextResponse.json({ error: "from datetime is required" }, { status: 400 });
    }

    const period = await savePeriod(from);
    return NextResponse.json(period);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save report period";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
