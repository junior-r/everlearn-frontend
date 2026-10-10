import { expect, test } from "@playwright/test";
import {
  chooseOwnPassword,
  completeOnboarding,
  createInstitution,
  formError,
  PASSWORD,
  PLATFORM_ADMIN,
  signIn,
} from "./support";

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test("the full pipeline: an admin registers a Student, the Student onboards, the admin approves", async ({
  page,
  browser,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const studentEmail = `e2e-student-${unique()}@example.com`;

  // 1. The Institution Admin registers the Student in the dashboard
  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL("/es/admin/members");
  // Scoped to the form: Next.js keeps the previous page in the DOM, hidden, after a navigation
  const memberForm = page.getByRole("form", { name: "Registrar miembro" });
  await memberForm.getByLabel("Nombres").fill("Grace");
  await memberForm.getByLabel("Apellidos").fill("Hopper");
  await memberForm.getByLabel("Correo electrónico").fill(studentEmail);
  await memberForm.getByLabel("Rol").selectOption("STUDENT");
  await memberForm.getByRole("button", { name: "Registrar" }).click();

  await expect(page.getByRole("heading", { name: "Miembro registrado" })).toBeVisible();
  const temporaryPassword = await page.getByTestId("temporary-password").innerText();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);
  const studentRow = page.getByRole("row", { name: /Grace Hopper/ });
  await expect(studentRow).toContainText("Estudiante");
  await expect(studentRow).toContainText("Pendiente de verificación");

  // The password is shown once only
  await page.getByRole("button", { name: "Ya las copié" }).click();
  await expect(page.getByText(temporaryPassword)).toHaveCount(0);

  // 2. The Student signs in on their own device and completes onboarding
  const studentContext = await browser.newContext({ locale: "es-ES", permissions: ["camera"] });
  const studentPage = await studentContext.newPage();
  await signIn(studentPage, studentEmail, temporaryPassword);
  // The temporary password only lets them choose their own; then onboarding opens
  await chooseOwnPassword(studentPage, temporaryPassword);
  await completeOnboarding(studentPage, "Grace Brewster");

  // 3. The admin reviews: the photo sits beside the registered, OCR and confirmed data
  await page.getByRole("link", { name: "Revisiones pendientes" }).click();
  await expect(page).toHaveURL("/es/admin/reviews");
  const card = page.getByRole("article", { name: "Grace Hopper" });
  await expect(card).toContainText(studentEmail);
  const photo = card.getByAltText("Foto del documento de Grace Hopper");
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const nameRow = card.getByRole("row", { name: /^Nombre/ });
  await expect(nameRow).toContainText("Grace Hopper");
  await expect(nameRow).toContainText("María Fernanda González Pérez");
  await expect(nameRow).toContainText("Grace Brewster González Pérez");

  await card.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("No hay solicitudes pendientes de revisión.")).toBeVisible();

  // 4. The Student is now active and lands on the home page under the name from their ID
  await studentPage.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(studentPage, studentEmail, PASSWORD);
  await expect(studentPage).toHaveURL("/es");
  await expect(
    studentPage.getByRole("heading", { name: "Te damos la bienvenida, Grace Brewster" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Miembros" }).click();
  await expect(page.getByRole("row", { name: /Grace Brewster/ })).toContainText("Activo");
  await studentContext.close();
  await institution.dispose();
});

test("a rejection reaches the applicant with its reason and lets them try again", async ({
  page,
  browser,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const teacher = await institution.register("TEACHER", { firstName: "Alan", lastName: "Turing" });
  const teacherContext = await browser.newContext({ locale: "es-ES", permissions: ["camera"] });
  const teacherPage = await teacherContext.newPage();
  await signIn(teacherPage, teacher.email, teacher.password);
  await completeOnboarding(teacherPage, "Alan");

  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Revisiones pendientes" }).click();
  const card = page.getByRole("article", { name: "Alan Turing" });
  await expect(card).toContainText("Docente");
  await card.getByRole("button", { name: "Rechazar" }).click();
  await card.getByLabel("Motivo del rechazo").fill("La foto está borrosa.");
  await card.getByRole("button", { name: "Confirmar rechazo" }).click();
  await expect(page.getByText("No hay solicitudes pendientes de revisión.")).toBeVisible();

  await teacherPage.reload();
  await expect(formError(teacherPage)).toContainText("La foto está borrosa.");
  await expect(teacherPage.getByRole("button", { name: "Activar cámara" })).toBeVisible();
  await teacherContext.close();
  await institution.dispose();
});

test("an Institution Admin manages subjects for their institution only", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Materias" }).click();
  await expect(page.getByText("Esta institución aún no tiene materias.")).toBeVisible();

  const subjectForm = page.getByRole("form", { name: "Nueva materia" });
  await subjectForm.getByLabel("Código").fill("mat-101");
  await subjectForm.getByLabel("Nombre", { exact: true }).fill("Matemática I");
  await subjectForm.getByRole("button", { name: "Crear" }).click();

  const row = page.getByRole("row", { name: /MAT-101/ });
  await expect(row).toContainText("Matemática I");

  // The same code again is refused with a translated message
  await subjectForm.getByLabel("Código").fill("MAT-101");
  await subjectForm.getByLabel("Nombre", { exact: true }).fill("Duplicada");
  await subjectForm.getByRole("button", { name: "Crear" }).click();
  await expect(subjectForm.getByRole("alert")).toHaveText("Otra materia ya usa este código.");

  await row.getByRole("button", { name: /Eliminar/ }).click();
  await expect(page.getByText("Esta institución aún no tiene materias.")).toBeVisible();

  // Institutions are not theirs to manage: no link, and the page sends them away
  await expect(page.getByRole("link", { name: "Instituciones" })).toHaveCount(0);
  await page.goto("/es/admin/institutions");
  await expect(page).toHaveURL("/es/admin/members");
  await institution.dispose();
});

test("a Platform Admin creates an institution and deactivates it", async ({ page }) => {
  const slug = `e2e-ui-${unique()}`;
  const name = `Liceo ${slug}`;
  await signIn(page, PLATFORM_ADMIN.email, PLATFORM_ADMIN.password);
  await expect(page).toHaveURL("/es/admin/institutions");

  const institutionForm = page.getByRole("form", { name: "Nueva institución" });
  await institutionForm.getByLabel("Nombre", { exact: true }).fill(name);
  await institutionForm.getByLabel("Identificador").fill(slug);
  await institutionForm.getByRole("button", { name: "Crear" }).click();

  const row = page.getByRole("row", { name: new RegExp(slug) });
  await expect(row).toContainText("America/Caracas");
  await expect(row).toContainText("Activa");
  // The new institution is immediately selectable for the other admin pages
  await expect(
    page.getByRole("combobox", { name: "Institución" }).locator("option", { hasText: name }),
  ).toHaveCount(1);

  await row.getByRole("button", { name: /Desactivar/ }).click();
  await expect(row).toContainText("Inactiva");

  // A Platform Admin may also appoint Institution Admins
  await page.getByRole("link", { name: "Miembros" }).click();
  await expect(
    page
      .getByRole("form", { name: "Registrar miembro" })
      .getByLabel("Rol")
      .locator("option", { hasText: "Administrador de institución" }),
  ).toHaveCount(1);
});

test("Teachers and Students cannot reach the admin dashboard", async ({ page, browser, playwright }) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT", { firstName: "Linus", lastName: "Pauling" });
  // Pending: any admin URL leads back to onboarding
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es/onboarding");
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es/onboarding");

  // Active: approved through the dashboard, then still kept out of it
  await completeOnboarding(page, "Linus");
  const adminContext = await browser.newContext({ locale: "es-ES" });
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, institution.admin.email, institution.admin.password);
  await adminPage.getByRole("link", { name: "Revisiones pendientes" }).click();
  await adminPage.getByRole("article", { name: "Linus Pauling" }).getByRole("button", { name: "Aprobar" }).click();
  await expect(adminPage.getByText("No hay solicitudes pendientes de revisión.")).toBeVisible();
  await adminContext.close();

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es");
  await page.goto("/es/admin/reviews");
  await expect(page).toHaveURL("/es");
  await expect(page.getByRole("link", { name: "Miembros" })).toHaveCount(0);
  await institution.dispose();
});
