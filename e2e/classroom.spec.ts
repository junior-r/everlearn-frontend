import { expect, test, type Browser, type Page } from "@playwright/test";
import { API_URL, createCourse, signIn } from "./support";

// Needs the whole stack: `docker compose up -d postgres redis livekit ocr-server video-server backend`
test.describe.configure({ mode: "serial" });

/** A second person: their own browser context, so their session and devices are separate. */
async function openAs(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext({ locale: "es-ES", permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}

const participants = (page: Page) => page.getByRole("list", { name: "Participantes" });
const chatForm = (page: Page) => page.getByRole("form", { name: "Chat de la clase" });
const chatLog = (page: Page) => page.getByRole("log", { name: "Chat de la clase" });

async function say(page: Page, message: string) {
  await chatForm(page).getByLabel("Mensaje").fill(message);
  await chatForm(page).getByRole("button", { name: "Enviar" }).click();
}

test("a Teacher starts a class, a Student joins, and they share video, chat and captions", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(120_000);
  const { institution, teacher, student } = await createCourse(playwright);

  // The Student sees the subject, but there is no class to enter yet
  const studentPage = await openAs(browser, student.email, student.password);
  const studentClasses = studentPage.getByRole("region", { name: "Mis clases" });
  await expect(studentClasses).toContainText("Matemática");
  await expect(studentClasses).toContainText("Docente: Alan Turing");
  await expect(studentClasses).toContainText("Sin clase en curso");

  // The Teacher starts the class and lands in the room, on air
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("button", { name: "Iniciar clase de Matemática" }).click();
  await expect(page).toHaveURL(/\/es\/class\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Matemática · 1ro A" })).toBeVisible();
  await expect(participants(page).getByRole("listitem", { name: "Alan Turing (tú)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Silenciar micrófono" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apagar cámara" })).toBeVisible();

  // The class shows up for the Student without reloading, and they enter muted
  await studentPage.getByRole("link", { name: "Entrar a la clase de Matemática" }).click({ timeout: 30_000 });
  await expect(studentPage.getByRole("heading", { name: "Matemática · 1ro A" })).toBeVisible();
  await expect(studentPage.getByRole("button", { name: "Activar micrófono" })).toBeVisible();
  await expect(participants(studentPage).getByRole("listitem")).toHaveCount(2);
  await expect(participants(page).getByRole("listitem", { name: "Grace Hopper, micrófono silenciado" })).toBeVisible();

  // The Student really receives the Teacher's camera
  const teacherVideo = participants(studentPage).getByRole("listitem", { name: "Alan Turing" }).locator("video");
  await expect.poll(() => teacherVideo.evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0);

  // Chat reaches both, each seeing who wrote
  await say(studentPage, "¿Puede repetir el ejemplo?");
  await expect(chatLog(page)).toContainText("Grace Hopper");
  await expect(chatLog(page)).toContainText("¿Puede repetir el ejemplo?");
  await expect(chatLog(studentPage)).toContainText("Tú");
  await say(page, "Claro, lo repito.");
  await expect(chatLog(studentPage)).toContainText("Alan Turing");
  await expect(chatLog(studentPage)).toContainText("Claro, lo repito.");
  await expect(chatForm(page).getByLabel("Mensaje")).toHaveValue("");

  // The Teacher's open microphone is transcribed (by the mock provider) and captioned for everyone
  const captions = studentPage.getByRole("region", { name: "Subtítulos en vivo" });
  await expect(captions).toContainText("Alan Turing: Transcripción simulada", { timeout: 30_000 });

  // Leaving takes the Student home and off the Teacher's grid
  await studentPage.getByRole("button", { name: "Salir de la clase" }).click();
  await expect(studentPage).toHaveURL("/es");
  await expect(participants(page).getByRole("listitem")).toHaveCount(1);
  await studentPage.context().close();
  await institution.dispose();
});

test("a Student who is not enrolled cannot enter, and the page says why", async ({ page, browser, playwright }) => {
  test.setTimeout(90_000);
  const { institution, teacher, outsider } = await createCourse(playwright);
  const teacherPage = await openAs(browser, teacher.email, teacher.password);
  await teacherPage.getByRole("button", { name: "Iniciar clase de Matemática" }).click();
  await expect(teacherPage).toHaveURL(/\/es\/class\/[0-9a-f-]{36}$/);
  const classUrl = new URL(teacherPage.url()).pathname;

  await signIn(page, outsider.email, outsider.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Todavía no tienes clases asignadas.");
  await page.goto(classUrl);

  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Solo el docente asignado y los estudiantes inscritos pueden entrar a esta clase.",
  );
  await expect(page.getByRole("list", { name: "Participantes" })).toHaveCount(0);

  // Nor can anyone post chat messages to the video-server without a room token
  const forged = await page.request.post("http://localhost:8080/chat", {
    headers: { Authorization: "Bearer not-a-token" },
    data: { content: "hola" },
  });
  expect(forged.status()).toBe(401);
  // And the internal API is closed to user sessions
  const internal = await page.request.post(
    `${API_URL}/internal/classroom/sessions/${classUrl.split("/").pop()}/finished`,
    { data: { endedAt: new Date().toISOString() } },
  );
  expect(internal.status()).toBe(401);

  await teacherPage.context().close();
  await institution.dispose();
});

test("a class that does not exist is reported, not left loading", async ({ page, playwright }) => {
  const { institution, teacher } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toBeVisible();

  await page.goto("/es/class/0199d3c2-7b1e-7c3a-9f41-2f6f5e0c1a11");

  await expect(page.getByRole("main").getByRole("alert")).toHaveText("No se encontró la clase.");
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL("/es");
  await institution.dispose();
});
