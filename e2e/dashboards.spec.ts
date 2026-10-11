import { expect, test, type Locator, type Page } from "@playwright/test";
import { createCourse, formError, PLATFORM_ADMIN, signIn } from "./support";

// Needs the API: `docker compose up -d postgres redis ocr-server backend`

/** The figure of a summary card, found by what the card counts. */
const stat = (scope: Page | Locator, label: string) =>
  scope.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");

/** A chart, found by its title; its bars are the items of the list it labels. */
const chart = (page: Page, title: string) => page.getByRole("list", { name: title });

test("an Institution Admin lands on their institution in figures", async ({ page, playwright }) => {
  const { institution } = await createCourse(playwright);
  await signIn(page, institution.admin.email, institution.admin.password);

  await expect(page).toHaveURL("/es/admin");
  await expect(page.getByRole("heading", { name: "Resumen de la institución", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page");
  // Two active Students (one enrolled, one not), one Teacher, and the group of the running period
  await expect(stat(page, "Estudiantes activos")).toHaveText("2");
  await expect(stat(page, "Docentes")).toHaveText("1");
  await expect(stat(page, "Grupos activos")).toHaveText("1");
  await expect(stat(page, "Asistencia general")).toHaveText("—");
  await expect(page.locator("dl", { hasText: "Asistencia general" })).toContainText("Sin registros");
  await expect(page.getByRole("figure").filter({ hasText: "Asistencia registrada" })).toContainText(
    "Todavía no se ha registrado asistencia.",
  );
  // Nothing waits for review, so there is no notice about it
  await expect(page.getByRole("link", { name: /esperan? revisión/ })).toHaveCount(0);

  // The sections are one click away, and the dashboard one click back
  await page.getByRole("link", { name: "Miembros" }).click();
  await expect(page).toHaveURL("/es/admin/members");
  await page.getByRole("link", { name: "Resumen" }).click();
  await expect(stat(page, "Docentes")).toHaveText("1");
  await institution.dispose();
});

test("a member who has not finished onboarding is not counted as an active Student", async ({ page, playwright }) => {
  const { institution } = await createCourse(playwright);
  // Registered and with their own password, but not approved yet
  await institution.register("STUDENT", { firstName: "Tim", lastName: "Berners" });
  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL("/es/admin");
  // Pending members are not counted as active Students
  await expect(stat(page, "Estudiantes activos")).toHaveText("2");
  await institution.dispose();
});

test("Staff have no dashboard and go straight to members", async ({ page, playwright }) => {
  const { institution } = await createCourse(playwright);
  const staff = await institution.registerActive("STAFF", { firstName: "Radia", lastName: "Perlman" });
  await signIn(page, staff.email, staff.password);

  await expect(page).toHaveURL("/es/admin/members");
  await expect(page.getByRole("link", { name: "Resumen" })).toHaveCount(0);
  await page.goto("/es/admin");
  await expect(page).toHaveURL("/es/admin/members");
  await institution.dispose();
});

test("a Platform Admin lands on the platform in figures", async ({ page, playwright }) => {
  const { institution } = await createCourse(playwright);
  await signIn(page, PLATFORM_ADMIN.email, PLATFORM_ADMIN.password);

  await expect(page).toHaveURL("/es/admin");
  await expect(page.getByRole("heading", { name: "Resumen de la plataforma", level: 1 })).toBeVisible();
  await expect(page.getByTestId("admin-context")).toBeVisible();
  for (const label of ["Instituciones activas", "Usuarios", "Usuarios activos", "Revisiones pendientes"]) {
    await expect(stat(page, label)).toHaveText(/^\d[\d.]*$/);
  }
  expect(Number((await stat(page, "Instituciones activas").innerText()).replace(/\D/g, ""))).toBeGreaterThan(0);
  await expect(chart(page, "Miembros por institución").getByRole("listitem").first()).toBeVisible();
  await expect(chart(page, "Usuarios por estado").getByRole("listitem")).toHaveCount(3);
  await page.getByRole("link", { name: "Instituciones" }).click();
  await expect(page).toHaveURL("/es/admin/institutions");
  await institution.dispose();
});

test("a Teacher's dashboard follows their evaluations, and the Student's their grades", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(90_000);
  const { institution, teacher, student } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("link", { name: "Panel docente" }).click();
  await expect(page).toHaveURL("/es/teacher");
  await expect(page.getByRole("heading", { name: "Panel docente", level: 1 })).toBeVisible();
  await expect(stat(page, "Materias activas")).toHaveText("1");
  await expect(stat(page, "Evaluaciones por publicar")).toHaveText("0");
  await expect(stat(page, "Estudiantes en riesgo")).toHaveText("0");
  await expect(page.getByRole("figure").filter({ hasText: "Distribución de promedios" })).toContainText(
    "Todavía no hay notas registradas en tus materias.",
  );
  await expect(page.getByRole("region", { name: "Estudiantes en riesgo por inasistencia" })).toContainText(
    "Ningún estudiante está por debajo del 70% de asistencia en tus clases.",
  );

  // A draft counts as left to publish
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await page.getByRole("link", { name: "Evaluaciones de Matemática" }).click();
  const form = page.getByRole("form", { name: "Nueva evaluación" });
  await form.getByLabel("Título").fill("Examen parcial");
  await form.getByLabel("Peso (%)").fill("60");
  await form.getByLabel("Nota máxima").fill("20");
  await form.getByRole("button", { name: "Crear evaluación" }).click();
  await expect(page.getByRole("button", { name: "Publicar Examen parcial" })).toBeVisible();
  await page.goto("/es/teacher");
  await expect(stat(page, "Evaluaciones por publicar")).toHaveText("1");

  // Published and graded, it leaves the drafts and enters the distribution: 17/20 is 85%
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await page.getByRole("link", { name: "Evaluaciones de Matemática" }).click();
  await page.getByRole("button", { name: "Publicar Examen parcial" }).click();
  const gradebook = page.getByRole("region", { name: "Libro de notas" });
  await gradebook.getByLabel("Nota de Grace Hopper en Examen parcial").fill("17");
  await gradebook.getByRole("button", { name: "Guardar notas" }).click();
  await expect(gradebook.getByRole("status")).toHaveText("Notas guardadas.");
  await page.goto("/es/teacher");
  await expect(stat(page, "Evaluaciones por publicar")).toHaveText("0");
  const distribution = chart(page, "Distribución de promedios");
  await expect(distribution.getByRole("listitem")).toHaveCount(5);
  await expect(distribution.getByRole("listitem").filter({ hasText: "80–89%" })).toContainText("1");
  await expect(distribution.getByRole("listitem").filter({ hasText: "0–59%" })).toContainText("0");

  // The Student's grades page opens with the same grade in figures
  const context = await browser.newContext({ locale: "es-ES" });
  const studentPage = await context.newPage();
  await signIn(studentPage, student.email, student.password);
  await studentPage.getByRole("link", { name: "Mis notas" }).click();
  await expect(stat(studentPage, "Materias")).toHaveText("1");
  await expect(stat(studentPage, "Evaluaciones calificadas")).toHaveText("1");
  await expect(stat(studentPage, "Por calificar")).toHaveText("0");
  const averages = chart(studentPage, "Promedio por materia");
  await expect(averages.getByRole("listitem")).toHaveCount(1);
  await expect(averages.getByRole("listitem")).toContainText("Matemática");
  await expect(averages.getByRole("listitem")).toContainText("85%");

  // A Teacher's dashboard is not a Student's to open
  await expect(studentPage.getByRole("link", { name: "Panel docente" })).toHaveCount(0);
  await studentPage.goto("/es/teacher");
  await expect(formError(studentPage)).toContainText("Esta sección no está disponible para tu rol");
  await context.close();
  await institution.dispose();
});
