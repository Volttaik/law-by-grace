import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "Password required to delete account" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, role: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "Cannot delete account" }, { status: 400 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be self-deleted" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ success: true });
}
