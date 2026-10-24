import { expect, test } from "@playwright/test";
import { API_URL, createInstitution, formError, signIn } from "./support";

test("a registered Student signs in and survives a reload", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");

  await signIn(page, student.email, student.password);

  // A new member's ID has not been checked yet, so they are told to bring it to the institution
  await expect(page).toHaveURL("/es/onboarding");
  await expect(page.getByRole("heading", { name: "Presenta tu documento en tu institución" })).toBeVisible();

  // The access token is memory-only, so this proves the refresh cookie restores the session
  await page.reload();
  await expect(page.getByRole("heading", { name: "Presenta tu documento en tu institución" })).toBeVisible();
  await institution.dispose();
});

test("there is no way to self-register", async ({ page, request }) => {
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { email: "self@example.com", password: "some-password", firstName: "S", lastName: "R" },
  });
  expect(response.status()).toBe(404);

  await page.goto("/es/login");
  await expect(page.getByRole("link", { name: /regist|crear cuenta|sign up/i })).toHaveCount(0);
});

test("logging out revokes the session on the server, not just in the browser", async ({
  page,
  context,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL("/es/admin");
  const stolenCookies = await context.cookies(API_URL + "/auth/refresh");
  expect(stolenCookies.map((cookie) => cookie.name)).toContain("everlearn_refresh");

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/es/login");

  // Replay the cookie an attacker could have copied before the logout
  const attacker = await playwright.request.newContext();
  const replay = await attacker.post(`${API_URL}/auth/refresh`, {
    headers: { Cookie: stolenCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") },
  });
  expect(replay.status()).toBe(401);
  await attacker.dispose();
  await institution.dispose();
});

test("shows an error for a wrong password and stays on the login page", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);

  await signIn(page, institution.admin.email, "wrong-password");

  await expect(formError(page)).toHaveText("El correo o la contraseña no son correctos.");
  await expect(page).toHaveURL("/es/login");
  await institution.dispose();
});

test("sends anonymous visitors to the login page", async ({ page }) => {
  await page.goto("/es");
  await expect(page).toHaveURL("/es/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es/login");
});

test("offers Google sign-in through the backend and explains why an unlinked account was refused", async ({
  page,
}) => {
  await page.goto("/es/login?error=GOOGLE_ACCOUNT_NOT_LINKED");

  await expect(formError(page)).toHaveText(
    "Esta cuenta de Google no está vinculada. Inicia sesión con tu contraseña y vincúlala desde tu perfil.",
  );
  await expect(page.getByRole("link", { name: "Continuar con Google" })).toHaveAttribute(
    "href",
    `${API_URL}/auth/google`,
  );
});
