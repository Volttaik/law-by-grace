import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { buildKey, isConfigured, mediaRef, putObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isConfigured()) {
    return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const key = buildKey(`users/${session.user.id}`, file.name);
  const bytes = await file.arrayBuffer();
  await putObject(key, new Uint8Array(bytes), file.type || "application/octet-stream");

  return NextResponse.json({ url: mediaRef(key) });
}
