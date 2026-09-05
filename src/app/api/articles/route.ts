import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { extractImages, resolveArticleBanner } from "@/lib/article-content";

export const dynamic = "force-dynamic";

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";
  const session = await auth();

  const where = mine && session?.user?.id
    ? { authorId: session.user.id }
    : { isPublished: true };

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { name: true, username: true, image: true } },
      editions: {
        orderBy: { number: "desc" },
        take: 1,
        select: { id: true, number: true, label: true, publishedAt: true, content: true },
      },
      draft: { select: { content: true } },
      _count: { select: { editions: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(articles.map(a => {
    // Prefer the in-progress draft content; fall back to the latest edition —
    // matches what the editor shows, so card previews reflect the draft too.
    const raw = a.draft?.content ?? a.editions[0]?.content ?? null;
    const images = raw ? extractImages(raw) : [];
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      coverImage: a.coverImage,
      banner: resolveArticleBanner(a.coverImage, a.id),
      isPublished: a.isPublished,
      views: a.views,
      likes: a.likes,
      tags: JSON.parse(a.tags || "[]"),
      images: images.slice(0, 5),
      imageCount: images.length,
      author: a.author,
      editions: a.editions.map(e => ({ id: e.id, number: e.number, publishedAt: e.publishedAt })),
      _count: { editions: a._count.editions },
      updatedAt: a.updatedAt,
    };
  }));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const article = await prisma.article.create({
    data: {
      slug: generateSlug(title.trim()),
      title: title.trim(),
      authorId: session.user.id,
      summary: body.summary || null,
      coverImage: body.coverImage || null,
      tags: JSON.stringify(body.tags || []),
    },
  });
  return NextResponse.json(article, { status: 201 });
}