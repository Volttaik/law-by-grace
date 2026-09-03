import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required." }, { status: 400 });
    }

    const otp = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        purpose: "verify_account",
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: otp.id }, data: { used: true } }),
      prisma.user.update({ where: { email }, data: { isVerified: true } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[verify-account]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
