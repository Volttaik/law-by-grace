"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Render as a centered dialog instead of a bottom sheet (desktop). */
  centered?: boolean;
}

/**
 * Modal container used by every editor picker. Slides up from the bottom on
 * phones; renders as a centered dialog on larger screens. Locks body scroll
 * while open and closes on Escape.
 */
export function BottomSheet({ open, onClose, title, children, centered = false }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          {centered ? (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="elevated-surface-strong rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto pointer-events-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/20 bg-surface-container-lowest rounded-t-2xl">
                  <h3 className="text-sm font-bold font-manrope text-on-surface">{title}</h3>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="p-2 -mr-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
                <div className="p-5">{children}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 inset-x-0 z-[71] elevated-surface-strong rounded-t-2xl pb-safe max-h-[82vh] flex flex-col"
            >
              <div className="shrink-0 flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-outline-variant/20 bg-surface-container-lowest rounded-t-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-1 rounded-full bg-outline-variant/60 shrink-0" aria-hidden />
                  <h3 className="text-sm font-bold font-manrope text-on-surface truncate">{title}</h3>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-2 -mr-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">{children}</div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}