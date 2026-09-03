import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildKey, isConfigured, mediaRef, putObject } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name, email, password, bio,
      imageBase64,
      university, department, level,
      verificationCode,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    }

    if (!verificationCode) {
      return NextResponse.json({ error: "Email verification code is required." }, { status: 400 });
    }

    const otp = await prisma.emailVerification.findFirst({
      where: {
        email,
        code: verificationCode,
        purpose: "signup",
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const base = name.toLowerCase().replace(/[^a-z0-9]/g, ".");
    let username = base;
    let attempt = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      attempt++;
      username = `${base}${attempt}`;
    }

    const hashed = await bcrypt.hash(password, 12);

    let imageUrl: string | null = null;
    if (imageBase64 && typeof imageBase64 === "string") {
      try {
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
          const buffer = Buffer.from(matches[2], "base64");
          if (isConfigured()) {
            const key = buildKey(`users/avatars`, `avatar_${Date.now()}.${ext}`);
            await putObject(key, buffer, mimeType);
            imageUrl = mediaRef(key);
          } else {
            // Development-only fallback; production always uses R2.
            imageUrl = imageBase64;
          }
        }
      } catch {
        imageUrl = null;
      }
    }

    const resolvedDept = department || null;

    await prisma.emailVerification.update({ where: { id: otp.id }, data: { used: true } });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashed,
        bio: bio || null,
        image: imageUrl,
        university: university || null,
        department: resolvedDept,
        level: level || null,
        isVerified: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
