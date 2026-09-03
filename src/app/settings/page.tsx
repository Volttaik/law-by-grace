"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, Shield, Palette, Save, Loader2, ArrowLeft, Camera, ImageIcon,
  Eye, EyeOff, Sun, Moon, Check, Scale,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";

function ProfileTab() {
  const { data: session, update: updateSession } = useSession();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", bio: "", university: "", department: "", level: "", website: "", location: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/profile/settings").then(r => r.json()).then(d => {
      if (d.user) {
        setForm({
          name: d.user.name ?? "",
          bio: d.user.bio ?? "",
          university: d.user.university ?? "",
          department: d.user.department ?? "",
          level: d.user.level ?? "",
          website: d.user.website ?? "",
          location: d.user.location ?? "",
        });
        if (d.user.image) setAvatarPreview(d.user.image);
        if (d.user.banner) setBannerPreview(d.user.banner);
      }
    });
  }, [session]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await updateSession();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: "avatar" | "banner") => {
    const setUploading = type === "avatar" ? setUploadingAvatar : setUploadingBanner;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);
      const res = await fetch("/api/profile/settings", { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      if (type === "avatar" && data.image) {
        setAvatarPreview(data.image);
        await updateSession();
      }
      if (type === "banner" && data.banner) {
        setBannerPreview(data.banner);
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const update = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const initials = form.name
    ? form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Banner + avatar */}
      <div className="card overflow-hidden">
        <div
          className="relative h-32 bg-ink-panel overflow-hidden group cursor-pointer"
          onClick={() => bannerInputRef.current?.click()}
        >
          {bannerPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
          )}
          {!bannerPreview && !uploadingBanner && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-xl text-sm font-medium text-on-surface border border-white/40 shadow-sm">
                <ImageIcon className="w-4 h-4" />
                Upload a cover
              </div>
            </div>
          )}
          {bannerPreview && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="flex items-center gap-2 bg-surface-container-lowest/90 px-4 py-2 rounded-xl text-sm font-medium text-on-surface">
                <ImageIcon className="w-4 h-4" />
                Change cover
              </div>
            </div>
          )}
          {uploadingBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => setBannerPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
            handleImageUpload(file, "banner");
          }}
        />

        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <div className="w-20 h-20 rounded-2xl bg-secondary-container border-4 border-surface-container-lowest flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold font-manrope text-xl text-on-secondary-container">{initials}</span>
                )}
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setAvatarPreview(ev.target?.result as string);
                reader.readAsDataURL(file);
                handleImageUpload(file, "avatar");
              }}
            />
            <div>
              <p className="font-manrope font-semibold text-base text-on-surface">{form.name || "Your name"}</p>
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-xs text-secondary hover:text-primary transition-colors font-medium">
                Change photo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-secondary" />
          <h2 className="font-manrope font-semibold text-lg text-on-surface">Profile information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Full name</label>
            <input value={form.name} onChange={e => update("name", e.target.value)} className="input-field" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Location</label>
            <input value={form.location} onChange={e => update("location", e.target.value)} className="input-field" placeholder="City, Country" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Bio</label>
          <textarea value={form.bio} onChange={e => update("bio", e.target.value)} rows={3} className="input-field resize-none" placeholder="Tell the community about yourself…" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">University / Institution</label>
            <input value={form.university} onChange={e => update("university", e.target.value)} className="input-field" placeholder="Your university" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Department / Faculty</label>
            <input value={form.department} onChange={e => update("department", e.target.value)} className="input-field" placeholder="e.g. Faculty of Law" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Level / Status</label>
            <input value={form.level} onChange={e => update("level", e.target.value)} className="input-field" placeholder="e.g. Law Student" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Website</label>
            <input value={form.website} onChange={e => update("website", e.target.value)} className="input-field" placeholder="https://…" />
          </div>
        </div>
        {error && (
          <div className="p-3 bg-error-container/20 border border-error/20 rounded-xl text-sm text-error">{error}</div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SecurityTab() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to update password.");
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch {
      setPasswordError("Something went wrong.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete account.");
        setDeletingAccount(false);
        return;
      }
      await signOut({ redirect: false });
      router.push("/");
    } catch {
      setDeleteError("Something went wrong.");
      setDeletingAccount(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-secondary" />
          <h2 className="font-manrope font-semibold text-lg text-on-surface">Change password</h2>
        </div>
        <p className="text-xs text-on-surface-variant mb-5">Keep your account secure with a strong, unique password.</p>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="input-field pr-12"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant p-1">
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input-field pr-12"
                required
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant p-1">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-field"
              required
              autoComplete="new-password"
            />
          </div>
          {passwordError && <p className="text-sm text-error">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />Password updated successfully.
            </p>
          )}
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update password
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border border-error/20">
        <h2 className="font-manrope font-semibold text-lg text-error mb-1">Delete account</h2>
        <p className="text-xs text-on-surface-variant mb-5">
          Deleting your account removes your profile, saved courses and study lists permanently. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 bg-error/10 text-error border border-error/30 px-4 py-2 rounded-xl text-xs font-semibold font-manrope hover:bg-error/20 transition-all"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-4 max-w-md">
            <p className="text-sm text-on-surface-variant">Enter your password to confirm deletion.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className="input-field"
            />
            {deleteError && <p className="text-sm text-error">{deleteError}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deletePassword}
                className="inline-flex items-center gap-1.5 bg-error text-on-error px-4 py-2 rounded-xl text-xs font-semibold font-manrope hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete permanently"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AppearanceTab() {
  const { theme, toggle } = useTheme();
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-secondary" />
          <h2 className="font-manrope font-semibold text-lg text-on-surface">Theme</h2>
        </div>
        <p className="text-xs text-on-surface-variant mb-6">
          THE LAW With Gracious opens in light mode. Choose whichever feels best for reading and studying — your choice is remembered on this device.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <button
            onClick={() => { if (theme !== "dark") toggle(); }}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-all",
              theme === "dark" ? "border-secondary bg-secondary-container/20" : "border-outline-variant/20 hover:border-outline/40"
            )}
          >
            <div className="rounded-xl h-20 mb-3 overflow-hidden border border-outline-variant/30 bg-[#0b1220] relative">
              <div className="absolute top-2 left-2 right-2 h-3 bg-[#141d33] rounded-md" />
              <div className="absolute top-7 left-2 w-1/2 h-3 bg-[#1f2b4a] rounded" />
              <div className="absolute top-12 left-2 w-3/4 h-3 bg-[#1f2b4a] rounded" />
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#0ea5e9]" />
            </div>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-secondary" />
              <p className="text-sm font-semibold text-on-surface">Dark mode</p>
              {theme === "dark" && <Check className="w-4 h-4 text-secondary ml-auto" />}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Calm navy surfaces — easy on the eyes at night</p>
          </button>
          <button
            onClick={() => { if (theme !== "light") toggle(); }}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-all",
              theme === "light" ? "border-secondary bg-secondary-container/20" : "border-outline-variant/20 hover:border-outline/40"
            )}
          >
            <div className="rounded-xl h-20 mb-3 overflow-hidden border border-outline-variant/30 bg-white relative">
              <div className="absolute top-2 left-2 right-2 h-3 bg-[#f1f5fc] rounded-md border border-slate-200" />
              <div className="absolute top-7 left-2 w-1/2 h-3 bg-[#eef3fb] rounded border border-slate-200" />
              <div className="absolute top-12 left-2 w-3/4 h-3 bg-[#eef3fb] rounded border border-slate-200" />
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#0ea5e9]" />
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-secondary" />
              <p className="text-sm font-semibold text-on-surface">Light mode</p>
              {theme === "light" && <Check className="w-4 h-4 text-secondary ml-auto" />}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Bright white &amp; blue surfaces</p>
          </button>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-br from-primary-container/25 to-secondary-container/15 border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-on-primary" />
          </div>
          <div>
            <p className="font-manrope font-semibold text-sm text-on-surface">Reading comfort</p>
            <p className="text-xs text-on-surface-variant">PDFs open in the built-in reader with its own calm, focus-friendly view.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("Profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab && ["Profile", "Security", "Appearance"].includes(urlTab)) setTab(urlTab);
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="flex-1 max-w-[900px] mx-auto px-4 md:px-6 py-10 w-full">
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />Back to dashboard
          </Link>
          <h1 className="font-serif font-bold text-xl md:text-2xl text-on-surface">Settings</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage your profile, security and how THE LAW With Gracious looks for you.</p>
        </div>

        <div className="flex gap-8 flex-col md:flex-row">
          <aside className="md:w-48 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              {[
                { label: "Profile", icon: User },
                { label: "Security", icon: Shield },
                { label: "Appearance", icon: Palette },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setTab(label)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                    tab === label
                      ? "bg-secondary-container text-on-secondary-container font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {tab === "Profile" && <ProfileTab />}
            {tab === "Security" && <SecurityTab />}
            {tab === "Appearance" && <AppearanceTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
