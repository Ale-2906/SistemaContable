# Escalas salariales internas

Se asignaron grados por responsabilidad a los cargos existentes. Estos rangos
son una configuración interna de la empresa, no una tabla oficial de salarios
sectoriales ni una estimación de remuneraciones de mercado.

| Grado | Nivel | Mínimo mensual | Máximo mensual |
| --- | --- | ---: | ---: |
| G1 | Apoyo y operación | $500 | $900 |
| G2 | Técnico y comercial | $900 | $1.200 |
| G3 | Profesional y analista | $1.000 | $1.600 |
| G4 | Coordinación y supervisión | $1.200 | $1.800 |
| G5 | Jefaturas | $1.500 | $2.400 |
| G6 | Gerencia y dirección | $2.000 | $3.500 |

Los rangos se solapan entre niveles; la clasificación depende del puesto, no
únicamente del importe del sueldo. Los cargos sin personal también tienen su
escala en el catálogo y siguen ocultos en el organigrama.

## Asignación y diferencias

Consulta la asignación de cada persona dentro del sistema, en Colaboradores.
La documentación pública no incluye nombres ni remuneraciones individuales.
Un sueldo inferior al mínimo o superior al máximo del grado se señala para
revisión. Asignar una escala no aplica un aumento automático.

Los datos personales y beneficios de un empleado fuera de escala pueden
editarse normalmente. Los nuevos sueldos o cambios de puesto deben respetar el
rango. Un cambio explícito de sueldo debe realizarse en Remuneraciones para
mantener el historial correspondiente.

## Dónde verlas

- [Cargos y escalas](http://localhost:5000/#cargos): tabla de seis niveles, rangos,
  cantidad de personal y excepciones. Pulsar un grado filtra el catálogo.
- [Colaboradores](http://localhost:5000/#employees): columna Escala salarial con
  grado, nombre, rango y aviso de diferencias.
Las capturas se generan localmente y se excluyen del repositorio.

## Persistencia y verificación

La tabla `salary_scales` contiene los niveles. Los cargos conservan el grado y
su rango en `salary_grade`, `salary_min` y `salary_max`. La inicialización solo
completa cargos conocidos que todavía no tienen escala y conserva las
configuraciones personalizadas. Las asignaciones se registran en Auditoría.

Se respaldó SQLite antes de activar el cambio y se compararon los sueldos de
empleados, los sueldos de referencia de cargos y las huellas del historial y de
las nóminas antes y después. Todos permanecieron sin cambios.

Archivos principales:

- [Configuración y asignación](../server/database/salaryScales.js).
- [API de consulta y validaciones](../server/routes/departments.js).
- [Pantalla de escalas](../client/src/views/CargosView.jsx).
- [Escala de cada colaborador](../client/src/views/EmployeesView.jsx).
- [Pruebas de conservación de datos](../server/tests/salary_scales.cjs).

```powershell
npx --yes --package=node@22 node server/tests/salary_scales.cjs
```
