"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import {
  ArrowLeft, BookOpen, Download, Loader2, AlertTriangle,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WhatsAppChannelButton from "@/components/ui/WhatsAppChannelButton";

/* PDF.js v3 (UMD) — works as a plain <script> tag, exposes window.pdfjsLib */
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";

declare global {
  interface Window { pdfjsLib: any; }
}

/* Pages within this many pixels of the viewport get rendered */
const RENDER_MARGIN = 800;

export default function PdfReader({
  slug,
  fileId,
  fileName = "Document",
  onBack,
  embedded = false,
}: {
  slug: string;
  fileId: string;
  fileName?: string;
  /** When embedded, the reader fills its container instead of the viewport. */
  embedded?: boolean;
  /** Called when the user clicks back/close (embedded mode). */
  onBack?: () => void;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  // Mobile-first default: fit the page width on small screens.
  const [scale, setScale] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 0.6 : 0.8
  );
  const [pageInput, setPageInput] = useState("1");
  const [fullscreen, setFullscreen] = useState(false);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageSizes = useRef<Map<number, { w: number; h: number }>>(new Map());
  const renderQueue = useRef<Set<number>>(new Set());

  const viewUrl = `/api/courses/${slug}/files/${fileId}/view`;
  const downloadUrl = `/api/courses/${slug}/files/${fileId}/download`;

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || renderQueue.current.has(pageNum)) return;
    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;

    renderQueue.current.add(pageNum);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.scale(dpr, dpr);

      await page.render({ canvasContext: ctx, viewport }).promise;
      setRenderedPages(prev => new Set([...prev, pageNum]));
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") console.error("Render error", e);
    } finally {
      renderQueue.current.delete(pageNum);
    }
  }, [scale]);

  const checkVisiblePages = useCallback(() => {
    const scroll = scrollAreaRef.current;
    if (!scroll || numPages === 0) return;
    const top = scroll.scrollTop - RENDER_MARGIN;
    const bottom = scroll.scrollTop + scroll.clientHeight + RENDER_MARGIN;

    pageRefs.current.forEach((el, pageNum) => {
      const rect = el.offsetTop;
      const h = el.offsetHeight;
      if (rect + h >= top && rect <= bottom) {
        if (!renderQueue.current.has(pageNum) && !renderedPages.has(pageNum)) {
          renderPage(pageNum);
        }
      }
    });
  }, [numPages, renderedPages, renderPage]);

  const loadPdf = useCallback(async () => {
    if (!window.pdfjsLib || !slug || !fileId) return;
    setLoading(true);
    setError("");

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;

      const res = await fetch(viewUrl, { credentials: "include" });
      if (!res.ok) {
        setError(
          res.status === 403
            ? "You don't have permission to read this document."
            : "This document could not be loaded."
        );
        setLoading(false);
        return;
      }

      const buffer = await res.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
      pdfDocRef.current = pdf;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale });
        pageSizes.current.set(i, { w: vp.width, h: vp.height });
      }

      setNumPages(pdf.numPages);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("The document could not be opened. Please try again.");
      setLoading(false);
    }
  }, [slug, fileId, viewUrl, scale]);

  useEffect(() => { if (scriptReady) loadPdf(); }, [scriptReady, loadPdf]);

  useEffect(() => {
    if (numPages === 0) return;
    const t = setTimeout(() => checkVisiblePages(), 100);
    return () => clearTimeout(t);
  }, [numPages, checkVisiblePages]);

  useEffect(() => {
    if (numPages === 0) return;
    renderQueue.current.clear();
    setRenderedPages(new Set());
    (async () => {
      if (!pdfDocRef.current) return;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocRef.current.getPage(i);
        const vp = page.getViewport({ scale });
        pageSizes.current.set(i, { w: vp.width, h: vp.height });
      }
      setTimeout(() => checkVisiblePages(), 100);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => checkVisiblePages();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [checkVisiblePages]);

  useEffect(() => {
    if (numPages === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const p = parseInt(e.target.getAttribute("data-page") ?? "1", 10);
            setCurrentPage(p);
            setPageInput(String(p));
          }
        });
      },
      { root: scrollAreaRef.current, threshold: 0.3 }
    );
    pageRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages]);

  useEffect(() => {
    const onFsc = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsc);
    return () => document.removeEventListener("fullscreenchange", onFsc);
  }, []);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const scrollToPage = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(page);
      setPageInput(String(page));
    }
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (n >= 1 && n <= numPages) scrollToPage(n);
    else setPageInput(String(currentPage));
  };

  /* ── Loading screen: "Preparing your reading experience…" ── */
  const LoadingScreen = () => (
    <div className="absolute inset-0 z-10 bg-[#0e1322] flex flex-col items-center justify-center gap-6 px-6">
      <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-elevation-md border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon.svg" alt="THE LAW With Gracious" className="w-full h-full object-cover" />
      </div>
      <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <div className="text-center">
        <p className="text-white font-medium font-manrope text-sm mb-1">Preparing your reading experience…</p>
        <p className="text-white/45 text-xs">Opening <span className="text-white/70">{decodeURIComponent(fileName)}</span></p>
      </div>
    </div>
  );

  const ErrorScreen = () => (
    <div className="absolute inset-0 z-10 bg-[#0e1322] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <p className="text-white font-semibold font-manrope mb-1">Could not open this document</p>
        <p className="text-white/50 text-sm max-w-sm">{error}</p>
      </div>
      <div className="flex gap-3">
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            ← Back to course
          </button>
        )}
        <button
          onClick={() => { setError(""); setRenderedPages(new Set()); loadPdf(); }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Script
        src={`${PDFJS_CDN}/pdf.min.js`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("The PDF reader could not be initialized.")}
      />

      <div
        ref={containerRef}
        className={cn(
          "relative flex flex-col bg-[#0e1322] overflow-hidden select-none",
          embedded ? "h-full min-h-[420px] rounded-2xl border border-white/10" : "h-screen"
        )}
      >
        {/* ── Reader chrome (top bar) ── */}
        <div className="relative z-20 flex items-center justify-between gap-2 px-3 md:px-4 py-2.5 bg-[#121829] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors shrink-0 px-1.5 py-1 rounded-lg hover:bg-white/5"
                title="Close reader"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            ) : (
              <a
                href={`/courses/${slug}`}
                className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors shrink-0 px-1.5 py-1 rounded-lg hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </a>
            )}
            <div className="w-px h-5 bg-white/10 shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-white/85 truncate max-w-[130px] md:max-w-[280px]">
                {decodeURIComponent(fileName)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
            {/* Page navigation */}
            {numPages > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
                  <input
                    value={pageInput}
                    onChange={e => setPageInput(e.target.value.replace(/\D/g, ""))}
                    className="w-9 text-center bg-white/10 border border-white/15 rounded-md text-xs text-white py-1 focus:outline-none focus:border-primary/70 tabular-nums"
                    aria-label="Go to page"
                  />
                  <span className="text-xs text-white/40 tabular-nums">/ {numPages}</span>
                </form>
                <button
                  onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage >= numPages}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile page indicator */}
            {numPages > 0 && (
              <span className="sm:hidden text-[11px] text-white/50 tabular-nums shrink-0">
                {currentPage}/{numPages}
              </span>
            )}

            <div className="w-px h-5 bg-white/10 hidden sm:block" />

            {/* Zoom */}
            <button
              onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
              disabled={loading || !!error}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-white/40 w-10 text-center tabular-nums hidden md:inline">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(s + 0.25, 3.0))}
              disabled={loading || !!error}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-white/10" />

            {/* Download */}
            {!loading && !error && (
              <a
                href={downloadUrl}
                download
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                title="Download this document"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Join the course's WhatsApp Channel (same channel for every course) */}
            <WhatsAppChannelButton iconOnly />

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
              title={fullscreen ? "Exit fullscreen" : "Read in fullscreen"}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {embedded && onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all lg:hidden"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Page area ── */}
        <div ref={scrollAreaRef} className="flex-1 bg-[#171d31]" style={{ overflow: "auto" }}>
          {!loading && !error && numPages > 0 && (
            <div className="flex flex-col items-center py-6 md:py-8 gap-5 md:gap-7 px-2" style={{ minWidth: "min-content" }}>
              {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
                const size = pageSizes.current.get(pageNum);
                const canvasWidth = size ? size.w : Math.min(640, (scrollAreaRef.current?.clientWidth ?? 640) - 8);
                const canvasHeight = size ? size.h : 900;
                return (
                  <div key={pageNum} className="relative">
                    <div
                      data-page={pageNum}
                      ref={el => { if (el) pageRefs.current.set(pageNum, el); else pageRefs.current.delete(pageNum); }}
                      style={{
                        width: canvasWidth,
                        height: canvasHeight,
                        maxWidth: "100%",
                        minWidth: "min-content",
                      }}
                      className="relative shadow-2xl bg-white rounded-sm overflow-hidden"
                    >
                      {!renderedPages.has(pageNum) && (
                        <div className="absolute inset-0 bg-[#e9ecf4] flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
                            <span className="text-[10px] text-on-surface-variant/70 tabular-nums">{pageNum} / {numPages}</span>
                          </div>
                        </div>
                      )}
                      <canvas
                        ref={el => {
                          if (el) canvasRefs.current.set(pageNum, el);
                          else canvasRefs.current.delete(pageNum);
                        }}
                        className="block"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overlays */}
        {(loading || error) && (
          <>
            <div className="absolute inset-0 z-[5] bg-[#0e1322]" />
            {loading && <LoadingScreen />}
            {error && !loading && <ErrorScreen />}
          </>
        )}

        {/* ── Status bar ── */}
        {numPages > 0 && !loading && !error && (
          <div className="relative z-20 flex items-center justify-between px-4 py-1.5 bg-[#121829] border-t border-white/10 text-[11px] text-white/35 shrink-0">
            <span className="tabular-nums hidden sm:block">THE LAW With Gracious reader</span>
            <span className="tabular-nums">Page {currentPage} of {numPages}</span>
            <span className="hidden sm:block">Scroll to read — zoom for comfort</span>
          </div>
        )}
      </div>
    </>
  );
}
