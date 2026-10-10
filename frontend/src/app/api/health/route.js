import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "HEALTHY",
    service: "ResilientChain JS API",
    version: "2.0.0",
    engine: "Next.js 16 API Routes",
    ai_provider: "OpenRouter / Mistral-7B",
    timestamp: new Date().toISOString(),
  });
}
