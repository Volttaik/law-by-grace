import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mediaRef } from "@/lib/storage";
import { isMediaMime, validateUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Step 3 of the direct upload flow: the file bytes are already in R2 (via the
 * presigned PUT from /files/presign). This route validates the same policy and
 * creates the material row pointing at the uploaded object.
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

  let body: { name?: string; mimeType?: string; size?: number; moduleId?: string | null; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const mimeType = (body.mimeType ?? "").trim() || "application/octet-stream";
  const size = Number(body.size ?? 0);
  const key = (body.key ?? "").trim();
  const moduleId = body.moduleId || null;

  const issue = validateUpload(name, mimeType, size);
  if (issue) {
    return NextResponse.json({ error: issue.error }, { status: issue.status });
  }
  if (!key || !key.startsWith("law-by-grace/courses/")) {
    return NextResponse.json({ error: "Invalid upload reference" }, { status: 400 });
  }

  const isMedia = isMediaMime(mimeType);
  const ref = mediaRef(key);

  const record = await prisma.material.create({
    data: {
      courseId: course.id,
      moduleId,
      name,
      url: isMedia ? ref : "",
      rawPath: isMedia ? null : ref,
      size,
      mimeType,
    },
  });

  if (moduleId) {
    await prisma.module
      .update({
        where: { id: moduleId },
        data: { files: { increment: 1 } },
      })
      .catch(() => {});
  }

  return NextResponse.json({ file: record });
}
