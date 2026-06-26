import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://genealogia.flivecompany.com";
export const SITE_NAME = "Árvore Genealógica Flive";
const DEFAULT_TITLE = "Crie sua Árvore Genealógica Online Grátis | Flive";
const DEFAULT_DESC =
  "Monte sua árvore genealógica online e de graça: cadastre a família, veja um organograma interativo com fotos e preserve a história. Crie sua conta grátis.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SeoProps {
  /** Título da aba/SERP. Se omitido, usa o título padrão da marca. */
  title?: string;
  /** Meta description (~155 caracteres). */
  description?: string;
  /** Caminho da rota (para canonical e og:url), ex.: "/auth". */
  path?: string;
  /** URL absoluta da imagem de compartilhamento (og/twitter). */
  image?: string;
  /** Marca a página como noindex,nofollow (privadas, login e links com token). */
  noindex?: boolean;
  /** og:type — "website" (padrão) ou "article". */
  type?: string;
  /** Um ou mais blocos JSON-LD (dados estruturados). */
  jsonLd?: object | object[];
}

/**
 * Gerencia o <head> por rota (título, description, canonical, Open Graph,
 * Twitter Card e JSON-LD). Numa SPA isso garante meta específica por página
 * em vez do cabeçalho estático único do index.html.
 */
export function Seo({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  noindex = false,
  type = "website",
  jsonLd,
}: SeoProps) {
  const fullTitle = title ?? DEFAULT_TITLE;
  const desc = description ?? DEFAULT_DESC;
  const canonical = `${SITE_URL}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(b)}
        </script>
      ))}
    </Helmet>
  );
}
