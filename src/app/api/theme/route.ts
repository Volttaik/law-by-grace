import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ themeConfig: null });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { themeConfig: true },
  });

  return NextResponse.json({ themeConfig: user?.themeConfig ?? null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { themeConfig } = await req.json();
  if (typeof themeConfig !== "string") return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { themeConfig },
  });

  return NextResponse.json({ ok: true });
}
