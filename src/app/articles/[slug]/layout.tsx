import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://lawbygrace.app";
    const res = await fetch(`${baseUrl}/api/articles/${params.slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("not found");
    const article = await res.json();
    if (article.error) throw new Error(article.error);

    const title = `${article.title} — THE LAW With Gracious`;
    const description = article.summary ?? "A legal article on THE LAW With Gracious.";
    const image = article.coverImage ?? "/icons/icon-192.png";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "THE LAW With Gracious",
        images: [{ url: image, width: 1200, height: 630, alt: article.title }],
        authors: article.author?.name ? [article.author.name] : [],
      },
      twitter: {
        card: article.coverImage ? "summary_large_image" : "summary",
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: "Article — THE LAW With Gracious",
      description: "Read this legal article on THE LAW With Gracious.",
    };
  }
}

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
