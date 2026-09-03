import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isVerified: true,
        emailVerified: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        university: true,
        _count: { select: { courses: true, saves: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action, reason } = await req.json();
  if (!userId || !action) {
    return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((session.user as any).id === userId) {
    return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
  }

  if (action === "ban") {
    await prisma.user.update({
      where: { id: userId },
      data: { bannedAt: new Date(), banReason: reason ?? "Violation of terms" },
    });
  } else if (action === "unban") {
    await prisma.user.update({
      where: { id: userId },
      data: { bannedAt: null, banReason: null },
    });
  } else if (action === "verify") {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: !user.isVerified },
    });
  } else if (action === "promote") {
    const nextRole = user.role === "STUDENT" ? "PROFESSOR" : "ADMIN";
    await prisma.user.update({ where: { id: userId }, data: { role: nextRole as any } });
  } else if (action === "demote") {
    const prevRole = user.role === "ADMIN" ? "PROFESSOR" : "STUDENT";
    await prisma.user.update({ where: { id: userId }, data: { role: prevRole as any } });
  } else if (action === "delete") {
    await prisma.user.delete({ where: { id: userId } });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
