import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const port = 4174;
const baseURL = `http://127.0.0.1:${port}`;
const widths = [320, 375, 430, 768, 1024];

let server;
let browser;

try {
  server = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { stdio: "inherit", env: process.env },
  );

  console.log("\nWaiting for CampusConnect to start...");
  let ready = false;

  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(`Development server exited with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The local server is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!ready) throw new Error("CampusConnect did not start within 120 seconds.");

  browser = await chromium.launch({
    channel: "chrome",
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });

  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });

  console.log("\nChrome is open at the local CampusConnect site.");
  const rl = createInterface({ input: stdin, output: stdout });

  await rl.question(
    "\nSign in normally in Chrome and open the dashboard. " +
    "When the dashboard is visible, return here and press ENTER to audit it. ",
  );
  rl.close();

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(600);

    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const width = window.innerWidth;

      const candidates = [...document.querySelectorAll("body *")]
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const className =
            typeof element.className === "string" ? element.className : "";

          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < -2 || rect.right > width + 2) &&
            !/ccOpeningGrid|ccOpeningGlow/.test(className)
          );
        })
        .slice(0, 6)
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            tag: element.tagName.toLowerCase(),
            className:
              typeof element.className === "string"
                ? element.className.slice(0, 90)
                : "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            position: getComputedStyle(element).position,
          };
        });

      return {
        title: document.title,
        viewport: width,
        documentWidth: root.scrollWidth,
        bodyWidth: body.scrollWidth,
        horizontalOverflow:
          Math.max(root.scrollWidth, body.scrollWidth) > width + 1,
        offscreenCandidates: candidates,
      };
    });

    console.log(`\n[${width}px] ${JSON.stringify(result)}`);
  }

  await page.setViewportSize({ width: 375, height: 812 });

  console.log("\n===== DRAWER INTERACTION CHECK =====");

  const toggle = page.locator(".topSidebarToggle").first();
  const backdrop = page.locator(".mobileSidebarBackdrop").first();

  if (!(await toggle.isVisible().catch(() => false))) {
    console.log("SKIPPED: Hamburger button is not visible on this dashboard.");
  } else {
    await toggle.click();
    await backdrop.waitFor({ state: "visible", timeout: 5000 });
    console.log("PASS: Hamburger opens the drawer and backdrop.");

    await page.keyboard.press("Escape");
    await backdrop.waitFor({ state: "detached", timeout: 5000 });
    console.log("PASS: Escape closes the drawer.");

    await toggle.click();
    await backdrop.waitFor({ state: "visible", timeout: 5000 });

    await backdrop.click({ position: { x: 370, y: 100 } });
    await backdrop.waitFor({ state: "detached", timeout: 5000 });
    console.log("PASS: Clicking outside the drawer closes it.");
  }

  console.log("\nAudit complete. Review the viewport results above.");
  await browser.close();
  browser = undefined;
} catch (error) {
  console.error("\nMOBILE AUDIT ERROR:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
  }
}
