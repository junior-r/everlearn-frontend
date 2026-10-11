import { expect, test, type Locator, type Page } from "@playwright/test";
import { createCourse, formError, signIn } from "./support";

// Needs the API: `docker compose up -d postgres redis ocr-server backend`

/** The figure of a summary card, found by what the card counts. */
const stat = (scope: Page | Locator, label: string) =>
  scope.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");

test("the office links a Guardian to a Student, and the Guardian then follows that Student", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(90_000);
  const { institution } = await createCourse(playwright);
  const guardian = await institution.registerActive("GUARDIAN", { firstName: "Gina", lastName: "Rometty" });

  // Before anyone links her, she lands on her portal and it says what is missing
  const context = await browser.newContext({ locale: "es-ES" });
  const guardianPage = await context.newPage();
  await signIn(guardianPage, guardian.email, guardian.password);
  await expect(guardianPage).toHaveURL("/es/guardian");
  await expect(guardianPage.getByRole("heading", { name: "Mis representados", level: 1 })).toBeVisible();
  await expect(guardianPage.getByRole("main")).toContainText("Todavía no tienes estudiantes vinculados.");

  // The Institution Admin records that she answers for Grace
  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Miembros" }).click();
  const links = page.getByRole("region", { name: "Representantes y estudiantes" });
  await expect(links).toContainText("Todavía no hay representantes vinculados a estudiantes.");
  const form = links.getByRole("form", { name: "Vincular representante" });
  await form.getByLabel("Representante").selectOption({ label: "Gina Rometty" });
  await form.getByLabel("Estudiante").selectOption({ label: "Grace Hopper" });
  await form.getByLabel("Parentesco").selectOption({ label: "Madre" });
  await form.getByRole("button", { name: "Vincular" }).click();
  const row = links.getByRole("row", { name: /Gina Rometty/ });
  await expect(row).toContainText("Grace Hopper");
  await expect(row).toContainText("Madre");

  // Now her portal shows Grace: her group, her subjects, and what has no data yet says so
  await guardianPage.reload();
  const tab = guardianPage.getByRole("tab", { name: /Grace Hopper/ });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(tab).toContainText("Grupo 1ro A");
  const panel = guardianPage.getByRole("tabpanel", { name: "Grace Hopper" });
  await expect(stat(panel, "Materias")).toHaveText("1");
  await expect(stat(panel, "Asistencia")).toHaveText("—");
  await expect(stat(panel, "Próximas evaluaciones")).toHaveText("0");
  await expect(panel.getByRole("region", { name: "Horario semanal" })).toContainText("Su grupo todavía no tiene horario.");
  await expect(panel.getByRole("region", { name: "Asistencia reciente" })).toContainText(
    "Todavía no se ha registrado su asistencia.",
  );

  // She can write to Grace's Teacher, and to nobody else who teaches
  await guardianPage.getByRole("link", { name: "Mensajes" }).click();
  await guardianPage.getByLabel("Buscar personas").fill("Turing");
  await expect(
    guardianPage.getByRole("list", { name: "Personas encontradas" }).getByRole("button", { name: /Alan Turing/ }),
  ).toBeVisible();
  await guardianPage.getByLabel("Buscar personas").fill("Grace");
  await expect(guardianPage.getByRole("list", { name: "Personas encontradas" })).toContainText(
    "No se encontró a nadie con ese nombre.",
  );

  // Unlinked, she sees nothing of Grace again
  await row.getByRole("button", { name: "Desvincular a Gina Rometty de Grace Hopper" }).click();
  await expect(links).toContainText("Todavía no hay representantes vinculados a estudiantes.");
  await guardianPage.goto("/es/guardian");
  await expect(guardianPage.getByRole("main")).toContainText("Todavía no tienes estudiantes vinculados.");
  await context.close();
  await institution.dispose();
});

test("a Guardian's portal is closed to the other roles", async ({ page, playwright }) => {
  const { institution, student } = await createCourse(playwright);
  await signIn(page, student.email, student.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");

  await expect(page.getByRole("link", { name: "Mis representados" })).toHaveCount(0);
  await page.goto("/es/guardian");
  await expect(formError(page)).toContainText("Esta sección no está disponible para tu rol");
  await institution.dispose();
});

test("a Principal lands on the teaching of the institution, to read and not to administer", async ({
  page,
  playwright,
}) => {
  const { institution } = await createCourse(playwright);
  const principal = await institution.registerActive("COORDINATOR", { firstName: "Marie", lastName: "Curie" });
  await signIn(page, principal.email, principal.password);

  await expect(page).toHaveURL("/es/principal");
  await expect(page.getByRole("heading", { name: "Panel académico", level: 1 })).toBeVisible();
  await expect(stat(page, "Grupos activos")).toHaveText("1");
  await expect(stat(page, "Estudiantes activos")).toHaveText("2");
  await expect(stat(page, "Docentes")).toHaveText("1");
  await expect(stat(page, "Materias sin docente")).toHaveText("0");
  const group = page.getByRole("table", { name: "Grupos activos" }).getByRole("row", { name: /1ro A/ });
  await expect(group).toContainText("Bachillerato");
  await expect(group).toContainText("0 h");
  await expect(page.getByRole("table", { name: "Pensums" }).getByRole("row", { name: /BACH/ })).toContainText(
    "Bachillerato",
  );
  await expect(page.getByRole("figure").filter({ hasText: "Carga horaria de los docentes" })).toContainText(
    "Todavía no hay clases en el horario.",
  );

  // No administration: the dashboard of the admins sends them back to their own
  await expect(page.getByRole("link", { name: "Miembros" })).toHaveCount(0);
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es/principal");
  // And the way out and the account are on their landing screen
  await expect(page.getByRole("link", { name: "Configuración de perfil" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/es/login");
  await institution.dispose();
});
