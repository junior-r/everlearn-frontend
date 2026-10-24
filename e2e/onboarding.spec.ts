import { expect, test, type Page } from "@playwright/test";
import { API_URL, createInstitution, PASSWORD, signIn } from "./support";

type Institution = Awaited<ReturnType<typeof createInstitution>>;

/** Signs the Institution Admin in at the desk and opens the ID check of a pending member from the table. */
async function openCheck(page: Page, institution: Institution, name: string) {
  await signIn(page, institution.admin.email, institution.admin.password);
  await expect(page).toHaveURL("/es/admin");
  await page.goto("/es/admin/members");
  await page.getByRole("button", { name: `Verificar identidad de ${name}` }).click();
  return page.getByRole("region", { name: `Verificar la identidad de ${name}` });
}

async function waitForFrames(page: Page) {
  const video = page.getByTestId("camera-video");
  await expect(video).toBeVisible();
  // Wait for real frames, otherwise the capture would be empty
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);
}

// Chromium's fake camera (see playwright.config.ts) stands in for the desk's webcam
test("the desk photographs a member's ID, corrects the OCR data and the member is active at once", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  const check = await openCheck(page, institution, "Ada Lovelace");

  await check.getByLabel("Tipo de documento").selectOption("PASSPORT");
  await check.getByRole("button", { name: "Activar cámara" }).click();
  await waitForFrames(page);
  await check.getByRole("button", { name: "Tomar foto" }).click();

  const preview = check.getByAltText("Vista previa de la foto del documento");
  await expect(preview).toBeVisible();
  // The photo is cropped to the ID-card frame, so it must be card-shaped rather than 4:3
  const ratio = await preview.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight);
  expect(ratio).toBeCloseTo(85.6 / 53.98, 1);

  const upload = page.waitForResponse((response) => response.url().endsWith("/document"));
  await check.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(check.getByText("Analizando el documento…")).toBeVisible();
  expect((await upload).status()).toBe(200);

  // The fake camera shows no document, so the real OCR finds nothing: the form says so and is left blank
  await expect(check.getByRole("heading", { name: "Confirma los datos" })).toBeVisible();
  await expect(check.getByRole("alert")).toContainText("No pudimos leer el documento automáticamente");
  await expect(check.getByLabel("Nombres")).toHaveValue("");
  await check.getByLabel("Nombres").fill("Ada Augusta");
  await check.getByLabel("Apellidos").fill("Lovelace");
  await check.getByLabel("Número de documento").fill("87654321");
  await check.getByLabel("Fecha de nacimiento").fill("2008-03-14");
  await check.getByRole("button", { name: "Confirmar y activar" }).click();

  await expect(check.getByRole("heading", { name: "Ada Lovelace ya está activo" })).toBeVisible();
  await check.getByRole("button", { name: "Listo" }).click();
  // The account now carries the name from the ID, and the form is back for the next person
  await expect(page.getByRole("row", { name: /Ada Augusta Lovelace/ })).toContainText("Activo");
  await expect(page.getByRole("form", { name: "Registrar miembro" })).toBeVisible();

  // The member signs in to an active account, with nothing left to do about their ID
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, student.email, PASSWORD);
  await expect(page).toHaveURL("/es");
  await expect(page.getByRole("heading", { name: "Te damos la bienvenida, Ada Augusta" })).toBeVisible();
  await institution.dispose();
});

test("the OCR service reads a legible ID and prefills the form", async ({ page, context, playwright }) => {
  const institution = await createInstitution(playwright);
  await institution.register("STUDENT");
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

  const check = await openCheck(page, institution, "Ada Lovelace");
  await check.getByLabel("Subir una imagen").setInputFiles({ name: "cedula.png", mimeType: "image/png", buffer: photo });
  await check.getByRole("button", { name: "Usar esta foto" }).click();

  await expect(check.getByRole("heading", { name: "Confirma los datos" })).toBeVisible();
  await expect(check.getByLabel("Nombres")).toHaveValue("María Fernanda");
  await expect(check.getByLabel("Apellidos")).toHaveValue("González Pérez");
  await expect(check.getByLabel("Número de documento")).toHaveValue("V-12345678");
  // The birth date, not the later issue date
  await expect(check.getByLabel("Fecha de nacimiento")).toHaveValue("2008-03-14");
  await expect(check.getByText("No pudimos leer el documento automáticamente")).toHaveCount(0);
  await institution.dispose();
});

test("lets the desk retake the photo from the confirmation step", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  await institution.register("STUDENT");
  const check = await openCheck(page, institution, "Ada Lovelace");

  await check.getByRole("button", { name: "Activar cámara" }).click();
  await waitForFrames(page);
  await check.getByRole("button", { name: "Tomar foto" }).click();
  await check.getByRole("button", { name: "Repetir foto" }).click();
  await waitForFrames(page);
  await check.getByRole("button", { name: "Tomar foto" }).click();
  await check.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(check.getByRole("heading", { name: "Confirma los datos" })).toBeVisible();

  await check.getByRole("button", { name: "Volver a tomar la foto" }).click();

  await expect(check.getByRole("button", { name: "Activar cámara" })).toBeVisible();
  await institution.dispose();
});

test("falls back to uploading a file and rejects one that is not an image", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  await institution.register("TEACHER");
  const check = await openCheck(page, institution, "Ada Lovelace");

  await check.getByLabel("Subir una imagen").setInputFiles({
    name: "id.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("this is not really a JPEG"),
  });
  await check.getByRole("button", { name: "Usar esta foto" }).click();

  await expect(check.getByRole("alert")).toHaveText("La foto debe ser una imagen JPEG, PNG o WebP.");
  await expect(check.getByRole("button", { name: "Activar cámara" })).toBeVisible();
  await institution.dispose();
});

test("explains a blocked camera and still offers the upload", async ({ browser, playwright }) => {
  const context = await browser.newContext({ permissions: [], locale: "es-ES" });
  const page = await context.newPage();
  // Simulates the desk's browser refusing camera access
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
  });
  const institution = await createInstitution(playwright);
  await institution.register("STUDENT");
  const check = await openCheck(page, institution, "Ada Lovelace");

  await check.getByRole("button", { name: "Activar cámara" }).click();

  await expect(check.getByRole("alert")).toContainText("No pudimos acceder a la cámara");
  await expect(check.getByLabel("Subir una imagen")).toBeAttached();
  await context.close();
  await institution.dispose();
});

test("a check left for later stays pending and can be resumed from the table", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  await institution.register("STUDENT", { firstName: "Grace", lastName: "Hopper" });
  const check = await openCheck(page, institution, "Grace Hopper");

  await check.getByRole("button", { name: "Hacerlo más tarde" }).click();

  await expect(check).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Grace Hopper/ })).toContainText("Pendiente de verificación");
  await page.getByRole("button", { name: "Verificar identidad de Grace Hopper" }).click();
  await expect(page.getByRole("region", { name: "Verificar la identidad de Grace Hopper" })).toBeVisible();
  await institution.dispose();
});

test("a pending member is told to bring their ID to the institution, and can do nothing else", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  await signIn(page, student.email, student.password);

  await expect(page).toHaveURL("/es/onboarding");
  await expect(page.getByRole("heading", { name: "Presenta tu documento en tu institución" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar cámara" })).toHaveCount(0);
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es/onboarding");

  // Once the desk checks the ID, the next visit goes straight to the app
  await institution.checkIdentity(student.membershipId);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es");
  await page.goto("/es/onboarding");
  await expect(page).toHaveURL("/es");
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
    data: { email: institution.admin.email, password: institution.admin.password },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const desk = { Authorization: `Bearer ${accessToken}`, "x-institution-id": institution.institutionId };
  const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
  // Starts like a real JPEG, so only its size can be the reason it is refused
  oversized.set([0xff, 0xd8, 0xff, 0xe0]);

  const response = await api.post(`${API_URL}/onboarding/members/${student.membershipId}/document`, {
    headers: desk,
    multipart: {
      documentType: "NATIONAL_ID",
      file: { name: "id.jpg", mimeType: "image/jpeg", buffer: oversized },
    },
  });

  expect(response.status()).toBe(413);
  // Nothing was opened for the member: there is still nothing to confirm
  const confirm = await api.post(`${API_URL}/onboarding/members/${student.membershipId}/confirm`, {
    headers: desk,
    data: { firstName: "Ada", lastName: "Lovelace", documentType: "NATIONAL_ID", documentNumber: "1", birthDate: "2000-01-01" },
  });
  expect(confirm.status()).toBe(409);
  expect(((await confirm.json()) as { code: string }).code).toBe("NOTHING_TO_CONFIRM");
  await api.dispose();
  await institution.dispose();
});

test("a member cannot check their own ID", async ({ playwright }) => {
  const institution = await createInstitution(playwright);
  const student = await institution.register("STUDENT");
  const api = await playwright.request.newContext();
  const login = await api.post(`${API_URL}/auth/login`, { data: { email: student.email, password: student.password } });
  const { accessToken } = (await login.json()) as { accessToken: string };

  const response = await api.post(`${API_URL}/onboarding/members/${student.membershipId}/document`, {
    headers: { Authorization: `Bearer ${accessToken}`, "x-institution-id": institution.institutionId },
    multipart: {
      documentType: "NATIONAL_ID",
      file: { name: "id.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
    },
  });

  expect(response.status()).toBe(403);
  await api.dispose();
  await institution.dispose();
});
