import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COURSE_PATH_RE = /^\/(?:courses\/)?([a-z0-9-]+)\/?$/i;

/**
 * Accepts a course share URL (e.g. "https://lawbygrace.app/courses/constitutional-law-1"
 * or "/courses/constitutional-law-1") and resolves it to the actual course
 * record by its stable slug. Never stores the raw URL — the caller persists
 * the resolved course id.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Paste a course link to attach it." }, { status: 400 });
  }

  let pathname: string;
  try {
    const parsed = new URL(raw, "https://lawbygrace.app");
    pathname = parsed.pathname;
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid link." }, { status: 400 });
  }

  // Also tolerate a bare slug pasted without a path ("constitutional-law-1").
  const bare = COURSE_PATH_RE.test(pathname) ? pathname : pathname.replace(/^\/+/, "");
  const m = COURSE_PATH_RE.exec(bare);
  const slug = m?.[1] ?? (raw.match(/^[a-z0-9-]{2,}$/i)?.[0] ?? null);

  if (!slug) {
    return NextResponse.json({ error: "That link doesn't point to a course. Use a course link like /courses/<course-name>." }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { slug, isPublic: true },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      courseCode: true,
      university: true,
      department: true,
      semester: true,
      banner: true,
    },
  });

  if (!course) {
    return NextResponse.json({ error: "We couldn't find a course at that link." }, { status: 404 });
  }

  return NextResponse.json({ course });
}