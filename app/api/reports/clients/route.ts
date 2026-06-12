import { NextRequest, NextResponse } from "next/server";
import type { Region } from "@/lib/db";
import { listClients } from "@/lib/clients";

export async function GET(request: NextRequest) {
  try {
    const region = request.nextUrl.searchParams.get("region") as Region | null;

    if (region !== "UK" && region !== "ZA") {
      return NextResponse.json({ error: "region must be UK or ZA" }, { status: 400 });
    }

    const clients = listClients(region);
    return NextResponse.json({ region, clients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list clients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
