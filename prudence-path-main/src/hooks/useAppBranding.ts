import { useAuth } from "@/contexts/AuthContext";
import { SITE_NAME } from "@/lib/siteConfig";

/** In-app branding: office name when logged in, platform name on marketing/auth. */
export function useAppBranding() {
  const { office } = useAuth();
  const officeName = office?.name ?? null;
  const platformName = SITE_NAME;
  const appName = officeName ?? platformName;

  return {
    officeName,
    platformName,
    appName,
    /** For page titles: "Dashboard | Acme Office" or "Dashboard | THE PRUDENCE" */
    titleSuffix: appName,
  };
}
