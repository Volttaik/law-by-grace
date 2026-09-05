import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveArticleBanner } from "@/lib/article-content";
import ArticleReader from "@/components/articles/ArticleReader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      title: true,
      summary: true,
      coverImage: true,
      isPublished: true,
      authorId: true,
      author: { select: { name: true } },
    },
  });
  if (!article) return { title: "Article not found" };

  const banner = resolveArticleBanner(article.coverImage, article.id);
  const description = article.summary || `Read “${article.title}” — a legal commentary on THE LAW With Gracious.`;

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      authors: [article.author.name],
      images: [{ url: banner, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [banner],
    },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const session = await auth();
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    include: {
      author: { select: { name: true, username: true, image: true } },
      editions: {
        orderBy: { number: "desc" },
        select: { id: true, number: true, label: true, content: true, publishedAt: true },
      },
      referenceCourse: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          courseCode: true,
          university: true,
          department: true,
          banner: true,
        },
      },
    },
  });

  if (!article || (!article.isPublished && article.authorId !== session?.user?.id)) {
    notFound();
  }

  // Count the read (owner views counted too — matches the previous API behavior).
  await prisma.article.update({
    where: { id: article.id },
    data: { views: { increment: 1 } },
  });

  const banner = resolveArticleBanner(article.coverImage, article.id);

  return (
    <ArticleReader
      article={{
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        tags: JSON.parse(article.tags || "[]") as string[],
        views: article.views + 1,
        likes: article.likes,
        isOwner: session?.user?.id === article.authorId,
        banner,
        author: article.author,
        referenceCourse: article.referenceCourse,
        editions: article.editions.map(e => ({ ...e, publishedAt: e.publishedAt.toISOString() })),
      }}
    />
  );
}