import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatCourse(c: any, userId?: string) {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    courseCode: c.courseCode ?? "",
    university: c.university ?? "",
    department: c.department ?? "",
    semester: c.semester ?? "",
    language: c.language ?? "PDF",
    isVerified: c.isVerified,
    isPublic: c.isPublic,
    views: c.views,
    saves: c._count?.saves ?? 0,
    materialCount: c._count?.materials ?? 0,
    tags: c.tags?.map((t: any) => t.tag?.name ?? t).filter(Boolean) ?? [],
    owner: c.owner ?? null,
    modules: c.modules ?? [],
    updatedDaysAgo: daysAgo(c.updatedAt),
    lastUpdated: c.updatedAt?.toISOString?.() ?? c.updatedAt,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
    isSaved: userId ? (c.saves?.some((s: any) => s.userId === userId) ?? false) : false,
    readme: c.readme ?? null,
    banner: c.banner ?? null,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? "__none__";
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const department = searchParams.get("department") ?? "";
  const sort = searchParams.get("sort") ?? "recent";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where: any = {
    isPublic: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { courseCode: { contains: q } },
            { university: { contains: q } },
            { tags: { some: { tag: { name: { contains: q } } } } },
          ],
        }
      : {}),
    ...(department && department !== "All" ? { department } : {}),
  };

  const orderBy: any =
    sort === "saves"
      ? { saves: { _count: "desc" } }
      : sort === "recent"
      ? { updatedAt: "desc" }
      : sort === "views"
      ? { views: "desc" }
      : { updatedAt: "desc" };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        owner: { select: { id: true, name: true, username: true, image: true } },
        tags: { include: { tag: true } },
        modules: { orderBy: { order: "asc" }, take: 10 },
        _count: { select: { materials: true, saves: true } },
        saves: { where: { userId }, select: { userId: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return NextResponse.json({
    courses: courses.map(c => formatCourse(c, session?.user?.id)),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Only the library administrator (Grace) can publish courses to the library.
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the library administrator can publish courses." },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const { title, description, department, courseCode, university, semester, language, tags, modules, isPublic } = body;

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
        language: language || "PDF",
        isPublic: isPublic !== false,
        ownerId: session.user.id,
        tags: {
          create: (tags as string[] ?? [])
            .filter(Boolean)
            .map(name => ({
              tag: {
                connectOrCreate: {
                  where: { name: name.toLowerCase().trim() },
                  create: { name: name.toLowerCase().trim() },
                },
              },
            })),
        },
        modules: {
          create: (modules as { title: string; type: string }[] ?? [])
            .filter(m => m.title?.trim())
            .map((m, i) => ({
              title: m.title.trim(),
              type: m.type || "lecture",
              order: i,
            })),
        },
      },
    });

    return NextResponse.json({ slug: course.slug, id: course.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/courses]", err);
    return NextResponse.json({ error: "Failed to create course." }, { status: 500 });
  }
}