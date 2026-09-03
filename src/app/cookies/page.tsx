import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The cookies and local storage THE LAW With Gracious actually uses — and what it does not use.",
};

export default function CookiesPage() {
  return (
    <InfoLayout
      eyebrow="Legal"
      title="Cookie Policy"
      lede="A short, accurate account of the storage technologies THE LAW With Gracious uses."
      updated="September 2026"
    >
      <Section title="What we use">
        <p>
          THE LAW With Gracious keeps things minimal. The platform uses exactly two
          kinds of browser storage:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-on-surface">A session cookie</strong>{" "}
            (set by the authentication system when you sign in) so the library
            remembers that you are signed in between page loads. It does not
            contain your password.
          </li>
          <li>
            <strong className="text-on-surface">A local-storage theme
            preference</strong> for light or dark mode, saved only when you
            choose to change it. It never leaves your device.
          </li>
        </ul>
      </Section>

      <Section title="What we do not use">
        <p>
          THE LAW With Gracious does not run advertising, third-party analytics,
          marketing trackers, social widgets or cross-site tracking scripts,
          and it does not sell or share data for advertising purposes.
        </p>
      </Section>

      <Section title="Managing storage">
        <p>
          Signing out clears your session on our side. You can delete cookies
          and site data for lawbygrace.app from your browser&apos;s settings at
          any time; you will simply need to sign in again. Your theme choice
          can be changed at any time from the appearance settings or the
          theme toggle in the navigation.
        </p>
      </Section>
    </InfoLayout>
  );
}
