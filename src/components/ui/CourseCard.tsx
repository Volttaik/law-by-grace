"use client";

import Link from "next/link";
import { Shield, Clock, BookOpen, Eye } from "lucide-react";
import { cn, formatNumber, truncate } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    courseCode: string;
    university: string;
    department: string;
    owner: { name: string; username: string };
    tags: string[];
    saves: number;
    views: number;
    materialCount?: number;
    lastUpdated: string;
    isVerified?: boolean;
    updatedDaysAgo: number;
    language: string;
  };
  className?: string;
  compact?: boolean;
}

export default function CourseCard({ course, className, compact }: CourseCardProps) {
  const timeStr = course.updatedDaysAgo === 0
    ? "Updated today"
    : course.updatedDaysAgo === 1
    ? "Updated yesterday"
    : `Updated ${course.updatedDaysAgo} days ago`;

  return (
    <Link href={`/courses/${course.slug}`}>
      <article
        className={cn(
          "card p-6 cursor-pointer group flex flex-col gap-4 h-full",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {course.department && (
                <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {course.department}
                </span>
              )}
              {course.courseCode && (
                <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {course.courseCode}
                </span>
              )}
              {course.isVerified && (
                <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary-container px-2 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" /> Library verified
                </span>
              )}
            </div>
            <h3 className="font-serif font-semibold text-base text-on-surface group-hover:text-primary transition-colors leading-snug">
              {course.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {!compact && (
          <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
            {truncate(course.description, 120)}
          </p>
        )}

        {/* Tags */}
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag text-xs">{tag}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {course.materialCount != null
                ? `${formatNumber(course.materialCount)} materials`
                : course.language}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(course.views)}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs text-on-surface-variant/60">
            <Clock className="w-3 h-3" />
            {timeStr}
          </span>
        </div>
      </article>
    </Link>
  );
}