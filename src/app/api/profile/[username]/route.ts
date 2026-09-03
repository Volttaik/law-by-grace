import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/utils";

function courseInclude(viewerId: string) {
  return {
    owner: { select: { id: true, name: true, username: true, image: true } },
    tags: { include: { tag: true } },
    modules: { orderBy: { order: "asc" as const }, take: 5 },
    _count: { select: { materials: true, saves: true } },
    saves: { where: { userId: viewerId }, select: { userId: true } },
  };
}

function formatCourse(c: any, userId: string) {
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
    views: c.views,
    saves: c._count?.saves ?? 0,
    materialCount: c._count?.materials ?? 0,
    tags: c.tags?.map((t: any) => t.tag?.name ?? t).filter(Boolean) ?? [],
    owner: c.owner ?? null,
    modules: c.modules ?? [],
    updatedDaysAgo: daysAgo(c.updatedAt),
    lastUpdated: c.updatedAt?.toISOString?.() ?? c.updatedAt,
    isSaved: c.saves?.some((s: any) => s.userId === userId) ?? false,
    banner: c.banner ?? null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const session = await auth();
  const viewerId = session?.user?.id ?? "__none__";

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      banner: true,
      bio: true,
      university: true,
      department: true,
      level: true,
      isVerified: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          courses: true,
          saves: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isOwnProfile = viewerId === user.id;

  const [courses, savedCourses] = await Promise.all([
    prisma.course.findMany({
      where: { ownerId: user.id, isPublic: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: courseInclude(viewerId),
    }),
    isOwnProfile
      ? prisma.savedCourse.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { course: { include: courseInclude(viewerId) } },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      repositoryCount: user._count.courses,
      savedCount: user._count.saves,
    },
    courses: courses.map(c => formatCourse(c, viewerId)),
    savedCourses: savedCourses.map(s => formatCourse(s.course, viewerId)),
    isOwnProfile,
  });
}