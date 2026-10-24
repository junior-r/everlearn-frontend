import { expect, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const VIDEO_SERVER_URL = process.env.NEXT_PUBLIC_VIDEO_SERVER_URL ?? "http://localhost:8080";
// The Platform Admin that docker-compose.yml creates on first start
export const PLATFORM_ADMIN = {
  email: process.env.PLATFORM_ADMIN_EMAIL ?? "admin@everlearn.local",
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? "dev-platform-admin-password",
};
/** The password test accounts end up with once their temporary one has been replaced. */
export const PASSWORD = "e2e-own-password";

type Playwright = PlaywrightWorkerArgs["playwright"];
type MemberRole = "ADMIN" | "COORDINATOR" | "TEACHER" | "STAFF" | "STUDENT" | "GUARDIAN";
type RegistrableRole = Exclude<MemberRole, "ADMIN">;

export interface Account {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  membershipId: string;
}

// Scoped to <main> because Next.js adds its own role="alert" route announcer to the body
export const formError = (page: Page) => page.getByRole("main").getByRole("alert");

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
// A real 1x1 PNG: the OCR service must be able to open it, and reads nothing from it
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let platformTokenPromise: Promise<string> | null = null;

async function accessToken(api: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await api.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(response.status(), `login as ${email}`).toBe(200);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

const bearer = (token: string, institutionId?: string) => ({
  Authorization: `Bearer ${token}`,
  ...(institutionId ? { "x-institution-id": institutionId } : {}),
});

/** Replaces a temporary password through the API and returns the unrestricted token. */
async function replacePassword(api: APIRequestContext, email: string, temporary: string) {
  const restricted = await accessToken(api, email, temporary);
  const response = await api.post(`${API_URL}/auth/change-password`, {
    headers: bearer(restricted),
    data: { currentPassword: temporary, newPassword: PASSWORD },
  });
  expect(response.status(), `change password of ${email}`).toBe(200);
  return ((await response.json()) as { accessToken: string }).accessToken;
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
    headers: bearer(platformToken),
    data: { name, slug: `e2e-${unique()}`, timezone: "America/Caracas" },
  });
  expect(created.status(), "create institution").toBe(201);
  const institutionId = ((await created.json()) as { id: string }).id;

  async function post(token: string, path: string, data: object) {
    return api.post(`${API_URL}${path}`, { headers: bearer(token, institutionId), data });
  }

  async function addMember(token: string, role: MemberRole, email: string, names: Names) {
    const response = await post(token, "/members", { email, role, ...names });
    expect(response.status(), `register ${role} ${email}`).toBe(201);
    return (await response.json()) as {
      member: { membershipId: string };
      temporaryPassword: string | null;
    };
  }

  const adminNames = { firstName: "Directora", lastName: "Prueba" };
  const adminEmail = `e2e-admin-${unique()}@example.com`;
  const appointed = await addMember(platformToken, "ADMIN", adminEmail, adminNames);
  const adminToken = await replacePassword(api, adminEmail, appointed.temporaryPassword ?? "");
  const admin: Account = {
    email: adminEmail,
    password: PASSWORD,
    membershipId: appointed.member.membershipId,
    ...adminNames,
  };

  /** Checks a pending member's ID at the desk, as the Institution Admin, which activates them. */
  async function checkIdentity(membershipId: string, names: Names = DEFAULT_NAMES) {
    const desk = { headers: bearer(adminToken, institutionId) };
    const uploaded = await api.post(`${API_URL}/onboarding/members/${membershipId}/document`, {
      ...desk,
      multipart: {
        documentType: "NATIONAL_ID",
        file: { name: "id.png", mimeType: "image/png", buffer: BLANK_PNG },
      },
    });
    expect(uploaded.status(), "photograph ID").toBe(200);
    const confirmed = await api.post(`${API_URL}/onboarding/members/${membershipId}/confirm`, {
      ...desk,
      data: { ...names, documentType: "NATIONAL_ID", documentNumber: "12345678", birthDate: "2000-01-01" },
    });
    expect(confirmed.status(), "confirm ID data").toBe(200);
  }

  return {
    institutionId,
    name,
    admin,
    /**
     * Registers a member who has already chosen their own password but whose
     * ID has not been checked yet, so they are pending and can sign in normally.
     */
    async register(role: RegistrableRole, names: Names = DEFAULT_NAMES): Promise<Account> {
      const email = `e2e-${role.toLowerCase()}-${unique()}@example.com`;
      const registered = await addMember(adminToken, role, email, names);
      await replacePassword(api, email, registered.temporaryPassword ?? "");
      return { email, password: PASSWORD, membershipId: registered.member.membershipId, ...names };
    },
    /** Like `register`, but leaves the temporary password in place, as the admin would hand it over. */
    async registerWithTemporaryPassword(role: RegistrableRole, names: Names = DEFAULT_NAMES) {
      const email = `e2e-${role.toLowerCase()}-${unique()}@example.com`;
      const registered = await addMember(adminToken, role, email, names);
      return {
        email,
        password: registered.temporaryPassword ?? "",
        membershipId: registered.member.membershipId,
        ...names,
      };
    },
    checkIdentity,
    /** Registers a member and has their ID checked at the desk, leaving them active with their own password. */
    async registerActive(role: RegistrableRole, names: Names = DEFAULT_NAMES): Promise<Account> {
      const email = `e2e-${role.toLowerCase()}-${unique()}@example.com`;
      const registered = await addMember(adminToken, role, email, names);
      await replacePassword(api, email, registered.temporaryPassword ?? "");
      await checkIdentity(registered.member.membershipId, names);
      return { email, password: PASSWORD, membershipId: registered.member.membershipId, ...names };
    },
    /** Gives someone who already has an account a role in this institution too. */
    async addExisting(email: string, role: "TEACHER" | "STUDENT") {
      const added = await addMember(adminToken, role, email, DEFAULT_NAMES);
      expect(added.temporaryPassword, "existing accounts get no temporary password").toBeNull();
    },
    /** Calls an admin endpoint of this institution as its Institution Admin. */
    async api<T>(path: string, data: object): Promise<T> {
      const response = await post(adminToken, path, data);
      expect(response.ok(), `POST ${path}: ${response.status()}`).toBe(true);
      return (await response.json()) as T;
    },
    /** Like `api`, for the endpoints that use PUT. */
    async apiPut<T>(path: string, data: object): Promise<T> {
      const response = await api.put(API_URL + path, { headers: bearer(adminToken, institutionId), data });
      expect(response.ok(), "PUT " + path + ": " + response.status()).toBe(true);
      return (await response.json()) as T;
    },
    /** Grants labs to this institution as the Platform Admin; a granted lab starts switched on. */
    async grantLabs(labKeys: string[]) {
      for (const labKey of labKeys) {
        const response = await api.put(`${API_URL}/institutions/${institutionId}/labs/${labKey}`, {
          headers: bearer(platformToken),
          data: { granted: true },
        });
        expect(response.status(), `grant ${labKey}`).toBe(204);
      }
    },
    dispose: () => api.dispose(),
  };
}

type Names = { firstName: string; lastName: string };
const DEFAULT_NAMES: Names = { firstName: "Ada", lastName: "Lovelace" };

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/es/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

/** Fills the forced password change screen a new member lands on. */
export async function chooseOwnPassword(page: Page, temporaryPassword: string): Promise<void> {
  await expect(page).toHaveURL("/es/change-password");
  // Scoped to the form: Next.js keeps the previous page (the login form) in the DOM, hidden
  const form = page.getByRole("form", { name: "Cambiar contraseña" });
  await form.getByLabel("Contraseña temporal").fill(temporaryPassword);
  await form.getByLabel("Nueva contraseña", { exact: true }).fill(PASSWORD);
  await form.getByLabel("Repite la nueva contraseña").fill(PASSWORD);
  await form.getByRole("button", { name: "Guardar contraseña" }).click();
}

/**
 * Checks the ID of the member whose check is open on the members page, with
 * the camera. The fake camera shows no document, so the OCR reads nothing and every field is typed.
 */
export async function checkIdentityAtDesk(
  page: Page,
  registeredName: string,
  identity: { firstName: string; lastName: string },
): Promise<void> {
  const check = page.getByRole("region", { name: `Verificar la identidad de ${registeredName}` });
  await check.getByRole("button", { name: "Activar cámara" }).click();
  const video = check.getByTestId("camera-video");
  // Wait for real frames, otherwise the capture would be empty
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);
  await check.getByRole("button", { name: "Tomar foto" }).click();
  await check.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(check.getByRole("heading", { name: "Confirma los datos" })).toBeVisible();
  await expect(check.getByRole("alert")).toContainText("No pudimos leer el documento automáticamente");
  await check.getByLabel("Nombres").fill(identity.firstName);
  await check.getByLabel("Apellidos").fill(identity.lastName);
  await check.getByLabel("Número de documento").fill("12345678");
  await check.getByLabel("Fecha de nacimiento").fill("2008-03-14");
  await check.getByRole("button", { name: "Confirmar y activar" }).click();
  await expect(check.getByRole("heading", { name: `${registeredName} ya está activo` })).toBeVisible();
}

/**
 * A group ("1ro A") taking Matemática with an active Teacher, and two active
 * Students: one enrolled in the group, the other (`outsider`) not.
 */
export async function createCourse(playwright: Playwright) {
  const institution = await createInstitution(playwright);
  const teacher = await institution.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });
  const student = await institution.registerActive("STUDENT", { firstName: "Grace", lastName: "Hopper" });
  const outsider = await institution.registerActive("STUDENT", { firstName: "Linus", lastName: "Pauling" });
  const pensum = await institution.api<{ id: string }>("/pensums", { code: "BACH", name: "Bachillerato" });
  const period = await institution.api<{ id: string }>("/periods", {
    name: "2026-2027",
    startDate: "2026-09-15",
    endDate: "2027-07-15",
  });
  const subject = await institution.api<{ id: string }>("/subjects", { code: "MAT-1", name: "Matemática" });
  await institution.apiPut(`/pensums/${pensum.id}/subjects/${subject.id}`, { level: 1, weeklyHours: 4 });
  const group = await institution.api<{ id: string }>("/groups", {
    name: "1ro A",
    level: 1,
    pensumId: pensum.id,
    periodId: period.id,
  });
  await institution.apiPut(`/groups/${group.id}/courses/${subject.id}`, {
    teacherMembershipId: teacher.membershipId,
  });
  await institution.api(`/groups/${group.id}/students`, { membershipId: student.membershipId });
  return { institution, teacher, student, outsider, groupId: group.id, subjectId: subject.id, periodId: period.id };
}
