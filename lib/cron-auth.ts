import { NextRequest } from "next/server";

export function isCronAuthorized(request: NextRequest): boolean {
  const cronHeader = request.headers.get("x-vercel-cron");
  if (cronHeader === "1") {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }

  const querySecret = request.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}
