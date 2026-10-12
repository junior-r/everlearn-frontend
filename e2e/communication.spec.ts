import { readFile } from "node:fs/promises";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createCourse, signIn } from "./support";

// Needs the API: `docker compose up -d postgres redis ocr-server backend`

// After a navigation Next.js keeps the previous page in the DOM, hidden, with a bell of its own
const bell = (page: Page) => page.getByRole("button", { name: /^Abrir notificaciones/ }).filter({ visible: true });
const notices = (page: Page) => page.getByRole("region", { name: "Notificaciones" });

async function openAs(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext({ locale: "es-ES" });
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}

async function publishExam(page: Page) {
  await page.getByRole("link", { name: "Evaluaciones de Matemática" }).click();
  const form = page.getByRole("form", { name: "Nueva evaluación" });
  await form.getByLabel("Título").fill("Examen parcial");
  await form.getByLabel("Peso (%)").fill("60");
  await form.getByLabel("Nota máxima").fill("20");
  await form.getByRole("button", { name: "Crear evaluación" }).click();
  await page.getByRole("button", { name: "Publicar Examen parcial" }).click();
  await expect(page.getByRole("list", { name: "Evaluaciones" })).toContainText("Publicada");
}

test("a Student is welcomed, and hears of a new evaluation the moment it is published", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(120_000);
  const { institution, teacher, student } = await createCourse(playwright);
  const guardian = await institution.registerActive("GUARDIAN", { firstName: "Gina", lastName: "Rometty" });
  // She answers for two Students; Ada comes first in her portal, and the news will be about Grace
  const ada = await institution.registerActive("STUDENT", { firstName: "Ada", lastName: "Byron" });
  for (const ward of [ada, student]) {
    await institution.apiPut("/guardian-links", {
      studentMembershipId: ward.membershipId,
      guardianMembershipId: guardian.membershipId,
      relationship: "MOTHER",
    });
  }

  // Approved during setup: the welcome is waiting when they first sign in
  await signIn(page, student.email, student.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");
  await expect(bell(page)).toHaveAccessibleName("Abrir notificaciones, 1 sin leer");
  await bell(page).click();
  await expect(notices(page).getByRole("listitem")).toHaveCount(1);
  await expect(notices(page)).toContainText("¡Te damos la bienvenida!");
  await expect(notices(page)).toContainText("Tu documento fue aprobado y tu cuenta ya está activa.");
  await page.keyboard.press("Escape");
  await expect(notices(page)).toHaveCount(0);

  // The Teacher publishes while the Student's page is open: the bell counts it without a reload
  const teacherPage = await openAs(browser, teacher.email, teacher.password);
  await publishExam(teacherPage);
  await expect(bell(page)).toHaveAccessibleName("Abrir notificaciones, 2 sin leer");
  await bell(page).click();
  const published = notices(page).getByRole("button", { name: /Nueva evaluación: Examen parcial/ });
  await expect(published).toContainText("Matemática · Grupo 1ro A");

  // Opening a notice goes to what it is about and marks it as read
  await published.click();
  await expect(page).toHaveURL("/es/progress");
  await expect(page.getByRole("article", { name: "Matemática" })).toContainText("Examen parcial");
  await expect(bell(page)).toHaveAccessibleName("Abrir notificaciones, 1 sin leer");
  await bell(page).click();
  await notices(page).getByRole("button", { name: "Marcar todas como leídas" }).click();
  await expect(bell(page)).toHaveAccessibleName("Abrir notificaciones");
  await expect(notices(page).getByRole("listitem")).toHaveCount(2);

  // Her Guardian was told too, about her by name, and the notice opens the portal on her, not on the first ward
  const guardianPage = await openAs(browser, guardian.email, guardian.password);
  await expect(guardianPage.getByRole("tab", { name: /Ada Byron/ })).toHaveAttribute("aria-selected", "true");
  await bell(guardianPage).click();
  const forWard = notices(guardianPage).getByRole("button", { name: /Nueva evaluación para Grace Hopper/ });
  await expect(forWard).toContainText("Examen parcial · Matemática");
  await forWard.click();
  await expect(guardianPage).toHaveURL(`/es/guardian?ward=${student.membershipId}`);
  await expect(guardianPage.getByRole("tab", { name: /Grace Hopper/ })).toHaveAttribute("aria-selected", "true");
  await expect(guardianPage.getByRole("tabpanel", { name: "Grace Hopper" })).toBeVisible();
  // The tabs still work, and the address follows them
  await guardianPage.getByRole("tab", { name: /Ada Byron/ }).click();
  await expect(guardianPage.getByRole("tabpanel", { name: "Ada Byron" })).toBeVisible();
  await expect(guardianPage).toHaveURL(`/es/guardian?ward=${ada.membershipId}`);
  await guardianPage.context().close();

  // The Teacher who published is told nothing about their own evaluation
  await teacherPage.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(teacherPage.getByRole("region", { name: "Mis clases" })).toBeVisible();
  await bell(teacherPage).click();
  await expect(notices(teacherPage)).not.toContainText("Nueva evaluación");
  await teacherPage.context().close();
  await institution.dispose();
});

test("a Student and a Teacher write to each other, live", async ({ page, browser, playwright }) => {
  test.setTimeout(90_000);
  const { institution, teacher, student } = await createCourse(playwright);
  const teacherPage = await openAs(browser, teacher.email, teacher.password);
  await expect(teacherPage.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");
  await bell(teacherPage).click();
  await notices(teacherPage).getByRole("button", { name: "Marcar todas como leídas" }).click();
  await teacherPage.keyboard.press("Escape");

  // The Student finds the Teacher by name and writes
  await signIn(page, student.email, student.password);
  await page.getByRole("link", { name: "Mensajes" }).click();
  await expect(page).toHaveURL("/es/messages");
  await expect(page.getByRole("navigation", { name: "Conversaciones" })).toContainText("Todavía no tienes conversaciones");
  await page.getByLabel("Buscar personas").fill("turing");
  const found = page.getByRole("list", { name: "Personas encontradas" });
  await expect(found.getByRole("listitem")).toHaveCount(1);
  await expect(found).toContainText("Docente");
  await found.getByRole("button", { name: /Alan Turing/ }).click();
  await expect(page).toHaveURL(/\/es\/messages\?with=[0-9a-f-]{36}$/);
  const thread = page.getByRole("log", { name: "Conversación con Alan Turing" });
  await expect(thread).toContainText("Todavía no hay mensajes.");
  const draft = page.getByRole("form", { name: "Escribir a Alan Turing" }).getByLabel("Tu mensaje");
  await draft.fill("Profesor, ¿puede revisar mi nota?");
  await draft.press("Enter");
  await expect(thread).toContainText("Profesor, ¿puede revisar mi nota?");
  await expect(draft).toHaveValue("");

  // The Teacher, on another page, gets a notice at once; it opens the conversation
  await expect(bell(teacherPage)).toHaveAccessibleName("Abrir notificaciones, 1 sin leer");
  await bell(teacherPage).click();
  await notices(teacherPage).getByRole("button", { name: /Nuevo mensaje de Grace Hopper/ }).click();
  await expect(teacherPage).toHaveURL(/\/es\/messages\?with=[0-9a-f-]{36}$/);
  const teacherThread = teacherPage.getByRole("log", { name: "Conversación con Grace Hopper" });
  await expect(teacherThread).toContainText("Profesor, ¿puede revisar mi nota?");
  await expect(bell(teacherPage)).toHaveAccessibleName("Abrir notificaciones");

  // The reply reaches the Student's open conversation without a reload, and with no notice
  const reply = teacherPage.getByRole("form", { name: "Escribir a Grace Hopper" }).getByLabel("Tu mensaje");
  await reply.fill("Claro, la reviso hoy.");
  await teacherPage.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(teacherThread).toContainText("Claro, la reviso hoy.");
  await expect(thread).toContainText("Claro, la reviso hoy.");
  await expect(bell(page)).toHaveAccessibleName(/^Abrir notificaciones(, 1 sin leer)?$/);
  await bell(page).click();
  await expect(notices(page)).not.toContainText("Nuevo mensaje");
  await page.keyboard.press("Escape");

  // The conversation is still there after a reload, in order
  await page.reload();
  await expect(thread).toContainText("Profesor, ¿puede revisar mi nota?");
  await expect(thread).toContainText("Claro, la reviso hoy.");
  await expect(page.getByRole("navigation", { name: "Conversaciones" }).getByRole("button")).toContainText([
    "Alan Turing",
  ]);
  await teacherPage.context().close();
  await institution.dispose();
});

test("people of another institution cannot be found or written to", async ({ page, playwright }) => {
  const { institution, student } = await createCourse(playwright);
  const elsewhere = await createCourse(playwright);
  await signIn(page, student.email, student.password);
  await page.getByRole("link", { name: "Mensajes" }).click();

  // Both institutions have an Alan Turing; only the one of this institution is found
  await page.getByLabel("Buscar personas").fill("Alan");
  await expect(page.getByRole("list", { name: "Personas encontradas" }).getByRole("listitem")).toHaveCount(1);

  // Naming someone of the other institution in the address opens nothing
  const stranger = elsewhere.teacher.membershipId;
  await page.goto(`/es/messages?with=${stranger}`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Esa persona no es miembro de esta institución.");
  await expect(page.getByRole("form", { name: /^Escribir a/ })).toHaveCount(0);
  await institution.dispose();
  await elsewhere.institution.dispose();
});

test("a Student finds only their Teachers and group mates; the office finds everyone", async ({
  page,
  browser,
  playwright,
}) => {
  const { institution, student, teacher } = await createCourse(playwright);
  const found = (who: Page) => who.getByRole("list", { name: "Personas encontradas" });

  // Linus Pauling is a Student of the institution, but shares no group with Grace
  await signIn(page, student.email, student.password);
  await page.getByRole("link", { name: "Mensajes" }).click();
  await page.getByLabel("Buscar personas").fill("Pauling");
  await expect(found(page)).toContainText("No se encontró a nadie con ese nombre.");
  await page.getByLabel("Buscar personas").fill("Directora");
  await expect(found(page)).toContainText("No se encontró a nadie con ese nombre.");
  await page.getByLabel("Buscar personas").fill("Turing");
  await expect(found(page).getByRole("button", { name: /Alan Turing/ })).toBeVisible();

  // The Teacher reaches the office, but not a Student who is not theirs
  const teacherPage = await openAs(browser, teacher.email, teacher.password);
  await teacherPage.getByRole("link", { name: "Mensajes" }).click();
  await teacherPage.getByLabel("Buscar personas").fill("Pauling");
  await expect(found(teacherPage)).toContainText("No se encontró a nadie con ese nombre.");
  await teacherPage.getByLabel("Buscar personas").fill("Directora");
  await expect(found(teacherPage).getByRole("button", { name: /Directora Prueba/ })).toBeVisible();
  await teacherPage.context().close();

  // The Institution Admin reaches anyone, and the Student may then answer
  const adminPage = await openAs(browser, institution.admin.email, institution.admin.password);
  await adminPage.getByRole("link", { name: "Mensajes" }).click();
  await adminPage.getByLabel("Buscar personas").fill("Grace");
  await found(adminPage).getByRole("button", { name: /Grace Hopper/ }).click();
  const note = adminPage.getByRole("form", { name: "Escribir a Grace Hopper" }).getByLabel("Tu mensaje");
  await note.fill("Pasa por la oficina, por favor.");
  await note.press("Enter");
  await expect(adminPage.getByRole("log", { name: "Conversación con Grace Hopper" })).toContainText("Pasa por la oficina");
  await adminPage.context().close();

  await page.getByRole("navigation", { name: "Conversaciones" }).getByRole("button", { name: /Directora Prueba/ }).click();
  const answer = page.getByRole("form", { name: "Escribir a Directora Prueba" }).getByLabel("Tu mensaje");
  await answer.fill("Voy enseguida.");
  await answer.press("Enter");
  await expect(page.getByRole("log", { name: "Conversación con Directora Prueba" })).toContainText("Voy enseguida.");
  await institution.dispose();
});

test("a Teacher exports the gradebook as a CSV file", async ({ page, playwright }) => {
  const { institution, teacher } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  await publishExam(page);
  const gradebook = page.getByRole("region", { name: "Libro de notas" });
  await gradebook.getByLabel("Nota de Grace Hopper en Examen parcial").fill("15,5");
  await gradebook.getByRole("button", { name: "Guardar notas" }).click();
  await expect(gradebook.getByRole("status")).toHaveText("Notas guardadas.");

  const downloading = page.waitForEvent("download");
  await gradebook.getByRole("button", { name: "Exportar a CSV" }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe("Notas Matemática 1ro A.csv");
  const csv = await readFile(await download.path(), "utf8");
  expect(csv.replace("﻿", "").split("\r\n")).toEqual([
    "Apellidos;Nombres;Examen parcial (60%, sobre 20);Promedio (%);Evaluado (% de la materia)",
    "Hopper;Grace;15,5;77,5;60",
    "",
  ]);
  await institution.dispose();
});

test("the admin dashboard has the bell and the way to messages too", async ({ page, playwright }) => {
  const { institution } = await createCourse(playwright);
  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL("/es/admin");

  await bell(page).click();
  await expect(notices(page)).toContainText("No tienes notificaciones.");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Mensajes" }).click();
  await expect(page).toHaveURL("/es/messages");
  await page.getByLabel("Buscar personas").fill("grace hop");
  await expect(page.getByRole("list", { name: "Personas encontradas" })).toContainText("Estudiante");
  await institution.dispose();
});

test("on a phone nothing covers the field to write a message", async ({ browser, playwright }) => {
  const { institution, student } = await createCourse(playwright);
  const context = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: "es-ES" });
  const page = await context.newPage();
  await signIn(page, student.email, student.password);
  await page.getByRole("link", { name: "Mensajes" }).click();
  await page.getByLabel("Buscar personas").fill("turing");
  await page.getByRole("button", { name: /Alan Turing/ }).click();

  // The assistant's floating button stays out of this screen, which has a chat of its own
  await expect(page.getByRole("button", { name: "Abrir asistente de IA" })).toHaveCount(0);
  const draft = page.getByLabel("Tu mensaje");
  await draft.fill("Hola");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByRole("log", { name: "Conversación con Alan Turing" })).toContainText("Hola");

  // One pane at a time: the list comes back with the arrow
  await page.getByRole("button", { name: "Volver a las conversaciones" }).click();
  await expect(page.getByRole("navigation", { name: "Conversaciones" })).toContainText("Alan Turing");
  await context.close();
  await institution.dispose();
});

test("a Teacher takes the roll of a class given without video, and the Guardian hears of the absence", async ({
  page,
  browser,
  playwright,
}) => {
  const { institution, teacher, student } = await createCourse(playwright);
  const guardian = await institution.registerActive("GUARDIAN", { firstName: "Gina", lastName: "Rometty" });
  await institution.apiPut("/guardian-links", {
    studentMembershipId: student.membershipId,
    guardianMembershipId: guardian.membershipId,
    relationship: "MOTHER",
  });

  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("link", { name: "Asistencia de Matemática" }).click();
  await expect(page).toHaveURL(/\/es\/courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/attendance$/);
  await expect(page.getByRole("heading", { name: "Asistencia de Matemática" })).toBeVisible();
  const classes = page.getByRole("region", { name: "Clases" });
  await expect(classes).toContainText("Todavía no hay clases en esta materia.");

  // The class was given in the classroom: it is recorded, and its roll opens
  await page.getByRole("form", { name: "Registrar una clase sin video" }).getByRole("button", { name: "Registrar clase" }).click();
  const recorded = classes.getByRole("button", { name: /^Clase del / });
  await expect(recorded).toHaveCount(1);
  await expect(recorded).toHaveAttribute("aria-pressed", "true");
  await expect(recorded).toContainText("Sin asistencia");
  const roll = page.getByRole("form", { name: /^Lista del / });
  const grace = roll.getByRole("radiogroup", { name: "Grace Hopper" });
  const save = roll.getByRole("button", { name: "Guardar asistencia" });
  await expect(grace.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(save).toBeDisabled();

  await roll.getByRole("button", { name: "Marcar al resto como presentes" }).click();
  await expect(grace.getByRole("radio", { name: "Presente" })).toBeChecked();
  await grace.getByRole("radio", { name: "Ausente" }).check();
  await save.click();
  await expect(roll.getByRole("status")).toHaveText("Asistencia guardada.");
  await expect(recorded).toContainText("1 con asistencia");
  await expect(save).toBeDisabled();

  // It was stored, not just drawn
  await page.reload();
  await expect(
    page.getByRole("form", { name: /^Lista del / }).getByRole("radiogroup", { name: "Grace Hopper" }).getByRole("radio", { name: "Ausente" }),
  ).toBeChecked();

  // Her Guardian is told, and the notice opens the portal on her
  const guardianPage = await openAs(browser, guardian.email, guardian.password);
  await expect(guardianPage.getByRole("tab", { name: /Grace Hopper/ })).toBeVisible();
  await bell(guardianPage).click();
  const notice = notices(guardianPage).getByRole("button", { name: /Grace Hopper no asistió a clase/ });
  await expect(notice).toContainText("Matemática");
  await notice.click();
  await expect(guardianPage).toHaveURL(`/es/guardian?ward=${student.membershipId}`);
  await guardianPage.context().close();
  await institution.dispose();
});
