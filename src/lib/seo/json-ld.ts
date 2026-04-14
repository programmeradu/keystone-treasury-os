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
