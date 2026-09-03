import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildKey, isConfigured, mediaRef, putObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, username: true, email: true,
      bio: true, image: true, banner: true,
      university: true, department: true, level: true,
      website: true, location: true, isVerified: true, role: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const type = formData.get("type") as "avatar" | "banner" | null;
    const file = formData.get("file") as File | null;

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 413 });
    }

    if (!isConfigured()) {
      return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    }

    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const key = buildKey(`users/${session.user.id}/${type}s`, `image.${ext}`);
    const bytes = await file.arrayBuffer();
    await putObject(key, new Uint8Array(bytes), file.type);
    const url = mediaRef(key);

    if (type === "avatar") {
      await prisma.user.update({ where: { id: session.user.id }, data: { image: url } });
      return NextResponse.json({ image: url });
    } else {
      await prisma.user.update({ where: { id: session.user.id }, data: { banner: url } });
      return NextResponse.json({ banner: url });
    }
  }

  const body = await req.json();
  const { name, bio, university, department, level, website, location } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      bio: bio?.trim() || null,
      university: university?.trim() || null,
      department: department?.trim() || null,
      level: level?.trim() || null,
      website: website?.trim() || null,
      location: location?.trim() || null,
    },
  });

  return NextResponse.json({ success: true });
}
