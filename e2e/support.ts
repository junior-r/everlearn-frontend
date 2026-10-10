import { expect, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
// The Platform Admin that docker-compose.yml creates on first start
export const PLATFORM_ADMIN = {
  email: process.env.PLATFORM_ADMIN_EMAIL ?? "admin@everlearn.local",
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? "dev-platform-admin-password",
};

type Playwright = PlaywrightWorkerArgs["playwright"];
type MemberRole = "ADMIN" | "TEACHER" | "STUDENT";

export interface Account {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Scoped to <main> because Next.js adds its own role="alert" route announcer to the body
export const formError = (page: Page) => page.getByRole("main").getByRole("alert");

let platformTokenPromise: Promise<string> | null = null;

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

async function accessToken(api: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await api.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(response.status(), `login as ${email}`).toBe(200);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function registerMember(
  api: APIRequestContext,
  token: string,
  institutionId: string,
  role: MemberRole,
  names: { firstName: string; lastName: string },
): Promise<Account> {
  const email = `e2e-${role.toLowerCase()}-${unique()}@example.com`;
  const response = await api.post(`${API_URL}/members`, {
    headers: { Authorization: `Bearer ${token}`, "x-institution-id": institutionId },
    data: { email, role, ...names },
  });
  expect(response.status(), `register ${role}`).toBe(201);
  const { temporaryPassword } = (await response.json()) as { temporaryPassword: string };
  return { email, password: temporaryPassword, ...names };
}

/**
 * Builds, through the API, what a test needs to start from: a new institution
 * with its own Institution Admin. Uses a throwaway request context, so no
 * session cookie reaches the browser under test.
 */
export async function createInstitution(playwright: Playwright) {
  const api = await playwright.request.newContext();
  // One Platform Admin sign-in per worker keeps the suite well under the login rate limit
  platformTokenPromise ??= accessToken(api, PLATFORM_ADMIN.email, PLATFORM_ADMIN.password);
  const platformToken = await platformTokenPromise;
  const name = `Colegio E2E ${unique()}`;
  const created = await api.post(`${API_URL}/institutions`, {
    headers: { Authorization: `Bearer ${platformToken}` },
    data: { name, slug: `e2e-${unique()}`, timezone: "America/Caracas" },
  });
  expect(created.status(), "create institution").toBe(201);
  const institutionId = ((await created.json()) as { id: string }).id;
  const admin = await registerMember(api, platformToken, institutionId, "ADMIN", {
    firstName: "Directora",
    lastName: "Prueba",
  });
  const adminToken = await accessToken(api, admin.email, admin.password);

  return {
    institutionId,
    name,
    admin,
    /** Registers a pending Teacher or Student the way the admin dashboard would. */
    async register(role: "TEACHER" | "STUDENT", names = { firstName: "Ada", lastName: "Lovelace" }) {
      return registerMember(api, adminToken, institutionId, role, names);
    },
    dispose: () => api.dispose(),
  };
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/es/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

/** Takes a pending member from the camera step to "submitted for review". */
export async function completeOnboarding(page: Page, firstName: string): Promise<void> {
  await expect(page).toHaveURL("/es/onboarding");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  const video = page.getByTestId("camera-video");
  // Wait for real frames, otherwise the capture would be empty
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Tomar foto" }).click();
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByRole("heading", { name: "Confirma tus datos" })).toBeVisible();
  await page.getByLabel("Nombres").fill(firstName);
  await page.getByRole("button", { name: "Enviar para revisión" }).click();
  await expect(page.getByRole("heading", { name: "Solicitud enviada" })).toBeVisible();
}
