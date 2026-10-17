import { expect, test, type Browser, type Page } from "@playwright/test";
import { createCourse, createInstitution, PLATFORM_ADMIN, signIn } from "./support";

// Needs the API: `docker compose up -d postgres redis ocr-server backend`; the class test also needs `livekit video-server`

async function openAs(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext({ locale: "es-ES", permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}

const labCards = (page: Page) => page.getByRole("main").getByRole("link");

test("the platform grants a lab, the institution switches it, and its members see only what both allow", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(90_000);
  const { institution, teacher } = await createCourse(playwright);

  // The Platform Admin enters the institution and grants it free fall
  await signIn(page, PLATFORM_ADMIN.email, PLATFORM_ADMIN.password);
  await page.getByRole("link", { name: "Instituciones" }).click();
  await page.getByRole("button", { name: `Gestionar: ${institution.name}` }).click();
  await page.getByRole("link", { name: "Laboratorios", exact: true }).click();
  const grant = page.getByRole("switch", { name: "Conceder Caída libre a la institución" });
  await expect(grant).toHaveAttribute("aria-checked", "false");
  // Nothing granted cannot be switched on
  await expect(page.getByRole("switch", { name: "Activar Caída libre" })).toBeDisabled();
  await grant.click();
  await expect(grant).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("switch", { name: "Activar Caída libre" })).toBeEnabled();

  // The Teacher now finds it among their labs, and nothing that was not granted
  const teacherPage = await openAs(browser, teacher.email, teacher.password);
  await teacherPage.getByRole("link", { name: "Laboratorios", exact: true }).click();
  await expect(labCards(teacherPage).filter({ hasText: "Caída libre" })).toBeVisible();
  await expect(labCards(teacherPage).filter({ hasText: "Graficador de funciones" })).toHaveCount(0);

  // The Institution Admin sees only granted labs, and switches it off
  const adminPage = await openAs(browser, institution.admin.email, institution.admin.password);
  await adminPage.getByRole("link", { name: "Laboratorios", exact: true }).click();
  await expect(adminPage.getByRole("switch", { name: /^Conceder/ })).toHaveCount(0);
  const enabled = adminPage.getByRole("switch", { name: "Activar Caída libre" });
  await expect(enabled).toHaveAttribute("aria-checked", "true");
  await enabled.click();
  await expect(enabled).toHaveAttribute("aria-checked", "false");

  await teacherPage.reload();
  await expect(teacherPage.getByText("Tu institución todavía no tiene laboratorios activos.")).toBeVisible();
  await teacherPage.goto("/es/labs/gravity");
  await expect(teacherPage.getByRole("main")).toContainText("Este laboratorio no está disponible en tu institución.");
});

test("a Teacher gives a language activity, the Student hands it in once, and the Teacher sees the score", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(90_000);
  const { institution, teacher, student } = await createCourse(playwright);
  await institution.grantLabs(["completions"]);

  // The Teacher gives the group two sentences of the bank to complete
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("link", { name: "Laboratorios de Matemática" }).click();
  const form = page.getByRole("form", { name: "Nueva actividad de laboratorio" });
  await form.getByRole("radio", { name: "Completar oraciones" }).click();
  await form.getByLabel("Título de la actividad").fill("Verbos en pasado");
  await form.getByRole("checkbox", { name: /Ayer nosotros/ }).check();
  await form.getByRole("checkbox", { name: /Si tuviera tiempo/ }).check();
  await form.getByRole("button", { name: "Asignar al grupo" }).click();
  const activities = page.getByRole("region", { name: "Actividades del grupo" });
  await expect(activities).toContainText("Verbos en pasado");
  await expect(activities).toContainText("0 de 1 entregadas");

  // The Student is told, finds it, answers with one accent missing, and hands it in
  const studentPage = await openAs(browser, student.email, student.password);
  await studentPage.getByRole("link", { name: "Laboratorios", exact: true }).click();
  await studentPage.getByRole("link", { name: /Verbos en pasado/ }).click();
  const sheet = studentPage.getByRole("form", { name: "Respuestas de la actividad" });
  await expect(sheet.getByRole("listitem")).toHaveCount(2);
  await sheet.getByLabel("Palabra que falta").nth(0).fill("Fuimos");
  await sheet.getByLabel("Palabra que falta").nth(1).fill("leeria");
  await sheet.getByRole("button", { name: "Entregar" }).click();
  await studentPage.getByRole("dialog", { name: "¿Entregar la actividad?" }).getByRole("button", { name: "Entregar" }).click();
  await expect(studentPage.getByRole("status").filter({ hasText: "Acertaste 1 de 2." })).toBeVisible();
  await expect(sheet).toContainText("Revisa las tildes");
  await expect(sheet).toContainText("Respuesta: leería");
  // A single attempt: there is nothing left to hand in
  await expect(sheet.getByRole("button", { name: "Entregar" })).toHaveCount(0);

  // The Teacher sees the hand-in and its score
  await page.reload();
  await expect(activities).toContainText("1 de 1 entregadas");
  await activities.getByRole("button", { name: "Ver entregas" }).click();
  const results = page.getByRole("table", { name: "Entregas de «Verbos en pasado»" });
  await expect(results.getByRole("row", { name: /Grace Hopper/ })).toContainText("1 de 2");
});

test("a Teacher shares the function grapher in class and the Student follows it, sharp and read-only", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(120_000);
  const { institution, teacher, student } = await createCourse(playwright);
  await institution.grantLabs(["function-grapher"]);

  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("button", { name: "Iniciar clase de Matemática" }).click();
  await expect(page.getByRole("group", { name: "Controles de la clase" })).toBeVisible({ timeout: 30_000 });
  const studentPage = await openAs(browser, student.email, student.password);
  await studentPage.getByRole("link", { name: "Entrar a la clase de Matemática" }).click({ timeout: 30_000 });
  await expect(studentPage.getByRole("group", { name: "Controles de la clase" })).toBeVisible({ timeout: 30_000 });
  // Only the Teacher gets the menu that shares a lab
  await expect(studentPage.getByRole("button", { name: "Compartir", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Compartir", exact: true }).click();
  await page.getByRole("menuitem", { name: "Compartir un laboratorio" }).click();
  await page.getByRole("dialog", { name: "Compartir un laboratorio" }).getByRole("button", { name: "Graficador de funciones" }).click();
  const teacherLab = page.getByRole("region", { name: "Graficador de funciones" });
  await expect(teacherLab).toContainText("Lo estás compartiendo");

  // The lab takes the Student's stage, drawn from the shared state
  const studentLab = studentPage.getByRole("region", { name: "Graficador de funciones" });
  await expect(studentLab).toContainText("Lo comparte tu docente", { timeout: 15_000 });
  await teacherLab.getByLabel("f1(x) =").fill("x^3 - 2x");
  await expect(studentLab.getByLabel("f1(x) =")).toHaveValue("x^3 - 2x");
  await expect(studentLab.getByLabel("f1(x) =")).toHaveAttribute("readonly", "");
  await expect(studentLab.getByRole("link", { name: "Abrir en mis laboratorios" })).toHaveAttribute(
    "href",
    /\/es\/labs\/function-grapher\?state=/,
  );

  // A Student who joins late gets the lab as it is now
  await studentPage.reload();
  await expect(studentPage.getByRole("region", { name: "Graficador de funciones" }).getByLabel("f1(x) =")).toHaveValue(
    "x^3 - 2x",
    { timeout: 15_000 },
  );

  await teacherLab.getByRole("button", { name: "Dejar de compartir" }).click();
  await expect(studentPage.getByRole("region", { name: "Graficador de funciones" })).toHaveCount(0, { timeout: 15_000 });
});

test("an institution without labs offers none", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  const teacher = await institution.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("link", { name: "Laboratorios", exact: true }).click();
  await expect(page.getByText("Tu institución todavía no tiene laboratorios activos.")).toBeVisible();
});
