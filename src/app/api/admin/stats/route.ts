import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400_000);

  const [
    totalUsers,
    newUsersThisWeek,
    totalCourses,
    publishedCourses,
    newCoursesThisWeek,
    totalMaterials,
    totalArticles,
    publishedArticles,
    draftArticles,
    totalViews,
    totalSaves,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.course.count(),
    prisma.course.count({ where: { isPublic: true } }),
    prisma.course.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.material.count(),
    prisma.article.count(),
    prisma.article.count({ where: { isPublished: true } }),
    prisma.article.count({ where: { isPublished: false } }),
    prisma.course.aggregate({ _sum: { views: true } }),
    prisma.savedCourse.count(),
  ]);

  // Real, genuinely-tracked activity (last 8 items each).
  const [recentUsers, recentCourses, recentMaterials, recentArticles] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, name: true, username: true, email: true, image: true,
          role: true, isVerified: true, bannedAt: true, createdAt: true, university: true,
        },
      }),
      prisma.course.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          owner: { select: { id: true, name: true, username: true } },
          _count: { select: { materials: true, saves: true } },
        },
      }),
      prisma.material.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { course: { select: { id: true, title: true, slug: true } } },
      }),
      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { author: { select: { id: true, name: true, username: true } } },
      }),
    ]);

  return NextResponse.json({
    totalUsers,
    newUsersThisWeek,
    totalCourses,
    publishedCourses,
    newCoursesThisWeek,
    totalMaterials,
    totalArticles,
    publishedArticles,
    draftArticles,
    totalViews: totalViews._sum.views ?? 0,
    totalSaves,
    recentUsers: recentUsers.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    recentCourses: recentCourses.map(s => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      isPublic: s.isPublic,
      views: s.views,
      banner: s.banner,
      createdAt: s.createdAt.toISOString(),
      owner: s.owner,
      materialCount: s._count.materials,
      saveCount: s._count.saves,
    })),
    recentMaterials: recentMaterials.map(f => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      createdAt: f.createdAt.toISOString(),
      course: f.course,
    })),
    recentArticles: recentArticles.map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      isPublished: a.isPublished,
      views: a.views,
      createdAt: a.createdAt.toISOString(),
      author: a.author,
    })),
  });
}
