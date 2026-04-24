# Viands Sur

Sitio web corporativo de Viands Sur — catering corporativo en CABA y GBA.

## Stack

Sitio estático, un solo archivo. Sin build, sin dependencias.

- `index.html` — HTML + CSS + JS embebido
- Fuentes: Google Fonts (Fraunces, Instrument Sans, JetBrains Mono)
- Sin tracking, sin cookies, sin backend

## Desarrollo local

No hay build. Abrís `index.html` en el navegador y listo.

```bash
# Opcional, si querés servidor local:
python3 -m http.server 8000
# Luego visitá http://localhost:8000
```

## Deploy

El deploy es automático en Vercel:

- **Producción:** push a `main` → deploya a https://viands-sur.vercel.app
- **Preview:** cualquier otro branch → URL temporal de preview

## Dominio custom

Para conectar un dominio propio (ej: `viandssur.com.ar`):

1. Comprar el dominio en nic.ar o registrador preferido
2. En Vercel → Project Settings → Domains → Add Domain
3. Apuntar el DNS del registrador a los nameservers de Vercel
4. SSL se provisiona automáticamente

## Contacto

- Email: cepreco.a@gmail.com
- WhatsApp: +54 9 11 3307-2434

## Estructura del contenido

El sitio tiene una sola página con secciones:

- `#propuesta` — tres diferenciales
- `#planes` — tres opciones de comida (A plato principal, B ensalada, C dieta)
- `#proceso` — tres pasos para empezar
- `#faq` — preguntas frecuentes
- `#contacto` — formulario que envía al WhatsApp

## Cambios futuros

- Para cambiar el número de WhatsApp: buscar `5491133072434` en `index.html` (aparece 3 veces) y reemplazar.
- Para cambiar el email: buscar `cepreco.a@gmail.com` (aparece 2 veces).
- Las variables de color y tipografía están centralizadas al principio del `<style>` como variables CSS (`:root`).
