import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.title !== undefined && String(body.title).trim()) data.title = String(body.title).trim();
  if (body.summary !== undefined) data.summary = body.summary || null;
  if (body.isPublished !== undefined) data.isPublished = !!body.isPublished;
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags || []);

  await prisma.article.update({ where: { id: article.id }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.article.delete({ where: { id: article.id } });
  return NextResponse.json({ success: true });
}
