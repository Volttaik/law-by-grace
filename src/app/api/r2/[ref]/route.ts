import { NextRequest, NextResponse } from "next/server";
import { keyFromRef, readRef, toArrayBuffer } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { ref: string } }
) {
  const ref = `/api/r2/${params.ref}`;
  if (!keyFromRef(ref)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const content = await readRef(ref);
    if (!content) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": content.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    };
    if (content.length > 0) headers["Content-Length"] = String(content.length);

    if (content.stream) {
      return new Response(content.stream, { headers });
    }
    if (content.bytes) {
      return new Response(toArrayBuffer(content.bytes), { headers });
    }
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  } catch (err) {
    console.error("[r2] media read failed:", err);
    return NextResponse.json({ error: "Unable to load this file. Please try again." }, { status: 500 });
  }
}
