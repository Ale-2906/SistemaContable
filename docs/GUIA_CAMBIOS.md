# Guía de cambios del sistema contable

Abre [el sistema](http://localhost:5000) y actualiza con **Ctrl + F5**.
La [Guía de cambios dentro de la aplicación](http://localhost:5000/#changes)
contiene comparaciones de antes y ahora, pasos para verificar cada función y
botones que abren el módulo correspondiente.

## Dónde encontrar las funciones solicitadas

| Cambio | Ubicación exacta | Qué comprobar | Captura |
| --- | --- | --- | --- |
| Organigrama de puestos | Personal → Organigrama | Solo cargos con colaboradores activos; búsqueda y expansión de equipos. El superior se edita en Cargos y escalas. | [Organigrama](screenshots/03-orgchart.png) |
| Décimos mensuales o anuales | Personal → Colaboradores → Editar → Décimos | Modalidad independiente para el décimo tercero y cuarto; región del pago anual. La tabla muestra la modalidad de cada empleado. | [Décimos](screenshots/04-decimos.png) |
| Horas extra opcionales | Nómina y pagos → Nómina mensual → Horas extra | Casilla opcional, horas al 50% y 100%, ingreso estimado y columna de horas extra en la nómina. | [Formulario](screenshots/11-horas-extra.png) |
| Impuesto a la renta | Colaboradores → Editar → Impuesto a la renta; Nómina mensual → Ver rol | Rebaja y exoneración anual, total de IR en nómina y deducción en el rol recalculado. | [Datos tributarios](screenshots/05-impuesto-renta.png) |
| Escalas salariales | Personal → Cargos y escalas → Editar | Grado, mínimo, sueldo base y máximo; rango visual y superior directo. | [Escala salarial](screenshots/06-escala-salarial.png) |

Los beneficios y las horas se aplican al **recalcular un período abierto**.
Los roles históricos cerrados mantienen sus importes. Por eso un rol guardado
antes de estas funciones puede no mostrar todavía impuesto o décimos pagados.
El IR incorpora la revisión del artículo 104 para 2026, con ajuste del saldo
cuando existe historial aprobado completo; no incluye otros empleadores. Los décimos anuales liquidan las provisiones
registradas del ciclo; no se estiman meses sin historial.

## Renovación visual

| Pantallas | Mejoras | Evidencia |
| --- | --- | --- |
| Acceso | Presentación de marca, formulario etiquetado, mostrar u ocultar contraseña, temas claro y oscuro. | [Acceso](screenshots/01-acceso.png) |
| Navegación de todos los módulos | Menú agrupado por áreas, buscador, botones accesibles, enlaces directos por URL, cabecera simplificada y guía de cambios. | [Panel general](screenshots/02-panel-general.png) |
| Resumen general | Indicadores compactos, gráficos de barras y líneas por período, anillos de pagos y costo, y personal por cargo. | [Resumen](screenshots/02-panel-general.png) |
| Colaboradores | Directorio con búsqueda y filtros, modalidades de décimos visibles y formulario con cuatro pestañas. | [Directorio](screenshots/03-employees.png) |
| Organigrama | Tarjetas conectadas solo para cargos ocupados; expansión, contracción y búsqueda. | [Estructura](screenshots/03-orgchart.png) |
| Cargos y escalas | Métricas, búsqueda y representación del sueldo dentro del rango. | [Cargos](screenshots/03-cargos.png) |
| Jornadas | Tarjetas de horarios, duración y tipo; formulario etiquetado y tiempos enviados correctamente al servidor. | [Jornadas](screenshots/03-schedules.png) |
| Períodos | Resumen por estado, búsqueda, fechas legibles y acceso a la nómina. | [Períodos](screenshots/03-periods.png) |
| Nómina | Resumen visual de roles e importes, filtros, paginación, totales y acciones compactas por empleado. | [Nómina](screenshots/03-payroll.png) |
| Pagos | Tablas, botones, importes y estados con el estilo compartido. | [Pagos](screenshots/03-payments.png) |
| Remuneraciones | Controles y tabla con tipografía, espaciado, contraste y desplazamiento coherentes. | [Remuneraciones](screenshots/03-remunerations.png) |
| Propuestas, parámetros, reportes y auditoría | Tarjetas, controles y tablas con la misma paleta; parámetros explicados en lenguaje de usuario. | [Propuestas](screenshots/03-proposals.png), [parámetros](screenshots/03-parameters.png), [reportes](screenshots/03-reports.png), [auditoría](screenshots/03-audit.png) |
| Rol individual | Documento imprimible integrado en la nueva navegación y controles. | [Rol](screenshots/12-rol-individual.png) |
| Móvil | Menú desplegable, tarjetas adaptables, tablas con desplazamiento interno y formularios en una columna. | [Panel móvil](screenshots/08-movil.png), [menú](screenshots/09-menu-movil.png), [formulario](screenshots/10-formulario-movil.png) |
| Tema oscuro | Colores y contraste compartidos, conservando la preferencia del usuario. | [Tema oscuro](screenshots/07-tema-oscuro.png) |
| Demostración | Seis tarjetas con antes, ahora, instrucciones y accesos a los módulos. | [Guía en pantalla](screenshots/03-changes.png) |

## Archivos donde se implementaron los cambios

| Área | Archivos |
| --- | --- |
| Navegación y adaptación general | [App.jsx](../client/src/App.jsx), [workspace.css](../client/src/workspace.css), [main.jsx](../client/src/main.jsx), [index.css](../client/src/index.css) |
| Acceso, idioma y marca | [LoginView.jsx](../client/src/views/LoginView.jsx), [AuthContext.jsx](../client/src/context/AuthContext.jsx), [index.html](../client/index.html), [favicon.svg](../client/public/favicon.svg) |
| Panel general | [DashboardView.jsx](../client/src/views/DashboardView.jsx) |
| Colaboradores, décimos e IR | [EmployeesView.jsx](../client/src/views/EmployeesView.jsx), [employees.js](../server/routes/employees.js) |
| Organigrama y escalas | [OrgChartView.jsx](../client/src/views/OrgChartView.jsx), [CargosView.jsx](../client/src/views/CargosView.jsx), [departments.js](../server/routes/departments.js), [salaryScale.js](../server/services/salaryScale.js) |
| Nómina y horas | [PayrollView.jsx](../client/src/views/PayrollView.jsx), [OvertimeForm.jsx](../client/src/components/OvertimeForm.jsx), [payrolls.js](../server/routes/payrolls.js), [PayrollCalculationService.js](../server/services/PayrollCalculationService.js) |
| Jornadas, períodos y parámetros | [SchedulesView.jsx](../client/src/views/SchedulesView.jsx), [PeriodsView.jsx](../client/src/views/PeriodsView.jsx), [ParametersView.jsx](../client/src/views/ParametersView.jsx) |
| Formularios accesibles | [Modal.jsx](../client/src/components/Modal.jsx): cierre con Escape, manejo de foco y bloqueo del desplazamiento del fondo. |
| Guía interactiva | [ChangesGuideView.jsx](../client/src/views/ChangesGuideView.jsx) |
| Persistencia de las funciones | [init.js](../server/database/init.js): migraciones aditivas, sin eliminar datos existentes. |
| Verificación | [review-ui.cjs](../scripts/review-ui.cjs), [payroll_features.cjs](../server/tests/payroll_features.cjs), [informe visual](screenshots/verification.json) |

Los archivos del servidor corresponden a los cambios funcionales anteriores.
La renovación visual usa los mismos endpoints y conserva los cálculos.
La compilación lista para usar está en `client/dist/`.

## Verificación reproducible

Con el servidor iniciado y Google Chrome instalado:

```powershell
npm run build:client
npx --yes --package=playwright node scripts/review-ui.cjs
```

El recorrido inicia sesión con el administrador de demostración, revisa
pantallas en escritorio y móvil, abre formularios sin guardarlos y verifica la
navegación, el cambio de tema, el organigrama y los accesos de la guía. Genera
capturas reales en `docs/screenshots/`. No genera nóminas ni registra pagos.
Las verificaciones monetarias y HTTP usan una base aislada en memoria:

```powershell
npx --yes --package=node@22 node server/tests/payroll_features.cjs
```

Resultado final: **28 vistas verificadas**, sin errores de JavaScript ni desbordamientos de página; **42 comprobaciones HTTP** de nómina aprobadas en memoria. La compilación del cliente también finalizó correctamente.

## Ajuste a las referencias visuales

Se retiraron el banner de bienvenida, los mensajes promocionales, el flujo de
trabajo repetido y el pie de página. El panel utiliza gráficos de barras y
líneas intercambiables con ejes, leyendas e importes al seleccionar un período.
Los anillos muestran lotes de pago y composición del costo con datos reales.
La nómina dispone de resumen visual, búsqueda, filtro por estado, importes
alineados, total del período y paginación. Se omiten columnas de ID sin utilidad
para la lectura diaria. El resto de las tablas comparte el diseño compacto.

El organigrama excluye los cargos sin colaboradores activos. Si un cargo vacío
está entre dos cargos ocupados, se conecta al superior ocupado más cercano,
sin cambiar las relaciones guardadas del catálogo.

- [Panel compacto](screenshots/02-panel-general.png).
- [Gráfico de líneas](screenshots/13-grafico-lineas.png).
- [Nómina compacta](screenshots/03-payroll.png).
- [Organigrama sin vacantes](screenshots/03-orgchart.png).

Prueba de filtrado de la jerarquía: `node server/tests/organization.mjs`.

## Revisión de renta y filtros

[Filtros mejorados y explicación tributaria verificada con fuentes oficiales](IMPUESTO_RENTA_2026.md). La simulación está en Colaboradores → Editar → Impuesto a la renta.

## Escalas asignadas

[Seis escalas salariales, asignaciones por colaborador y diferencias señaladas](ESCALAS_SALARIALES.md).
