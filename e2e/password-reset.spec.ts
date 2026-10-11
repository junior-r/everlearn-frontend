import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { createCourse, formError, PASSWORD, signIn } from "./support";

// Needs the API (`docker compose up -d postgres redis ocr-server backend`) started with
// EMAIL_LOG_BODIES=true, as docker-compose.yml does: with no real email service in
// development, the reset link is read from the backend's log, where a developer finds it too.
const NEW_PASSWORD = "e2e-reset-password";

/** The reset link the backend "emailed" to an address, taken from its log. */
async function resetLinkFor(email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      () => {
        const log = execSync("docker compose logs backend --since 3m --no-color", { cwd: "..", encoding: "utf8" });
        const body = log.split(`Body of the email to ${email}:`).at(-1) ?? "";
        link = log.includes(`Body of the email to ${email}:`)
          ? /http:\/\/\S+\/reset-password#token=[\w-]+/.exec(body)?.[0]
          : undefined;
        return link;
      },
      { message: `a reset email for ${email} in the backend log` },
    )
    .toBeDefined();
  return link ?? "";
}

test("a member who forgot their password chooses a new one from the emailed link", async ({ page, playwright }) => {
  test.setTimeout(60_000);
  const { institution, student } = await createCourse(playwright);

  await page.goto("/es/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL("/es/forgot-password");
  const request = page.getByRole("form", { name: "Restablecer contraseña" });
  await request.getByLabel("Correo electrónico").fill(student.email);
  await request.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toContainText("Si ese correo tiene una cuenta, te enviamos un enlace");

  // The link opens the screen to choose the password, in the language it was asked from
  const link = await resetLinkFor(student.email);
  expect(link).toContain("/es/reset-password#token=");
  await page.goto(link);
  const form = page.getByRole("form", { name: "Elige una contraseña nueva" });
  await form.getByLabel("Nueva contraseña", { exact: true }).fill(NEW_PASSWORD);
  await form.getByLabel("Repite la nueva contraseña").fill("otra-distinta");
  await form.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(formError(page)).toContainText("no coinciden");
  await form.getByLabel("Repite la nueva contraseña").fill(NEW_PASSWORD);
  await form.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("status")).toContainText("Tu contraseña fue actualizada.");

  // The old password is gone, the new one works
  await page.getByRole("link", { name: "Volver a iniciar sesión" }).click();
  await signIn(page, student.email, PASSWORD);
  await expect(formError(page)).toContainText("El correo o la contraseña no son correctos.");
  await signIn(page, student.email, NEW_PASSWORD);
  await expect(page.getByRole("region", { name: "Mis clases" })).toContainText("Matemática");

  // The link worked once
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/es/login");
  await page.goto(link);
  await page.reload();
  const again = page.getByRole("form", { name: "Elige una contraseña nueva" });
  await again.getByLabel("Nueva contraseña", { exact: true }).fill("una-tercera-clave");
  await again.getByLabel("Repite la nueva contraseña").fill("una-tercera-clave");
  await again.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(formError(page)).toContainText("Este enlace ya no es válido. Pide uno nuevo.");
  await institution.dispose();
});

test("asking for a reset says the same for an address nobody has", async ({ page }) => {
  await page.goto("/es/forgot-password");
  const request = page.getByRole("form", { name: "Restablecer contraseña" });
  await request.getByLabel("Correo electrónico").fill(`nadie-${Date.now()}@example.com`);
  await request.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(page.getByRole("status")).toContainText("Si ese correo tiene una cuenta, te enviamos un enlace");
});

test("the reset screen without a link explains itself and offers a new one", async ({ page }) => {
  await page.goto("/es/reset-password");

  await expect(formError(page)).toContainText("Este enlace no es válido.");
  await expect(page.getByRole("form", { name: "Elige una contraseña nueva" })).toHaveCount(0);
  await page.getByRole("link", { name: "Pedir un enlace nuevo" }).click();
  await expect(page).toHaveURL("/es/forgot-password");
});
