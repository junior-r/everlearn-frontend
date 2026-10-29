import { readFile } from "node:fs/promises";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createCourse, signIn } from "./support";

// Needs the whole stack, Egress included: `docker compose up -d postgres redis livekit egress video-server backend`
test.describe.configure({ mode: "serial" });

async function openAs(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext({ locale: "es-ES", permissions: ["camera", "microphone"] });
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}

const controls = (page: Page) => page.getByRole("group", { name: "Controles de la clase" });
const recordingBadge = (page: Page) => page.getByRole("status").filter({ hasText: "Grabando" });

/** The handler types of the tracks in an MP4 file: `vide` for video, `soun` for sound. */
function trackKinds(file: Buffer): string[] {
  const kinds: string[] = [];
  for (let at = file.indexOf("hdlr"); at !== -1; at = file.indexOf("hdlr", at + 4)) {
    // hdlr box: type, version and flags (4 bytes), pre-defined (4 bytes), then the handler type
    kinds.push(file.subarray(at + 12, at + 16).toString("latin1"));
  }
  return kinds;
}

test("a Teacher records a class, and the group watches and downloads it with its sound", async ({
  page,
  browser,
  playwright,
}) => {
  test.setTimeout(240_000);
  const { institution, teacher, student } = await createCourse(playwright);

  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("button", { name: "Iniciar clase de Matemática" }).click();
  await expect(controls(page)).toBeVisible({ timeout: 30_000 });
  const studentPage = await openAs(browser, student.email, student.password);
  await studentPage.getByRole("link", { name: "Entrar a la clase de Matemática" }).click({ timeout: 30_000 });
  await expect(controls(studentPage)).toBeVisible({ timeout: 30_000 });

  // Only the Teacher is offered to record
  await expect(controls(studentPage).getByRole("button", { name: "Grabar la clase" })).toHaveCount(0);

  // Recording is announced to everyone in the room once Egress is filming it
  await controls(page).getByRole("button", { name: "Grabar la clase" }).click();
  await expect(recordingBadge(studentPage)).toBeVisible({ timeout: 60_000 });
  await expect(recordingBadge(page)).toBeVisible();
  await expect(controls(page).getByRole("button", { name: "Detener la grabación" })).toBeVisible();

  // A shared screen and the microphones go into the same file
  await page.getByRole("button", { name: "Compartir" }).click();
  const shareMenu = page.getByRole("menu", { name: "Compartir" });
  if (await shareMenu.isVisible()) {
    await shareMenu.getByRole("menuitem", { name: "Compartir pantalla" }).click();
  }
  await expect(studentPage.getByRole("list", { name: "Pantalla principal" })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(8_000);

  // Stopping asks first; keeping it on changes nothing
  await controls(page).getByRole("button", { name: "Detener la grabación" }).click();
  const stopDialog = page.getByRole("dialog", { name: "¿Detener la grabación?" });
  await stopDialog.getByRole("button", { name: "Seguir grabando" }).click();
  await expect(recordingBadge(studentPage)).toBeVisible();
  await controls(page).getByRole("button", { name: "Detener la grabación" }).click();
  await stopDialog.getByRole("button", { name: "Detener" }).click();
  await expect(recordingBadge(studentPage)).toHaveCount(0, { timeout: 30_000 });
  await expect(controls(page).getByRole("button", { name: "Grabar la clase" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Salir de la clase" }).click();
  await page
    .getByRole("dialog", { name: "¿Salir o finalizar la clase?" })
    .getByRole("button", { name: "Finalizar para todos" })
    .click();
  await expect(page).toHaveURL("/es");

  // The Student finds it in the course's recordings once the backend has stored it
  await studentPage.goto("/es");
  await studentPage.getByRole("link", { name: "Grabaciones de Matemática" }).click();
  await expect(studentPage.getByRole("heading", { name: "Grabaciones de Matemática" })).toBeVisible();
  const listed = studentPage.getByRole("button", { name: /^Grabación de la clase del/ });
  await expect(async () => {
    await studentPage.reload();
    await expect(listed).toHaveCount(1, { timeout: 2_000 });
  }).toPass({ timeout: 120_000 });
  await expect(listed).toContainText(/\d+(,\d)? MB/);

  // It plays in the page, with the length of what was recorded
  const player = studentPage.locator("video");
  await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.duration), { timeout: 20_000 }).toBeGreaterThan(5);

  // And downloads as an MP4 that holds both the picture and the sound
  const downloading = studentPage.waitForEvent("download");
  await studentPage.getByRole("button", { name: "Descargar video" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^Matematica-1ro-A-\d{4}-\d{2}-\d{2}\.mp4$/);
  const kinds = trackKinds(await readFile(await download.path()));
  expect(kinds).toContain("vide");
  expect(kinds).toContain("soun");

  // The Teacher has it too
  await page.getByRole("link", { name: "Grabaciones de Matemática" }).click();
  await expect(page.getByRole("button", { name: /^Grabación de la clase del/ })).toHaveCount(1);

  await studentPage.context().close();
  await institution.dispose();
});
