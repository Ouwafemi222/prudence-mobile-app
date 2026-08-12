import * as Linking from "expo-linking";
import { SITE_URL } from "./siteConfig";

/** Open a website path in the system browser (marketing pages stay on web). */
export async function openSitePath(path: string) {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
