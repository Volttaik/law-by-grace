import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatCourse(c: any, userId?: string) {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description ?? "",
    courseCode: c.courseCode ?? "",
    university: c.university ?? "",
    department: c.department ?? "",
    semester: c.semester ?? "",
    language: c.language ?? "PDF",
    isVerified: c.isVerified,
    views: c.views,
    saves: c._count?.saves ?? 0,
    materialCount: c._count?.materials ?? 0,
    tags: c.tags?.map((t: any) => t.tag?.name ?? t).filter(Boolean) ?? [],
    owner: c.owner ?? null,
    modules: c.modules ?? [],
    updatedDaysAgo: daysAgo(c.updatedAt),
    lastUpdated: c.updatedAt?.toISOString?.() ?? c.updatedAt,
    isSaved: userId ? (c.saves?.some((s: any) => s.userId === userId) ?? false) : false,
    banner: c.banner ?? null,
  };
}

function formatUser(u: any) {
  return {
    id: u.id,
    name: u.name ?? "Unknown",
    username: u.username,
    university: u.university ?? "",
    department: u.department ?? "",
    bio: u.bio ?? undefined,
    repositories: u._count?.courses ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "all";
  const sort = searchParams.get("sort") ?? "courses";
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  if (type === "universities") {
    const rows = await prisma.course.groupBy({
      by: ["university"],
      where: { isPublic: true, university: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 50,
    });
    const userRows = await prisma.user.groupBy({
      by: ["university"],
      where: { university: { not: null } },
      _count: { id: true },
    });
    const userMap: Record<string, number> = {};
    for (const r of userRows) {
      if (r.university) userMap[r.university] = r._count.id;
    }
    const universities = rows
      .filter(r => r.university)
      .map(r => ({
        name: r.university as string,
        courses: r._count.id,
        learners: userMap[r.university as string] ?? 0,
      }));
    return NextResponse.json({ universities });
  }

  if (type === "users") {
    const orderBy: any =
      sort === "courses"
        ? { courses: { _count: "desc" } }
        : { createdAt: "desc" };

    const where: any = q
      ? {
          OR: [
            { name: { contains: q } },
            { username: { contains: q } },
            { university: { contains: q } },
            { department: { contains: q } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where: { ...where, bannedAt: null },
      orderBy,
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        university: true,
        department: true,
        bio: true,
        image: true,
        isVerified: true,
        _count: { select: { courses: true } },
      },
    });
    return NextResponse.json({ users: users.map(formatUser) });
  }

  if (type === "tags") {
    const where: any = q ? { name: { contains: q } } : {};
    const tags = await prisma.tag.findMany({
      where,
      orderBy: { courses: { _count: "desc" } },
      take: limit,
      select: { name: true, _count: { select: { courses: true } } },
    });
    return NextResponse.json({ tags: tags.map(t => ({ name: t.name, count: t._count.courses })) });
  }

  if (type === "trending_tags") {
    const tags = await prisma.tag.findMany({
      orderBy: { courses: { _count: "desc" } },
      take: 20,
      select: { name: true },
    });
    return NextResponse.json({ tags: tags.map(t => t.name) });
  }

  const courseWhere: any = {
    isPublic: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { courseCode: { contains: q } },
            { university: { contains: q } },
            { department: { contains: q } },
            { tags: { some: { tag: { name: { contains: q } } } } },
          ],
        }
      : {}),
  };

  const userWhere: any = q
    ? {
        bannedAt: null,
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { university: { contains: q } },
          { department: { contains: q } },
        ],
      }
    : { bannedAt: null };

  const tagWhere: any = q ? { name: { contains: q } } : {};

  const [courses, users, tags] = await Promise.all([
    q
      ? prisma.course.findMany({
          where: courseWhere,
          orderBy: { saves: { _count: "desc" } },
          take: limit,
          include: {
            owner: { select: { id: true, name: true, username: true, image: true } },
            tags: { include: { tag: true } },
            modules: { orderBy: { order: "asc" }, take: 5 },
            _count: { select: { materials: true, saves: true } },
            saves: userId ? { where: { userId }, select: { userId: true } } : false,
          },
        })
      : Promise.resolve([]),
    q
      ? prisma.user.findMany({
          where: userWhere,
          orderBy: { courses: { _count: "desc" } },
          take: limit,
          select: {
            id: true, name: true, username: true, university: true,
            department: true, bio: true, image: true, isVerified: true,
            _count: { select: { courses: true } },
          },
        })
      : Promise.resolve([]),
    q
      ? prisma.tag.findMany({
          where: tagWhere,
          orderBy: { courses: { _count: "desc" } },
          take: 20,
          select: { name: true },
        })
      : prisma.tag.findMany({
          orderBy: { courses: { _count: "desc" } },
          take: 20,
          select: { name: true },
        }),
  ]);

  return NextResponse.json({
    courses: courses.map(c => formatCourse(c, userId)),
    users: users.map(formatUser),
    tags: tags.map(t => t.name),
  });
}