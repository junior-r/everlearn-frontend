import { expect, test } from "@playwright/test";
import { API_URL, formError, registerUser, signIn } from "./support";

test("signs in and survives a reload", async ({ page, playwright }) => {
  const email = await registerUser(playwright);

  await signIn(page, email);

  // A new account has not been verified yet, so it lands on onboarding
  await expect(page).toHaveURL("/es/onboarding");
  await expect(page.getByRole("heading", { name: "Verifica tu identidad" })).toBeVisible();

  // The access token is memory-only, so this proves the refresh cookie restores the session
  await page.reload();
  await expect(page.getByRole("heading", { name: "Verifica tu identidad" })).toBeVisible();
});

test("logging out revokes the session on the server, not just in the browser", async ({
  page,
  context,
  playwright,
}) => {
  const email = await registerUser(playwright);
  await signIn(page, email);
  await expect(page).toHaveURL("/es/onboarding");
  const stolenCookies = await context.cookies(API_URL + "/auth/refresh");
  expect(stolenCookies.map((cookie) => cookie.name)).toContain("everlearn_refresh");

  // Same request the sign-out button makes; page.request shares the browser's cookies
  const logout = await page.request.post(`${API_URL}/auth/logout`);
  expect(logout.status()).toBe(204);

  // Replay the cookie an attacker could have copied before the logout
  const attacker = await playwright.request.newContext();
  const replay = await attacker.post(`${API_URL}/auth/refresh`, {
    headers: { Cookie: stolenCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") },
  });
  expect(replay.status()).toBe(401);
  await attacker.dispose();

  await page.goto("/es");
  await expect(page).toHaveURL("/es/login");
});

test("shows an error for a wrong password and stays on the login page", async ({
  page,
  playwright,
}) => {
  const email = await registerUser(playwright);

  await signIn(page, email, "wrong-password");

  await expect(formError(page)).toHaveText("El correo o la contraseña no son correctos.");
  await expect(page).toHaveURL("/es/login");
});

test("sends anonymous visitors to the login page", async ({ page }) => {
  await page.goto("/es");

  await expect(page).toHaveURL("/es/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("offers Google sign-in through the backend and explains a failed attempt", async ({
  page,
}) => {
  await page.goto("/es/login?error=GOOGLE_AUTHENTICATION_FAILED");

  await expect(formError(page)).toHaveText(
    "No se completó el inicio de sesión con Google. Inténtalo de nuevo.",
  );
  await expect(page.getByRole("link", { name: "Continuar con Google" })).toHaveAttribute(
    "href",
    `${API_URL}/auth/google`,
  );
});
