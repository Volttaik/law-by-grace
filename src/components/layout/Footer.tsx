import Link from "next/link";
import { Mail } from "lucide-react";

const LINKS = {
  Platform: [
    { label: "Home", href: "/" },
    { label: "Explore the Library", href: "/explore" },
    { label: "Articles", href: "/articles" },
    { label: "About", href: "/about" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Legal Disclaimer", href: "/disclaimer" },
    { label: "Copyright & Intellectual Property", href: "/copyright" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
  Support: [
    { label: "Help & Support", href: "/support" },
    { label: "Contact", href: "/contact" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-ink-panel text-white mt-auto border-t border-outline-variant/10">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon.svg" alt="Law by Grace" className="w-full h-full object-cover" />
              </div>
              <span className="font-serif font-bold text-lg text-white tracking-tight">Law by Grace</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              A beautiful e-library for law — courses, books, PDFs, videos and articles to help you understand law and study effectively.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="mailto:hello@lawbygrace.app"
                aria-label="Email Law by Grace"
                className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <Mail className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h4 className="font-manrope font-semibold text-sm text-white/90">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/15 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Law by Grace. An open legal e-library for students and readers.
          </p>
          <p className="text-sm text-white/60">
            Knowledge of the law, for everyone.
          </p>
        </div>
      </div>
    </footer>
  );
}
