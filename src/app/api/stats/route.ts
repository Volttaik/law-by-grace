import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [totalCourses, totalUsers, totalSaves] = await Promise.all([
    prisma.course.count({ where: { isPublic: true } }),
    prisma.user.count(),
    prisma.savedCourse.count(),
  ]);

  const universities = await prisma.user.groupBy({
    by: ["university"],
    where: { university: { not: null } },
  });

  return NextResponse.json({
    totalCourses,
    totalUsers,
    totalSaves,
    totalUniversities: universities.length,
  });
}
