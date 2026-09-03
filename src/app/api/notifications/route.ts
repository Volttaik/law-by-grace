import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    notifications: notifications.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })),
    count: notifications.filter(n => !n.read).length,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { ids } = body as { ids?: string[] };

  if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: session.user.id },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: session.user.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
