import { useEffect } from "react";
import { SITE_URL } from "@/components/marketing/Seo";

type AppSeoProps = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  /** Override default "THE PRUDENCE" suffix (e.g. office display name) */
  brandName?: string;
  /** Page type for structured data */
  pageType?: "WebPage" | "CollectionPage";
  breadcrumbs?: { name: string; path: string }[];
};

const GEO_KEYWORDS =
  "Nigeria, Africa/Lagos, WAT, GMT+1, Nigerian office accountability, team training Nigeria, office accountability software Africa";

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  const id = "prudence-app-json-ld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * SEO + AEO + GEO metadata for authenticated app pages.
 * Sets title, description, Open Graph, geo hints, and JSON-LD (WebPage + breadcrumbs).
 */
export function AppSeo({
  title,
  description,
  path,
  keywords,
  brandName = "THE PRUDENCE",
  pageType = "WebPage",
  breadcrumbs,
}: AppSeoProps) {
  const fullTitle =
    title.includes(brandName) || title.includes("PRUDENCE")
      ? title
      : `${title} | ${brandName}`;
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const allKeywords = keywords ? `${keywords}, ${GEO_KEYWORDS}` : GEO_KEYWORDS;

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta("description", description);
    upsertMeta("keywords", allKeywords);
    upsertMeta("geo.region", "NG");
    upsertMeta("geo.placename", "Nigeria");
    upsertMeta("og:title", fullTitle, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:url", url, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:locale", "en_NG", "property");
    upsertMeta("twitter:card", "summary");
    upsertMeta("twitter:title", fullTitle);
    upsertMeta("twitter:description", description);

    const jsonLd: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": pageType,
        name: fullTitle,
        description,
        url,
        inLanguage: "en-NG",
        isPartOf: {
          "@type": "WebApplication",
          name: brandName,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          description:
            "THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app.",
          areaServed: {
            "@type": "Country",
            name: "Nigeria",
          },
          availableLanguage: "English",
        },
        about: {
          "@type": "Organization",
          name: brandName,
          areaServed: "Nigeria",
        },
      },
    ];

    if (breadcrumbs?.length) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          item: `${SITE_URL}${crumb.path}`,
        })),
      });
    }

    upsertJsonLd(jsonLd);
  }, [fullTitle, description, url, allKeywords, pageType, breadcrumbs, brandName]);

  return null;
}
