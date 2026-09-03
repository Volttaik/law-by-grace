import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await prisma.article.updateMany({
    where: { slug: params.slug, authorId: session.user.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.summary !== undefined && { summary: body.summary }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      ...(body.tags && { tags: JSON.stringify(body.tags) }),
    },
  });
  return NextResponse.json({ updated: result.count > 0 });
}

export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.article.deleteMany({ where: { slug: params.slug, authorId: session.user.id } });
  return NextResponse.json({ deleted: true });
}
