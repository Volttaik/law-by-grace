import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { slug: params.slug }, select: { id: true, likes: true } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.article.update({
    where: { id: article.id },
    data: { likes: { increment: 1 } },
    select: { likes: true },
  });

  return NextResponse.json({ likes: updated.likes });
}
