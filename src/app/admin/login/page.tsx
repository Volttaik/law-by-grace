"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import TransitionOverlay from "@/components/TransitionOverlay";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Invalid credentials or insufficient privileges.");
        return;
      }
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (session?.user?.role === "ADMIN") {
        setTransitioning(true);
        router.push("/admin");
        router.refresh();
      } else {
        setError("This account does not have admin privileges.");
        await signOut({ redirect: false });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <TransitionOverlay show={transitioning} message="Opening Library Admin…" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-3 mb-9">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-elevation-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="THE LAW With Gracious" className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <p className="font-serif font-bold text-lg text-on-surface leading-tight tracking-tight">THE LAW With Gracious</p>
            <p className="text-xs text-on-surface-variant">Library Admin Portal</p>
          </div>
        </div>

        <div className="card p-7">
          <h1 className="font-serif font-bold text-[1.4rem] text-on-surface mb-1.5">Library Admin sign in</h1>
          <p className="text-sm text-on-surface-variant mb-6">Restricted to the library administrator (Grace) only.</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-error-container/40 border border-error/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@lawbygrace.app"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Admin password"
                  className="input-field pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign in to Admin</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          This page is restricted. All access attempts are logged.
        </p>
      </motion.div>
    </div>
  );
}
