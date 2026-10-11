import { expect, test, type Browser, type Page } from "@playwright/test";
import { createCourse, formError, signIn } from "./support";

// Needs the API: `docker compose up -d postgres redis ocr-server backend`
test.describe.configure({ mode: "serial" });

/** The 15th of the current month, so the evaluation shows in the month the calendar opens on. */
function midMonth(hour: number): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-15T${pad(hour)}:00`;
}

async function openAs(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext({ locale: "es-ES" });
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}

async function fillEvaluation(page: Page, values: { title: string; type: string; weight: string; dueAt: string }) {
  const form = page.getByRole("form", { name: "Nueva evaluación" });
  await form.getByLabel("Título").fill(values.title);
  await form.getByLabel("Tipo").selectOption({ label: values.type });
  await form.getByLabel("Peso (%)").fill(values.weight);
  await form.getByLabel("Nota máxima").fill("20");
  await form.getByLabel("Fecha de entrega (opcional)").fill(values.dueAt);
  await form.getByRole("button", { name: "Crear evaluación" }).click();
}

test("a Teacher sets and grades evaluations, and the Student sees grades, average and calendar", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(90_000);
  const { institution, teacher, student } = await createCourse(playwright);

  // From their classes, the Teacher opens the evaluations of the subject
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("link", { name: "Evaluaciones de Matemática" }).click();
  await expect(page).toHaveURL(/\/es\/courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/evaluations$/);
  await expect(page.getByRole("heading", { name: "Evaluaciones de Matemática", level: 1 })).toBeVisible();
  const evaluations = page.getByRole("list", { name: "Evaluaciones" });
  const gradebook = page.getByRole("region", { name: "Libro de notas" });
  await expect(gradebook).toContainText("Publica una evaluación para empezar a registrar notas.");

  // A draft created by mistake can be deleted, after confirming
  await fillEvaluation(page, { title: "Prueba descartada", type: "Prueba corta", weight: "10", dueAt: midMonth(9) });
  await expect(evaluations.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Eliminar Prueba descartada" }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Eliminar Prueba descartada" });
  await expect(confirmation).toContainText("Esta acción no se puede deshacer");
  await confirmation.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(evaluations.getByRole("listitem")).toHaveCount(0);
  await expect(page.getByText("Peso asignado: 0% de 100%")).toBeVisible();

  // A new evaluation is a draft, and its weight counts from the start
  await fillEvaluation(page, { title: "Examen parcial", type: "Examen", weight: "60", dueAt: midMonth(10) });
  const exam = evaluations.getByRole("listitem").filter({ hasText: "Examen parcial" });
  await expect(exam).toContainText("Borrador");
  await expect(exam).toContainText("60% de la materia");
  await expect(page.getByText("Peso asignado: 60% de 100%")).toBeVisible();

  // The subject cannot be worth more than 100%
  await fillEvaluation(page, { title: "Proyecto final", type: "Proyecto", weight: "50", dueAt: midMonth(16) });
  await expect(formError(page)).toContainText("no pueden sumar más de 100%");
  await page.getByRole("form", { name: "Nueva evaluación" }).getByLabel("Peso (%)").fill("40");
  await page.getByRole("button", { name: "Crear evaluación" }).click();
  await expect(evaluations.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText("Peso asignado: 100% de 100%")).toBeVisible();

  // Publishing opens the evaluation to grading: it becomes a column of the gradebook
  await page.getByRole("button", { name: "Publicar Examen parcial" }).click();
  await expect(exam).toContainText("Publicada");
  await expect(page.getByRole("button", { name: "Eliminar Examen parcial" })).toHaveCount(0);
  const table = gradebook.getByRole("table", { name: "Notas de Matemática, grupo 1ro A" });
  await expect(table.getByRole("columnheader", { name: /Examen parcial/ })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /Proyecto final/ })).toHaveCount(0);
  const row = table.getByRole("row", { name: /Grace Hopper/ });
  await expect(row).toContainText("Sin notas");

  // A score above the maximum is flagged and cannot be saved
  const score = table.getByLabel("Nota de Grace Hopper en Examen parcial");
  const save = gradebook.getByRole("button", { name: "Guardar notas" });
  const commentName = "Comentario para Grace Hopper en Examen parcial";
  await score.fill("25");
  await expect(score).toHaveAttribute("aria-invalid", "true");
  await expect(save).toBeDisabled();
  await expect(table.getByRole("button", { name: commentName })).toBeDisabled();

  // A valid one, typed with a comma, is saved with its comment and the average follows
  await score.fill("15,5");
  await table.getByRole("button", { name: commentName }).click();
  await table.getByRole("textbox", { name: commentName }).fill("Buen trabajo, revisa el ejercicio 3.");
  await expect(gradebook.getByRole("status")).toHaveText("1 cambio sin guardar");
  await save.click();
  await expect(gradebook.getByRole("status")).toHaveText("Notas guardadas.");
  await expect(row).toContainText("77,5%");
  await page.reload();
  await expect(table.getByLabel("Nota de Grace Hopper en Examen parcial")).toHaveValue("15,5");
  await table.getByRole("button", { name: commentName }).click();
  await expect(table.getByRole("textbox", { name: commentName })).toHaveValue("Buen trabajo, revisa el ejercicio 3.");

  // The Teacher's calendar shows both evaluations, the draft marked as such
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await page.getByRole("link", { name: "Calendario de evaluaciones" }).click();
  await expect(page).toHaveURL("/es/calendar");
  const agenda = page.getByRole("region", { name: /^Entregas de / });
  await expect(agenda.getByRole("listitem")).toHaveCount(2);
  await expect(agenda.getByRole("listitem").filter({ hasText: "Proyecto final" })).toContainText("Borrador");
  await expect(page.getByRole("table", { name: /^Evaluaciones de / })).toContainText("Examen parcial");

  // The Student sees the published evaluation, their grade and their average, and nothing of the draft
  const studentPage = await openAs(browser, student.email, student.password);
  await studentPage.getByRole("link", { name: "Mis notas" }).click();
  await expect(studentPage).toHaveURL("/es/progress");
  const course = studentPage.getByRole("article", { name: "Matemática" });
  await expect(course).toContainText("Grupo 1ro A · Docente: Alan Turing");
  await expect(course).toContainText("77,5%");
  await expect(course).toContainText("Evaluado: 60% de la materia");
  await expect(course.getByRole("row", { name: /Examen parcial/ })).toContainText("15,5 / 20");
  await expect(course).toContainText("Comentario: Buen trabajo, revisa el ejercicio 3.");
  await expect(course).not.toContainText("Proyecto final");

  // And only the published one in their calendar
  await studentPage.getByRole("link", { name: "Volver al inicio" }).click();
  await studentPage.getByRole("link", { name: "Calendario de evaluaciones" }).click();
  const studentAgenda = studentPage.getByRole("region", { name: /^Entregas de / });
  await expect(studentAgenda.getByRole("listitem")).toHaveCount(1);
  await expect(studentAgenda).toContainText("Examen parcial");
  await expect(studentAgenda).toContainText("Matemática · 1ro A");

  // Another month has nothing due
  await studentPage.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(studentAgenda).toContainText("No hay evaluaciones con fecha de entrega este mes.");
  await studentPage.context().close();
  await institution.dispose();
});

test("the gradebook of a course is closed to Students and to other Teachers", async ({
  page,
  browser,
  playwright,
}) => {
  const { institution, student, groupId, subjectId } = await createCourse(playwright);
  const otherTeacher = await institution.registerActive("TEACHER", { firstName: "Emmy", lastName: "Noether" });
  const courseUrl = `/es/courses/${groupId}/${subjectId}/evaluations`;

  // A Student has no such section, and no link to it
  await signIn(page, student.email, student.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");
  await expect(page.getByRole("link", { name: "Evaluaciones de Matemática" })).toHaveCount(0);
  await page.goto(courseUrl);
  await expect(formError(page)).toContainText("Esta sección no está disponible para tu rol");
  await expect(page.getByRole("region", { name: "Libro de notas" })).toHaveCount(0);

  // A Teacher who does not teach the subject is refused by the backend
  const teacherPage = await openAs(browser, otherTeacher.email, otherTeacher.password);
  await expect(teacherPage).toHaveURL("/es");
  await teacherPage.goto(courseUrl);
  await expect(formError(teacherPage)).toContainText("Solo el docente asignado a esta materia puede hacer esto.");
  await expect(teacherPage.getByRole("region", { name: "Libro de notas" })).toHaveCount(0);
  await teacherPage.context().close();
  await institution.dispose();
});
