"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Library, ArrowLeft, Mail, ShieldCheck, BookOpen, PlayCircle, FileText } from "lucide-react";
import Image from "next/image";
import TransitionOverlay from "@/components/TransitionOverlay";

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? char : d)).join("").slice(0, 6);
    onChange(next);
    if (char && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = digits.map((d, idx) => (idx === i - 1 ? "" : d)).join("");
      onChange(next);
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) { onChange(pasted); inputsRef.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] ?? ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          className="w-11 text-center text-base font-semibold font-manrope text-on-surface bg-surface-container-low border border-outline-variant/70 rounded-md focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-surface-container-lowest focus:outline-none transition-all"
          style={{ height: "52px" }}
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/explore";

  const [step, setStep] = useState<"credentials" | "verify_otp">("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const doSignIn = async () => {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Something went wrong during sign in. Please try again.");
      setLoading(false);
      return;
    }
    // Full-screen loader covers the transition so the authenticated app
    // (bottom nav included) never appears underneath the auth screen.
    setTransitioning(true);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (sessionData?.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push(callbackUrl);
      }
    } catch {
      router.push(callbackUrl);
    }
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/check-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (data.needsVerification) {
        setStep("verify_otp");
        setResendCooldown(60);
        setLoading(false);
        return;
      }

      await doSignIn();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { setOtpError("Enter the 6-digit code sent to your email."); return; }
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error ?? "Invalid or expired code.");
        setOtpLoading(false);
        return;
      }
      await doSignIn();
    } catch {
      setOtpError("Something went wrong. Please try again.");
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    const res = await fetch("/api/auth/check-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) setResendCooldown(60);
    else setOtpError("Failed to resend. Please try again.");
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <TransitionOverlay
        show={transitioning}
        message="Signing you in to the library…"
      />
      {/* Left panel — quiet ink-navy library rail */}
      <div className="hidden lg:flex lg:w-[45%] bg-ink-panel relative overflow-hidden flex-col justify-between p-12 border-r border-white/[0.07]">
        <div className="absolute inset-0">
          <Image src="/home/hero-top-bg.png" alt="" fill priority className="object-cover object-[82%_45%] opacity-[0.22]" sizes="45vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a15]/90 via-[#070c1a]/75 to-[#0a1120]/30" />
          <div className="absolute -top-40 -right-28 w-[520px] h-[520px] rounded-full bg-[#1d4ed8]/20 blur-[130px]" />
        </div>
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="login-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dot-grid)" />
        </svg>
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="THE LAW With Gracious" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-bold text-xl text-white tracking-tight">THE LAW With Gracious</span>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.18em] mb-4">THE LAW With Gracious e-library</p>
            <h2 className="text-[1.75rem] leading-snug font-serif font-bold text-white">
              A calm place to study law — read, watch and learn.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: FileText, text: "Read legal PDFs and documents right in the app" },
              { icon: PlayCircle, text: "Watch educational lectures and study videos" },
              { icon: BookOpen, text: "Courses organised by area of law, curated by Grace" },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/[0.07] border border-white/10 rounded-md flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-white/90" />
                </div>
                <p className="text-sm text-white/75 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Library, label: "Courses" },
            { icon: FileText, label: "Documents" },
            { icon: PlayCircle, label: "Videos" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.05] border border-white/10 rounded-lg p-3">
              <s.icon className="w-4 h-4 text-white/80 mx-auto mb-1" />
              <p className="text-xs text-white/55">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 relative flex flex-col min-w-0 bg-background overflow-hidden">
        {/* Top background band — absolute, so it never pushes the form down */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[46vh] min-h-[320px] max-h-[500px] overflow-hidden pointer-events-none select-none">
          <Image src="/home/auth-top-bg.png" alt="" fill priority sizes="100vw" className="object-cover object-[72%_30%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/70 to-background" />
        </div>
        <div className="relative z-10 flex-1 w-full flex flex-col justify-center px-6 lg:px-10 py-8 lg:py-12">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md mx-auto"
          >
          {/* Brand header */}
          <div className="mb-9">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-elevation-sm group-hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon.svg" alt="THE LAW With Gracious" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <span className="block font-serif font-bold text-lg text-on-surface tracking-tight leading-none">THE LAW With Gracious</span>
                <span className="block text-[11px] text-on-surface-variant mt-1.5">Sign in to your account on THE LAW With Gracious</span>
              </div>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.div key="credentials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="font-serif font-bold text-2xl md:text-[1.75rem] text-on-surface mb-2">Welcome back</h1>
                <p className="text-sm text-on-surface-variant mb-8">Continue your journey through the library.</p>

                {error && (
                  <div className="mb-5 p-3.5 bg-error-container/40 border border-error/20 rounded-lg text-sm text-error">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input-field"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-sm font-medium text-on-surface">Password</label>
                      <Link href="/forgot-password" className="text-xs text-secondary hover:text-primary transition-colors">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="input-field pr-12"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full justify-center py-2.5 mt-2"
                  >
                    {loading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-on-primary/40 border-t-on-primary animate-spin" />
                    ) : (
                      <>Sign in <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-on-surface-variant mt-6">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-secondary font-medium hover:text-primary transition-colors">Create one free</Link>
                </p>
              </motion.div>
            ) : (
              <motion.div key="verify_otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={() => { setStep("credentials"); setOtpCode(""); setOtpError(""); }}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-7"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>

                <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center mb-5">
                  <Mail className="w-5 h-5 text-primary" />
                </div>

                <p className="text-on-surface-variant text-[11px] font-semibold uppercase tracking-[0.16em] mb-3">One last step</p>
                <h1 className="font-serif font-bold text-2xl text-on-surface mb-2">Verify your account</h1>
                <p className="text-sm text-on-surface-variant mb-7">
                  A 6-digit code was sent to <strong className="text-on-surface font-semibold">{email}</strong>. Enter it below to continue.
                </p>

                {otpError && (
                  <div className="mb-5 p-3.5 bg-error-container/40 border border-error/20 rounded-lg text-sm text-error">
                    {otpError}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <OTPInput value={otpCode} onChange={setOtpCode} />

                  <button
                    type="submit"
                    disabled={otpLoading || otpCode.length !== 6}
                    className="btn-primary w-full justify-center py-2.5"
                  >
                    {otpLoading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-on-primary/40 border-t-on-primary animate-spin" />
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Verify &amp; sign in</>
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-on-surface-variant">
                    Didn&apos;t get the code?{" "}
                    <button
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="text-secondary font-medium hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="spinner spinner-lg" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
