"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import PdfReader from "@/components/PdfReader";

function PdfViewInner() {
  const { fileId } = useParams<{ fileId: string }>();
  const searchParams = useSearchParams();
  const slug = searchParams.get("course") ?? "";
  const fileName = searchParams.get("name") ?? "Document";

  if (!slug || !fileId) {
    return (
      <div className="min-h-screen bg-[#0e1322] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-white font-semibold font-manrope">This document link is incomplete.</p>
        <a href="/explore" className="text-sm font-semibold text-primary hover:underline">
          Explore the library instead
        </a>
      </div>
    );
  }

  return <PdfReader slug={slug} fileId={fileId} fileName={fileName} />;
}

export default function PdfViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0e1322] flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
          </div>
          <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-white/70 text-sm font-medium">Preparing your reading experience…</p>
        </div>
      }
    >
      <PdfViewInner />
    </Suspense>
  );
}
