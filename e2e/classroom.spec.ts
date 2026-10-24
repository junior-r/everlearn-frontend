import { expect, test, type Browser, type Page } from "@playwright/test";
import { API_URL, VIDEO_SERVER_URL, createCourse, signIn } from "./support";

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

const leaveButton = (page: Page) => page.getByRole("button", { name: "Salir de la clase" });
const tileOf = (page: Page, name: string) => participants(page).getByRole("listitem", { name: new RegExp(name) });
const messageOf = (page: Page, content: string) => chatLog(page).getByRole("listitem").filter({ hasText: content });

/** Enters a class through the home screen, keeping the room access the backend issued. */
async function enterClass(page: Page, action: () => Promise<void>): Promise<{ token: string; identity: string }> {
  const access = page.waitForResponse((response) => /\/class-sessions\/[0-9a-f-]+\/token$/.test(response.url()));
  await action();
  await expect(page.getByRole("group", { name: "Controles de la clase" })).toBeVisible({ timeout: 30_000 });
  return (await (await access).json()) as { token: string; identity: string };
}

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

  // The Student zooms into the Teacher's camera; it is their own view, the Teacher's stays as it was
  const transformOf = (video: typeof teacherVideo) => video.evaluate((element) => getComputedStyle(element).transform);
  const zoomControls = studentPage.getByRole("group", { name: "Zoom de Alan Turing" });
  await participants(studentPage).getByRole("listitem", { name: "Alan Turing" }).hover();
  await zoomControls.getByRole("button", { name: "Acercar" }).click();
  await zoomControls.getByRole("button", { name: "Acercar" }).click();
  await expect(zoomControls.getByRole("button", { name: /Restablecer el zoom, ahora en 200/ })).toBeVisible();
  expect(await transformOf(teacherVideo)).toBe("matrix(2, 0, 0, 2, 0, 0)");
  const ownVideo = participants(page).getByRole("listitem", { name: "Alan Turing (tú)" }).locator("video");
  expect(await transformOf(ownVideo)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await zoomControls.getByRole("button", { name: "Alejar" }).click();
  await expect(zoomControls.getByRole("button", { name: /ahora en 150/ })).toBeVisible();
  await zoomControls.getByRole("button", { name: /Restablecer el zoom/ }).click();
  await expect.poll(() => transformOf(teacherVideo)).toBe("matrix(1, 0, 0, 1, 0, 0)");

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
  await leaveButton(studentPage).click();
  await studentPage.getByRole("dialog", { name: "¿Salir de la clase?" }).getByRole("button", { name: "Salir" }).click();
  await expect(studentPage).toHaveURL("/es");
  await expect(participants(page).getByRole("listitem")).toHaveCount(1);
  await studentPage.context().close();
  await institution.dispose();
});

test("hands, the Teacher's moderation, chat menus and ending the class for everyone", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(150_000);
  const { institution, teacher, student } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  const teacherAccess = await enterClass(page, () =>
    page.getByRole("button", { name: "Iniciar clase de Matemática" }).click(),
  );
  const studentPage = await openAs(browser, student.email, student.password);
  const studentAccess = await enterClass(studentPage, () =>
    studentPage.getByRole("link", { name: "Entrar a la clase de Matemática" }).click({ timeout: 30_000 }),
  );
  await expect(participants(page).getByRole("listitem")).toHaveCount(2);

  // A raised hand is seen by the whole class, and the Teacher lowers it from the Student's card
  await studentPage.getByRole("button", { name: "Levantar la mano" }).click();
  await expect(studentPage.getByRole("button", { name: "Bajar la mano" })).toBeVisible();
  await expect(tileOf(page, "Grace Hopper.*mano levantada")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 mano levantada" })).toBeVisible();
  await tileOf(page, "Grace Hopper").click({ button: "right" });
  const teacherMenu = page.getByRole("menu", { name: "Opciones de Grace Hopper" });
  await teacherMenu.getByRole("menuitem", { name: "Bajar la mano de Grace Hopper" }).click();
  await expect(studentPage.getByRole("button", { name: "Levantar la mano" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "mano levantada" })).toHaveCount(0);

  // Hands are taken in the order they went up: each tile shows its turn, and the Teacher's list keeps the queue
  await studentPage.getByRole("button", { name: "Levantar la mano" }).click();
  await expect(tileOf(page, "Grace Hopper.*turno 1")).toBeVisible();
  await page.getByRole("button", { name: "Levantar la mano" }).click();
  await expect(tileOf(page, "Alan Turing \\(tú\\).*turno 2")).toBeVisible();
  await expect(tileOf(studentPage, "Alan Turing.*turno 2")).toBeVisible();
  await page.getByRole("button", { name: "2 manos levantadas" }).click();
  const queue = page.getByRole("region", { name: "Manos levantadas, en orden" });
  await expect(queue.getByRole("listitem")).toHaveText([/Grace Hopper/, /Alan Turing \(tú\)/]);
  // The Teacher lowers others' hands from the list; their own goes down from their controls
  await expect(queue.getByRole("button", { name: /^Bajar la mano de/ })).toHaveCount(1);
  await queue.getByRole("button", { name: "Bajar la mano de Grace Hopper" }).click();
  await expect(studentPage.getByRole("button", { name: "Levantar la mano" })).toBeVisible();
  await expect(tileOf(studentPage, "Alan Turing.*turno 1")).toBeVisible();
  await expect(queue.getByRole("listitem")).toHaveText([/Alan Turing \(tú\)/]);
  await page.getByRole("button", { name: "Bajar la mano" }).click();
  await expect(queue).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "mano levantada" })).toHaveCount(0);

  // Only the Teacher silences a Student, who can speak again afterwards
  await studentPage.getByRole("button", { name: "Activar micrófono" }).click();
  await expect(studentPage.getByRole("button", { name: "Silenciar micrófono" })).toBeVisible();
  await expect(tileOf(page, "micrófono silenciado")).toHaveCount(0);
  await tileOf(page, "Grace Hopper").getByRole("button", { name: "Opciones de Grace Hopper" }).click();
  await teacherMenu.getByRole("menuitem", { name: "Silenciar a Grace Hopper" }).click();
  await expect(studentPage.getByRole("button", { name: "Activar micrófono" })).toBeVisible();
  await expect(tileOf(page, "Grace Hopper, micrófono silenciado")).toBeVisible();

  // A Student's menu on someone else's card only pins it; the video-server refuses the rest
  await tileOf(studentPage, "Alan Turing").click({ button: "right" });
  const studentMenu = studentPage.getByRole("menu", { name: "Opciones de Alan Turing" });
  await expect(studentMenu.getByRole("menuitem")).toHaveText(["Fijar en pantalla"]);
  await studentMenu.getByRole("menuitem", { name: "Fijar en pantalla" }).click();
  const stage = studentPage.getByRole("list", { name: "Pantalla principal" });
  await expect(stage.getByRole("listitem", { name: /Alan Turing/ })).toBeVisible();
  await expect(participants(studentPage).getByRole("listitem")).toHaveCount(1);
  const asStudent = { Authorization: `Bearer ${studentAccess.token}` };
  for (const [path, data] of [
    ["/participants/mute", { identity: teacherAccess.identity }],
    ["/participants/lower-hand", { identity: teacherAccess.identity }],
    ["/class/end", {}],
  ] as const) {
    const refused = await studentPage.request.post(`${VIDEO_SERVER_URL}${path}`, { headers: asStudent, data });
    expect(refused.status(), path).toBe(403);
  }
  await expect(page.getByRole("button", { name: "Silenciar micrófono" })).toBeVisible();

  // A reader copies and replies; the author and the Teacher can also take a message down
  await say(studentPage, "Hola profe");
  await say(page, "Bienvenida a la clase");
  await expect(messageOf(studentPage, "Bienvenida a la clase")).toBeVisible();
  await messageOf(studentPage, "Bienvenida a la clase").click({ button: "right" });
  const readerMenu = studentPage.getByRole("menu", { name: "Opciones del mensaje de Alan Turing" });
  await expect(readerMenu.getByRole("menuitem")).toHaveText(["Copiar texto", "Responder"]);
  await readerMenu.getByRole("menuitem", { name: "Responder" }).click();
  await expect(chatForm(studentPage).getByLabel("Mensaje")).toHaveValue("@Alan Turing ");
  await expect(chatForm(studentPage).getByLabel("Mensaje")).toBeFocused();
  await messageOf(studentPage, "Hola profe").click({ button: "right" });
  const authorMenu = studentPage.getByRole("menu", { name: "Opciones de tu mensaje" });
  await expect(authorMenu.getByRole("menuitem")).toHaveText(["Copiar texto", "Eliminar para todos"]);
  await authorMenu.getByRole("menuitem", { name: "Eliminar para todos" }).click();
  await expect(chatLog(page)).not.toContainText("Hola profe");
  await expect(chatLog(studentPage)).not.toContainText("Hola profe");
  await expect(chatLog(page)).toContainText("Mensaje eliminado");

  // With the chat closed, new messages are counted on its button
  await page.getByRole("button", { name: "Cerrar el chat" }).first().click();
  await expect(chatLog(page)).toHaveCount(0);
  await chatForm(studentPage).getByLabel("Mensaje").fill("");
  await say(studentPage, "¿Me escucha?");
  await page.getByRole("button", { name: "Abrir el chat, 1 mensaje sin leer" }).click();
  await messageOf(page, "¿Me escucha?").getByRole("button", { name: "Opciones del mensaje de Grace Hopper" }).click();
  const moderatorMenu = page.getByRole("menu", { name: "Opciones del mensaje de Grace Hopper" });
  await expect(moderatorMenu.getByRole("menuitem")).toHaveText(["Copiar texto", "Responder", "Eliminar para todos"]);
  await moderatorMenu.getByRole("menuitem", { name: "Eliminar para todos" }).click();
  await expect(chatLog(studentPage)).not.toContainText("¿Me escucha?");

  // Leaving asks first, and can be called off
  await leaveButton(studentPage).click();
  const studentDialog = studentPage.getByRole("dialog", { name: "¿Salir de la clase?" });
  await studentDialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(studentDialog).toBeHidden();
  await expect(stage).toBeVisible();

  // The Teacher ends the class: it closes for the Student too, and can be started again
  await leaveButton(page).click();
  await page
    .getByRole("dialog", { name: "¿Salir o finalizar la clase?" })
    .getByRole("button", { name: "Finalizar para todos" })
    .click();
  await expect(page).toHaveURL("/es");
  await expect(studentPage.getByText("La clase terminó.")).toBeVisible();
  await expect(studentPage.getByRole("button", { name: "Volver a entrar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Iniciar clase de Matemática" })).toBeVisible({ timeout: 30_000 });

  await studentPage.context().close();
  await institution.dispose();
});

test("a Teacher who only leaves keeps the class open, and a shared screen takes the stage", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(120_000);
  const { institution, teacher, student } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  await enterClass(page, () => page.getByRole("button", { name: "Iniciar clase de Matemática" }).click());
  const studentPage = await openAs(browser, student.email, student.password);
  await enterClass(studentPage, () =>
    studentPage.getByRole("link", { name: "Entrar a la clase de Matemática" }).click({ timeout: 30_000 }),
  );

  // The Teacher sees their connected microphones and cameras, with the one in use marked
  await page.getByRole("button", { name: "Elegir cámara" }).click();
  const cameras = page.getByRole("menu", { name: "Elegir cámara" });
  await expect(cameras.getByRole("menuitem").first()).toBeVisible();
  await expect(cameras.locator('[aria-current="true"]')).toHaveCount(1);
  await cameras.getByRole("menuitem").last().click();
  await expect(cameras).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apagar cámara" })).toBeVisible();
  await page.getByRole("button", { name: "Elegir micrófono" }).click();
  await expect(page.getByRole("menu", { name: "Elegir micrófono" }).getByRole("menuitem").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  // The screen the Teacher shares is shown large to the Student, even over what they had pinned
  const stage = studentPage.getByRole("list", { name: "Pantalla principal" });
  await tileOf(studentPage, "Grace Hopper").click({ button: "right" });
  await studentPage.getByRole("menuitem", { name: "Fijar en pantalla" }).click();
  await expect(stage.getByRole("listitem", { name: /Grace Hopper/ })).toBeVisible();
  await page.getByRole("button", { name: "Compartir pantalla" }).click();
  await expect(page.getByRole("button", { name: "Dejar de compartir" })).toBeVisible();
  await expect(stage.getByRole("listitem", { name: "Pantalla de Alan Turing" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Pantalla principal" }).getByRole("listitem")).toHaveAccessibleName(
    "Pantalla de Alan Turing (tú)",
  );
  await expect(participants(studentPage).getByRole("listitem")).toHaveCount(2);
  // Stopping asks first: keeping the share leaves the screen on the stage
  await page.getByRole("button", { name: "Dejar de compartir" }).click();
  const stopScreen = page.getByRole("dialog", { name: "¿Dejar de compartir la pantalla?" });
  await stopScreen.getByRole("button", { name: "Seguir compartiendo" }).click();
  await expect(stopScreen).toBeHidden();
  await expect(stage.getByRole("listitem", { name: "Pantalla de Alan Turing" })).toBeVisible();
  await page.getByRole("button", { name: "Dejar de compartir" }).click();
  await stopScreen.getByRole("button", { name: "Dejar de compartir" }).click();
  // With the screen gone, everyone is back on the grid
  await expect(stage).toHaveCount(0);
  await expect(participants(studentPage).getByRole("listitem")).toHaveCount(2);
  // Sharing a screen is not a camera or microphone problem
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  // When the class cannot be ended, the Teacher is back in it, told so, and the Student never noticed
  await page.route(`${VIDEO_SERVER_URL}/class/end`, (route) => route.fulfill({ status: 502 }));
  await leaveButton(page).click();
  await page
    .getByRole("dialog", { name: "¿Salir o finalizar la clase?" })
    .getByRole("button", { name: "Finalizar para todos" })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "No se pudo completar la acción. Inténtalo de nuevo.",
  );
  await expect(page.getByRole("button", { name: "Apagar cámara" })).toBeVisible();
  await expect(participants(studentPage).getByRole("listitem")).toHaveCount(2);
  await page.unroute(`${VIDEO_SERVER_URL}/class/end`);

  await leaveButton(page).click();
  await page
    .getByRole("dialog", { name: "¿Salir o finalizar la clase?" })
    .getByRole("button", { name: "Solo salir" })
    .click();
  await expect(page).toHaveURL("/es");
  await expect(participants(studentPage).getByRole("listitem")).toHaveCount(1);
  await expect(studentPage.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Entrar a la clase de Matemática" })).toBeVisible();

  await studentPage.context().close();
  await institution.dispose();
});

test("a Student who joins late, or comes back, is shown the chat the class already had", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(120_000);
  const { institution, teacher, student } = await createCourse(playwright);
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("button", { name: "Iniciar clase de Matemática" }).click();
  await expect(page.getByRole("group", { name: "Controles de la clase" })).toBeVisible({ timeout: 30_000 });
  await say(page, "Dicho antes de que llegaras");
  await expect(messageOf(page, "Dicho antes de que llegaras")).toBeVisible();
  await say(page, "Esto se retira");
  await messageOf(page, "Esto se retira").click({ button: "right" });
  await page.getByRole("menu").getByRole("menuitem", { name: "Eliminar para todos" }).click();
  await expect(chatLog(page)).toContainText("Mensaje eliminado");

  const studentPage = await openAs(browser, student.email, student.password);
  await studentPage.getByRole("link", { name: "Entrar a la clase de Matemática" }).click({ timeout: 30_000 });
  await expect(messageOf(studentPage, "Dicho antes de que llegaras")).toBeVisible({ timeout: 15_000 });
  await expect(chatLog(studentPage)).toContainText("Mensaje eliminado");
  await expect(chatLog(studentPage)).not.toContainText("Esto se retira");

  // What is said live lands after the replay, and coming back keeps both in order
  await say(page, "Ya estás aquí");
  await expect(messageOf(studentPage, "Ya estás aquí")).toBeVisible();
  await studentPage.reload();
  await expect(chatLog(studentPage).getByRole("listitem")).toHaveCount(3, { timeout: 15_000 });
  await expect(chatLog(studentPage).getByRole("listitem").last()).toContainText("Ya estás aquí");

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
  const forged = await page.request.post(`${VIDEO_SERVER_URL}/chat`, {
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
