# App de pedidos semanales

Página `/pedidos` donde los empleados de cada empresa cliente eligen su almuerzo de lunes a viernes.
Los pedidos llegan a un **Google Sheet** tuyo, agrupados por empresa. Costo: $0.

```
Empleado (celular) ──► pedidos.viandssur.com/?e=acme ──►        Google Apps Script ──► Google Sheet
                                                                                       ├─ Menu      (lo cargás vos)
                                                                                       ├─ Empresas  (códigos de link)
                                                                                       ├─ Pedidos   (una fila por persona)
                                                                                       └─ Resumen   (totales por empresa/día)
```

## Configuración (una sola vez, ~10 minutos)

1. Crear un Google Sheet nuevo (ej: "Viands Sur — Pedidos").
2. **Extensiones → Apps Script**. Borrar lo que haya y pegar el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Guardar.
3. En el editor de Apps Script, elegir la función `setup` arriba y darle **Ejecutar**. Aceptar los permisos (es tu propia cuenta). Esto crea las hojas con datos de ejemplo.
4. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Copiar la URL que termina en `/exec`.
5. En `pedidos.html`, pegar esa URL en `const API_URL = '...'` y hacer push a `main` (Vercel deploya solo).

> Si después cambiás `Code.gs`, hay que ir a **Implementar → Administrar implementaciones → Editar → Nueva versión** para que tome los cambios. La URL no cambia.

## Agregar una empresa

En la hoja **Empresas** agregá una fila: `Código | Nombre`, ej: `acme | ACME S.A.`
El link para mandarles es:

```
https://pedidos.viandssur.com/?e=acme
```

Usá un código no obvio si querés que nadie de afuera adivine el link (ej: `acme-7k2`).

## Cada semana

En la hoja **Config**:
- **Lunes de la semana**: la fecha del lunes (ej: `19/10/2026`). Con eso se arma solo el texto "Semana del 19 al 23 de octubre" y se separan los pedidos de cada semana.
- **Hora de cierre** (normalmente `18`): cada día se puede pedir hasta **el día hábil anterior a esa hora**. Ej: el martes cierra el lunes a las 18 h, y el lunes cierra el viernes anterior a las 18 h. Los días cerrados aparecen grisados y no se pueden modificar.

En la hoja **Menu**: reemplazar los platos. Si un día no hay servicio (feriado), dejá la fila vacía. Si un día no hay ensalada, dejá esa celda vacía.

## Ver los pedidos

- **Resumen**: se actualiza solo con cada pedido. Por empresa: cuántas A/B/C por día + observaciones (alergias, etc).
- **Pedidos**: el detalle persona por persona. Se puede filtrar por Semana / Empresa.
- Menú **Viands Sur → Enviarme el resumen por email** (aparece al reabrir la planilla). Para que llegue solo al cierre: en Apps Script → Activadores → `enviarResumen`, basado en tiempo.

Si un empleado vuelve a pedir con el mismo nombre, se reemplaza su pedido (no se duplica); los días ya cerrados quedan como estaban.

## Probar sin configurar nada

Con `API_URL` vacío la página funciona en **modo demo** (datos de ejemplo, no guarda nada). Abrí `pedidos.html` en el navegador.
