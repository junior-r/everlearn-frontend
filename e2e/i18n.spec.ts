import { expect, test } from "@playwright/test";

test.describe("locale routing", () => {
  test.describe("with a Spanish browser", () => {
    test.use({ locale: "es-VE" });

    test("redirects paths without a locale to Spanish, keeping the query string", async ({
      page,
    }) => {
      await page.goto("/login?error=INVALID_CREDENTIALS");

      await expect(page).toHaveURL("/es/login?error=INVALID_CREDENTIALS");
      await expect(page.locator("html")).toHaveAttribute("lang", "es");
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
      await expect(page).toHaveTitle("Everlearn");
    });
  });

  test.describe("with an English browser", () => {
    test.use({ locale: "en-US" });

    test("serves English when the browser asks for it", async ({ page }) => {
      await page.goto("/login");

      await expect(page).toHaveURL("/en/login");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });

    test("an explicit locale in the URL wins over the browser language", async ({ page }) => {
      await page.goto("/es/login");

      await expect(page).toHaveURL("/es/login");
      await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    });
  });

  test.describe("with an unsupported browser language", () => {
    test.use({ locale: "fr-FR" });

    test("falls back to Spanish", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL("/es/login");
    });
  });

  test("returns 404 for unknown pages and unsupported locale prefixes", async ({ page }) => {
    expect((await page.goto("/es/does-not-exist"))?.status()).toBe(404);
    // "fr" is not a locale, so it is treated as a page name under the negotiated locale
    expect((await page.goto("/fr/login"))?.status()).toBe(404);
  });
});
