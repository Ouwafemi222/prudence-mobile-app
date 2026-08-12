import { AppSeo } from "@/components/seo/AppSeo";
import { useAppBranding } from "@/hooks/useAppBranding";

type TenantAppSeoProps = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  pageType?: "WebPage" | "CollectionPage";
  breadcrumbs?: { name: string; path: string }[];
};

/** App SEO with office-aware page titles when the user belongs to an office. */
export function TenantAppSeo(props: TenantAppSeoProps) {
  const { titleSuffix } = useAppBranding();
  return <AppSeo {...props} brandName={titleSuffix} />;
}
