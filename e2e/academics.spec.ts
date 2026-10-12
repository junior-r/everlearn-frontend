import { expect, test } from "@playwright/test";
import { createInstitution, signIn } from "./support";

test("an Institution Admin builds a pensum by placing subjects at levels", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  await institution.api("/subjects", { code: "MAT-1", name: "Matemática" });
  await institution.api("/subjects", { code: "FIS-1", name: "Física" });
  await signIn(page, institution.admin.email, institution.admin.password);
  await page.getByRole("link", { name: "Pensums" }).click();
  await expect(page).toHaveURL("/es/admin/pensums");
  await expect(page.getByText("Esta institución aún no tiene pensums.")).toBeVisible();

  const newPensum = page.getByRole("form", { name: "Nuevo pensum" });
  await newPensum.getByLabel("Código").fill("bach");
  await newPensum.getByLabel("Nombre").fill("Bachillerato");
  await newPensum.getByRole("button", { name: "Crear" }).click();
  const pensumRow = page.getByRole("row", { name: /BACH/ });
  await expect(pensumRow).toContainText("Bachillerato");

  await pensumRow.getByRole("button", { name: /Gestionar/ }).click();
  const editor = page.getByRole("region", { name: "Materias de Bachillerato" });
  await expect(editor.getByText("Este pensum aún no tiene materias.")).toBeVisible();

  const addSubject = editor.getByRole("form", { name: "Añadir materia" });
  await addSubject.getByLabel("Materia").selectOption({ label: "MAT-1 · Matemática" });
  await addSubject.getByLabel("Nivel").fill("1");
  await addSubject.getByLabel("Horas semanales").fill("5");
  await addSubject.getByRole("button", { name: "Añadir" }).click();

  const placed = editor.getByRole("row", { name: /MAT-1/ });
  await expect(placed).toContainText("Matemática");
  await expect(placed.getByRole("cell").nth(3)).toHaveText("5");
  // A placed subject is no longer offered; the other one still is
  await expect(addSubject.getByLabel("Materia").locator("option")).toHaveText(["FIS-1 · Física"]);
  await expect(pensumRow.getByRole("cell").nth(3)).toHaveText("1");

  await addSubject.getByLabel("Nivel").fill("2");
  await addSubject.getByRole("button", { name: "Añadir" }).click();
  await expect(editor.getByRole("row", { name: /FIS-1/ })).toBeVisible();
  // With every subject placed there is nothing left to add
  await expect(addSubject).toHaveCount(0);

  await placed.getByRole("button", { name: /Quitar/ }).click();
  await expect(editor.getByRole("row", { name: /MAT-1/ })).toHaveCount(0);
  await expect(editor.getByRole("form", { name: "Añadir materia" })).toBeVisible();

  // The same code and version again is refused with a translated message
  await newPensum.getByLabel("Código").fill("BACH");
  await newPensum.getByLabel("Nombre").fill("Duplicado");
  await newPensum.getByRole("button", { name: "Crear" }).click();
  await expect(newPensum.getByRole("alert")).toHaveText(
    "Ya existe un pensum con ese código y versión.",
  );
  await institution.dispose();
});

test("an Institution Admin creates a group, assigns a Teacher to a subject and enrolls a Student", async ({
  page,
  playwright,
}) => {
  const institution = await createInstitution(playwright);
  await institution.api("/subjects", { code: "MAT-1", name: "Matemática" });
  await institution.api("/pensums", { code: "BACH", name: "Bachillerato" });
  const teacher = await institution.registerActive("TEACHER", { firstName: "Alan", lastName: "Turing" });
  const student = await institution.registerActive("STUDENT", { firstName: "Grace", lastName: "Hopper" });
  // Registered but not yet approved, so they must not be offered for enrollment
  await institution.register("STUDENT", { firstName: "Pendiente", lastName: "Todavia" });

  await signIn(page, institution.admin.email, institution.admin.password);
  // Place the subject through the pensum screen, as an admin would
  await page.getByRole("link", { name: "Pensums" }).click();
  await page.getByRole("row", { name: /BACH/ }).getByRole("button", { name: /Gestionar/ }).click();
  const addSubject = page.getByRole("form", { name: "Añadir materia" });
  await addSubject.getByLabel("Nivel").fill("1");
  await addSubject.getByLabel("Horas semanales").fill("5");
  await addSubject.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByRole("region", { name: "Materias de Bachillerato" }).getByRole("row", { name: /MAT-1/ })).toBeVisible();

  await page.getByRole("link", { name: "Grupos" }).click();
  await expect(page).toHaveURL("/es/admin/groups");
  // A group needs a period first
  await expect(page.getByText("Crea al menos un pensum y un período académico para poder crear grupos.")).toBeVisible();
  const newPeriod = page.getByRole("form", { name: "Nuevo período" });
  await newPeriod.getByLabel("Nombre del período").fill("2026-2027");
  await newPeriod.getByLabel("Inicio").fill("2026-09-15");
  await newPeriod.getByLabel("Fin").fill("2027-07-15");
  await newPeriod.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByRole("region", { name: "Períodos académicos" }).getByRole("row", { name: /2026-2027/ })).toBeVisible();

  const newGroup = page.getByRole("form", { name: "Nuevo grupo" });
  await newGroup.getByLabel("Nombre").fill("1ro A");
  await newGroup.getByLabel("Nivel").fill("1");
  await newGroup.getByLabel("Cupo").fill("1");
  await newGroup.getByRole("button", { name: "Crear" }).click();

  const groupRow = page.getByRole("row", { name: /1ro A/ });
  await expect(groupRow).toContainText("BACH v1");
  await expect(groupRow).toContainText("2026-2027");
  await expect(groupRow).toContainText("0 / 1");

  // The new group opens with the subjects of its pensum level, none assigned
  const courses = page.getByRole("region", { name: "Materias y docentes de 1ro A" });
  const mathRow = courses.getByRole("row", { name: /Matemática/ });
  await expect(mathRow).toContainText("Sin asignar");
  // Nobody is listed until a Teacher is searched for, and only active Teachers are found
  const assign = courses.getByRole("form", { name: "Asignar docente" });
  await expect(assign.getByRole("button", { name: "Asignar" })).toBeDisabled();
  const teacherField = assign.getByRole("combobox", { name: "Docente", exact: true });
  await teacherField.fill("todavia");
  await expect(assign.getByRole("status").filter({ visible: true })).toHaveText("Nadie coincide con la búsqueda.");
  await teacherField.fill("turing");
  // The subject select has options of its own, so the matches are read from the Teacher's list
  await expect(assign.getByRole("listbox", { name: "Docente" }).getByRole("option")).toHaveText([
    new RegExp(`Alan Turing.*${teacher.email}`),
  ]);
  await assign.getByRole("option", { name: /Alan Turing/ }).click();
  await expect(teacherField).toHaveValue("Alan Turing");
  await assign.getByRole("button", { name: "Asignar" }).click();
  await expect(mathRow).toContainText("Alan Turing");
  await expect(teacherField).toHaveValue("");

  const students = page.getByRole("region", { name: "Estudiantes de 1ro A" });
  await expect(students.getByText("Aún no hay estudiantes inscritos.")).toBeVisible();
  const enroll = students.getByRole("form", { name: "Inscribir estudiante" });
  const studentField = enroll.getByRole("combobox", { name: "Estudiante" });
  // The pending Student is not found; only the approved one
  await studentField.fill("pendiente");
  await expect(enroll.getByRole("status").filter({ visible: true })).toHaveText("Nadie coincide con la búsqueda.");
  await studentField.fill("hopper");
  await enroll.getByRole("option", { name: /Grace Hopper/ }).click();
  await enroll.getByRole("button", { name: "Inscribir" }).click();
  await expect(students.getByRole("row", { name: /Grace Hopper/ })).toContainText(student.email);
  await expect(groupRow).toContainText("1 / 1");
  // Whoever is already in the group is not offered again
  await studentField.fill("hopper");
  await expect(enroll.getByRole("status").filter({ visible: true })).toHaveText("Nadie coincide con la búsqueda.");

  // Everything was saved: a reload shows the same teacher and student
  await page.reload();
  await page.getByRole("row", { name: /1ro A/ }).getByRole("button", { name: /Gestionar/ }).click();
  const savedRow = page.getByRole("region", { name: "Materias y docentes de 1ro A" }).getByRole("row", { name: /Matemática/ });
  await expect(savedRow).toContainText("Alan Turing");
  await expect(page.getByRole("region", { name: "Estudiantes de 1ro A" }).getByRole("row", { name: /Grace Hopper/ })).toBeVisible();

  // The Teacher can be taken off the subject again
  await savedRow.getByRole("button", { name: "Quitar docente de Matemática" }).click();
  await expect(savedRow).toContainText("Sin asignar");

  await page.getByRole("region", { name: "Estudiantes de 1ro A" }).getByRole("button", { name: /Retirar/ }).click();
  await expect(page.getByRole("region", { name: "Estudiantes de 1ro A" }).getByText("Aún no hay estudiantes inscritos.")).toBeVisible();
  await institution.dispose();
});
