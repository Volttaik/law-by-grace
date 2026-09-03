import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Copyright & Intellectual Property",
  description:
    "How copyright applies to content on THE LAW With Gracious and how to report copyright concerns.",
};

export default function CopyrightPage() {
  return (
    <InfoLayout
      eyebrow="Legal"
      title="Copyright & Intellectual Property"
      lede="Who owns what on THE LAW With Gracious, and how copyright concerns can be raised."
      updated="September 2026"
    >
      <Section title="Platform content owned by THE LAW With Gracious">
        <p>
          The name &ldquo;THE LAW With Gracious&rdquo;, the logo, platform
          design, user interface and the original courses, materials and
          editorial content published by THE LAW With Gracious are owned by or
          licensed to THE LAW With Gracious. Reproduction,
          distribution or republication of this content, in whole or in part,
          without permission is not permitted.
        </p>
      </Section>

      <Section title="User-submitted content">
        <p>
          Articles and other content submitted by users belong to their
          authors. By publishing on THE LAW With Gracious, authors keep ownership of
          their work and grant the platform the limited rights needed to host
          and display it. THE LAW With Gracious does not claim ownership of the content
          its users create.
        </p>
      </Section>

      <Section title="Third-party materials">
        <p>
          The library may include documents and other materials that are
          copyright of their respective owners. THE LAW With Gracious does not claim
          ownership of such materials and provides them for educational
          purposes in good faith, consistent with how the library is curated.
        </p>
      </Section>

      <Section title="Unauthorised reproduction">
        <p>
          You may read, stream and download materials for your own personal
          study. Redistributing, reselling, or republishing library content at
          scale — or content that belongs to others — without authorisation may
          infringe copyright and is not allowed under our{" "}
          <a href="/terms" className="text-secondary hover:text-primary transition-colors">terms of service</a>.
        </p>
      </Section>

      <Section title="Reporting copyright concerns">
        <p>
          If you believe content on THE LAW With Gracious infringes your copyright, or
          the copyright of someone you represent, please tell us. To help us
          investigate, include:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>a description of the work you believe is infringed;</li>
          <li>the exact location (URL or page) of the material on THE LAW With Gracious;</li>
          <li>your contact details; and</li>
          <li>your relationship to the rights holder.</li>
        </ul>
        <p>
          Send this information to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-secondary hover:text-primary transition-colors">
            {SUPPORT_EMAIL}
          </a>
          . We take copyright concerns seriously and will review reports and
          remove content where appropriate.
        </p>
      </Section>
    </InfoLayout>
  );
}
