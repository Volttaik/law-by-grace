import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { deleteRef, deleteRefWithDecoy } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

function sanitizeModuleType(t: string) {
  return ["lecture", "reading", "case-study", "revision", "video"].includes(t)
    ? t
    : "lecture";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      modules: { orderBy: { order: "asc" } },
      materials: { orderBy: { createdAt: "asc" } },
      tags: { include: { tag: true } },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    department: course.department,
    courseCode: course.courseCode,
    university: course.university,
    semester: course.semester,
    isPublic: course.isPublic,
    banner: course.banner,
    readme: course.readme,
    tags: course.tags.map((t) => t.tag.name),
    modules: course.modules,
    materials: course.materials,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const course = await prisma.course.findUnique({ where: { id: params.id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // ── Module operations ──
  if (body.moduleAction) {
    const { action } = body.moduleAction;
    if (action === "create") {
      const title = body.moduleAction.title?.trim();
      if (!title) return NextResponse.json({ error: "Module title required" }, { status: 400 });
      const last = await prisma.module.findFirst({
        where: { courseId: course.id },
        orderBy: { order: "desc" },
      });
      const module = await prisma.module.create({
        data: {
          courseId: course.id,
          title,
          type: sanitizeModuleType(body.moduleAction.type),
          order: (last?.order ?? -1) + 1,
        },
      });
      return NextResponse.json({ module });
    }
    if (action === "rename") {
      const m = await prisma.module.findFirst({
        where: { id: body.moduleAction.id, courseId: course.id },
      });
      if (!m) return NextResponse.json({ error: "Module not found" }, { status: 404 });
      await prisma.module.update({
        where: { id: m.id },
        data: { title: body.moduleAction.title?.trim() || m.title },
      });
      return NextResponse.json({ success: true });
    }
    if (action === "delete") {
      const moduleId = body.moduleAction.id;
      // Detach the module's files first so they fall back to "General"
      // instead of being orphaned with a dangling moduleId.
      await prisma.material.updateMany({
        where: { courseId: course.id, moduleId },
        data: { moduleId: null },
      });
      await prisma.module.deleteMany({
        where: { id: moduleId, courseId: course.id },
      });
      return NextResponse.json({ success: true });
    }
    if (action === "reorder") {
      const order: string[] = body.moduleAction.order ?? [];
      await Promise.all(
        order.map((id, i) =>
          prisma.module.updateMany({
            where: { id, courseId: course.id },
            data: { order: i },
          })
        )
      );
      return NextResponse.json({ success: true });
    }
  }

  // ── Details / publish updates ──
  const { title, description, department, courseCode, university, semester, banner, readme, tags } = body;
  const hasPublish = body.isPublic !== undefined;

  let newSlug = course.slug;
  if (title && title !== course.title) {
    const base = slugify(title);
    newSlug = base;
    let collision = await prisma.course.findFirst({
      where: { slug: newSlug, id: { not: course.id } },
    });
    let i = 2;
    while (collision) {
      newSlug = `${base}-${i++}`;
      collision = await prisma.course.findFirst({
        where: { slug: newSlug, id: { not: course.id } },
      });
    }
  }

  await prisma.course.update({
    where: { id: course.id },
    data: {
      ...(title ? { title, slug: newSlug } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(courseCode !== undefined ? { courseCode } : {}),
      ...(university !== undefined ? { university } : {}),
      ...(semester !== undefined ? { semester } : {}),
      ...(banner !== undefined ? { banner } : {}),
      ...(readme !== undefined ? { readme } : {}),
      ...(hasPublish ? { isPublic: !!body.isPublic } : {}),
    },
  });

  if (tags !== undefined) {
    await prisma.courseTag.deleteMany({ where: { courseId: course.id } });
    for (const tagName of tags.filter(Boolean)) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName.toLowerCase().trim() },
        create: { name: tagName.toLowerCase().trim() },
        update: {},
      });
      await prisma.courseTag
        .create({ data: { courseId: course.id, tagId: tag.id } })
        .catch(() => {});
    }
  }

  return NextResponse.json({ success: true, slug: newSlug });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { materials: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove stored objects before deleting records.
  for (const file of course.materials) {
    await deleteRef(file.url);
    await deleteRef(file.rawPath);
  }

  await prisma.course.delete({ where: { id: course.id } });
  return NextResponse.json({ success: true });
}
