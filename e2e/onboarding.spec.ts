import { expect, test } from "@playwright/test";
import { API_URL, createInstitution, formError, signIn } from "./support";

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

  // The fake camera shows no document, so the real OCR finds nothing: the form says so and is left blank
  await expect(page.getByRole("heading", { name: "Confirma tus datos" })).toBeVisible();
  await expect(formError(page)).toContainText("No pudimos leer tu documento automáticamente");
  await expect(page.getByLabel("Nombres")).toHaveValue("");
  await expect(page.getByLabel("Número de documento")).toHaveValue("");

  // A reload resumes at the confirmation step instead of starting over
  await page.reload();
  await expect(page.getByRole("heading", { name: "Confirma tus datos" })).toBeVisible();

  await page.getByLabel("Nombres").fill("Ada");
  await page.getByLabel("Apellidos").fill("Lovelace");
  await page.getByLabel("Número de documento").fill("87654321");
  await page.getByLabel("Fecha de nacimiento").fill("2008-03-14");
  await page.getByRole("button", { name: "Enviar para revisión" }).click();

  await expect(page.getByRole("heading", { name: "Solicitud enviada" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Solicitud enviada" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/es/login");
  await institution.dispose();
});

test("the OCR service reads a legible ID and prefills the form", async ({ page, context, playwright }) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  // A clean, flat ID card, the way a good photo of one looks
  const cardPage = await context.newPage();
  await cardPage.setContent(`
    <div id="card" style="width:1000px;padding:40px;background:#fff;color:#000;font:34px/1.9 Arial,sans-serif">
      <div>REPÚBLICA BOLIVARIANA DE VENEZUELA</div>
      <div>CÉDULA DE IDENTIDAD &nbsp; V 12.345.678</div>
      <div>APELLIDOS</div><div>GONZÁLEZ PÉREZ</div>
      <div>NOMBRES</div><div>MARÍA FERNANDA</div>
      <div>F. NACIMIENTO 14/03/2008</div>
      <div>F. EXPEDICIÓN 02/05/2022</div>
    </div>`);
  const photo = await cardPage.locator("#card").screenshot({ type: "png" });
  await cardPage.close();

  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es/onboarding");
  await page.getByLabel("Subir una imagen").setInputFiles({
    name: "cedula.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.getByRole("button", { name: "Usar esta foto" }).click();

  await expect(page.getByRole("heading", { name: "Confirma tus datos" })).toBeVisible();
  await expect(page.getByLabel("Nombres")).toHaveValue("María Fernanda");
  await expect(page.getByLabel("Apellidos")).toHaveValue("González Pérez");
  await expect(page.getByLabel("Número de documento")).toHaveValue("V-12345678");
  // The expiry-free birth date, not the later issue date
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("2008-03-14");
  await expect(page.getByText("No pudimos leer tu documento automáticamente")).toHaveCount(0);
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

test("the server refuses an ID photo over 5 MB and keeps serving", async ({ playwright }) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  const api = await playwright.request.newContext();
  const login = await api.post(`${API_URL}/auth/login`, {
    data: { email: student.email, password: student.password },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
  // Starts like a real JPEG, so only its size can be the reason it is refused
  oversized.set([0xff, 0xd8, 0xff, 0xe0]);

  const authorization = { Authorization: `Bearer ${accessToken}` };

  const response = await api.post(`${API_URL}/onboarding/document`, {
    headers: authorization,
    multipart: {
      documentType: "NATIONAL_ID",
      file: { name: "id.jpg", mimeType: "image/jpeg", buffer: oversized },
    },
  });

  expect(response.status()).toBe(413);
  const current = await api.get(`${API_URL}/onboarding/application`, { headers: authorization });
  expect(current.status()).toBe(200);
  expect(((await current.json()) as { application: unknown }).application).toBeNull();
  await api.dispose();
  await institution.dispose();
});
