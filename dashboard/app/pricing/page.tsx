import type { Metadata } from "next";
import { Pricing } from "@/components/home/pricing";
import { SITE_URL } from "@/lib/site";

const TITLE = "Pricing";
const DESCRIPTION =
  "Start free with one agent. Starter is $49 and Pro is $99 per workspace per month, with Enterprise on custom terms.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: `${TITLE} / Tracyn`,
    description: DESCRIPTION,
    url: `${SITE_URL}/pricing`,
    siteName: "Tracyn",
    images: [{ url: "/og.png", width: 512, height: 512 }],
    type: "website",
  },
  twitter: { card: "summary", title: `${TITLE} / Tracyn`, description: DESCRIPTION, images: ["/og.png"] },
};

export default function PricingPage() {
  return <Pricing />;
}
