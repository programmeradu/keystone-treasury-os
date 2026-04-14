import { HOME_FAQ_ITEMS } from "./home-faq";
import { getSiteOrigin } from "./site";

/** JSON-LD @graph for Organization + WebSite + SoftwareApplication + FAQPage (Google-friendly). */
export function buildRootJsonLd(): Record<string, unknown> {
  const origin = getSiteOrigin();
  const logoUrl = `${origin}/icon.svg`;

  const faqPage: Record<string, unknown> = {
    "@type": "FAQPage",
    "@id": `${origin}/#faq`,
    mainEntity: HOME_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "dreyv",
        url: origin,
        sameAs: [
          "https://x.com/dreyvapp",
          "https://www.linkedin.com/company/dreyv/",
        ],
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        description:
          "AI-powered, non-custodial operating system for Web3 treasuries — command-ops, simulation-backed execution, and persistent intelligence.",
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "dreyv",
        url: origin,
        publisher: { "@id": `${origin}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#product`,
        name: "dreyv OS",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier available; paid plans for teams.",
        },
        description:
          "Natural-language treasury command layer with pre-execution simulation, Solana intelligence, and an agent-ready studio.",
        url: origin,
        provider: { "@id": `${origin}/#organization` },
      },
      faqPage,
    ],
  };
}

/** Article / long-form guide (rich results–friendly when content is substantive). */
export function buildArticleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}): Record<string, unknown> {
  const origin = getSiteOrigin().replace(/\/$/, "");
  const url = `${origin}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const modified = opts.dateModified ?? opts.datePublished;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: opts.datePublished,
    dateModified: modified,
    author: { "@type": "Organization", name: "dreyv", url: origin },
    publisher: {
      "@type": "Organization",
      name: "StaUniverse",
      logo: { "@type": "ImageObject", url: `${origin}/icon.svg` },
    },
  };
}
