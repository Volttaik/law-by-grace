import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const referenceCourseSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  courseCode: true,
  university: true,
  department: true,
  banner: true,
  isPublic: true,
  ownerId: true,
} as const;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    include: {
      author: { select: { name: true, username: true, image: true, bio: true } },
      editions: {
        orderBy: { number: "desc" },
        include: { connectors: true },
      },
      referenceCourse: { select: referenceCourseSelect },
      _count: { select: { editions: true } },
    },
  });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!article.isPublished && article.authorId !== session?.user?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } });

  return NextResponse.json({ ...article, tags: JSON.parse(article.tags || "[]"), isOwner: session?.user?.id === article.authorId });
}

/** Validate that a referenceCourseId points at a real, readable course. */
async function validateReferenceCourse(courseId: string | null | undefined) {
  if (!courseId) return { ok: true as const, course: null };
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: referenceCourseSelect,
  });
  if (!course || !course.isPublic) {
    return { ok: false as const, course: null };
  }
  return { ok: true as const, course };
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const existing = await prisma.article.findFirst({
    where: { slug: params.slug, authorId: session.user.id },
    select: { id: true, referenceCourseId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {
    ...(body.title?.trim() && { title: body.title.trim() }),
    ...(body.summary !== undefined && { summary: body.summary }),
    ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
    ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
    ...(body.tags && { tags: JSON.stringify(body.tags) }),
  };

  // Reference course is set/cleared explicitly; validate it resolves first.
  if (body.referenceCourseId !== undefined) {
    if (body.referenceCourseId) {
      const check = await validateReferenceCourse(body.referenceCourseId);
      if (!check.ok) {
        return NextResponse.json(
          { error: "That course could not be found or is no longer available. Re-attach the reference course." },
          { status: 400 }
        );
      }
    }
    data.referenceCourseId = body.referenceCourseId || null;
  }

  // Publishing requires a valid reference course — enforced server-side.
  if (body.isPublished === true) {
    const refId = (data.referenceCourseId as string | null | undefined) ?? existing.referenceCourseId;
    if (!refId) {
      return NextResponse.json(
        { error: "A reference course is required before publishing. Attach a reference course to this article first." },
        { status: 400 }
      );
    }
    const check = await validateReferenceCourse(refId);
    if (!check.ok) {
      return NextResponse.json(
        { error: "The article's reference course is no longer available. Re-attach a reference course before publishing." },
        { status: 400 }
      );
    }
  }

  await prisma.article.updateMany({ where: { id: existing.id }, data });
  return NextResponse.json({ updated: true });
}

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.article.deleteMany({ where: { slug: params.slug, authorId: session.user.id } });
  return NextResponse.json({ deleted: true });
}