import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  pdf: ["pdf", "application/pdf"],
  video: ["mp4", "webm", "mov", "video/"],
  audio: ["mp3", "wav", "ogg", "m4a", "audio/"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "image/"],
  document: ["docx", "doc", "ppt", "txt", "md", "text/", "application/vnd", "application/msword"],
};

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const courseId = searchParams.get("courseId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 15;

  const keywords = type ? TYPE_KEYWORDS[type] ?? [] : [];
  const where: any = {
    ...(courseId ? { courseId: courseId } : {}),
    ...(q ? { name: { contains: q } } : {}),
    ...(type && keywords.length > 0
      ? {
          OR: [
            { mimeType: { contains: keywords.find((k) => k.endsWith("/")) ?? keywords[0] } },
            { name: { contains: keywords.find((k) => !k.endsWith("/")) ?? keywords[0] } },
          ],
        }
      : {}),
  };

  const materials = await prisma.material.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      course: { select: { id: true, title: true, slug: true, isPublic: true, department: true } },
    },
  });
  const total = await prisma.material.count({ where });

  const moduleIds = Array.from(
    new Set(materials.map((f) => f.moduleId).filter(Boolean) as string[])
  );
  const moduleMap = new Map<string, { id: string; title: string }>();
  if (moduleIds.length > 0) {
    const modules = await prisma.module.findMany({
      where: { id: { in: moduleIds } },
      select: { id: true, title: true },
    });
    modules.forEach((m) => moduleMap.set(m.id, m));
  }

  return NextResponse.json({
    materials: materials.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      url: f.url,
      rawPath: f.rawPath,
      createdAt: f.createdAt.toISOString(),
      course: f.course
        ? {
            id: f.course.id,
            title: f.course.title,
            slug: f.course.slug,
            isPublic: f.course.isPublic,
            department: f.course.department,
          }
        : null,
      module: f.moduleId && moduleMap.has(f.moduleId)
        ? moduleMap.get(f.moduleId)!
        : null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

/** Reorder a list of materials (ordered ids) — all expected to belong to one course. */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const orderedIds: string[] = body.orderedIds ?? [];

  if (orderedIds.length < 2) {
    return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 });
  }

  const files = await prisma.material.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, courseId: true },
  });
  if (files.length !== orderedIds.length) {
    return NextResponse.json({ error: "Some materials could not be found" }, { status: 404 });
  }
  const courseIds = new Set(files.map((f) => f.courseId));
  if (courseIds.size > 1) {
    return NextResponse.json({ error: "Materials must belong to the same course" }, { status: 400 });
  }

  const base = Date.now();
  await Promise.all(
    orderedIds.map((id, i) =>
      prisma.material.update({
        where: { id },
        data: { createdAt: new Date(base + i * 1000) },
      })
    )
  );

  return NextResponse.json({ success: true });
}
