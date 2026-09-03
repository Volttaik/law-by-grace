import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";

export const metadata: Metadata = {
  title: "Legal Disclaimer",
  description:
    "THE LAW With Gracious is an educational platform. Its content is general legal information, not personalised legal advice.",
};

export default function DisclaimerPage() {
  return (
    <InfoLayout
      eyebrow="Legal"
      title="Legal Disclaimer"
      lede="Please read this before relying on anything you find on THE LAW With Gracious."
      updated="September 2026"
    >
      <Section title="Educational information, not legal advice">
        <p>
          THE LAW With Gracious is an educational and informational platform. The
          courses, books, PDFs, articles and other materials available here are
          provided to help people understand legal concepts, study law and
          learn more about how legal systems work.
        </p>
        <p>
          Nothing on this platform is legal advice, and nothing on this
          platform creates a lawyer–client relationship between you and Law by
          Grace, its creator, or any contributor.
        </p>
      </Section>

      <Section title="General material, general situations">
        <p>
          Legal materials are written in general terms. The law is complex,
          varies between jurisdictions, and changes over time. A general
          explanation of a legal rule may not fit your specific situation, and
          it may already be out of date or incomplete for where you live.
        </p>
        <p>
          For those reasons, you should not act — or refrain from acting — on
          the basis of content found on this platform without first seeking
          advice that is tailored to your own circumstances.
        </p>
      </Section>

      <Section title="Seek qualified counsel">
        <p>
          If you are facing a real legal matter — a dispute, a contract, a
          court case, an immigration question, or any situation where the law
          could affect your rights or obligations — you should consult a
          qualified legal professional who is licensed in the relevant
          jurisdiction and who can consider the full facts of your case.
        </p>
      </Section>

      <Section title="Verify before relying">
        <p>
          Legal study materials may contain summaries, omissions, translations
          or editorial interpretations. Where your studies, writing or
          decisions depend on the current law, you should independently verify
          the position against the applicable statutes, regulations, case law
          and authoritative sources for the relevant jurisdiction.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          THE LAW With Gracious makes every effort to curate accurate and useful
          material, but the platform is provided &ldquo;as is&rdquo;. To the
          maximum extent permitted by law, THE LAW With Gracious gives no warranty that
          the content is accurate, complete, current or fit for any particular
          purpose.
        </p>
      </Section>
    </InfoLayout>
  );
}
