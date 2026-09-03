"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppChannelButton from "@/components/ui/WhatsAppChannelButton";
import {
  FileText, BookOpen, Download, Link2, Check, ArrowLeft, PlayCircle,
  Image as ImageIcon, Video, File as FileIcon, Library, ExternalLink,
} from "lucide-react";


interface MaterialData {
  id: string;
  name: string;
  url: string | null;
  rawPath: string | null;
  size: number;
  mimeType: string;

  createdAt: string;
  course: {
    id: string; title: string; slug: string; description: string;
    department: string | null; isPublic: boolean; banner: string | null;
  };
  module: { id: string; title: string; type: string } | null;
}

function isVideoMime(mime: string, name: string) {
  return /^video\//.test(mime ?? "") || /\.(mp4|webm|mov|m4v)$/i.test(name ?? "");
}
function isAudioMime(mime: string, name: string) {
  return /^audio\//.test(mime ?? "") || /\.(mp3|wav|ogg|m4a)$/i.test(name ?? "");
}
function isImageMime(mime: string) {
  return /^image\//.test(mime ?? "");
}
function isPdf(name: string, mime: string) {
  return /\.pdf$/i.test(name ?? "") || mime === "application/pdf";
}

function kindInfo(mime: string, name: string) {
  if (isVideoMime(mime, name)) return { label: "Video", icon: Video };
  if (isAudioMime(mime, name)) return { label: "Audio", icon: PlayCircle };
  if (isImageMime(mime)) return { label: "Image", icon: ImageIcon };
  if (isPdf(name, mime)) return { label: "PDF document", icon: FileText };
  if (mime?.startsWith("text/") || name?.match(/\.(md|txt|docx?)$/i)) return { label: "Document", icon: FileText };
  return { label: "Material", icon: FileIcon };
}

export default function MaterialPage() {
  const { id } = useParams<{ id: string }>();
  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/materials/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (d && !d.error) setMaterial(d);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="min-h-[55vh] flex flex-col items-center justify-center gap-4" role="status">
          <div className="spinner spinner-lg" />
          <p className="text-sm text-on-surface-variant">Locating this material…</p>
        </div>
      );
    }
    if (notFound || !material) {
      return (
        <div className="min-h-[55vh] flex flex-col items-center justify-center gap-5 text-center px-4">
          <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-outline-variant" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl text-on-surface mb-2">Material not found</h1>
            <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
              This material may have been removed, or it belongs to a course that isn&apos;t public yet.
            </p>
          </div>
          <Link href="/explore" className="btn-primary">Explore the library</Link>
        </div>
      );
    }

    const kind = kindInfo(material.mimeType, material.name);
    const courseUrl = `/courses/${material.course.slug}?material=${material.id}`;
    const canDownload = material.rawPath || (material.url && (isVideoMime(material.mimeType, material.name) || isImageMime(material.mimeType) || isAudioMime(material.mimeType, material.name)));

    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto">
        <div className="card overflow-hidden">
          {material.course.banner && (
            <div className="h-28 relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={material.course.banner} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
          )}
          <div className="p-6 md:p-8">
            {/* Breadcrumb */}
            <Link href={courseUrl} className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors mb-5">
              <ArrowLeft className="w-3.5 h-3.5" />
              {material.course.title}
            </Link>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-secondary-container/70 rounded-xl flex items-center justify-center shrink-0">
                <kind.icon className="w-6 h-6 text-on-secondary-container" />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif font-bold text-xl md:text-2xl text-on-surface leading-tight mb-2 break-words">{material.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    {material.course.title}
                  </span>
                  {material.module && (
                    <span className="inline-flex items-center gap-1.5">
                      <Library className="w-3.5 h-3.5 text-primary" />
                      {material.module.title}
                    </span>
                  )}
                  <span>{kind.label}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link href={courseUrl} className="btn-primary flex-1 justify-center py-2.5">
                <BookOpen className="w-4 h-4" />
                Read this material
              </Link>
              {canDownload && (
                <a
                  href={material.rawPath ? `/api/courses/${material.course.slug}/files/${material.id}/download` : material.url ?? "#"}
                  download={!!material.url}
                  className="btn-secondary justify-center py-2.5"
                >
                  <Download className="w-4 h-4" />Download
                </a>
              )}
              <button onClick={copyLink} className="btn-secondary justify-center py-2.5">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                {copied ? "Link copied" : "Copy share link"}
              </button>
              <WhatsAppChannelButton className="py-2.5" />
            </div>

            {/* Course context */}
            <div className="mt-7 pt-6 border-t border-outline-variant/10 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1">Part of the course</p>
                <p className="text-sm font-medium text-on-surface truncate">{material.course.title}</p>
                {material.course.description && (
                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 max-w-lg">{material.course.description}</p>
                )}
              </div>
              <Link href={courseUrl} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline">
                Open course <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 card p-5 flex items-start gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Library className="w-4 h-4 text-primary" />
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            This material is part of THE LAW With Gracious library — read it online in the built-in reader,
            or download it to study offline.
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="flex-1 w-full px-4 md:px-6 py-10 max-w-[1200px] mx-auto">
        {/* Small brand breadcrumb for deep-link context */}
        <div className="max-w-3xl mx-auto mb-6 hidden md:flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Link href="/explore" className="hover:text-primary transition-colors flex items-center gap-1">
            <Library className="w-3 h-3" /> Library
          </Link>
          <span>/</span>
          {material && !loading ? (
            <>
              <Link href={`/courses/${material.course.slug}`} className="hover:text-primary transition-colors truncate max-w-[220px]">
                {material.course.title}
              </Link>
              <span>/</span>
              <span className="text-primary font-medium truncate max-w-[200px]">{material.name}</span>
            </>
          ) : (
            <span>Material</span>
          )}
        </div>
        {renderBody()}
      </main>
      <Footer />
    </div>
  );
}
