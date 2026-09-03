import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildKey, isConfigured, mediaRef, presignPut } from "@/lib/storage";
import { validateUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Step 1 of the direct upload flow: validate the file metadata server-side and
 * return a short-lived presigned PUT URL for R2, plus the object key and the
 * media reference to store once the upload completes (step 2 = browser PUT to
 * R2, step 3 = POST /files/record).
 *
 * Direct uploads bypass the serverless request-body limit, so large PDFs,
 * videos and audio files can be added without the proxy in the middle.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    select: { id: true, ownerId: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.ownerId !== session.user.id && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  }

  let body: { name?: string; mimeType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const mimeType = (body.mimeType ?? "").trim() || "application/octet-stream";
  const size = Number(body.size ?? 0);

  const issue = validateUpload(name, mimeType, size);
  if (issue) {
    return NextResponse.json({ error: issue.error }, { status: issue.status });
  }

  const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const key = buildKey(`courses/${course.id}`, safeName);

  const uploadUrl = await presignPut(key, mimeType);

  return NextResponse.json({
    uploadUrl,
    key,
    ref: mediaRef(key),
    name,
    mimeType,
    size,
  });
}
