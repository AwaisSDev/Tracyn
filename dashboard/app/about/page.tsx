import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { LegalPage, H2, P } from "@/components/legal/legal-page";

const TITLE = "About";
const DESCRIPTION = "Why Tracyn exists, and who's building it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `${TITLE} / Tracyn`,
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: "Tracyn",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
    type: "website",
  },
  twitter: { card: "summary", title: `${TITLE} / Tracyn`, description: DESCRIPTION, images: ["/logo.png"] },
};

export default function AboutPage() {
  return (
    <LegalPage title={TITLE}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About Tracyn",
            url: `${SITE_URL}/about`,
            isPartOf: { "@type": "WebSite", name: "Tracyn", url: SITE_URL },
          }),
        }}
      />

      <H2>The problem</H2>
      <P>
        AI agents are being handed real permissions now. They send emails, issue refunds, touch
        customer records, call outside services. Most teams have no real record of what an agent
        actually did, and no way to stop a risky action before it happens instead of after.
      </P>
      <P>
        Tracyn logs every action an agent takes, lets a person step in before the risky ones run,
        and keeps that record in a form that can&rsquo;t quietly be edited later. The goal is
        simple: turn &ldquo;trust me, the agent is fine&rdquo; into something you can actually
        show your team, your customers, or an auditor.
      </P>

      <H2>The founder</H2>
      <P>
        Tracyn is built by Awais Siddique. I&rsquo;ve been coding since I was 10. Along the way I
        taught myself Python, HTML, CSS, JavaScript, TypeScript, and C++, plus frameworks like
        React, Laravel, and Electron. What started as curiosity turned into shipping full
        products: AI platforms, desktop apps, browser tools, and machine learning research.
      </P>
      <P>
        I like problems that are properly hard, things like multi agent AI systems, ICU
        deterioration detection, and flood response models, and I care about turning them into
        things people can actually use. I recently finished my matric board exams with a 93.7%
        STEM aggregate.
      </P>
      <P>I&rsquo;m always open to new opportunities, collaborations, and interesting problems to build for.</P>
      <P>
        Reach me at <a href="mailto:mawais9171@gmail.com" className="underline">mawais9171@gmail.com</a>.
      </P>
    </LegalPage>
  );
}
