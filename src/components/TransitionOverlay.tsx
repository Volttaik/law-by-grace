"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * Full-screen Law by Grace transition overlay.
 *
 * Used during authentication transitions (login → app, registration →
 * verification → authenticated app) so the app never shows a half-authenticated
 * state: the current screen fades out cleanly behind the loader, and the
 * destination screen appears underneath once navigation completes.
 *
 * Rendered at z-[200] — above the navbar (z-50) and the mobile bottom nav
 * (z-40) — so no mixed auth UI can ever flash through.
 */
export default function TransitionOverlay({
  show,
  message = "One moment…",
}: {
  show: boolean;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center gap-6 px-6"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="w-14 h-14 rounded-2xl overflow-hidden shadow-elevation-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
          </motion.div>
          <div className="spinner spinner-lg" />
          <p className="text-sm font-medium text-on-surface-variant">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}