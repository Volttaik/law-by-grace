import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function kindLabel(mimeType: string, name: string) {
  const m = (mimeType ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (/^video\//.test(m) || /\.(mp4|webm|mov|m4v)$/i.test(n)) return "Video";
  if (/^audio\//.test(m) || /\.(mp3|wav|ogg|m4a)$/i.test(n)) return "Audio";
  if (/^image\//.test(m)) return "Image";
  if (/\.pdf$/i.test(n) || m === "application/pdf") return "PDF document";
  if (m.startsWith("text/") || /\.(md|txt|docx?)$/i.test(n)) return "Document";
  return "Material";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const courseId = searchParams.get("courseId") ?? "";

  const where: any = {
    course: { isPublic: true },
    ...(courseId ? { courseId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { course: { title: { contains: q } } },
          ],
        }
      : {}),
  };

  const materials = await prisma.material.findMany({
    where,
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          department: true,
        },
      },
    },
  });

  return NextResponse.json({
    materials: materials.map(m => ({
      id: m.id,
      name: m.name,
      mimeType: m.mimeType,
      size: m.size,
      kind: kindLabel(m.mimeType, m.name),
      course: {
        id: m.course.id,
        title: m.course.title,
        slug: m.course.slug,
        department: m.course.department,
      },
    })),
  });
}