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

test("a Teacher has the assistant too, without access to data yet", async ({ page, playwright }) => {
  const { institution, teacher } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");
  await launcher(page).click();
  await expect(panel(page)).toContainText("Todavía no puedo consultar tus datos en la plataforma");

  await panel(page).getByRole("button", { name: "¿En qué puedes ayudarme?" }).click();
  await expect(conversation(page)).toContainText("Por ahora no tengo acceso a tus datos en la plataforma");
  await institution.dispose();
});
