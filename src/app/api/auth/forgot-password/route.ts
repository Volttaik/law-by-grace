import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { randomInt } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: true });
    }

    await prisma.emailVerification.deleteMany({
      where: { email, purpose: "password_reset" },
    });

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.create({
      data: { email, code, purpose: "password_reset", expiresAt },
    });

    await sendVerificationCode(email, code, "password_reset");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
