import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { randomInt } from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (user.bannedAt) {
      return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.isVerified) {
      await prisma.emailVerification.deleteMany({
        where: { email, purpose: "verify_account" },
      });

      const code = randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.emailVerification.create({
        data: { email, code, purpose: "verify_account", expiresAt },
      });

      await sendVerificationCode(email, code, "verify_account");

      return NextResponse.json({ needsVerification: true });
    }

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("[check-login]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
