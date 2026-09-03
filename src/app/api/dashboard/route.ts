import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    tags: c.tags?.map((t: any) => t.tag?.name ?? t).filter(Boolean) ?? [],
    owner: c.owner ?? null,
    modules: c.modules ?? [],
    updatedDaysAgo: daysAgo(c.updatedAt),
    lastUpdated: c.updatedAt?.toISOString?.() ?? c.updatedAt,
    isSaved: c.saves?.some((s: any) => s.userId === userId) ?? false,
    banner: c.banner ?? null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, myCourses, allNotifs, savedCourses, courseCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, username: true, image: true, university: true, department: true, bio: true, createdAt: true },
      }),
      prisma.course.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          owner: { select: { id: true, name: true, username: true, image: true } },
          tags: { include: { tag: true } },
          modules: { orderBy: { order: "asc" } },
          _count: { select: { materials: true, saves: true } },
          saves: { where: { userId }, select: { userId: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.savedCourse.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          course: {
            include: {
              owner: { select: { id: true, name: true, username: true, image: true } },
              tags: { include: { tag: true } },
              modules: { orderBy: { order: "asc" } },
              _count: { select: { materials: true, saves: true } },
              saves: { where: { userId }, select: { userId: true } },
            },
          },
        },
      }),
      prisma.course.count({ where: { ownerId: userId } }),
    ]);

  const unreadCount = allNotifs.filter(n => !n.read).length;

  return NextResponse.json({
    user,
    myCourses: myCourses.map(c => formatCourse(c, userId)),
    notifications: allNotifs.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
    savedCourses: savedCourses.map(s => formatCourse(s.course, userId)),
    stats: {
      courseCount,
      totalViews: myCourses.reduce((acc, c) => acc + c.views, 0),
    },
  });
}