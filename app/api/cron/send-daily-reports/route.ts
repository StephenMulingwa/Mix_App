import { NextRequest } from "next/server";
import { GET as scheduledGet } from "../send-scheduled-reports/route";

export const maxDuration = 800;

/** @deprecated Use /api/cron/send-scheduled-reports?trigger=thursday */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set("trigger", "thursday");
  return scheduledGet(new NextRequest(url.toString(), request));
}
