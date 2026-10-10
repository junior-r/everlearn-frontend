import { expect, test } from "@playwright/test";
import { createInstitution, formError, signIn } from "./support";

// Chromium's fake camera (see playwright.config.ts) stands in for the device webcam
test("photographs the ID, corrects the OCR data and submits it for review", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es/onboarding");

  await page.getByLabel("Tipo de documento").selectOption("PASSPORT");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  const video = page.getByTestId("camera-video");
  await expect(video).toBeVisible();
  // Wait for real frames, otherwise the capture would be empty
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Tomar foto" }).click();

  const preview = page.getByAltText("Vista previa de la foto de tu documento");
  await expect(preview).toBeVisible();
  // The photo is cropped to the ID-card frame, so it must be card-shaped rather than 4:3
  const ratio = await preview.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight);
  expect(ratio).toBeCloseTo(85.6 / 53.98, 1);

  const upload = page.waitForResponse((response) => response.url().endsWith("/onboarding/document"));
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByText("Analizando tu documento…")).toBeVisible();
  expect((await upload).status()).toBe(200);

  // The mocked OCR data is shown for confirmation
  await expect(page.getByRole("heading", { name: "Confirma tus datos" })).toBeVisible();
  await expect(page.getByLabel("Nombres")).toHaveValue("María Fernanda");
  await expect(page.getByLabel("Apellidos")).toHaveValue("González Pérez");
  await expect(page.getByLabel("Número de documento")).toHaveValue("12345678");
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("2008-03-14");

  // A reload resumes at the confirmation step instead of starting over
  await page.reload();
  await expect(page.getByLabel("Número de documento")).toHaveValue("12345678");

  await page.getByLabel("Número de documento").fill("87654321");
  await page.getByRole("button", { name: "Enviar para revisión" }).click();

  await expect(page.getByRole("heading", { name: "Solicitud enviada" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Solicitud enviada" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/es/login");
  await institution.dispose();
});

test("lets the applicant retake the photo from the confirmation step", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  await signIn(page, student.email, student.password);

  await page.getByRole("button", { name: "Activar cámara" }).click();
  const video = page.getByTestId("camera-video");
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Tomar foto" }).click();
  await page.getByRole("button", { name: "Repetir foto" }).click();
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Tomar foto" }).click();
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByRole("heading", { name: "Confirma tus datos" })).toBeVisible();

  await page.getByRole("button", { name: "Volver a tomar la foto" }).click();

  await expect(page.getByRole("button", { name: "Activar cámara" })).toBeVisible();
  await institution.dispose();
});

test("falls back to uploading a file and rejects one that is not an image", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const teacher = await institution.register("TEACHER");
  await signIn(page, teacher.email, teacher.password);
  await expect(page).toHaveURL("/es/onboarding");

  await page.getByLabel("Subir una imagen").setInputFiles({
    name: "id.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("this is not really a JPEG"),
  });
  await page.getByRole("button", { name: "Usar esta foto" }).click();

  await expect(formError(page)).toHaveText("La foto debe ser una imagen JPEG, PNG o WebP.");
  await expect(page.getByRole("button", { name: "Activar cámara" })).toBeVisible();
  await institution.dispose();
});

test("explains a blocked camera and still offers the upload", async ({ browser, playwright }) => {
  const context = await browser.newContext({ permissions: [], locale: "es-ES" });
  const page = await context.newPage();
  // Simulates the user (or the browser) refusing camera access
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  await signIn(page, student.email, student.password);

  await page.getByRole("button", { name: "Activar cámara" }).click();

  await expect(formError(page)).toContainText("No pudimos acceder a la cámara");
  await expect(page.getByLabel("Subir una imagen")).toBeAttached();
  await context.close();
  await institution.dispose();
});

test("requires signing in", async ({ page }) => {
  await page.goto("/es/onboarding");

  await expect(page).toHaveURL("/es/login");
});
