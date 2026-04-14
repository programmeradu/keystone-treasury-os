import { buildArticleJsonLd } from "@/lib/seo/json-ld";

type Props = Parameters<typeof buildArticleJsonLd>[0];

export function ArticleJsonLd(props: Props) {
  const data = buildArticleJsonLd(props);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
