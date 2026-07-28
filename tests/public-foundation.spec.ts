import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import {
  ADMIN_ROUTE,
  NOT_FOUND_ROUTE,
  PUBLIC_ROUTES,
} from "../src/data/routes";
import {
  DEFAULT_AUDIT_PORT,
  UNKNOWN_PATH,
  resolveRunDir,
  routeSlug,
} from "../scripts/audit/common";

const runDir = resolveRunDir();
const screenshotRoot = path.join(runDir, "screenshots");
const forbiddenEndpointPattern =
  /(?:\.supabase\.co|ntfy\.sh|chariot|\/rest\/v1\/|service[_-]?role)/i;

interface PageEvidence {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  forbiddenEndpointAttempts: string[];
  writeRequests: string[];
  blockedThirdPartyRequests: string[];
}

function safeRequestUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "(unparseable URL redacted)";
  }
}

async function installAuditGuards(
  page: Page,
  testInfo: TestInfo,
): Promise<PageEvidence> {
  const evidence: PageEvidence = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    forbiddenEndpointAttempts: [],
    writeRequests: [],
    blockedThirdPartyRequests: [],
  };
  const theme = testInfo.project.use.colorScheme === "dark" ? "dark" : "light";

  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem("ultra-theme", selectedTheme);
  }, theme);

  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const local =
      requestUrl.hostname === "127.0.0.1" ||
      requestUrl.hostname === "localhost";

    if (!local) {
      evidence.blockedThirdPartyRequests.push(safeRequestUrl(request.url()));
      if (forbiddenEndpointPattern.test(request.url())) {
        evidence.forbiddenEndpointAttempts.push(
          safeRequestUrl(request.url()),
        );
      }
      await route.fulfill({
        status: 204,
        contentType: "text/plain",
        body: "",
      });
      return;
    }

    if (!["GET", "HEAD"].includes(request.method())) {
      evidence.writeRequests.push(
        `${request.method()} ${safeRequestUrl(request.url())}`,
      );
    }
    await route.continue();
  });

  page.on("console", (message) => {
    if (message.type() === "error") evidence.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    evidence.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const requestUrl = new URL(request.url());
    const local =
      requestUrl.hostname === "127.0.0.1" ||
      requestUrl.hostname === "localhost";
    if (local) {
      evidence.failedRequests.push(
        `${request.method()} ${safeRequestUrl(request.url())}: ${
          request.failure()?.errorText ?? "unknown failure"
        }`,
      );
    }
  });
  return evidence;
}

async function attachEvidence(
  testInfo: TestInfo,
  evidence: PageEvidence,
): Promise<void> {
  await testInfo.attach("network-console-evidence", {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: "application/json",
  });
}

async function expectCleanRuntime(
  evidence: PageEvidence,
  options: { allowExpectedDocument404?: boolean } = {},
): Promise<void> {
  const consoleErrors = options.allowExpectedDocument404
    ? evidence.consoleErrors.filter(
        (message) =>
          !/Failed to load resource: the server responded with a status of 404 \(Not Found\)/i.test(
            message,
          ),
      )
    : evidence.consoleErrors;
  expect(consoleErrors, "browser console errors").toEqual([]);
  expect(evidence.pageErrors, "uncaught page errors").toEqual([]);
  expect(evidence.failedRequests, "failed local requests").toEqual([]);
  expect(
    evidence.forbiddenEndpointAttempts,
    "production write/storage endpoint attempts",
  ).toEqual([]);
  expect(evidence.writeRequests, "local write requests").toEqual([]);
}

async function waitForHydratedApp(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute(
    "data-ultra-hydrated",
    "true",
  );
}

async function settleRenderedContent(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const maximum = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const increment = Math.max(320, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y <= maximum; y += increment) {
      window.scrollTo(0, y);
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      );
    }
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        if (!image.complete) {
          await Promise.race([
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
            new Promise<void>((resolve) => window.setTimeout(resolve, 2000)),
          ]);
        }
        try {
          await image.decode();
        } catch {
          // A failed image is reported separately by the runtime/network checks.
        }
      }),
    );
    window.scrollTo(0, Math.min(600, maximum));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        // Infinite decorative animations are already shortened by the
        // reduced-motion stylesheet and do not need to be forced.
      }
    }
  });
  await page.waitForTimeout(50);
}

async function resetPageForScreenshot(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        // Infinite decorative animations remain governed by reduced motion.
      }
    }
  });
  await page.waitForTimeout(100);
}

async function captureSectionWithoutFixedChrome(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  outputPath: string,
): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (window.getComputedStyle(element).position !== "fixed") continue;
      element.dataset.auditPreviousVisibility = element.style.visibility;
      element.dataset.auditFixedHidden = "true";
      element.style.visibility = "hidden";
    }
  });
  try {
    await locator.screenshot({
      path: outputPath,
      animations: "disabled",
    });
  } finally {
    await page.evaluate(() => {
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-audit-fixed-hidden="true"]',
      )) {
        element.style.visibility =
          element.dataset.auditPreviousVisibility ?? "";
        delete element.dataset.auditPreviousVisibility;
        delete element.dataset.auditFixedHidden;
      }
    });
  }
}

function screenshotPath(testInfo: TestInfo, ...parts: string[]): string {
  return path.join(
    screenshotRoot,
    testInfo.project.name,
    ...parts.map((part) => part.replace(/[^a-z0-9.-]+/gi, "-")),
  );
}

for (const route of PUBLIC_ROUTES) {
  test(`${route.path} renders, remains accessible, and captures cleanly`, async ({
    page,
  }, testInfo) => {
    const evidence = await installAuditGuards(page, testInfo);
    const response = await page.goto(route.path, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await waitForHydratedApp(page);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText(route.h1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    const expectedTheme =
      testInfo.project.use.colorScheme === "dark" ? "dark" : "light";
    await expect
      .poll(() =>
        page.locator("html").evaluate((element) =>
          element.classList.contains("dark") ? "dark" : "light",
        ),
      )
      .toBe(expectedTheme);

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow, "horizontal overflow in pixels").toBeLessThanOrEqual(
      1,
    );

    await settleRenderedContent(page);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    await testInfo.attach("axe-results", {
      body: Buffer.from(JSON.stringify(accessibility, null, 2)),
      contentType: "application/json",
    });
    expect(accessibility.violations, "axe accessibility violations").toEqual([]);

    await resetPageForScreenshot(page);
    await page.screenshot({
      path: screenshotPath(testInfo, `${routeSlug(route.path)}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await attachEvidence(testInfo, evidence);
    await expectCleanRuntime(evidence);
  });
}

test("homepage preserves the approved conversion design and detailed captures", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Spotless Results\.\s*100% Ultra Clean\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Get FREE Gutter Cleaning with any Roof and House Wash package!",
      { exact: true },
    ),
  ).toBeVisible();
  const viewport = page.viewportSize();
  if (viewport && viewport.width >= 1024) {
    await expect(page.getByText("Check Out Our Work Here")).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "See Our Recent Work" }),
  ).toBeVisible();

  await settleRenderedContent(page);
  await resetPageForScreenshot(page);
  await page.screenshot({
    path: screenshotPath(
      testInfo,
      "details",
      "header-before-scroll.png",
    ),
    animations: "disabled",
  });

  const detailed: ReadonlyArray<[string, ReturnType<Page["locator"]>]> = [
    [
      "hero.png",
      page
        .getByRole("heading", {
          level: 1,
          name: /Spotless Results\.\s*100% Ultra Clean\./,
        })
        .locator("xpath=ancestor::section[1]"),
    ],
    [
      "special-offer.png",
      page
        .getByText(
          "Get FREE Gutter Cleaning with any Roof and House Wash package!",
          { exact: true },
        )
        .locator("xpath=ancestor::section[1]"),
    ],
    [
      "services.png",
      page
        .getByRole("heading", {
          name: "Professional Exterior Cleaning for East Tennessee",
        })
        .locator("xpath=ancestor::section[1]"),
    ],
    [
      "facebook.png",
      page
        .getByRole("heading", { name: "See Our Recent Work" })
        .locator("xpath=ancestor::section[1]"),
    ],
    [
      "quote-form.png",
      page
        .getByRole("heading", { name: "Request Your Quote" })
        .locator("xpath=ancestor::section[1]"),
    ],
    ["footer.png", page.locator("footer")],
  ];
  for (const [name, locator] of detailed) {
    await captureSectionWithoutFixedChrome(
      page,
      locator,
      screenshotPath(testInfo, "details", name),
    );
  }

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(400);
  await page.screenshot({
    path: screenshotPath(
      testInfo,
      "details",
      "header-after-scroll.png",
    ),
    animations: "disabled",
  });

  if (viewport && viewport.width < 1024) {
    await page
      .getByRole("button", { name: /Open navigation menu/i })
      .click();
    await expect(page.getByLabel("Mobile navigation")).toBeVisible();
    await page.screenshot({
      path: screenshotPath(testInfo, "details", "mobile-menu.png"),
      animations: "disabled",
    });
    const mobileMenu = page.locator("#mobile-navigation");
    await mobileMenu.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.screenshot({
      path: screenshotPath(
        testInfo,
        "details",
        "mobile-menu-bottom.png",
      ),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Mobile navigation")).toBeHidden();
  }

  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("quote form validates locally and never sends", async ({ page }, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/#quote-form", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  const quoteForm = page.locator("#quote-form form");
  await expect(quoteForm).toHaveAttribute("data-preview-form-ready", "true");
  await expect(quoteForm).toHaveAttribute("aria-busy", "false");
  await page.getByLabel("First name (required)").fill("Preview");
  await page.getByLabel("Last name (required)").fill("Tester");
  await page.getByLabel("Phone (required)").fill("(865) 555-0100");
  await page
    .getByLabel("Full property address (required)")
    .fill("123 Preview Lane, Sevierville, TN");
  await page
    .getByRole("checkbox", { name: "House & Building Soft Wash" })
    .check();
  await page.getByRole("radio", { name: "Call" }).check();
  await page.getByRole("button", { name: "Test Quote Form" }).click();

  await expect(
    page.getByText("Preview mode — no request was sent.", { exact: true }),
  ).toBeVisible();
  expect(evidence.writeRequests).toEqual([]);
  expect(evidence.forbiddenEndpointAttempts).toEqual([]);
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("prerendered quote form fails closed without JavaScript", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-light-1440x900",
    "One JavaScript-disabled check covers the shared prerendered HTML.",
  );

  const context = await browser.newContext({
    baseURL: `http://127.0.0.1:${DEFAULT_AUDIT_PORT}`,
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const documentRequests: string[] = [];

  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(
        `${request.method()} ${safeRequestUrl(request.url())}`,
      );
    }
  });

  try {
    const response = await page.goto("/#quote-form", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);

    const quoteForm = page.locator("#quote-form form");
    await expect(quoteForm).toHaveAttribute(
      "data-preview-form-ready",
      "false",
    );
    await expect(quoteForm).toHaveAttribute("aria-busy", "true");
    await expect(quoteForm.locator("input[name]")).not.toHaveCount(0);

    const namedControls = quoteForm.locator("input[name]");
    for (let index = 0; index < (await namedControls.count()); index += 1) {
      await expect(namedControls.nth(index)).toBeDisabled();
    }

    const submit = quoteForm.getByRole("button", {
      name: "Test Quote Form",
    });
    await expect(submit).toBeDisabled();

    const urlBeforeClick = page.url();
    const documentCountBeforeClick = documentRequests.length;
    await submit.evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await page.waitForTimeout(100);

    expect(page.url()).toBe(urlBeforeClick);
    expect(documentRequests).toHaveLength(documentCountBeforeClick);
  } finally {
    await context.close();
  }
});

test("admin remains preview-only and noindex without backend traffic", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  const response = await page.goto(ADMIN_ROUTE.path, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);
  await waitForHydratedApp(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    ADMIN_ROUTE.h1,
  );
  await expect(page.getByText(/preview-only/i).first()).toBeVisible();
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("unknown direct URL returns a branded 404 and noindex", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  const response = await page.goto(UNKNOWN_PATH, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  await waitForHydratedApp(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    NOT_FOUND_ROUTE.h1,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence, { allowExpectedDocument404: true });
});

test("skip link moves keyboard focus to main content", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("mobile menu traps focus, closes with Escape, returns focus, and closes on quote navigation", async ({
  page,
}, testInfo) => {
  const viewport = page.viewportSize();
  test.skip(
    !viewport || viewport.width >= 1024,
    "Mobile navigation is visible only below the lg breakpoint.",
  );
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  const toggle = page.getByRole("button", { name: /navigation menu/i });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByLabel("Mobile navigation");
  await expect(menu).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");

  await toggle.focus();
  await page.keyboard.press("Shift+Tab");
  const lastFocusable = menu.locator("a[href], button:not([disabled])").last();
  await expect(lastFocusable).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await menu.getByRole("link", { name: "Request a Quote" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/#quote-form$/);
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("FAQ controls expose and operate their answer panels", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/faq", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  const button = page.getByRole("button", {
    name: "What is the difference between pressure washing and soft washing?",
  });
  const panelId = await button.getAttribute("aria-controls");
  expect(panelId).toBeTruthy();
  const panel = page.locator(`#${panelId}`);
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("before-and-after range comparison supports Arrow, Home, and End keys", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/before-after", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  const slider = page.getByRole("slider").first();
  await expect(slider).toHaveValue("50");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  await page.keyboard.press("End");
  await expect(slider).toHaveValue("100");
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveValue("99");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("100");
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("comparison lightbox is modal, closes with Escape, and restores focus", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/before-after", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  const opener = page
    .getByRole("button", { name: "Open larger comparison" })
    .first();
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(
    dialog.getByRole("button", { name: "Close larger comparison" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("required quote errors are announced and focus the first invalid field", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/#quote-form", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  await expect(page.locator("#quote-form form")).toHaveAttribute(
    "data-preview-form-ready",
    "true",
  );
  await page.getByRole("button", { name: "Test Quote Form" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Please correct the highlighted fields before continuing.",
  );
  const firstName = page.getByLabel("First name (required)");
  await expect(firstName).toHaveAttribute("aria-invalid", "true");
  await expect(firstName).toBeFocused();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expect(page.getByText("Select at least one service.")).toBeVisible();
  await expect(page.getByText("Choose call or text.")).toBeVisible();
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("mobile fixed Call and Quote bar leaves footer actions unobstructed", async ({
  page,
}, testInfo) => {
  const viewport = page.viewportSize();
  test.skip(
    !viewport || viewport.width >= 1024,
    "The fixed mobile Call and Quote bar is hidden at lg and above.",
  );
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const stickyQuote = page.getByRole("link", { name: "Quote", exact: true });
  await expect(stickyQuote).toBeVisible();
  const stickyBar = stickyQuote.locator("xpath=..");
  const footerAction = page.getByRole("link", { name: "Privacy Policy" });
  await footerAction.scrollIntoViewIfNeeded();
  const [stickyBox, footerBox] = await Promise.all([
    stickyBar.boundingBox(),
    footerAction.boundingBox(),
  ]);
  expect(stickyBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(stickyBox!.y);
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});

test("reduced-motion preference suppresses movement animation", async ({
  page,
}, testInfo) => {
  const evidence = await installAuditGuards(page, testInfo);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForHydratedApp(page);
  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  await page.waitForTimeout(50);
  const movingAnimations = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .map((animation) => animation.effect)
      .filter(
        (effect): effect is KeyframeEffect =>
          effect instanceof KeyframeEffect,
      )
      .filter((effect) => {
        const transforms = effect
          .getKeyframes()
          .map((frame) => frame.transform)
          .filter(
            (transform): transform is string =>
              typeof transform === "string" && transform !== "none",
          );
        return new Set(transforms).size > 1;
      })
      .map((effect) => ({
        duration: effect.getComputedTiming().duration,
        keyframes: effect.getKeyframes().map((frame) => frame.transform),
      })),
  );
  expect(movingAnimations).toEqual([]);
  await attachEvidence(testInfo, evidence);
  await expectCleanRuntime(evidence);
});
