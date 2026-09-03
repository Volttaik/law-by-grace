import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Law by Grace about support, feedback, privacy or copyright concerns.",
};

export default function ContactPage() {
  return (
    <InfoLayout
      eyebrow="Support"
      title="Contact Law by Grace"
      lede="We read every message. Choose the right address and tell us what you need."
      updated="September 2026"
    >
      <Section title="Email">
        <p>
          The best way to reach Law by Grace is by email at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-secondary font-medium hover:text-primary transition-colors break-all"
          >
            {SUPPORT_EMAIL}
          </a>
          . We aim to reply as soon as we reasonably can.
        </p>
      </Section>

      <Section title="What to include">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-on-surface">Support or technical
            problems</strong> — describe what happened, any error message, the
            page involved and your device/browser (see our{" "}
            <a href="/support" className="text-secondary hover:text-primary transition-colors">help &amp; support</a> page).
          </li>
          <li>
            <strong className="text-on-surface">Feedback or suggestions</strong>{" "}
            — tell us what you love and what could be better.
          </li>
          <li>
            <strong className="text-on-surface">Privacy questions</strong> — see
            the <a href="/privacy-policy" className="text-secondary hover:text-primary transition-colors">privacy policy</a> first, then email us with
            any remaining questions.
          </li>
          <li>
            <strong className="text-on-surface">Copyright concerns</strong> —
            include the details listed on our{" "}
            <a href="/copyright" className="text-secondary hover:text-primary transition-colors">copyright page</a>.
          </li>
        </ul>
      </Section>

      <Section title="A note on legal matters">
        <p>
          If you are writing about a personal legal matter, please remember
          that Law by Grace is an educational platform and cannot give legal
          advice or act as your lawyer.
        </p>
      </Section>
    </InfoLayout>
  );
}
