import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = params;
  const userId = session.user.id;

  const course = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const existing = await prisma.savedCourse.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (existing) {
    await prisma.savedCourse.delete({ where: { userId_courseId: { userId, courseId: course.id } } });
  } else {
    await prisma.savedCourse.create({ data: { userId, courseId: course.id } });
  }

  return NextResponse.json({ saved: !existing });
}
