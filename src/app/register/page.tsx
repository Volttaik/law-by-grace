"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Eye, EyeOff, Check, ArrowRight,
  GraduationCap, Camera, X, Library, BookOpen, Mail,
} from "lucide-react";
import TransitionOverlay from "@/components/TransitionOverlay";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
  { label: "Contains uppercase", test: (v: string) => /[A-Z]/.test(v) },
];

const AREAS_OF_LAW = [
  "Law (General)",
  "Constitutional Law",
  "Criminal Law",
  "Contract Law",
  "Family Law",
  "Tort Law",
  "Property Law",
  "Company Law",
  "Evidence & Litigation",
  "Human Rights",
  "Public International Law",
  "Jurisprudence & Legal Theory",
  "Legal Research & Writing",
  "Other",
];

const LEVELS = [
  "Undergraduate (LL.B)",
  "Postgraduate (LL.M / PhD)",
  "Law School / Bar Student",
  "Practitioner / Legal Professional",
  "Lecturer / Researcher",
  "Lifelong learner",
];

const UNIVERSITIES_LIST = [
  "University of Lagos (UNILAG)",
  "University of Nigeria, Nsukka (UNN)",
  "University of Ibadan (UI)",
  "Obafemi Awolowo University, Ile-Ife (OAU)",
  "Ahmadu Bello University, Zaria (ABU)",
  "University of Benin (UNIBEN)",
  "Nigerian Law School, Bwari, Abuja",
  "Lagos State University, Ojo (LASU)",
  "Covenant University, Ota",
  "University of Abuja (UniAbuja)",
  "Nnamdi Azikiwe University, Awka (UNIZIK)",
  "Bayero University, Kano (BUK)",
  "University of Jos (UNIJOS)",
  "Kwara State University, Malete",
  "Redeemer's University, Ede",
  "Other institution",
  "Not currently enrolled",
];

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    university: "", department: "", level: "",
    bio: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validateAccount = (): string | null => {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!form.password) return "Password is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (!/\d/.test(form.password)) return "Password must contain a number.";
    if (!/[A-Z]/.test(form.password)) return "Password must contain an uppercase letter.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSendCode = async () => {
    setCodeSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send code.");
      } else {
        setDevCode(data.devCode ?? "");
        setStep(4);
      }
    } catch {
      setError("Could not send verification code. Try again.");
    } finally {
      setCodeSending(false);
    }
  };

  const handleNext = () => {
    setError("");
    if (step === 1) {
      const err = validateAccount();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleSendCode();
    } else {
      handleSubmit();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      let imageBase64: string | null = null;
      if (avatarFile) {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          bio: form.bio || null,
          userType: "student",
          university: form.university || "",
          department: form.department || "",
          level: form.level || "",
          imageBase64: imageBase64 || null,
          verificationCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }
      // Account verified — cover the screen with the branded loader
      // BEFORE the session flips to authenticated, so the verification screen
      // disappears cleanly and no mixed auth state (e.g. the bottom nav)
      // appears underneath it.
      setTransitioning(true);
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/explore");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const stepLabels = ["Account", "About you", "Profile", "Verify"];

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <TransitionOverlay
        show={transitioning}
        message="Verification complete — opening the library…"
      />
      {/* Left panel — quiet ink-navy rail */}
      <div className="hidden lg:flex lg:w-[42%] bg-ink-panel relative overflow-hidden flex-col justify-between p-12 border-r border-white/[0.07]">
        <div className="absolute inset-0">
          <Image src="/home/hero-top-bg.png" alt="" fill priority className="object-cover object-[82%_45%] opacity-[0.2]" sizes="42vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060a15]/90 via-[#070c1a]/75 to-[#0a1120]/35" />
        </div>
        <div className="absolute -top-40 -right-28 w-[520px] h-[520px] rounded-full bg-[#1d4ed8]/20 blur-[130px]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="register-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#register-dot-grid)" />
        </svg>

        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="THE LAW With Gracious" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-bold text-xl text-white tracking-tight">THE LAW With Gracious</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.18em] mb-4">Create your student account</p>
            <h2 className="text-[1.9rem] leading-snug font-serif font-bold text-white">
              Open the library.
              <br />
              Start understanding the law.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              "Free access to legal courses, books, PDFs and articles",
              "Read documents in the app or download them for offline study",
              "A calm, focused experience designed for studying law",
            ].map(b => (
              <div key={b} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white/[0.07] border border-white/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white/90" />
                </div>
                <span className="text-sm text-white/70 leading-relaxed">{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 bg-white/[0.05] border border-white/10 rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/[0.07] border border-white/10 rounded-md flex items-center justify-center shrink-0">
            <Library className="w-5 h-5 text-white/90" />
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            A legal e-library curated by Grace — courses, materials and articles for every area of law.
          </p>
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
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md mx-auto py-2"
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
                <span className="block text-[11px] text-on-surface-variant mt-1.5">Start exploring our legal library</span>
              </div>
            </Link>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-1 mb-8">
            {stepLabels.map((label, idx) => {
              const s = idx + 1;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-manrope transition-all ${
                      isDone ? "bg-primary text-on-primary" :
                      isActive ? "bg-primary text-on-primary ring-4 ring-primary/15" :
                      "bg-surface-container-high border border-outline-variant/50 text-on-surface-variant"
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${isActive || isDone ? "text-on-surface" : "text-on-surface-variant/80"}`}>
                      {label}
                    </span>
                  </div>
                  {idx < stepLabels.length - 1 && (
                    <div className={`h-px flex-1 mb-4 transition-colors ${step > s ? "bg-primary/40" : "bg-outline-variant/40"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-error-container/40 border border-error/20 rounded-lg text-sm text-error">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1 — Account */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.28 }}
                className="space-y-4"
              >
                <h1 className="font-serif font-bold text-2xl text-on-surface mb-4">Create your account</h1>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Full name</label>
                  <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Your full name" className="input-field" autoComplete="name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email address</label>
                  <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" className="input-field" autoComplete="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => update("password", e.target.value)}
                      placeholder="Create a strong password"
                      className="input-field pr-12"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant p-1">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 space-y-1">
                      {PASSWORD_RULES.map(rule => (
                        <div key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${rule.test(form.password) ? "text-green-600 dark:text-green-400" : "text-on-surface-variant"}`}>
                          <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 transition-colors ${rule.test(form.password) ? "bg-green-500" : "bg-outline-variant"}`}>
                            {rule.test(form.password) && <Check className="w-2 h-2 text-white" />}
                          </div>
                          {rule.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => update("confirmPassword", e.target.value)}
                    placeholder="Re-enter your password"
                    className={`input-field ${form.confirmPassword && form.password !== form.confirmPassword ? "border-error/50 focus:ring-error/30" : ""}`}
                    autoComplete="new-password"
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-error mt-1">Passwords do not match.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2 — About you */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.28 }}
                className="space-y-4"
              >
                <h1 className="font-serif font-bold text-2xl text-on-surface mb-2">Tell us a little about yourself</h1>
                <p className="text-on-surface-variant text-sm mb-2">So THE LAW With Gracious can provide a better learning experience.</p>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">University / Institution</label>
                  <select value={form.university} onChange={e => update("university", e.target.value)} className="input-field">
                    <option value="">Select your institution</option>
                    {UNIVERSITIES_LIST.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Area of law you&apos;re studying</label>
                  <select value={form.department} onChange={e => update("department", e.target.value)} className="input-field">
                    <option value="">Select an area</option>
                    {AREAS_OF_LAW.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Your status</label>
                  <select value={form.level} onChange={e => update("level", e.target.value)} className="input-field">
                    <option value="">Select your status</option>
                    {LEVELS.map(level => <option key={level}>{level}</option>)}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Profile */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.28 }}
                className="space-y-5"
              >
                <h1 className="font-serif font-bold text-2xl text-on-surface mb-2">Finish your profile</h1>
                <p className="text-on-surface-variant text-sm mb-2">This is optional and can be changed later in settings.</p>

                <div className="flex flex-col items-center gap-3">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full bg-surface-container-high border border-outline-variant/60 flex items-center justify-center overflow-hidden transition-all group-hover:opacity-80">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-semibold font-manrope text-on-surface-variant">
                          {form.name ? form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center border border-background">
                      <Camera className="w-3.5 h-3.5 text-on-primary" />
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-secondary hover:text-primary transition-colors font-medium">
                    {avatarPreview ? "Change photo" : "Upload a photo"}
                  </button>
                  {avatarPreview && (
                    <button type="button" onClick={() => { setAvatarPreview(null); setAvatarFile(null); }} className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-error transition-colors">
                      <X className="w-3 h-3" />Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Bio <span className="text-on-surface-variant font-normal">(optional)</span></label>
                  <textarea
                    value={form.bio}
                    onChange={e => update("bio", e.target.value)}
                    rows={3}
                    maxLength={280}
                    className="input-field resize-none"
                    placeholder="Tell the community a little about yourself…"
                  />
                  <p className="text-xs text-on-surface-variant mt-1 text-right">{form.bio.length}/280</p>
                </div>

                <div className="flex items-start gap-2.5 bg-surface-container-low border border-outline-variant/50 rounded-lg p-4">
                  <GraduationCap className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    As a reader on THE LAW With Gracious you can browse the library, read documents, watch lectures and save courses to study later.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4 — Email Verification */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.28 }}
                className="space-y-5"
              >
                <div className="flex flex-col items-center text-center gap-3 mb-2">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-serif font-bold text-2xl text-on-surface mb-2">Verify your email</h1>
                    <p className="text-on-surface-variant text-sm">
                      We sent a 6-digit code to <strong className="text-on-surface font-semibold">{form.email}</strong>
                    </p>
                  </div>
                </div>

                {devCode && (
                  <div className="w-full rounded-lg border border-dashed border-outline-variant/80 bg-surface-container-low px-4 py-3 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Development mode</p>
                    <p className="text-xs text-on-surface-variant/80">Email delivery isn&apos;t configured yet, so no email was sent. Use this code to continue:</p>
                    <p className="font-mono text-lg font-semibold tracking-[0.35em] text-secondary mt-1.5">{devCode}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="input-field text-center text-2xl font-bold font-manrope tracking-[0.4em]"
                    placeholder="• • • • • •"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={codeSending}
                  className="w-full text-center text-sm text-secondary hover:underline disabled:opacity-50"
                >
                  {codeSending ? "Sending…" : "Resend code"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleNext}
            disabled={loading || codeSending}
            className="btn-primary w-full justify-center py-2.5 mt-6"
          >
            {(loading || codeSending) ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>{step < 3 ? "Continue" : step === 3 ? "Send verification code" : "Create account"} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {step > 1 && step < 4 && (
            <button onClick={() => { setError(""); setStep(s => s - 1); }} className="w-full text-center text-sm text-on-surface-variant hover:text-on-surface transition-colors mt-3">
              ← Back
            </button>
          )}

          {step === 3 && (
            <button onClick={handleSendCode} disabled={codeSending} className="w-full text-center text-sm text-on-surface-variant hover:text-on-surface transition-colors mt-2">
              Skip profile setup →
            </button>
          )}

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-secondary font-medium hover:underline">Sign in</Link>
          </p>
          <p className="text-center text-xs text-on-surface-variant/50 mt-4">
            By signing up you agree to our{" "}
            <Link href="#" className="hover:underline">Terms</Link> and{" "}
            <Link href="#" className="hover:underline">Privacy Policy</Link>.
          </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
