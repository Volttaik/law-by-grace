import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

const MODULE_TYPES = ["lecture", "reading", "case-study", "revision", "video"];

function sanitizeModuleType(t: string) {
  return MODULE_TYPES.includes(t) ? t : "lecture";
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? ""; // published | draft
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "12")));

  const where: any = {
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { department: { contains: q } },
            { courseCode: { contains: q } },
          ],
        }
      : {}),
    ...(status === "published" ? { isPublic: true } : {}),
    ...(status === "draft" ? { isPublic: false } : {}),
  };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        modules: { orderBy: { order: "asc" } },
        _count: { select: { materials: true, saves: true } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      department: c.department,
      courseCode: c.courseCode,
      university: c.university,
      semester: c.semester,
      isPublic: c.isPublic,
      banner: c.banner,
      views: c.views,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      tags: c.tags.map((t) => t.tag.name),
      modules: c.modules.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        order: m.order,
        fileCount: m.files,
      })),
      materialCount: c._count.materials,
      saveCount: c._count.saves,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      title, description, department, courseCode, university, semester,
      banner, isPublic, readme, tags,
    } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.course.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        courseCode: courseCode?.trim() || null,
        university: university?.trim() || null,
        department: department?.trim() || null,
        semester: semester?.trim() || null,
        banner: banner || null,
        isPublic: isPublic !== false,
        ownerId: session.user.id,
        readme: readme?.trim() || null,
        tags: {
          create: (tags as string[] ?? [])
            .filter(Boolean)
            .map((name) => ({
              tag: {
                connectOrCreate: {
                  where: { name: name.toLowerCase().trim() },
                  create: { name: name.toLowerCase().trim() },
                },
              },
            })),
        },
      },
    });

    return NextResponse.json(
      { slug: course.slug, id: course.id, title: course.title },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/admin/courses]", err);
    return NextResponse.json({ error: "Failed to create course." }, { status: 500 });
  }
}
