import type { Metadata } from "next";
import InfoLayout, { Section } from "@/components/layout/InfoLayout";

export const metadata: Metadata = {
  title: "About THE LAW With Gracious — Our Story",
  description:
    "What THE LAW With Gracious is, why it exists, and the person behind the legal e-library and study platform.",
};

export default function AboutPage() {
  return (
    <InfoLayout
      eyebrow="Platform"
      title="About THE LAW With Gracious"
      lede="A calm, beautiful e-library for law — built to make legal knowledge easier to discover, read and understand."
      updated="September 2026"
    >
      <Section title="What THE LAW With Gracious is">
        <p>
          THE LAW With Gracious is a legal e-library and study platform. It organises
          legal courses, books, PDFs, documents, videos and articles by area of
          law, and presents them in a calm, focused reading experience — so
          students, readers and professionals can study at their own pace.
        </p>
        <p>
          Every part of the platform is designed around one idea: legal
          knowledge should not be locked behind confusing interfaces or
          scattered across hard-to-find sources. THE LAW With Gracious brings materials
          together in one library and makes them comfortable to read, search
          and return to.
        </p>
      </Section>

      <Section title="Why it exists">
        <p>
          Law touches nearly every part of daily life, yet high-quality legal
          material is often difficult to find, expensive, or written in a way
          that is hard to approach. THE LAW With Gracious was created to close that gap:
          a space where legal education is open, well-organised and genuinely
          pleasant to use.
        </p>
        <p>
          The library is an educational platform. The materials it hosts are
          for learning and reference — and, as our legal disclaimer explains,
          they are not a substitute for professional legal advice.
        </p>
      </Section>

      <Section title="The person behind THE LAW With Gracious">
        <p>
          THE LAW With Gracious is created and maintained by its founder, who built the
          platform to share a love of clear legal study with a wider audience.
          The project is a personal endeavour: every course, article and design
          decision in the library reflects that single, careful point of view.
        </p>
        <div className="pt-4">
          <figure className="w-full max-w-sm">
            <div className="rounded-2xl overflow-hidden shadow-elevation-md border border-outline-variant/20 bg-surface-container-low">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/creator-owner.jpg"
                alt="The creator of THE LAW With Gracious"
                className="w-full h-auto object-cover"
              />
            </div>
            <figcaption className="mt-3 text-sm text-on-surface-variant">
              The creator of THE LAW With Gracious.
            </figcaption>
          </figure>
        </div>
      </Section>

      <Section title="What you can do here">
        <p>
          Browse courses organised by area of law, read books and PDFs in the
          built-in reader, watch lectures, follow legal articles, save courses
          for later and track your progress across the library — free to study.
        </p>
        <p>
          If you have feedback, a suggestion, or would like to report a
          problem, visit our <a href="/contact" className="text-secondary hover:text-primary transition-colors">contact page</a> or
          read the <a href="/support" className="text-secondary hover:text-primary transition-colors">help &amp; support centre</a>.
        </p>
      </Section>
    </InfoLayout>
  );
}
