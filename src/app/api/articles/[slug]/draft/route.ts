import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getOwnedArticle(slug: string, userId: string) {
  return prisma.article.findFirst({
    where: { slug, authorId: userId },
    select: { id: true, authorId: true, slug: true },
  });
}

/** Build a URL-safe slug from a title, deduped against existing articles. */
async function uniqueSlug(title: string): Promise<string> {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "article";
  let candidate = base;
  let i = 0;
  while (await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const article = await getOwnedArticle(params.slug, session.user.id);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const draft = await prisma.articleDraft.findUnique({ where: { articleId: article.id } });
  return NextResponse.json({ content: draft?.content ?? null, updatedAt: draft?.updatedAt ?? null });
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const article = await getOwnedArticle(params.slug, session.user.id);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const content = body?.content;
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const serialized = typeof content === "string" ? content : JSON.stringify(content);

  await prisma.articleDraft.upsert({
    where: { articleId: article.id },
    create: { articleId: article.id, content: serialized },
    update: { content: serialized },
  });

  // Keep the article's public metadata in sync with the draft so the author's
  // "My articles" list always shows the latest title/summary/tags.
  const meta: Record<string, unknown> = {};
  let newSlug: string | null = null;
  if (typeof body.title === "string" && body.title.trim()) {
    const newTitle = body.title.trim();
    meta.title = newTitle;
    // If the article was auto-created as "Untitled draft" (before a title was
    // typed) and now has a real title, regenerate the slug so share links don't
    // permanently expose the placeholder name. Only while it has never been
    // published — renaming a published article would break existing links.
    if (
      article.slug.startsWith("untitled-draft-") &&
      !newTitle.toLowerCase().startsWith("untitled")
    ) {
      const editionCount = await prisma.articleEdition.count({ where: { articleId: article.id } });
      if (editionCount === 0) {
        newSlug = await uniqueSlug(newTitle);
        meta.slug = newSlug;
      }
    }
  }
  if (typeof body.summary === "string") meta.summary = body.summary;
  if (Array.isArray(body.tags)) meta.tags = JSON.stringify(body.tags);

  if (body.coverImage !== undefined) {
    meta.coverImage = body.coverImage || null;
  }

  // Reference course changes are persisted through the draft save too, so the
  // article always carries its stable course reference even before publishing.
  if (body.referenceCourseId !== undefined) {
    if (body.referenceCourseId) {
      const course = await prisma.course.findUnique({ where: { id: body.referenceCourseId } });
      if (!course || !course.isPublic) {
        return NextResponse.json(
          { error: "That course could not be found or is no longer available." },
          { status: 400 }
        );
      }
    }
    meta.referenceCourseId = body.referenceCourseId || null;
  }

  if (Object.keys(meta).length > 0) {
    await prisma.article.update({ where: { id: article.id }, data: meta });
  }

  return NextResponse.json({ ok: true, ...(newSlug ? { slug: newSlug } : {}) });
}

// sendBeacon only sends POST requests — same payload as PUT, used to flush
// pending changes when the author leaves the page.
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  return PUT(req, { params });
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const article = await getOwnedArticle(params.slug, session.user.id);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.articleDraft.deleteMany({ where: { articleId: article.id } });
  return NextResponse.json({ ok: true });
}