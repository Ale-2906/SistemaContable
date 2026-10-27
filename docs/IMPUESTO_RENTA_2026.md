# Renta en salarios: revisión oficial de 2026

Revisado el 27 de octubre de 2026. Alcance del sistema: nómina mensual del
empleador registrado, tabla de personas naturales de 2026.

## Qué significan los campos

| Campo | Uso | Caso sin beneficio |
| --- | --- | --- |
| Rebaja por gastos personales | Descuento del impuesto ya calculado, respaldado por la proyección SRI-GP. No ingresar aquí el gasto total. | $0 |
| Exoneración de la base | Reducción previa a la tabla, cuando corresponde por tercera edad o discapacidad y existe soporte. | $0 |

La rebaja se estima al 18% del menor valor entre los gastos admitidos y el límite
por cargas familiares. Para 2026 la canasta de enero es $821,80 y los factores
ordinarios son 7, 9, 11, 14, 17 y 20 para 0, 1, 2, 3, 4 y 5 o más cargas. Sin cargas,
el máximo de rebaja es $1.035,47. Los casos especiales y Galápagos tienen reglas
propias. El formulario presenta un estimador, pero solo transfiere el resultado al
campo de rebaja cuando el usuario pulsa **Usar esta rebaja**.
[Fuente: SRI, gastos personales 2026](https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1).

## Secuencia de retención

1. Proyectar la remuneración gravada del ejercicio, deducir aporte personal y
   exoneraciones aplicables.
2. Aplicar la tabla progresiva anual; luego restar la rebaja.
3. Enero no lleva retención ordinaria; la cuota anual se distribuye entre febrero
   y diciembre. La norma no establece dividir entre doce.

Los décimos se excluyen de la base. La retención no es un porcentaje fijo del
sueldo. [Fuente: SRI, Reglamento, artículo 104](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/ee775a90-0ba9-48fe-85cb-9a52673c4c61/REGLAMENTO_PARA_APLICACION_LEY_DE_REGIMEN_TRIBUTARIO_INTERNO_LRTI.pdf).
La tabla 2026 deja en cero una base imponible anual hasta $12.208.
[Fuente: resolución SRI NAC-DGERCGC25-00000043](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=bb7aac3c-251d-4243-9477-10a3ba8e7355&nombre=NAC-DGERCGC25-00000043.pdf).

## Ejemplo de un año completo

Con sueldo de $1.200 durante los doce meses, sin extras, rebaja ni exoneración:

| Concepto | Importe |
| --- | ---: |
| Remuneración anual | $14.400,00 |
| Aporte personal anual del 9,45% | $1.360,80 |
| Base imponible anual | $13.039,20 |
| Impuesto según la tabla | $41,56 |
| Cuota ordinaria de febrero a diciembre | $3,78 |

Una rebaja válida de $41,56 o más deja ese impuesto en cero. No es obligatorio
aplicar una rebaja inexistente. Si la contratación empezó durante el año, la
proyección considera los meses de trabajo, por lo que el resultado cambia.
La tasa personal del sector privado general se verificó en el
[IESS](https://iess.gob.ec/es/preguntas-frecuentes-afiliacion).

## Cómo lo implementa este sistema

- La simulación de Colaboradores usa el sueldo base y permite cambiar el mes.
  No guarda datos ni crea roles.
- El rol agrega las novedades del período. Las horas extra actuales se proyectan
  una sola vez; no se repiten automáticamente en los doce meses.
- Con historial aprobado completo, se usa el ingreso real anterior y se resta la
  renta ya retenida para distribuir el saldo en los meses restantes.
- Si faltan roles aprobados, se estiman los meses sin información con el sueldo
  base y se identifica la cuota como ordinaria con **historial incompleto**. No se
  inventan retenciones ni se presenta como una reliquidación definitiva.
- Los meses futuros se proyectan con el sueldo base; no se presuponen bonos o
  extras futuros. No se incorporan ingresos de otros empleadores ni una liquidación
  por terminación de contrato.
- Los campos de beneficios quedan vinculados al ejercicio 2026. Los roles con el
  cálculo anterior que estén abiertos se marcan **Recalcular**; no se cambian sus
  importes hasta generar de nuevo. Los roles cerrados o pagados se conservan.

La actualización de proyecciones está respaldada por el
[comunicado del SRI de septiembre de 2026](https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1).

## Otros parámetros verificados

El Ministerio del Trabajo fija el SBU de 2026 en $482. La base del décimo cuarto
configurada en esta instalación sigue en $460; se muestra una alerta en
Parámetros y se conserva su valor para revisión de vigencia.
[Fuente oficial del SBU](https://www.trabajo.gob.ec/despues-de-casi-una-decada-hay-consenso-gobierno-empleadores-y-trabajadores-acuerdan-fijar-el-salario-basico-unificado-de-2026-en-usd-482-no-hay-imposicion-hay-union/).

El IESS publica, para el sector privado general, 9,45% personal y 11,15% patronal.
El 12,15% patronal de la configuración no se debe interpretar como la tasa IESS
sin desglosar otros componentes y comprobar el régimen. Se aclaró la etiqueta,
sin cambiar ese porcentaje ni descontarlo al trabajador.
[Fuente oficial: IESS](https://iess.gob.ec/es/preguntas-frecuentes-afiliacion).

## Archivos y pruebas

- Cálculo: `server/services/IncomeTaxService.js`, `taxHistory.js` y
  `PayrollCalculationService.js`.
- Explicación y simulación: `client/src/components/TaxPanel.jsx`,
  `server/routes/payrolls.js` y `client/src/views/IndividualSlipView.jsx`.
- Pruebas: `node server/tests/income_tax.cjs` y
  `npx --yes --package=node@22 node server/tests/payroll_features.cjs`.
- [Captura de filtros](screenshots/14-filtros-colaboradores.png).
- [Captura de la explicación de renta](screenshots/05-impuesto-renta.png).
