# MYSUBS Nómina

Sistema de gestión de nómina, roles de pago y cuadro de remuneraciones para
MYSUBS. La aplicación utiliza **Node.js**, **Express**, **React**, **Electron** y
**SQLite**.

## Requisitos

- Windows (el empaquetado de escritorio está configurado para Windows).
- Node.js 22 o superior y npm instalados (SQLite requiere Node >=22).
- Una terminal ubicada en la carpeta raíz del proyecto.

Comprueba que Node.js y npm estén disponibles:

```powershell
node --version
npm --version
```

## Instalación

Desde la raíz del proyecto, instala las dependencias del backend y de Electron:

```powershell
npm install
```

Instala también las dependencias del cliente:

```powershell
npm --prefix client install
```

La base de datos SQLite se crea automáticamente en `data/mysubs_nomina.sqlite`
cuando se inicia el servidor por primera vez. Si está vacía, el sistema carga
los datos iniciales de demostración.

## Ejecutar la aplicación en modo local

La forma recomendada de ejecutar la aplicación como sitio local es compilar el
frontend y luego iniciar el servidor:

```powershell
npm run build
npm start
```

Después, abre [http://localhost:5000](http://localhost:5000) en el navegador.
El estado del backend puede comprobarse en
[http://localhost:5000/api/health](http://localhost:5000/api/health).

Para detener el servidor, presiona `Ctrl+C` en la terminal.

## Ejecutar como aplicación de escritorio

Primero genera la compilación del cliente y después inicia Electron:

```powershell
npm run build:client
npm run desktop
```

Electron inicia el servidor local y abre la aplicación en una ventana
independiente. En modo de desarrollo, la base de datos de escritorio se guarda
en la carpeta de datos de usuario de Windows.

## Credenciales de demostración

El seed crea los siguientes usuarios:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@mysubs.com` | `admin123` |
| Recursos Humanos | `rrhh@mysubs.com` | `rrhh123` |
| Contabilidad | `contabilidad@mysubs.com` | `rrhh123` |
| Consulta | `consulta@mysubs.com` | `consulta123` |

Estas credenciales son únicamente para desarrollo y demostración. Deben
cambiarse antes de utilizar el sistema en un entorno real.

## Comandos disponibles

Ejecuta los comandos desde la raíz del proyecto:

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el backend Express en el puerto `5000`. |
| `npm run build` | Instala las dependencias del cliente y compila el frontend. |
| `npm run build:client` | Compila únicamente el frontend en `client/dist`. |
| `npm run desktop` | Abre la aplicación con Electron. |
| `npm run dev:server` | Inicia el backend en modo desarrollo. |
| `npm run dev:client` | Inicia el servidor de desarrollo de Vite. |
| `npm test` | Ejecuta la suite de pruebas del backend. |
| `npm run seed` | Inicializa la base de datos si todavía no contiene usuarios. |
| `npm run build:app` | Compila el cliente y genera el instalador de Windows. |
| `npm run dist` | Alias para generar la distribución de escritorio. |

## Generar el instalador de Windows

Para crear el instalador NSIS:

```powershell
npm run build:app
```

El instalador se genera dentro de `release/` con un nombre similar a
`MYSUBS-Nomina-Setup-1.0.0.exe`.

## Base de datos

- Ubicación predeterminada: `data/mysubs_nomina.sqlite`.
- El backend crea el esquema automáticamente al iniciar.
- Para usar otra ubicación, define la variable `DATABASE_PATH` antes de iniciar
  el servidor:

```powershell
$env:DATABASE_PATH = "C:\ruta\mysubs_nomina.sqlite"
npm start
```

El servidor utiliza el puerto `5000` por defecto. Puedes cambiarlo con la
variable `PORT`:

```powershell
$env:PORT = "5050"
npm start
```

## Estructura principal

```text
.
├── client/              # Frontend React + Vite
├── data/                # Base de datos SQLite local
├── server/              # API Express, servicios y esquema de base de datos
├── scripts/             # Scripts de preparación del empaquetado
├── electron-main.cjs    # Punto de entrada de Electron
└── package.json         # Scripts y dependencias del proyecto
```

## Solución de problemas

### El puerto 5000 ya está ocupado

Inicia el servidor con otro puerto:

```powershell
$env:PORT = "5050"
npm start
```

### La interfaz no aparece después de ejecutar `npm start`

Comprueba que el frontend haya sido compilado:

```powershell
npm run build:client
npm start
```

### La aplicación de escritorio no inicia

Verifica que las dependencias estén instaladas y que exista la compilación del
cliente:

```powershell
npm install
npm --prefix client install
npm run build:client
npm run desktop
```


## Puestos, beneficios y novedades de nómina

- **Cargos y escalas salariales:** crear o editar departamento, superior directo,
  grado, mínimo, sueldo base y máximo. Se rechazan ciclos de jerarquía y sueldos
  fuera del rango. Los cambios de sueldo conservan su historial en el módulo de
  remuneraciones. Los rangos no modifican automáticamente los sueldos existentes.
- **Organigrama:** muestra los puestos y sus superiores configurados, con
  colaboradores activos; se omiten los cargos sin personas asignadas. Al migrar una base existente se conserva la
  estructura anterior de gerencia y jefaturas como punto de partida editable.
- **Empleados:** elegir por separado décimo tercero y cuarto mensual o anual.
  La modalidad mensual se suma al neto y la anual acumula una provisión. El
  décimo tercero acumulado se paga en diciembre; el cuarto en marzo (Costa e
  Insular) o agosto (Sierra y Amazonía), según la selección del empleado. Se
  liquidan las provisiones de roles registrados del ciclo anterior (diciembre a
  noviembre, marzo a febrero o agosto a julio). No se inventan meses sin roles.
  Los empleados existentes conservan inicialmente la modalidad anual.
- **Nómina > Horas extra:** activar la casilla solo si hubo horas e ingresar
  cantidades con recargo del 50% o 100%. Desactivarla elimina las horas del
  período. Valor = sueldo / horas mensuales configuradas × cantidad × 1,5 o 2.
  Se incluyen en ingresos, base IESS y provisión del décimo tercero.
- **Impuesto a la renta:** cálculo revisado con fuentes oficiales del SRI para
  2026: enero sin retención; cuota ordinaria febrero-diciembre, nunca /12.
  Se diferencia rebaja del impuesto y exoneración de la base. Se permite simular
  y estimar gastos personales. Con historial aprobado completo se ajusta el saldo;
  si falta historial, se identifica la estimación y no se inventan retenciones.
  [Reglas, ejemplo, fuentes oficiales y límites](docs/IMPUESTO_RENTA_2026.md).

Después de editar décimos, datos tributarios u horas, usar **Generar / recalcular
nómina** antes de aprobar. Los roles desactualizados no pueden aprobarse.
Los períodos cerrados o pagados conservan sus cálculos históricos. Las nuevas
columnas se agregan automáticamente al iniciar, sin eliminar datos.

Pruebas de estas funciones: `node server/tests/payroll_features.cjs`.

## Interfaz y demostración de los cambios

La interfaz incluye navegación por áreas, búsqueda de módulos, temas claro y
oscuro, formularios por secciones y adaptación a escritorio y móvil.

- [Abrir la guía interactiva](http://localhost:5000/#changes).
- [Ver las ubicaciones, archivos y capturas de cada cambio](docs/GUIA_CAMBIOS.md).
- Verificación visual reproducible (con servidor iniciado y Google Chrome):
  `npx --yes --package=playwright node scripts/review-ui.cjs`.

Después de compilar, actualiza el navegador con **Ctrl + F5**.

Los filtros de colaboradores combinan búsqueda sin tildes, estado, departamento,
cargo, modalidades de décimos y rango salarial, con orden y paginación.
Pruebas: `node server/tests/employee_filters.mjs`.

## Escalas salariales internas

Se configuraron seis grados por responsabilidad, con rangos mensuales en USD:
G1 apoyo/operación $500–900; G2 técnico/comercial $900–1.200; G3 profesional/analista
$1.000–1.600; G4 coordinación/supervisión $1.200–1.800; G5 jefaturas $1.500–2.400;
G6 gerencia/dirección $2.000–3.500. Son bandas internas de la empresa.

La tabla de **Cargos y escalas** muestra grados, rangos y personal asignado.
**Colaboradores** muestra la escala de cada persona y señala diferencias.
La asignación conserva sueldos, referencias de cargos, historial y nóminas.
[Asignaciones y excepciones](docs/ESCALAS_SALARIALES.md).
Prueba: `npx --yes --package=node@22 node server/tests/salary_scales.cjs`.
