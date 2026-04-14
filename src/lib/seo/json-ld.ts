import { getSiteOrigin } from "./site";

/** JSON-LD @graph for Organization + WebSite + SoftwareApplication (Google-friendly, JSON-LD format). */
export function buildRootJsonLd(): Record<string, unknown> {
  const origin = getSiteOrigin();
  const logoUrl = `${origin}/icon.svg`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Dreyv",
        url: origin,
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
        name: "Dreyv",
        url: origin,
        publisher: { "@id": `${origin}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#product`,
        name: "Dreyv OS",
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
    author: { "@type": "Organization", name: "Dreyv", url: origin },
    publisher: {
      "@type": "Organization",
      name: "StaUniverse",
      logo: { "@type": "ImageObject", url: `${origin}/icon.svg` },
    },
  };
}
