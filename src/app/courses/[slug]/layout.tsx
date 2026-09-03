import type { Metadata } from "next";
import { headers } from "next/headers";

interface Props {
  params: { slug: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    // Derive the origin from the current request so metadata works identically
    // on local development, preview deployments, and the production domain.
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "https";
    const baseUrl = host
      ? `${proto}://${host}`
      : process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://lawbygrace.app";
    const res = await fetch(`${baseUrl}/api/courses/${params.slug}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error("not found");

    const course = await res.json();
    if (course.error) throw new Error(course.error);

    const title = `${course.title} — Law by Grace`;
    const description = course.description ?? "A legal course on Law by Grace.";
    const image = course.banner ?? undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "Law by Grace",
        ...(image && { images: [{ url: image, width: 1200, height: 630, alt: course.title }] }),
        authors: [course.owner?.name].filter(Boolean),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return {
      title: "Course — Law by Grace",
      description: "Legal course materials on Law by Grace.",
    };
  }
}

export default function CourseLayout({ children }: Props) {
  return <>{children}</>;
}
