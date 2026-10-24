import { expect, test } from "@playwright/test";
import {
  checkIdentityAtDesk,
  chooseOwnPassword,
  createInstitution,
  PASSWORD,
  PLATFORM_ADMIN,
  signIn,
} from "./support";

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test("the full pipeline: a Student enrols at the desk, shows their ID and signs in to an active account", async ({
  page,
  browser,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const studentEmail = `e2e-student-${unique()}@example.com`;

  // 1. The Institution Admin registers the Student in the dashboard
  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL("/es/admin");
  await page.getByRole("link", { name: "Miembros" }).click();
  await expect(page).toHaveURL("/es/admin/members");
  // Scoped to the form: Next.js keeps the previous page in the DOM, hidden, after a navigation
  const memberForm = page.getByRole("form", { name: "Registrar miembro" });
  await memberForm.getByLabel("Nombres").fill("Grace");
  await memberForm.getByLabel("Apellidos").fill("Hopper");
  await memberForm.getByLabel("Correo electrónico").fill(studentEmail);
  await memberForm.getByLabel("Rol").selectOption("STUDENT");
  await memberForm.getByRole("button", { name: "Registrar" }).click();

  // 2. The ID check opens at once, with the credentials to hand over at the end
  const check = page.getByRole("region", { name: "Verificar la identidad de Grace Hopper" });
  await expect(check).toBeVisible();
  const temporaryPassword = await check.getByTestId("temporary-password").innerText();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);
  await expect(page.getByRole("row", { name: /Grace Hopper/ })).toContainText("Pendiente de verificación");
  await checkIdentityAtDesk(page, "Grace Hopper", { firstName: "Grace Brewster", lastName: "Hopper" });

  // The password is shown once only
  await check.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByText(temporaryPassword)).toHaveCount(0);
  const studentRow = page.getByRole("row", { name: /Grace Brewster Hopper/ });
  await expect(studentRow).toContainText("Estudiante");
  await expect(studentRow).toContainText("Activo");

  // 3. The Student signs in on their own device, chooses a password and lands on the home page
  const studentContext = await browser.newContext({ locale: "es-ES" });
  const studentPage = await studentContext.newPage();
  await signIn(studentPage, studentEmail, temporaryPassword);
  await chooseOwnPassword(studentPage, temporaryPassword);
  await expect(studentPage).toHaveURL("/es");
  await expect(
    studentPage.getByRole("heading", { name: "Te damos la bienvenida, Grace Brewster" }),
  ).toBeVisible();
  await studentPage.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(studentPage, studentEmail, PASSWORD);
  await expect(studentPage).toHaveURL("/es");
  await studentContext.close();
  await institution.dispose();
});

test("only an Institution Admin checks the ID of a Teacher", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  const staff = await institution.registerActive("STAFF", { firstName: "Rosalind", lastName: "Franklin" });
  await institution.register("TEACHER", { firstName: "Alan", lastName: "Turing" });

  // Staff see the pending Teacher but are offered no check
  await signIn(page, staff.email, staff.password);
  await expect(page).toHaveURL("/es/admin/members");
  await expect(page.getByRole("row", { name: /Alan Turing/ })).toContainText("Pendiente de verificación");
  await expect(page.getByRole("button", { name: "Verificar identidad de Alan Turing" })).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/es/login");

  await signIn(page, institution.admin.email, institution.admin.password);
  // Only once signed in: leaving the login page earlier would abandon the sign-in
  await expect(page).toHaveURL("/es/admin");
  await page.goto("/es/admin/members");
  await page.getByRole("button", { name: "Verificar identidad de Alan Turing" }).click();
  await checkIdentityAtDesk(page, "Alan Turing", { firstName: "Alan Mathison", lastName: "Turing" });
  await page.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByRole("row", { name: /Alan Mathison Turing/ })).toContainText("Docente");
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

test("a Platform Admin creates an institution with its first admin, enters it and comes back out", async ({
  page,
  browser,
}) => {
  const slug = `e2e-ui-${unique()}`;
  const name = `Liceo ${slug}`;
  const adminEmail = `e2e-first-admin-${unique()}@example.com`;
  await signIn(page, PLATFORM_ADMIN.email, PLATFORM_ADMIN.password);
  await expect(page).toHaveURL("/es/admin");
  // At platform level there is no institution in play, and only institutions to manage
  await expect(page.getByTestId("admin-context")).toHaveText("Plataforma");
  const nav = page.getByRole("navigation", { name: "Secciones de administración" });
  await expect(nav.getByRole("link")).toHaveText(["Resumen", "Instituciones"]);
  await nav.getByRole("link", { name: "Instituciones" }).click();
  await expect(page).toHaveURL("/es/admin/institutions");
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es/admin/institutions");

  const institutionForm = page.getByRole("form", { name: "Nueva institución" });
  await institutionForm.getByLabel("Nombre", { exact: true }).fill(name);
  await institutionForm.getByLabel("Identificador").fill(slug);
  await institutionForm.getByLabel("Nombres del administrador").fill("Marie");
  await institutionForm.getByLabel("Apellidos del administrador").fill("Curie");
  await institutionForm.getByLabel("Correo del administrador").fill(adminEmail);
  await institutionForm.getByRole("button", { name: "Crear" }).click();

  await expect(page.getByRole("heading", { name: "Institución creada" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(`Marie Curie, quien administrará ${name}`);
  const temporaryPassword = await page.getByTestId("temporary-password").innerText();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);
  await page.getByRole("button", { name: "Ya las copié" }).click();
  await expect(page.getByText(temporaryPassword)).toHaveCount(0);

  const row = page.getByRole("row", { name: new RegExp(slug) });
  await expect(row).toContainText("America/Caracas");
  await expect(row).toContainText("Activa");

  // Entering the institution makes the context explicit and opens every section of it
  await row.getByRole("button", { name: /Gestionar/ }).click();
  await expect(page).toHaveURL("/es/admin/members");
  await expect(page.getByTestId("active-institution")).toHaveText(name);
  await expect(page.getByText("Estás gestionando")).toBeVisible();
  await expect(nav.getByRole("link")).toHaveText([
    "Resumen",
    "Instituciones",
    "Miembros",
    "Materias",
    "Pensums",
    "Grupos",
    "Disponibilidad docente",
    "Horarios",
    "Laboratorios",
  ]);
  // The first admin is already there, and needs no identity check
  const adminRow = page.getByRole("row", { name: /Marie Curie/ });
  await expect(adminRow).toContainText("Administrador de institución");
  await expect(adminRow).toContainText("Activo");
  // Inside an institution a Platform Admin may register any role, more admins included
  await expect(page.getByRole("form", { name: "Registrar miembro" }).getByLabel("Rol").locator("option")).toHaveText([
    "Estudiante",
    "Representante",
    "Personal administrativo",
    "Docente",
    "Directivo",
    "Administrador de institución",
  ]);
  // The choice survives a reload
  await page.reload();
  await expect(page.getByTestId("active-institution")).toHaveText(name);

  await page.getByRole("button", { name: "Volver a la plataforma" }).click();
  await expect(page).toHaveURL("/es/admin/institutions");
  await expect(page.getByTestId("admin-context")).toHaveText("Plataforma");
  await expect(nav.getByRole("link")).toHaveText(["Resumen", "Instituciones"]);

  // The appointed admin signs in with the credentials shown, and works only inside that institution
  const adminContext = await browser.newContext({ locale: "es-ES" });
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, adminEmail, temporaryPassword);
  await chooseOwnPassword(adminPage, temporaryPassword);
  await expect(adminPage).toHaveURL("/es/admin");
  await adminPage.getByRole("link", { name: "Miembros" }).click();
  await expect(adminPage).toHaveURL("/es/admin/members");
  await expect(adminPage.getByTestId("active-institution")).toHaveText(name);
  await expect(adminPage.getByRole("link", { name: "Instituciones" })).toHaveCount(0);
  await expect(
    adminPage.getByRole("form", { name: "Registrar miembro" }).getByLabel("Rol").locator("option"),
  ).toHaveText(["Estudiante", "Representante", "Personal administrativo", "Docente", "Directivo"]);
  await adminContext.close();

  await row.getByRole("button", { name: /Desactivar/ }).click();
  await expect(row).toContainText("Inactiva");
});

test("Staff enrol Students and their Guardians at the desk, and nothing else", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  const staff = await institution.registerActive("STAFF", { firstName: "Rosalind", lastName: "Franklin" });
  const studentEmail = `e2e-student-${unique()}@example.com`;
  await signIn(page, staff.email, staff.password);
  await expect(page).toHaveURL("/es/admin/members");
  await expect(page.getByTestId("active-institution")).toHaveText(institution.name);

  // Members is their whole dashboard
  const nav = page.getByRole("navigation", { name: "Secciones de administración" });
  await expect(nav.getByRole("link")).toHaveText(["Miembros"]);
  for (const section of ["subjects", "groups", "schedule", "institutions"]) {
    await page.goto(`/es/admin/${section}`);
    await expect(page).toHaveURL("/es/admin/members");
  }

  const memberForm = page.getByRole("form", { name: "Registrar miembro" });
  await expect(memberForm.getByLabel("Rol").locator("option")).toHaveText(["Estudiante", "Representante"]);
  await memberForm.getByLabel("Nombres").fill("Katherine");
  await memberForm.getByLabel("Apellidos").fill("Johnson");
  await memberForm.getByLabel("Correo electrónico").fill(studentEmail);
  await memberForm.getByRole("button", { name: "Registrar" }).click();

  const check = page.getByRole("region", { name: "Verificar la identidad de Katherine Johnson" });
  await expect(check.getByTestId("temporary-password")).not.toBeEmpty();
  await checkIdentityAtDesk(page, "Katherine Johnson", { firstName: "Katherine", lastName: "Johnson" });
  await check.getByRole("button", { name: "Listo" }).click();
  const studentRow = page.getByRole("row", { name: /Katherine Johnson/ });
  await expect(studentRow).toContainText("Estudiante");
  await expect(studentRow).toContainText("Activo");
  await institution.dispose();
});

test("a Principal works the enrolment desk and goes back to their own overview", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  const principal = await institution.registerActive("COORDINATOR", { firstName: "Maria", lastName: "Montessori" });
  await institution.register("STUDENT", { firstName: "Grace", lastName: "Hopper" });
  await signIn(page, principal.email, principal.password);

  // Their own screen comes first; the desk is one link away
  await expect(page).toHaveURL("/es/principal");
  await page.getByRole("link", { name: "Miembros" }).click();
  await expect(page).toHaveURL("/es/admin/members");
  const nav = page.getByRole("navigation", { name: "Secciones de administración" });
  await expect(nav.getByRole("link")).toHaveText(["Miembros"]);
  await expect(
    page.getByRole("form", { name: "Registrar miembro" }).getByLabel("Rol").locator("option"),
  ).toHaveText(["Estudiante", "Representante"]);

  await page.getByRole("button", { name: "Verificar identidad de Grace Hopper" }).click();
  await checkIdentityAtDesk(page, "Grace Hopper", { firstName: "Grace", lastName: "Hopper" });
  await page.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByRole("row", { name: /Grace Hopper/ })).toContainText("Activo");

  await page.getByRole("link", { name: "Volver a mi panel" }).click();
  await expect(page).toHaveURL("/es/principal");
  await institution.dispose();
});

test("Teachers and Students cannot reach the admin dashboard", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT", { firstName: "Linus", lastName: "Pauling" });
  // Pending: any admin URL leads back to the notice about bringing their ID
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es/onboarding");
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es/onboarding");

  // Active once the desk checked their ID, and still kept out of it
  await institution.checkIdentity(student.membershipId, { firstName: "Linus", lastName: "Pauling" });
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es");
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es");
  await expect(page.getByRole("link", { name: "Miembros" })).toHaveCount(0);
  await institution.dispose();
});
