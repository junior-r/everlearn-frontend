import { expect, test } from "@playwright/test";
import { API_URL, chooseOwnPassword, createInstitution, formError, PASSWORD, signIn } from "./support";

test("a temporary password only lets the member choose their own, before anything else opens", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const student = await institution.registerWithTemporaryPassword("STUDENT");

  await signIn(page, student.email, student.password);
  await expect(page).toHaveURL("/es/change-password");
  await expect(page.getByRole("heading", { name: "Crea tu contraseña" })).toBeVisible();

  // Onboarding and the dashboard both lead straight back here
  for (const path of ["/es/onboarding", "/es/admin/members", "/es"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/es/change-password");
  }
  // The API refuses too, so the redirect is not the only thing in the way
  const blocked = await page.evaluate(async (apiUrl) => {
    const refreshed = await fetch(`${apiUrl}/auth/refresh`, { method: "POST", credentials: "include" });
    const { accessToken } = await refreshed.json();
    const response = await fetch(`${apiUrl}/onboarding/application`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { status: response.status, code: (await response.json()).code };
  }, API_URL);
  expect(blocked).toEqual({ status: 403, code: "PASSWORD_CHANGE_REQUIRED" });

  const form = page.getByRole("form", { name: "Cambiar contraseña" });
  await form.getByLabel("Contraseña temporal").fill(student.password);
  await form.getByLabel("Nueva contraseña", { exact: true }).fill(PASSWORD);
  await form.getByLabel("Repite la nueva contraseña").fill("something-else");
  await form.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(form.getByRole("alert")).toHaveText("Las contraseñas no coinciden.");

  await chooseOwnPassword(page, student.password);

  // Now the pending member reaches onboarding, and the temporary password is dead
  await expect(page).toHaveURL("/es/onboarding");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, student.email, student.password);
  await expect(formError(page)).toHaveText("El correo o la contraseña no son correctos.");
  await signIn(page, student.email, PASSWORD);
  await expect(page).toHaveURL("/es/onboarding");
  await institution.dispose();
});

test("a member of two institutions chooses one, and the choice decides what they can do", async ({
  page,
  playwright,
}) => {
  const school = await createInstitution(playwright);
  const academy = await createInstitution(playwright);
  // Institution Admin of the school, and also a Student at the academy
  await academy.addExisting(school.admin.email, "STUDENT");

  await signIn(page, school.admin.email, school.admin.password);
  await expect(page).toHaveURL("/es/select-institution");
  await expect(page.getByRole("heading", { name: "Elige una institución" })).toBeVisible();
  const schoolChoice = page.getByRole("button", { name: new RegExp(school.name) });
  const academyChoice = page.getByRole("button", { name: new RegExp(academy.name) });
  await expect(schoolChoice).toContainText("Administrador de institución");
  await expect(academyChoice).toContainText("Estudiante");

  // As a Student of the academy: the plain home page, and no dashboard
  await academyChoice.click();
  await expect(page).toHaveURL("/es");
  await expect(page.getByText(`Institución: ${academy.name}`)).toBeVisible();
  await page.goto("/es/admin/members");
  await expect(page).toHaveURL("/es");

  // The choice survives a reload
  await page.reload();
  await expect(page.getByText(`Institución: ${academy.name}`)).toBeVisible();

  // Switching to the school makes them its admin
  await page.getByRole("link", { name: "Cambiar de institución" }).click();
  await expect(page).toHaveURL("/es/select-institution");
  await page.getByRole("button", { name: new RegExp(school.name) }).click();
  await expect(page).toHaveURL("/es/admin/members");
  await expect(page.getByTestId("active-institution")).toHaveText(school.name);
  await expect(page.getByRole("row", { name: /Directora Prueba/ })).toBeVisible();

  // Signing out forgets the choice, so the next sign-in asks again
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, school.admin.email, school.admin.password);
  await expect(page).toHaveURL("/es/select-institution");
  await school.dispose();
  await academy.dispose();
});

test("a member of a single institution never sees the selector", async ({ page, playwright }) => {
  const institution = await createInstitution(playwright);
  const teacher = await institution.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });

  await signIn(page, teacher.email, teacher.password);

  await expect(page).toHaveURL("/es");
  await expect(page.getByText(`Institución: ${institution.name}`)).toBeVisible();
  await expect(page.getByText("Docente")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cambiar de institución" })).toHaveCount(0);
  await institution.dispose();
});

test("profile settings: change the password and offer the Google link to active members only", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  const teacher = await institution.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });
  await signIn(page, teacher.email, teacher.password);
  await page.getByRole("link", { name: "Configuración de perfil" }).click();
  await expect(page).toHaveURL("/es/settings");
  await expect(page.getByRole("region", { name: "Perfil" })).toContainText(teacher.email);

  // Google is not configured in this environment, so starting the link reports that instead of leaving the page
  const google = page.getByRole("region", { name: "Cuenta de Google" });
  await expect(google).toContainText("Vincula tu cuenta de Google");
  await google.getByRole("button", { name: "Vincular cuenta de Google" }).click();
  await expect(google.getByRole("alert")).toHaveText(
    "El inicio de sesión con Google no está disponible en este momento.",
  );

  const form = page.getByRole("form", { name: "Cambiar contraseña" });
  await form.getByLabel("Contraseña actual").fill("not-my-password");
  await form.getByLabel("Nueva contraseña", { exact: true }).fill("a-brand-new-password");
  await form.getByLabel("Repite la nueva contraseña").fill("a-brand-new-password");
  await form.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(form.getByRole("alert")).toHaveText("La contraseña actual no es correcta.");

  await form.getByLabel("Contraseña actual").fill(teacher.password);
  await form.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Tu contraseña fue actualizada.")).toBeVisible();

  // What the backend sends the browser back with after a failed or successful link
  await page.goto("/es/settings?error=GOOGLE_ACCOUNT_ALREADY_LINKED");
  await expect(page.getByRole("region", { name: "Cuenta de Google" }).getByRole("alert")).toHaveText(
    "Esa cuenta de Google ya está vinculada a un usuario.",
  );

  await page.getByRole("link", { name: "Volver" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, teacher.email, "a-brand-new-password");
  await expect(page).toHaveURL("/es");

  // A pending member is told to wait instead of being offered the link
  const pending = await institution.register("STUDENT");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, pending.email, pending.password);
  await expect(page).toHaveURL("/es/onboarding");
  await page.goto("/es/settings");
  await expect(page.getByRole("region", { name: "Cuenta de Google" })).toContainText(
    "Podrás vincular Google cuando tu institución active tu cuenta.",
  );
  await expect(page.getByRole("button", { name: "Vincular cuenta de Google" })).toHaveCount(0);
  await institution.dispose();
});

test("registering an email that already has an account adds the person instead of failing", async ({
  page,
  playwright,
}) => {
  const school = await createInstitution(playwright);
  const academy = await createInstitution(playwright);
  const teacher = await school.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });

  await signIn(page, academy.admin.email, academy.admin.password);
  await expect(page).toHaveURL("/es/admin/members");
  const form = page.getByRole("form", { name: "Registrar miembro" });
  await form.getByLabel("Nombres").fill("Otro Nombre");
  await form.getByLabel("Apellidos").fill("Distinto");
  await form.getByLabel("Correo electrónico").fill(teacher.email);
  await form.getByLabel("Rol").selectOption("STUDENT");
  await form.getByRole("button", { name: "Registrar" }).click();

  await expect(page.getByRole("heading", { name: "Miembro añadido" })).toBeVisible();
  await expect(page.getByText(/Alan Turing ya tenía una cuenta/)).toBeVisible();
  await expect(page.getByTestId("temporary-password")).toHaveCount(0);
  // Already verified by the school, so active here at once, under their real name
  const row = page.getByRole("row", { name: /Alan Turing/ });
  await expect(row).toContainText("Estudiante");
  await expect(row).toContainText("Activo");
  await school.dispose();
  await academy.dispose();
});
