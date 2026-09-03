import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const file = await prisma.material.findUnique({
    where: { id: params.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          department: true,
          isPublic: true,
          ownerId: true,
          banner: true,
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  let module = null;
  if (file.moduleId) {
    module = await prisma.module.findUnique({
      where: { id: file.moduleId },
      select: { id: true, title: true, type: true },
    });
  }

  // Respect the course's visibility: public courses are freely reachable via
  // share links; private/draft courses require the owner or an administrator.
  if (!file.course.isPublic) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin = role === "ADMIN";
    const isOwner = session?.user?.id === file.course.ownerId;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
  }

  return NextResponse.json({
    id: file.id,
    name: file.name,
    url: file.url,
    rawPath: file.rawPath,
    size: file.size,
    mimeType: file.mimeType,
    createdAt: file.createdAt.toISOString(),
    course: {
      id: file.course.id,
      title: file.course.title,
      slug: file.course.slug,
      description: file.course.description,
      department: file.course.department,
      isPublic: file.course.isPublic,
      banner: file.course.banner,
    },
    module,
  });
}
