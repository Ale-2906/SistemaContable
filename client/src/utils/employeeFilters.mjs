export const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function filterEmployees(
  employees,
  {
    search = "",
    status = "",
    departmentId = "",
    positionId = "",
    decimo13 = "",
    decimo14 = "",
    salaryMin = "",
    salaryMax = "",
    sort = "name",
  } = {},
) {
  const tokens = normalizeSearch(search).split(/\s+/).filter(Boolean);
  const result = employees.filter((e) => {
    const text = normalizeSearch(
      `${e.first_name} ${e.last_name} ${e.cedula} ${e.email || ""} ${e.position_name || ""} ${e.department_name || ""}`,
    );
    return (
      tokens.every((token) => text.includes(token)) &&
      (!status || e.status === status) &&
      (!departmentId || String(e.department_id) === String(departmentId)) &&
      (!positionId || String(e.position_id) === String(positionId)) &&
      (!decimo13 || e.decimo13_mode === decimo13) &&
      (!decimo14 || e.decimo14_mode === decimo14) &&
      (salaryMin === "" || Number(e.base_salary) >= Number(salaryMin)) &&
      (salaryMax === "" || Number(e.base_salary) <= Number(salaryMax))
    );
  });
  return result.sort((a, b) =>
    sort === "salaryDesc"
      ? Number(b.base_salary) - Number(a.base_salary) || a.id - b.id
      : sort === "salaryAsc"
        ? Number(a.base_salary) - Number(b.base_salary) || a.id - b.id
        : sort === "recent"
          ? String(b.hire_date).localeCompare(String(a.hire_date)) ||
            a.id - b.id
          : `${a.first_name} ${a.last_name}`.localeCompare(
              `${b.first_name} ${b.last_name}`,
              "es",
              { sensitivity: "base" },
            ) || a.id - b.id,
  );
}
