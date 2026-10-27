# Migrar la base local a Render

Los colaboradores ya se guardan en SQLite. `seed.js` crea datos de demostración
cuando la base está vacía; no sincroniza los registros de tu computadora.
La carpeta `data/` se excluye de Git para conservar la privacidad.

## Preparar una copia consistente

Desde la raíz del proyecto, con Node.js 22 o superior:

```powershell
npx --yes --package=node@22 node scripts/export-sqlite.cjs
```

El comando muestra la ruta y el número de empleados. La copia incluye todas
las tablas (usuarios, cargos, beneficios, nóminas e historial), no solo empleados.
Usa la API de respaldo de SQLite para incluir los cambios del WAL mientras la
aplicación sigue funcionando. No copies únicamente el archivo SQLite en uso.

## Configurar Render y transferir

1. Configura un disco persistente con montaje `/var/data` en tu servicio Node.
   Render requiere un servicio de pago para adjuntar discos persistentes.
2. Configura acceso SSH según el panel Connect de Render.
3. En una ventana de mantenimiento, evita cambios en ambos sistemas y genera
   la copia final. Si Render tiene registros propios que deban conservarse,
   respáldalos y realiza una conciliación antes de continuar: este procedimiento
   cambia de base completa y no combina bases.
4. Transfiere la copia a un nombre NUEVO en el disco. Sustituye la ruta local y
   el destino SSH por los que correspondan a tu servicio:

```powershell
scp -s "RUTA_LOCAL_DE_LA_COPIA.sqlite" USUARIO@ssh.REGION.render.com:/var/data/mysubs-importacion-01.sqlite
```

No sobrescribas una base que el servicio esté utilizando. Si ese nombre ya
existe, elige uno nuevo. Conserva la base anterior para poder regresar a ella.

5. En Environment de Render, configura:

```text
DATABASE_PATH=/var/data/mysubs-importacion-01.sqlite
```

6. Guarda y redespliega. El servidor utiliza esa base y omite el seed porque ya
   contiene usuarios. Inicia sesión con las credenciales de tu sistema local,
   pues también se trasladan los usuarios. Revisa que aparezcan los empleados,
   cargos, saldos y nóminas esperados antes de permitir nuevas operaciones.
7. Reinicia el servicio y comprueba que conserva los registros. Mantén copias
   periódicas fuera del servicio. No vuelvas a importar la copia antigua tras
   cada despliegue, pues perderías los cambios realizados en Render.

El disco solo está disponible durante la ejecución; no inicialices la base en
el comando de build. Usa `npm start` como comando de inicio y Node.js >=22.
En el plan gratuito, SQLite local no conserva los cambios entre reinicios;
para ese escenario necesitas una base externa y adaptar la aplicación.

Documentación oficial:
- https://render.com/docs/disks
- https://render.com/docs/ssh
- https://render.com/docs/free
