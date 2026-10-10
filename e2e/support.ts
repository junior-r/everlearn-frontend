import { expect, type Page, type PlaywrightWorkerArgs } from "@playwright/test";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const PASSWORD = "correct-password";

// Scoped to <main> because Next.js adds its own role="alert" route announcer to the body
export const formError = (page: Page) => page.getByRole("main").getByRole("alert");

/** Creates an account through the API in a throwaway context, so no session cookie reaches the browser. */
export async function registerUser(playwright: PlaywrightWorkerArgs["playwright"]): Promise<string> {
  const api = await playwright.request.newContext();
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await api.post(`${API_URL}/auth/register`, {
    data: { email, password: PASSWORD, firstName: "Ada", lastName: "Lovelace" },
  });
  expect(response.status()).toBe(201);
  await api.dispose();
  return email;
}

export async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto("/es/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}
