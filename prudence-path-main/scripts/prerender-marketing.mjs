/**
 * Post-build prerender for marketing routes.
 * Uses @sparticuz/chromium on Vercel/CI (bundled Linux Chromium).
 * Runs after `vite build`, snapshots each route to dist/{route}/index.html.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const ROUTES = [
  "/",
  "/features",
  "/how-it-works",
  "/about",
  "/faq",
  "/apply",
  "/pricing",
  "/demo",
];

const PORT = 4173;

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (filePath.endsWith(".xml")) return "application/xml; charset=utf-8";
  return "application/octet-stream";
}

async function startStaticServer() {
  const indexHtml = await readFile(path.join(dist, "index.html"), "utf8");

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);
      let filePath = path.join(dist, decodeURIComponent(url.pathname));

      if (url.pathname.endsWith("/") && url.pathname !== "/") {
        filePath = path.join(filePath, "index.html");
      }

      try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
        const body = await readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType(filePath) });
        res.end(body);
        return;
      } catch {
        // SPA fallback
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(indexHtml);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  return server;
}

async function writeRouteHtml(route, html) {
  if (route === "/") {
    await writeFile(path.join(dist, "index.html"), html, "utf8");
    return;
  }

  const dir = path.join(dist, route.replace(/^\//, ""));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html, "utf8");
}

async function launchBrowser() {
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel) {
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // Local dev: prefer system Chrome, then Puppeteer's cached Chrome, then Sparticuz bundle
  const localCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : null,
    process.platform === "linux" ? "/usr/bin/google-chrome" : null,
    process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : null,
  ].filter(Boolean);

  for (const executablePath of localCandidates) {
    try {
      return await puppeteer.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } catch {
      // try next
    }
  }

  try {
    const { default: puppeteerFull } = await import("puppeteer");
    return puppeteerFull.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
}

async function main() {
  console.log("Prerendering marketing routes…");
  const server = await startStaticServer();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    for (const route of ROUTES) {
      const url = `http://localhost:${PORT}${route}`;
      console.log(`  → ${route}`);

      await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
      await page.waitForSelector("[data-prerender-ready]", { timeout: 15000 }).catch(() => {});
      await page.waitForFunction(
        () => document.title && document.title.length > 0,
        { timeout: 10000 },
      );

      const html = await page.content();
      await writeRouteHtml(route, html);
    }

    console.log(`Prerendered ${ROUTES.length} routes.`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error("Prerender failed:", err);
  if (process.env.VERCEL) {
    console.warn("Continuing Vercel build without prerendered HTML.");
    process.exit(0);
  }
  process.exit(1);
});
