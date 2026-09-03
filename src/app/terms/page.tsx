import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you use the Law by Grace legal e-library and study platform.",
};

export default function TermsPage() {
  return (
    <InfoLayout
      eyebrow="Legal"
      title="Terms of Service"
      lede="These terms govern your use of the Law by Grace platform. By creating an account or using the library you agree to them."
      updated="September 2026"
    >
      <Section title="The service">
        <p>
          Law by Grace is an educational e-library and study platform. It
          provides access to legal courses, books, PDFs, documents, videos and
          articles for personal study and reference. The service is provided
          &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          Some features require an account. You are responsible for keeping
          your login credentials confidential and for everything done through
          your account. You must provide accurate information when registering
          and keep it up to date.
        </p>
        <p>
          Accounts are verified by email before first use. You agree not to
          create accounts for anyone else without their permission or in a way
          that misrepresents who you are.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree to use the platform lawfully and respectfully, and not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>interfere with, disrupt or overload the service or its infrastructure;</li>
          <li>attempt to access accounts, systems or data you are not authorised to access;</li>
          <li>upload harmful content, malware or files that infringe others&apos; rights;</li>
          <li>misuse the platform to harass, defraud or deceive others;</li>
          <li>scrape, republish or redistribute the library&apos;s content at scale without permission.</li>
        </ul>
      </Section>

      <Section title="Educational content">
        <p>
          Materials in the library are provided for education and general
          information. Content may change, be updated or be removed as the
          library is curated. Nothing on the platform is a substitute for
          qualified legal advice (see our <a href="/disclaimer" className="text-secondary hover:text-primary transition-colors">legal disclaimer</a>).
        </p>
      </Section>

      <Section title="User-submitted content">
        <p>
          When you publish articles or other content to the platform, you keep
          ownership of your work and grant Law by Grace a limited licence to
          host, display and distribute it as part of the service. You confirm
          that content you submit is yours or that you have the right to share
          it.
        </p>
        <p>
          We may remove or decline content that violates these terms, and we do
          not pre-review every contribution.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The Law by Grace name, branding, platform design and the original
          courses and materials published by Law by Grace are the property of
          their respective owners. Unauthorised reproduction or distribution
          of content you do not own may violate copyright (see our{" "}
          <a href="/copyright" className="text-secondary hover:text-primary transition-colors">copyright page</a>).
        </p>
      </Section>

      <Section title="Suspension and termination">
        <p>
          We may suspend or close accounts that breach these terms, that are
          used for unlawful activity, or that abuse the service. You can stop
          using the platform at any time, and you can ask us to close your
          account.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>
          The platform relies on third-party services — including hosting,
          database, object storage and email delivery — which have their own
          terms and privacy policies. Your use of the platform is subject to
          the availability and policies of those services.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Law by Grace is not liable
          for indirect or consequential losses arising from your use of the
          platform, including reliance on its educational content. Nothing in
          these terms limits liability that cannot be limited by law.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms as the service evolves. Continued use of
          the platform after changes take effect means you accept the updated
          terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-secondary hover:text-primary transition-colors">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </InfoLayout>
  );
}
