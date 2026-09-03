"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("lbg-pwa-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("lbg-pwa-dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-modal p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-elevation-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-manrope font-semibold text-sm text-on-surface">Install Law by Grace</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Add to your home screen for quick access</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold font-manrope hover:brightness-110 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
