/** Public site configuration for SEO and Search Console. */
export const SITE_URL =
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || "https://prudence-path.online";

export const OG_IMAGE =
  import.meta.env.VITE_OG_IMAGE ||
  "https://prudence-path.online/og-image.png";

export const GOOGLE_SITE_VERIFICATION = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || "";

export const SITE_NAME = "THE PRUDENCE";

export const DEFAULT_DESCRIPTION =
  "THE PRUDENCE is the Prudence Office Accountability & Training System — structured reporting, sponsor teams, and trainer oversight in one secure web app.";

export const GEO_KEYWORDS =
  "Nigeria, Africa/Lagos, WAT, GMT+1, Nigerian office accountability, team training Nigeria, office accountability software Africa";
