import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { executeScheduledCron } from "@/lib/report-service";

export const maxDuration = 800;

const EAT = "Africa/Nairobi";

function eatNow(): { day: number; hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT,
    day: "numeric",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

function shouldRunMonthly(): boolean {
  const { day, hour } = eatNow();
  return day === 1 && hour === 0;
}

function shouldRunThursday(): boolean {
  const { hour, weekday } = eatNow();
  return weekday === 4 && hour === 14;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trigger = request.nextUrl.searchParams.get("trigger");

  if (trigger !== "monthly" && trigger !== "thursday") {
    return NextResponse.json({ ok: true, skipped: true, reason: "Missing or invalid trigger" });
  }

  if (trigger === "monthly" && !shouldRunMonthly()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Not 1st 00:00 EAT" });
  }

  if (trigger === "thursday" && !shouldRunThursday()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Not Thursday 14:00 EAT" });
  }

  try {
    const result = await executeScheduledCron();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
