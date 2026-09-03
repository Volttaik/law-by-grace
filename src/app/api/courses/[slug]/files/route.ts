import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildKey, deleteRef, isConfigured,
  mediaRef, putObject,
} from "@/lib/storage";
import { isMediaMime, validateUpload } from "@/lib/uploads";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    select: { id: true, isPublic: true, ownerId: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session?.user?.id === course.ownerId;
  if (!course.isPublic && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");

  const materials = await prisma.material.findMany({
    where: { courseId: course.id, ...(moduleId ? { moduleId } : {}) },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ materials });
}

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const moduleId = formData.get("moduleId") as string | null;
  const displayName = (formData.get("displayName") as string | null)?.trim() || null;

  const mimeType = file.type || "application/octet-stream";
  const issue = validateUpload(file.name, mimeType, file.size);
  if (issue) {
    return NextResponse.json({ error: issue.error }, { status: issue.status });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!isConfigured()) {
    return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  }

  const isMedia = isMediaMime(mimeType);

  let fileUrl = "";
  let rawPath: string | null = null;

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  if (isMedia) {
    const key = buildKey(`courses/${course.id}`, safeName);
    await putObject(key, buffer, mimeType);
    fileUrl = mediaRef(key);
  } else {
    // PDFs and documents are stored in R2 and streamed on demand through the
    // private view/download routes (with the file URL kept empty).
    const key = buildKey(`courses/${course.id}`, safeName);
    await putObject(key, buffer, mimeType || "application/octet-stream");
    rawPath = mediaRef(key);
  }

  const record = await prisma.material.create({
    data: {
      courseId: course.id,
      moduleId: moduleId ?? null,
      name: displayName ?? file.name,
      url: fileUrl,
      rawPath: rawPath ?? null,
      size: file.size,
      mimeType: mimeType,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId)
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    select: { id: true, ownerId: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.ownerId !== session.user.id && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fileRecord = await prisma.material.findFirst({
    where: { id: fileId, courseId: course.id },
  });
  if (fileRecord) {
    await prisma.material.delete({ where: { id: fileId } }).catch(() => {});
    await deleteRef(fileRecord.url);
    await deleteRef(fileRecord.rawPath);
  }
  return NextResponse.json({ success: true });
}
