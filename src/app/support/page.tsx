import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "Find help with accounts, email verification, courses, materials, articles and technical issues on Law by Grace.",
};

export default function SupportPage() {
  return (
    <InfoLayout
      eyebrow="Support"
      title="Help & Support"
      lede="The place to start when something is not working on Law by Grace."
      updated="September 2026"
    >
      <Section title="Common topics">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-on-surface">Signing in or creating an
            account</strong> — make sure you are using the email address you
            registered with and the correct password. If you cannot remember
            your password, use the &ldquo;Forgot password&rdquo; link on the
            sign-in page to reset it.
          </li>
          <li>
            <strong className="text-on-surface">Email verification</strong> —
            when you register or when an unverified account signs in, a 6-digit
            code is emailed to you. Codes expire after 10 minutes and can be
            used once. Check your spam or junk folder, wait a minute and use
            &ldquo;Resend code&rdquo; if it does not arrive.
          </li>
          <li>
            <strong className="text-on-surface">Courses and materials</strong>{" "}
            — materials open in the built-in reader or player on the course
            page. If a document will not open, try the download button or
            refresh the page.
          </li>
          <li>
            <strong className="text-on-surface">Articles</strong> — articles
            are public once published by their author and appear in the
            Articles section.
          </li>
          <li>
            <strong className="text-on-surface">Saved courses</strong> — use
            the &ldquo;Save course&rdquo; button on a course page; saved
            courses appear in your dashboard and profile.
          </li>
          <li>
            <strong className="text-on-surface">Reporting content</strong> —
            if you believe a course, material, article or profile violates our
            terms or copyright rules, contact us using the details below.
          </li>
          <li>
            <strong className="text-on-surface">Privacy concerns</strong> — read
            the <a href="/privacy-policy" className="text-secondary hover:text-primary transition-colors">privacy policy</a> and, if you still have
            questions, get in touch.
          </li>
        </ul>
      </Section>

      <Section title="Before you contact us">
        <p>
          A few quick checks can solve most issues:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>confirm you are using the latest version of your browser;</li>
          <li>check your internet connection and try again after a moment;</li>
          <li>check spam folders for verification emails;</li>
          <li>make sure you are signed in to the account you expect.</li>
        </ul>
      </Section>

      <Section title="Contacting support">
        <p>
          If the problem continues, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-secondary hover:text-primary transition-colors">
            {SUPPORT_EMAIL}
          </a>
          . To help us help you faster, please include:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>the email address on your account (if you have one);</li>
          <li>a clear description of what you were doing and what went wrong;</li>
          <li>any error message you saw, word for word;</li>
          <li>the page or feature involved (and its URL if possible);</li>
          <li>your device type and browser; and</li>
          <li>a screenshot if it helps show the problem.</li>
        </ul>
        <p>
          We aim to respond to support messages as soon as we can. Please do
          not include passwords or sensitive personal information in emails.
        </p>
      </Section>
    </InfoLayout>
  );
}
