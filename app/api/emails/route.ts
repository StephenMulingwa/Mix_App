import { NextRequest, NextResponse } from "next/server";
import {
  addEmailRecipient,
  deleteEmailRecipient,
  listEmailRecipients,
  setEmailRecipientEnabled,
} from "@/lib/db";

export async function GET() {
  try {
    const recipients = await listEmailRecipients();
    return NextResponse.json({ recipients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const recipient = await addEmailRecipient(email);
    return NextResponse.json({ recipient }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const enabled = Boolean(body.enabled);

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const recipient = await setEmailRecipientEnabled(id, enabled);
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ recipient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await deleteEmailRecipient(id);
    if (!deleted) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
