import { expect, test, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { createInstitution, signIn } from "./support";

type Institution = Awaited<ReturnType<typeof createInstitution>>;

/** A group with two subjects, each taught by the same active Teacher, built through the API. */
async function createGroupWithTeacher(playwright: PlaywrightWorkerArgs["playwright"]) {
  const institution: Institution = await createInstitution(playwright);
  const teacher = await institution.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });
  const pensum = await institution.api<{ id: string }>("/pensums", { code: "BACH", name: "Bachillerato" });
  const period = await institution.api<{ id: string }>("/periods", {
    name: "2026-2027",
    startDate: "2026-09-15",
    endDate: "2027-07-15",
  });
  const subjects = [
    await institution.api<{ id: string }>("/subjects", { code: "MAT-1", name: "Matemática" }),
    await institution.api<{ id: string }>("/subjects", { code: "FIS-1", name: "Física" }),
  ];
  for (const subject of subjects) {
    await institution.apiPut(`/pensums/${pensum.id}/subjects/${subject.id}`, { level: 1, weeklyHours: 4 });
  }
  const group = await institution.api<{ id: string }>("/groups", {
    name: "1ro A",
    level: 1,
    pensumId: pensum.id,
    periodId: period.id,
  });
  for (const subject of subjects) {
    await institution.apiPut(`/groups/${group.id}/courses/${subject.id}`, {
      teacherMembershipId: teacher.membershipId,
    });
  }
  return { institution, teacher, period, group, subjects };
}

/** No Teacher is listed on the availability page: the admin searches for one. */
async function pickTeacher(page: Page) {
  const field = page.getByRole("combobox", { name: "Docente", exact: true });
  await field.fill("turing");
  await page.getByRole("option", { name: /Alan Turing/ }).click();
  await expect(field).toHaveValue("Alan Turing");
}

test("an Institution Admin sets a Teacher's weekly availability on the grid", async ({ page, playwright }) => {
  const { institution } = await createGroupWithTeacher(playwright);
  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Disponibilidad docente" }).click();
  await expect(page).toHaveURL("/es/admin/availability");
  await expect(page.getByLabel("Período")).toContainText("2026-2027");
  // Nothing is shown until a Teacher is found
  await expect(page.getByText("Busca un docente para ver y editar su disponibilidad.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar disponibilidad" })).toHaveCount(0);
  await pickTeacher(page);

  const save = page.getByRole("button", { name: "Guardar disponibilidad" });
  // Nothing to save until something changes
  await expect(save).toBeDisabled();
  await page.getByRole("button", { name: "Lunes 08:00, no disponible" }).click();
  await page.getByRole("button", { name: "Lunes 09:00, no disponible" }).click();
  await page.getByRole("button", { name: "Miércoles 14:00, no disponible" }).click();
  await expect(page.getByRole("button", { name: "Lunes 08:00, disponible" })).toHaveAttribute("aria-pressed", "true");
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Disponibilidad guardada.");

  // It was stored, not just drawn
  await page.reload();
  await pickTeacher(page);
  await expect(page.getByRole("button", { name: "Lunes 08:00, disponible" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lunes 09:00, disponible" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Miércoles 14:00, disponible" })).toBeVisible();
  await expect(page.getByRole("button", { name: /, disponible$/ })).toHaveCount(3);

  // Clicking an available hour takes it away again
  await page.getByRole("button", { name: "Miércoles 14:00, disponible" }).click();
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Disponibilidad guardada.");
  await page.reload();
  await pickTeacher(page);
  await expect(page.getByRole("button", { name: /, disponible$/ })).toHaveCount(2);
  await institution.dispose();
});

test("the schedule builder books a class and explains each kind of conflict", async ({ page, playwright }) => {
  const { institution, teacher, period } = await createGroupWithTeacher(playwright);
  // Available Monday 08:00 to 10:00 only
  await institution.apiPut(`/teachers/${teacher.membershipId}/availability`, {
    periodId: period.id,
    windows: [{ dayOfWeek: "MONDAY", startMinute: 480, endMinute: 600 }],
  });
  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Horarios" }).click();
  await expect(page).toHaveURL("/es/admin/schedule");
  await expect(page.getByLabel("Grupo")).toContainText("1ro A · 2026-2027");

  // Clicking a free hour opens the form prefilled with that hour
  await page.getByRole("button", { name: "Lunes 08:00, libre" }).click();
  const form = page.getByRole("form", { name: "Programar clase" });
  await expect(form.getByLabel("Día")).toHaveValue("MONDAY");
  await expect(form.getByLabel("Inicio")).toHaveValue("08:00");
  await expect(form.getByLabel("Fin")).toHaveValue("09:00");
  await form.getByLabel("Materia").selectOption({ label: "Matemática · Alan Turing" });
  await form.getByLabel("Aula").fill("A-12");
  await form.getByRole("button", { name: "Programar", exact: true }).click();

  await expect(form).toHaveCount(0);
  const table = page.getByRole("table", { name: "Horario de 1ro A" });
  await expect(table).toContainText("MAT-1 08:00–09:00");
  await expect(page.getByRole("button", { name: "Lunes 08:00, libre" })).toHaveCount(0);

  // Outside the teacher's availability: refused, and the form stays open to try another time
  await page.getByRole("button", { name: "Martes 08:00, libre" }).click();
  await form.getByLabel("Materia").selectOption({ label: "Física · Alan Turing" });
  await form.getByRole("button", { name: "Programar", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText("El docente no está disponible a esa hora.");

  // Overlapping the class the group already has
  await form.getByLabel("Día").selectOption("MONDAY");
  await form.getByLabel("Inicio").fill("08:30");
  await form.getByLabel("Fin").fill("09:30");
  await form.getByRole("button", { name: "Programar", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText("El grupo ya tiene una clase a esa hora.");

  // An end before the start never reaches the server
  await form.getByLabel("Inicio").fill("09:30");
  await form.getByLabel("Fin").fill("09:00");
  await form.getByRole("button", { name: "Programar", exact: true }).click();
  await expect(form.getByRole("alert")).toBeVisible();

  // Right after the first class, inside the availability: accepted
  await form.getByLabel("Inicio").fill("09:00");
  await form.getByLabel("Fin").fill("10:00");
  await form.getByRole("button", { name: "Programar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(table).toContainText("FIS-1 09:00–10:00");

  // Saved, not just drawn; and a class can be taken off again
  await page.reload();
  await expect(table).toContainText("MAT-1 08:00–09:00");
  await expect(table).toContainText("FIS-1 09:00–10:00");
  await page.getByRole("button", { name: "Quitar: Matemática, Lunes 08:00" }).click();
  await expect(table).not.toContainText("MAT-1");
  await expect(page.getByRole("button", { name: "Lunes 08:00, libre" })).toBeVisible();
  await institution.dispose();
});

test("a Teacher's availability cannot be cut from under a class already scheduled", async ({
  page,
  playwright,
}) => {
  const { institution, teacher, period, group, subjects } = await createGroupWithTeacher(playwright);
  await institution.apiPut(`/teachers/${teacher.membershipId}/availability`, {
    periodId: period.id,
    windows: [{ dayOfWeek: "MONDAY", startMinute: 480, endMinute: 600 }],
  });
  const scheduled = await institution.api<unknown[]>(`/groups/${group.id}/schedule`, {
    subjectId: subjects[0].id,
    dayOfWeek: "MONDAY",
    startMinute: 480,
    endMinute: 540,
  });
  expect(scheduled).toHaveLength(1);

  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Disponibilidad docente" }).click();
  await pickTeacher(page);
  await page.getByRole("button", { name: "Lunes 08:00, disponible" }).click();
  await page.getByRole("button", { name: "Guardar disponibilidad" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText("clases");
  await page.reload();
  await pickTeacher(page);
  await expect(page.getByRole("button", { name: "Lunes 08:00, disponible" })).toBeVisible();
  await institution.dispose();
});
