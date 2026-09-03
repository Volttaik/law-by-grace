import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteRef, deleteRefWithDecoy } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await prisma.material.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    data.name = name;
  }
  if (body.moduleId !== undefined) {
    // Validate the module belongs to the same course when provided.
    if (body.moduleId) {
      const module = await prisma.module.findFirst({
        where: { id: body.moduleId, courseId: file.courseId },
        select: { id: true },
      });
      if (!module) {
        return NextResponse.json({ error: "Module not found for this course" }, { status: 400 });
      }
    }
    data.moduleId = body.moduleId || null;
  }

  const updated = await prisma.material.update({
    where: { id: file.id },
    data,
  });

  // Refresh module file counts for the old and new module.
  await refreshModuleCount(file.courseId, file.moduleId);
  await refreshModuleCount(file.courseId, updated.moduleId);

  return NextResponse.json({ success: true, file: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await prisma.material.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteRef(file.url);
  await deleteRefWithDecoy(file.rawPath);

  await prisma.material.delete({ where: { id: file.id } });
  await refreshModuleCount(file.courseId, file.moduleId);

  return NextResponse.json({ success: true });
}

async function refreshModuleCount(courseId: string, moduleId: string | null) {
  if (!moduleId) return;
  const count = await prisma.material.count({ where: { courseId, moduleId } });
  await prisma.module
    .updateMany({ where: { id: moduleId }, data: { files: count } })
    .catch(() => {});
}
