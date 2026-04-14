import { buildRootJsonLd } from "@/lib/seo/json-ld";

export function RootJsonLd() {
  const data = buildRootJsonLd();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
