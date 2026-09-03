import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  const article = await prisma.article.findUnique({ where: { slug: params.slug }, select: { id: true, authorId: true, isPublished: true } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!article.isPublished && article.authorId !== session?.user?.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const editions = await prisma.articleEdition.findMany({
    where: { articleId: article.id },
    include: { connectors: true },
    orderBy: { number: "desc" },
  });
  return NextResponse.json(editions);
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { slug: params.slug }, select: { id: true, authorId: true } });
  if (!article || article.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { content, connectors } = body;
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const lastEdition = await prisma.articleEdition.findFirst({ where: { articleId: article.id }, orderBy: { number: "desc" } });
  const nextNumber = (lastEdition?.number ?? 0) + 1;

  const edition = await prisma.articleEdition.create({
    data: {
      articleId: article.id,
      number: nextNumber,
      label: `Edition ${nextNumber}`,
      content: typeof content === "string" ? content : JSON.stringify(content),
      connectors: connectors?.length
        ? { create: connectors.map((c: { textAnchorId: string; imageNodeId: string }) => ({ textAnchorId: c.textAnchorId, imageNodeId: c.imageNodeId })) }
        : undefined,
    },
    include: { connectors: true },
  });

  await prisma.article.update({ where: { id: article.id }, data: { updatedAt: new Date() } });

  return NextResponse.json(edition, { status: 201 });
}
