import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") return null;
  return session;
}

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? ""; // published | draft

  const where: any = {
    ...(q ? { title: { contains: q } } : {}),
    ...(status === "published" ? { isPublished: true } : {}),
    ...(status === "draft" ? { isPublished: false } : {}),
  };

  const articles = await prisma.article.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 60,
    include: {
      author: { select: { id: true, name: true, username: true, image: true, role: true } },
      _count: { select: { editions: true } },
    },
  });

  return NextResponse.json(
    articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      tags: JSON.parse(a.tags || "[]"),
      isPublished: a.isPublished,
      views: a.views,
      likes: a.likes,
      coverImage: a.coverImage,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      author: a.author,
      editionCount: a._count.editions,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const article = await prisma.article.create({
    data: {
      slug: generateSlug(title),
      title,
      summary: body.summary || null,
      authorId: session.user.id,
      tags: JSON.stringify(body.tags || []),
      isPublished: !!body.isPublished,
      coverImage: body.coverImage || null,
    },
  });

  return NextResponse.json(
    {
      id: article.id,
      slug: article.slug,
      title: article.title,
      isPublished: article.isPublished,
    },
    { status: 201 }
  );
}
