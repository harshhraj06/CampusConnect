import { test, expect } from "@playwright/test";

const viewportWidths = [320, 375, 430, 768, 1024];

for (const width of viewportWidths) {
  test(`no document-level horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });

    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    expect(response, "The page should return an HTTP response").not.toBeNull();
    expect(
      response.status(),
      `Unexpected HTTP status at ${width}px`,
    ).toBeLessThan(500);

    await page.waitForTimeout(1500);

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const viewport = window.innerWidth;

      const overflowCandidates = [...document.querySelectorAll("body *")]
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < -2 || rect.right > viewport + 2)
          );
        })
        .slice(0, 8)
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            element: element.tagName.toLowerCase(),
            className:
              typeof element.className === "string"
                ? element.className.slice(0, 100)
                : "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        });

      return {
        title: document.title,
        viewport,
        documentWidth: root.scrollWidth,
        bodyWidth: body.scrollWidth,
        candidates: overflowCandidates,
      };
    });

    console.log(
      `[Mobile audit ${width}px] ${JSON.stringify(layout)}`,
    );

    expect(
      Math.max(layout.documentWidth, layout.bodyWidth),
      `Horizontal overflow at ${width}px. Candidate elements: ${
        JSON.stringify(layout.candidates)
      }`,
    ).toBeLessThanOrEqual(width + 1);
  });
}

test("mobile sidebar closes with Escape and backdrop when available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto("/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(1500);

  const toggle = page.locator(".topSidebarToggle").first();

  if ((await toggle.count()) === 0 || !(await toggle.isVisible())) {
    test.skip(
      true,
      "Sidebar toggle is unavailable on this page; authenticated dashboard UI may be required.",
    );
    return;
  }

  const backdrop = page.locator(".mobileSidebarBackdrop");

  await toggle.click();
  await expect(backdrop).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(backdrop).toHaveCount(0);

  await toggle.click();
  await expect(backdrop).toBeVisible();

  await backdrop.click({
    position: { x: 370, y: 100 },
  });

  await expect(backdrop).toHaveCount(0);
});




test("Login and Register are visible and open the correct screen on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });

  // Respect the real consent flow before attempting to click page controls.
  const essentialOnlyButton = page.getByRole("button", {
    name: "Essential only",
  });

  const consentIsVisible = await essentialOnlyButton
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (consentIsVisible) {
    await essentialOnlyButton.click();
    await expect(page.locator(".ccCookieBanner")).toHaveCount(0);
  }

  const login = page.locator(".ccLandingV2LoginButton").first();
  const register = page.locator(".ccLandingV2RegisterButton").first();

  await login.waitFor({ state: "visible", timeout: 25000 });

  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(login).toBeVisible();
    await expect(register).toBeVisible();

    for (const rect of await Promise.all([login.boundingBox(), register.boundingBox()])) {
      expect(rect).not.toBeNull();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
    }
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await register.click();
  await expect(page.locator(".authHeading h2")).toHaveText("Create your account");
  await expect(page.locator(".authTabs button.active")).toHaveText("Register");

  await page.locator(".authBack").click();
  await expect(login).toBeVisible({ timeout: 10000 });
  await login.click();

  await expect(page.locator(".authHeading h2")).toHaveText("Sign in to continue");
  await expect(page.locator(".authTabs button.active")).toHaveText("Sign in");
});
