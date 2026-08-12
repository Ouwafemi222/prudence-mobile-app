import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const googleVerification = env.VITE_GOOGLE_SITE_VERIFICATION || "";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "inject-google-site-verification",
        transformIndexHtml(html: string) {
          if (!googleVerification) return html;
          const tag = `<meta name="google-site-verification" content="${googleVerification}" />`;
          return html.replace("<!-- GOOGLE_SITE_VERIFICATION: injected at build from VITE_GOOGLE_SITE_VERIFICATION -->", tag);
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
