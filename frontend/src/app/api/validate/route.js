import { NextResponse } from "next/server";
import { validateDatasetSchema } from "@/lib/governance.js";

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = validateDatasetSchema(payload);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/validate] Error:", err);
    return NextResponse.json(
      {
        is_valid: false,
        error_count: 1,
        warning_count: 0,
        errors: [{ record_type: "JSON", record_id: "PARSE_ERROR", field: "syntax", message: err.message || "Invalid JSON syntax" }],
        warnings: [],
      },
      { status: 400 }
    );
  }
}
