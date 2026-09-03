import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How THE LAW With Gracious handles the information you share: accounts, saved courses, your articles and the data stored to run the library.",
};

export default function PrivacyPolicyPage() {
  return (
    <InfoLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lede="This policy explains what information THE LAW With Gracious collects, why it is collected, and how it is stored and protected. It describes the platform as it actually works."
      updated="September 2026"
    >
      <Section title="Information you provide">
        <p>
          When you create an account you provide your name, email address and a
          password (stored only as a salted hash, never in plain text). You may
          also choose to add a profile picture, a short bio, your university,
          department, level, website or location.
        </p>
        <p>
          If you write articles, create courses, upload materials or save
          courses, we store that content and activity on your account so it can
          be shown to you and to other readers on the library.
        </p>
      </Section>

      <Section title="Email addresses and verification">
        <p>
          Your email address is used to identify your account and to send
          transactional messages you request or that are required for the
          service — mainly verification codes when you register, verify an
          account or reset your password.
        </p>
        <p>
          Verification codes are generated, stored temporarily with an expiry
          time, and delivered by our email provider (Resend). We do not sell
          your email address or use it for marketing newsletters.
        </p>
      </Section>

      <Section title="Usage data and authentication">
        <p>
          To keep you signed in, the platform uses a session cookie issued by
          our authentication system (NextAuth). The cookie contains a signed
          session token — no password. Your theme preference (light or dark) is
          remembered in your browser&apos;s local storage and used only on your
          device.
        </p>
        <p>
          Basic server logs (such as request times and error details) may be
          retained by our hosting provider to keep the service running and
          secure. THE LAW With Gracious does not run third-party advertising, analytics
          or tracking scripts, and does not sell or share personal data with
          advertisers.
        </p>
      </Section>

      <Section title="Where your data is stored">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-on-surface">Database —</strong> account,
            course, material, article and activity records are stored in a
            Turso (libSQL) database.
          </li>
          <li>
            <strong className="text-on-surface">File storage —</strong> uploaded
            documents, PDFs, videos and images are stored in Cloudflare R2
            object storage under the platform&apos;s dedicated key space.
          </li>
          <li>
            <strong className="text-on-surface">Email processing —</strong>
            verification and password emails are sent through Resend, which
            processes the recipient address and content of each transactional
            message.
          </li>
          <li>
            <strong className="text-on-surface">Hosting —</strong> the
            application is hosted on Vercel.
          </li>
        </ul>
        <p>
          These providers act as data processors for the platform and have
          their own security and privacy commitments. Data may be processed in
          regions where those providers operate.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Passwords are hashed before storage, session tokens are signed, and
          secrets such as API keys are kept server-side and never exposed to
          the browser. Content is served over encrypted connections. Moderation
          and administrative functions are protected by authentication and
          role checks.
        </p>
        <p>
          No service is perfectly secure, and we cannot guarantee absolute
          security of data transmitted or stored.
        </p>
      </Section>

      <Section title="Data retention">
        <p>
          Account data is kept while your account is active. Verification
          codes expire automatically and are removed when superseded. If you
          close your account or ask us to delete data we can remove it, subject
          to technical retention limits in backups and logs.
        </p>
      </Section>

      <Section title="Your rights and choices">
        <p>
          You can review and update most of your profile information from your
          account settings at any time. You can sign out, delete saved courses
          and remove content you have authored. You may contact us to request
          access to, correction of, or deletion of your personal information.
        </p>
      </Section>

      <Section title="Children">
        <p>
          THE LAW With Gracious is an educational service intended for study use. It is
          not directed at children under the age of 13, and we do not knowingly
          collect personal information from children under 13.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy as the platform evolves. When we do, the
          &ldquo;Last updated&rdquo; date above will change, and significant
          changes will be reflected here.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or about your data can be sent to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-secondary hover:text-primary transition-colors">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </InfoLayout>
  );
}
