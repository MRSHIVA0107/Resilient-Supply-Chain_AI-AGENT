import { NextResponse } from "next/server";

// In-memory audit log (per-session; replace with DB for persistence)
const auditLog = [];

export async function GET() {
  return NextResponse.json(auditLog.slice(-100).reverse()); // last 100 events, newest first
}

export async function POST(request) {
  try {
    const body = await request.json();
    const event = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      event_type: body.event_type || "SYSTEM",
      actor: body.actor || "system",
      entity_type: body.entity_type || null,
      entity_id: body.entity_id || null,
      description: body.description || "",
      metadata: body.metadata || {},
    };
    auditLog.push(event);
    return NextResponse.json({ success: true, event });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
