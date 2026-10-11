import { expect, test, type Page } from "@playwright/test";
import { API_URL, createCourse, signIn } from "./support";

// Needs the API: `docker compose up -d postgres redis ocr-server backend`
const launcher = (page: Page) => page.getByRole("button", { name: "Abrir asistente de IA" });
const panel = (page: Page) => page.getByRole("dialog", { name: "Asistente de IA" });
const conversation = (page: Page) => panel(page).getByRole("log", { name: "Conversación con el asistente" });
const question = (page: Page) => panel(page).getByRole("textbox", { name: "Tu pregunta" });

test("an Institution Admin asks the assistant for the class hours of a subject", async ({ page, playwright }) => {
  const { institution } = await createCourse(playwright);

  // Nobody is signed in on the login page, so there is no assistant
  await page.goto("/es/login");
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  await expect(launcher(page)).toHaveCount(0);

  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL(/\/es\/admin/);
  await launcher(page).click();
  await expect(panel(page)).toContainText("Puedo consultar las horas de clase de los docentes");
  await expect(question(page)).toBeFocused();
  await expect(question(page)).toHaveAttribute("placeholder", "Escribe tu pregunta...");
  await expect(panel(page).getByRole("button", { name: "Enviar pregunta" })).toBeDisabled();

  // The answer comes from the timetable and the classes held, looked up by the backend
  await question(page).fill("¿Cuántas horas de Matemática hubo en octubre de 2026?");
  await question(page).press("Enter");
  await expect(conversation(page)).toContainText("¿Cuántas horas de Matemática hubo en octubre de 2026?");
  await expect(question(page)).toHaveValue("");
  await expect(conversation(page)).toContainText("Horas de clase de Matemática en 2026-10:");
  await expect(conversation(page)).toContainText(
    "Alan Turing (1ro A): 0 h programadas en el horario, 0 h de clases dictadas.",
  );
  await expect(conversation(page)).toHaveAttribute("aria-busy", "false");

  // The conversation outlives the panel and the page: it is still there in another section
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(launcher(page)).toBeFocused();
  await page.getByRole("link", { name: "Materias" }).click();
  await expect(page).toHaveURL("/es/admin/subjects");
  await launcher(page).click();
  await expect(conversation(page)).toContainText("Horas de clase de Matemática en 2026-10:");

  // A question that names no subject gets a question back, and the history can be cleared
  await question(page).fill("¿Cuántas horas tienen los docentes?");
  await panel(page).getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(conversation(page)).toContainText("Puedo consultar: Matemática.");
  await panel(page).getByRole("button", { name: "Nueva conversación" }).click();
  await expect(conversation(page)).not.toContainText("Horas de clase");
  await expect(panel(page).getByRole("list", { name: "Preguntas sugeridas" })).toBeVisible();
  await institution.dispose();
});

test("a Student asks about their grades, and a failed answer can be retried", async ({ page, playwright }) => {
  const { institution, student } = await createCourse(playwright);
  await signIn(page, student.email, student.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");
  await launcher(page).click();
  await expect(panel(page)).toContainText("Puedo consultar tus notas, tus promedios y los detalles de una evaluación.");

  // The connection drops: the question stays, with a way to ask it again
  await page.route(`${API_URL}/ai/chat`, (route) => route.abort());
  await panel(page).getByRole("button", { name: "¿Cómo van mis notas?" }).click();
  await expect(conversation(page)).toContainText("¿Cómo van mis notas?");
  await expect(conversation(page).getByRole("alert")).toContainText("No pudimos conectar con el servidor");
  await page.unroute(`${API_URL}/ai/chat`);
  await conversation(page).getByRole("button", { name: "Reintentar" }).click();
  await expect(conversation(page).getByRole("alert")).toHaveCount(0);
  await expect(conversation(page)).toContainText("Este es tu historial académico:");
  await expect(conversation(page)).toContainText("Matemática: todavía sin notas.");

  // What belongs to the institution's admins is not theirs to ask
  await question(page).fill("Horas de Matemática en octubre");
  await question(page).press("Enter");
  await expect(conversation(page)).toContainText("Puedo consultar tus notas y promedios");
  await expect(conversation(page)).not.toContainText("Horas de clase de Matemática");

  // The assistant follows the Student to their other pages
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Mis notas" }).click();
  await expect(page).toHaveURL("/es/progress");
  await expect(launcher(page)).toBeVisible();
  await institution.dispose();
});

test("a Teacher asks about the averages and the attendance of what they teach", async ({ page, browser, playwright }) => {
  const { institution, teacher } = await createCourse(playwright);
  const unassigned = await institution.registerActive("TEACHER", { firstName: "Emmy", lastName: "Noether" });
  await signIn(page, teacher.email, teacher.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");
  await launcher(page).click();
  await expect(panel(page)).toContainText("Puedo consultar los promedios de tus estudiantes en una materia");

  // With a single course and group there is nothing to name: the backend looks them up
  await panel(page).getByRole("button", { name: "¿Cómo van los promedios de mis estudiantes?" }).click();
  await expect(conversation(page)).toContainText(
    "Matemática, grupo 1ro A: todavía no hay notas registradas (0 evaluaciones publicadas).",
  );
  await question(page).fill("¿Quién está en riesgo por inasistencia?");
  await question(page).press("Enter");
  await expect(conversation(page)).toContainText(
    "Ningún estudiante del grupo 1ro A está por debajo del 70% de asistencia en tus clases.",
  );
  await expect(conversation(page)).toContainText("Clases dictadas: 0. Estudiantes inscritos: 1.");

  // A Teacher assigned to nothing is told so, whatever subject or group they name
  const context = await browser.newContext({ locale: "es-ES" });
  const other = await context.newPage();
  await signIn(other, unassigned.email, unassigned.password);
  await expect(other).toHaveURL("/es");
  await launcher(other).click();
  await question(other).fill("¿Cómo van los promedios de Matemática?");
  await question(other).press("Enter");
  await expect(conversation(other)).toContainText("Todavía no tienes materias asignadas.");
  await question(other).fill("Asistencia del grupo 1ro A");
  await question(other).press("Enter");
  await expect(conversation(other)).toContainText("Todavía no tienes grupos asignados.");
  await context.close();
  await institution.dispose();
});

/** Scrolls to the end of the page and names every control of the page the launcher lies on top of. */
async function coveredControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const button = document.querySelector("[data-assistant-launcher]");
    if (!button) {
      return ["the launcher is missing"];
    }
    const corner = button.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>("a, button, input, select, textarea")]
      .filter((control) => control !== button && control.checkVisibility())
      .filter((control) => {
        const box = control.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.left < corner.right &&
          box.right > corner.left &&
          box.top < corner.bottom &&
          box.bottom > corner.top
        );
      })
      .map((control) => control.getAttribute("aria-label") ?? control.textContent?.trim() ?? control.tagName);
  });
}

test("on a phone the assistant button never covers what a page ends with", async ({ browser, playwright }) => {
  test.setTimeout(90_000);
  const { institution, teacher, student } = await createCourse(playwright);
  const phone = { viewport: { width: 390, height: 780 }, locale: "es-ES" };

  // The Student's home ends with "Cerrar sesión", right where the button floats
  const studentContext = await browser.newContext(phone);
  const studentPage = await studentContext.newPage();
  await signIn(studentPage, student.email, student.password);
  const signOut = studentPage.getByRole("button", { name: "Cerrar sesión" });
  await expect(signOut).toBeVisible();
  await expect(launcher(studentPage)).toBeVisible();
  expect(await coveredControls(studentPage)).toEqual([]);
  // And the button under it really takes the tap
  await signOut.click();
  await expect(studentPage).toHaveURL("/es/login");
  await signIn(studentPage, student.email, student.password);
  for (const [link, url] of [
    ["Mis notas", "/es/progress"],
    ["Calendario de evaluaciones", "/es/calendar"],
  ]) {
    await expect(studentPage.getByRole("region", { name: "Mis clases" })).toBeVisible();
    await studentPage.getByRole("link", { name: link }).click();
    await expect(studentPage).toHaveURL(url);
    await expect(launcher(studentPage)).toBeVisible();
    expect(await coveredControls(studentPage), url).toEqual([]);
    await studentPage.getByRole("link", { name: "Volver al inicio" }).click();
  }
  await studentContext.close();

  // The Teacher's gradebook and the admin dashboard end with buttons and form fields
  const teacherContext = await browser.newContext(phone);
  const teacherPage = await teacherContext.newPage();
  await signIn(teacherPage, teacher.email, teacher.password);
  await teacherPage.getByRole("link", { name: "Evaluaciones de Matemática" }).click();
  await expect(teacherPage.getByRole("button", { name: "Crear evaluación" })).toBeVisible();
  expect(await coveredControls(teacherPage)).toEqual([]);
  await teacherContext.close();

  const adminContext = await browser.newContext(phone);
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, institution.admin.email, institution.admin.password);
  await expect(adminPage).toHaveURL(/\/es\/admin/);
  await expect(adminPage.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await expect(launcher(adminPage)).toBeVisible();
  expect(await coveredControls(adminPage)).toEqual([]);
  await adminContext.close();
  await institution.dispose();
});
