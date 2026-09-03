import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readRef, toArrayBuffer } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; fileId: string } }
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

  const fileRecord = await prisma.material.findFirst({
    where: { id: params.fileId, courseId: course.id },
  });
  if (!fileRecord) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!fileRecord.rawPath) {
    return NextResponse.json({ error: "Not downloadable" }, { status: 400 });
  }

  try {
    const content = await readRef(fileRecord.rawPath);
    if (!content) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    const safeName = fileRecord.name || "document.pdf";
    const headers: Record<string, string> = {
      "Content-Type": fileRecord.mimeType || content.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
      "Cache-Control": "private, no-cache, no-store",
    };
    if (content.stream) {
      return new Response(content.stream, { headers });
    }
    if (content.bytes) {
      return new Response(toArrayBuffer(content.bytes), { headers });
    }
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  } catch (err) {
    console.error("[download] failed to serve file:", err);
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }
}
