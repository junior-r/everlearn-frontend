import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PASSWORD = "correct-password";

// Scoped to <main> because Next.js adds its own role="alert" route announcer to the body
const formError = (page: Page) => page.getByRole("main").getByRole("alert");

async function registerUser(request: APIRequestContext): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { email, password: PASSWORD, firstName: "Ada", lastName: "Lovelace" },
  });
  expect(response.status()).toBe(201);
  return email;
}

test("signs in, survives a reload and signs out", async ({ page, playwright }) => {
  // A separate context, so registering does not leave a session cookie in the browser
  const api = await playwright.request.newContext();
  const email = await registerUser(api);
  await api.dispose();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Welcome, Ada" })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  // The access token is memory-only, so this proves the refresh cookie restores the session
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome, Ada" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("shows an error for a wrong password and stays on the login page", async ({
  page,
  playwright,
}) => {
  const api = await playwright.request.newContext();
  const email = await registerUser(api);
  await api.dispose();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(formError(page)).toHaveText("The email or password is incorrect.");
  await expect(page).toHaveURL("/login");
});

test("sends anonymous visitors to the login page", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("offers Google sign-in through the backend and explains a failed attempt", async ({
  page,
}) => {
  await page.goto("/login?error=GOOGLE_AUTHENTICATION_FAILED");

  await expect(formError(page)).toHaveText(
    "Google sign-in did not complete. Please try again.",
  );
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
    "href",
    `${API_URL}/auth/google`,
  );
});
