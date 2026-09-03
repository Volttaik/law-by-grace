import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo, slugify } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const session = await auth();
  const userId = session?.user?.id ?? "__none__";

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true, university: true, department: true } },
      tags: { include: { tag: true } },
      modules: { orderBy: { order: "asc" } },
      _count: { select: { materials: true, saves: true } },
      saves: { where: { userId }, select: { userId: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const isOwner = userId === course.ownerId;
  if (!course.isPublic && !isOwner) {
    return NextResponse.json({ error: "This course is not published" }, { status: 403 });
  }

  prisma.course.update({ where: { id: course.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return NextResponse.json({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    courseCode: course.courseCode ?? "",
    university: course.university ?? "",
    department: course.department ?? "",
    semester: course.semester ?? "",
    language: course.language,
    isVerified: course.isVerified,
    isPublic: course.isPublic,
    views: course.views,
    readme: course.readme,
    saves: course._count.saves,
    tags: course.tags.map(t => t.tag.name),
    owner: course.owner,
    modules: course.modules,
    materialCount: course._count.materials,
    updatedDaysAgo: daysAgo(course.updatedAt),
    lastUpdated: course.updatedAt.toISOString(),
    createdAt: course.createdAt.toISOString(),
    banner: course.banner ?? null,
    isSaved: course.saves.some(s => s.userId === userId),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({ where: { slug: params.slug } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = (session.user as any).role === "ADMIN";
  if (course.ownerId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, courseCode, university, department, semester, language, isPublic, readme, tags, banner } = body;

  let newSlug = course.slug;
  if (title && title !== course.title) {
    const base = slugify(title);
    newSlug = base;
    let collision = await prisma.course.findFirst({ where: { slug: newSlug, id: { not: course.id } } });
    let i = 2;
    while (collision) {
      newSlug = `${base}-${i++}`;
      collision = await prisma.course.findFirst({ where: { slug: newSlug, id: { not: course.id } } });
    }
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      ...(title && { title, slug: newSlug }),
      ...(description !== undefined && { description }),
      ...(courseCode !== undefined && { courseCode }),
      ...(university !== undefined && { university }),
      ...(department !== undefined && { department }),
      ...(semester !== undefined && { semester }),
      ...(language !== undefined && { language }),
      ...(isPublic !== undefined && { isPublic }),
      ...(readme !== undefined && { readme }),
      ...(banner !== undefined && { banner }),
    },
  });

  if (tags !== undefined) {
    await prisma.courseTag.deleteMany({ where: { courseId: course.id } });
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName.toLowerCase().trim() },
        create: { name: tagName.toLowerCase().trim() },
        update: {},
      });
      await prisma.courseTag.create({ data: { courseId: course.id, tagId: tag.id } }).catch(() => {});
    }
  }

  return NextResponse.json({ slug: updated.slug, success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({ where: { slug: params.slug } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = (session.user as any).role === "ADMIN";
  if (course.ownerId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { verificationCode } = body as { verificationCode?: string };

  if (!isAdmin) {
    if (!verificationCode) {
      return NextResponse.json({ error: "Verification code required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    const otp = await prisma.emailVerification.findFirst({
      where: {
        email: user?.email ?? "",
        code: verificationCode,
        purpose: "delete_course",
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 400 });
    }

    await prisma.emailVerification.update({ where: { id: otp.id }, data: { used: true } });
  }

  await prisma.course.delete({ where: { id: course.id } });
  return NextResponse.json({ success: true });
}