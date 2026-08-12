import { useLayoutEffect } from "react";
import {
  DEFAULT_DESCRIPTION,
  GEO_KEYWORDS,
  GOOGLE_SITE_VERIFICATION,
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/siteConfig";

type SeoProps = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  breadcrumbs?: { name: string; path: string }[];
  index?: boolean;
};

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content || typeof document === "undefined") return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  if (!href || typeof document === "undefined") return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  if (typeof document === "undefined") return;
  const id = "prudence-json-ld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    email: "agboola378@gmail.com",
    areaServed: { "@type": "Country", name: "Nigeria" },
    knowsAbout: [
      "office accountability",
      "daily activity reporting",
      "team performance tracking",
      "trainer verification",
    ],
  };
}

function applySeoTags({
  fullTitle,
  description,
  url,
  allKeywords,
  jsonLd,
  breadcrumbs,
  index,
}: {
  fullTitle: string;
  description: string;
  url: string;
  allKeywords: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  breadcrumbs?: { name: string; path: string }[];
  index: boolean;
}) {
  if (typeof document === "undefined") return;

  document.title = fullTitle;
  upsertMeta("description", description);
  upsertMeta("keywords", allKeywords);
  upsertMeta("robots", index ? "index, follow" : "noindex, nofollow");
  upsertMeta("geo.region", "NG");
  upsertMeta("geo.placename", "Nigeria");
  upsertMeta("language", "English");
  upsertLink("canonical", url);
  upsertMeta("og:title", fullTitle, "property");
  upsertMeta("og:description", description, "property");
  upsertMeta("og:url", url, "property");
  upsertMeta("og:type", "website", "property");
  upsertMeta("og:locale", "en_NG", "property");
  upsertMeta("og:site_name", SITE_NAME, "property");
  upsertMeta("og:image", OG_IMAGE, "property");
  upsertMeta("twitter:card", "summary_large_image");
  upsertMeta("twitter:title", fullTitle);
  upsertMeta("twitter:description", description);
  upsertMeta("twitter:image", OG_IMAGE);

  if (GOOGLE_SITE_VERIFICATION) {
    upsertMeta("google-site-verification", GOOGLE_SITE_VERIFICATION);
  }

  const schemas: Record<string, unknown>[] = [organizationJsonLd()];
  if (jsonLd) schemas.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]));
  if (breadcrumbs?.length) {
    schemas.push({
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
  upsertJsonLd(schemas);
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  keywords,
  jsonLd,
  breadcrumbs,
  index = true,
}: SeoProps) {
  const fullTitle = title.includes("PRUDENCE") ? title : `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const allKeywords = keywords ? `${keywords}, ${GEO_KEYWORDS}` : GEO_KEYWORDS;

  // Apply during render so build-time prerender captures meta in <head>
  applySeoTags({ fullTitle, description, url, allKeywords, jsonLd, breadcrumbs, index });

  useLayoutEffect(() => {
    applySeoTags({ fullTitle, description, url, allKeywords, jsonLd, breadcrumbs, index });
    document.documentElement.setAttribute("data-prerender-ready", "true");
  }, [fullTitle, description, url, allKeywords, jsonLd, breadcrumbs, index]);

  return null;
}

export { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, OG_IMAGE };
