import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { randomInt } from "crypto";
import { auth } from "@/auth";

const VALID_PURPOSES = ["signup", "password_reset", "bank_account", "verify_account", "delete_course"] as const;
type Purpose = typeof VALID_PURPOSES[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { email } = body as { email?: string; purpose?: string };
    const { purpose } = body as { email?: string; purpose?: string };

    if (!purpose || !VALID_PURPOSES.includes(purpose as Purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    if (purpose === "bank_account" || purpose === "delete_course") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true },
      });
      email = user?.email ?? undefined;
    }

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (purpose === "signup") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
    }

    if (purpose === "password_reset") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        return NextResponse.json({ success: true });
      }
    }

    if (purpose === "verify_account") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
      }
      if (existing.isVerified) {
        return NextResponse.json({ error: "This account is already verified." }, { status: 409 });
      }
    }

    await prisma.emailVerification.deleteMany({
      where: { email, purpose },
    });

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.create({
      data: { email, code, purpose, expiresAt },
    });

    const delivery = await sendVerificationCode(email, code, purpose as Purpose);

    // Development-only reveal: never sent to production clients.
    const devCode = delivery === "dev" && process.env.NODE_ENV !== "production"
      ? code
      : undefined;

    return NextResponse.json({ success: true, delivery, ...(devCode ? { devCode } : {}) });
  } catch (err) {
    console.error("[send-code]", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
