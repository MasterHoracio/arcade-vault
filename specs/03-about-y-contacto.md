# 03 · Acerca de y formulario de contacto

**Estado:** Implementado
**Depende de:** SPEC 02
**Fecha:** 2026-08-26

**Objetivo:** Añadir la pantalla "Acerca de" (`about.jsx` del prototipo) en la ruta `/acerca-de`, con un formulario de contacto que envía correos reales mediante Resend desde una API route.

## Alcance

**Incluye:**

- Migrar `references/templates/home-about/about.jsx` a `app/acerca-de/page.tsx` (client component): sección hero de misión + highlights, divisor decorativo, y sección de contacto con formulario.
- Migrar el bloque CSS `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1146: `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`/`.highlight`, `.about-divider`/`.div-bar`/`.div-pixels`, `.about-contact`/`.contact-grid`/`.contact-intro`/`.contact-title`/`.contact-sub`/`.contact-tips`, `.contact-form`, `.terminal-success`/`.term-*`) a `app/globals.css`.
- Instalar la dependencia `resend` (SDK oficial) y crear `app/api/contact/route.ts`: un `POST` handler que recibe `{ name, email, message }`, valida los campos en servidor, y llama a `resend.emails.send(...)` con:
  - `from`: valor de la variable de entorno `RESEND_FROM_EMAIL`.
  - `to`: valor de la variable de entorno `CONTACT_TO_EMAIL`.
  - `reply_to`: el email ingresado en el formulario (para poder responder directo al remitente).
  - `subject`: `"Nuevo mensaje de contacto — Arcade Vault"`.
  - Cuerpo con nombre, email y mensaje del formulario.
- Validación en servidor: rechazar con `400` si falta `name`, `email` o `message`, o si `email` no tiene formato válido (regex simple). Si Resend devuelve error, responder `502` con un mensaje genérico.
- Actualizar `app/acerca-de/page.tsx` para hacer `fetch("/api/contact", { method: "POST", ... })` en el submit:
  - Validación en cliente igual al prototipo (campos no vacíos → `shake` si falla).
  - Estado `"enviando"` mientras espera la respuesta: botón deshabilitado con texto `"ENVIANDO..."`.
  - Estado de éxito: el bloque `.terminal-success` actual del prototipo (verde), igual que hoy.
  - Estado de error (fetch falla o la API responde no-2xx): variante del mismo bloque terminal en magenta/rojo (nueva clase `.terminal-error`, mismo layout que `.terminal-success` pero con `border-color`/`box-shadow`/texto en `var(--magenta)`), con línea final tipo `> ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO.` y botón para reintentar (vuelve al formulario).
- Crear `.env.example` en la raíz con placeholders documentados: `RESEND_API_KEY=`, `RESEND_FROM_EMAIL=`, `CONTACT_TO_EMAIL=`. El usuario completa los valores reales en su propio `.env.local` (ya ignorado por `.gitignore`).
- Actualizar `components/Nav.tsx`: agregar el link "Acerca de" → `/acerca-de` en el nav de escritorio y en el panel móvil (después de "Salón de la Fama", antes del botón de auth), y añadir el caso `"acerca-de"` a `isActive` (activo solo en `pathname === "/acerca-de"`).

**No incluye:**

- Persistencia de los mensajes de contacto (no se guardan en `localStorage` ni en ninguna base de datos; solo se envían por correo).
- Rate limiting, CAPTCHA o cualquier protección anti-spam del formulario.
- Verificación de dominio propio en Resend ni configuración DNS — se asume que el usuario ya tiene remitente verificado en su cuenta de Resend; la spec solo consume las variables de entorno.
- Plantillas HTML de correo con diseño propio — el cuerpo del correo enviado por Resend es texto/HTML simple con los tres campos, sin theming adicional.
- Cambios a otras páginas o rutas (`/`, `/juegos`, `/salon`, `/auth`) más allá de `components/Nav.tsx`.

## Modelo de datos

No se introducen estructuras de datos persistentes. El único "dato" es el payload transitorio del formulario (`{ name, email, message }`), validado y reenviado a Resend sin guardarse en ningún storage.

## Plan de implementación

1. **Dependencia y entorno** — `npm install resend`. Crear `.env.example` con `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL` como placeholders vacíos. El usuario copia esto a `.env.local` con sus valores reales (`CONTACT_TO_EMAIL=horacio.cpp@gmail.com`, remitente verificado en `RESEND_FROM_EMAIL`, y su API key en `RESEND_API_KEY`).
2. **CSS** — Migrar el bloque `ABOUT PAGE` (líneas 1071–1146 de `styles.css`) a `app/globals.css`, agregando además una clase `.terminal-error` (copia de `.terminal-success` con paleta magenta) para el estado de error.
3. **API route** — Crear `app/api/contact/route.ts`: valida el body, instancia `new Resend(process.env.RESEND_API_KEY)`, llama a `resend.emails.send(...)` con los campos descritos en Alcance, y devuelve `200` en éxito o `400`/`502` según el caso.
4. **`app/acerca-de/page.tsx`** — Migrar el JSX de `about.jsx` como client component: hero de misión + highlights (`HighlightIcon`), divisor animado (`reveal`/`IntersectionObserver` igual que el resto del sitio), y formulario de contacto con los tres estados (formulario, enviando, éxito, error) descritos en Alcance, usando `fetch("/api/contact")`.
5. **`components/Nav.tsx`** — Agregar el link "Acerca de" → `/acerca-de` en desktop y móvil, y el caso correspondiente en `isActive`.
6. **Verificación final** — `npm run lint` y `npm run build` sin errores; navegar `/acerca-de` manualmente y probar: envío exitoso (con `RESEND_API_KEY` válida) muestra el terminal verde; forzar un error (API key inválida o campo vacío que pase validación de cliente pero falle en servidor) muestra el terminal magenta con opción de reintentar; confirmar que "Acerca de" resalta en el Nav solo en `/acerca-de`.

## Criterios de aceptación

- [ ] `/acerca-de` renderiza el hero de misión, los tres highlights, el divisor animado y la sección de contacto, con la misma estética que `about.jsx`.
- [ ] Enviar el formulario con campos vacíos dispara la animación `shake` y no llama a la API.
- [ ] Enviar el formulario con datos válidos llama a `POST /api/contact`, muestra el estado "ENVIANDO..." con el botón deshabilitado, y al recibir éxito muestra el terminal verde con el nombre del remitente.
- [ ] Si `POST /api/contact` responde con error (o el fetch falla), se muestra el terminal magenta de error con opción de volver a intentar (regresa al formulario con los datos ingresados o vacíos).
- [ ] `app/api/contact/route.ts` rechaza con `400` si falta `name`, `email` o `message`, o si `email` no es válido, sin llamar a Resend.
- [ ] `app/api/contact/route.ts` usa `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CONTACT_TO_EMAIL` desde variables de entorno (ninguna hardcodeada en el código).
- [ ] `.env.example` existe en la raíz del repo con las tres variables documentadas (sin valores reales).
- [ ] El Nav (desktop y móvil) muestra "Acerca de" → `/acerca-de`, resaltado solo cuando la ruta activa es `/acerca-de`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Ruta `/acerca-de` en vez de `/about`.** Motivo (decisión del usuario): consistencia con el resto de rutas del sitio, todas en español (`/juegos`, `/salon`, `/auth`).
- **API Route (`app/api/contact/route.ts`) en vez de Server Action.** Motivo (decisión del usuario): patrón explícito y estándar de App Router para mantener la API key de Resend fuera del cliente.
- **Validación server-side además de la de cliente.** Motivo (decisión del usuario): la API route es un endpoint público y no debe confiar únicamente en la validación del formulario.
- **Estado de error como variante del terminal (`.terminal-error`, magenta) en vez de un mensaje simple.** Motivo (decisión del usuario): mantiene la estética retro consistente con el resto del template en vez de romper el patrón visual con un mensaje de error genérico.
- **Remitente (`RESEND_FROM_EMAIL`) y API key quedan como placeholders en `.env.example`, no hardcodeados en la spec.** Motivo (decisión del usuario): ya tiene cuenta y remitente verificado en Resend, pero esos valores no deben quedar en el repo ni en la spec.
- **No se persisten los mensajes de contacto.** Motivo: el prototipo no lo hacía y el alcance de esta spec es solo habilitar el envío real por correo, no un sistema de tickets/historial.
- **No se agrega protección anti-spam (CAPTCHA, rate limiting).** Motivo: fuera del alcance de esta spec; puede abordarse en una spec futura si se detecta abuso.

## Riesgos identificados

- **Dependencia de configuración externa.** Si `.env.local` no tiene `RESEND_API_KEY`/`RESEND_FROM_EMAIL` válidos, todo envío fallará y solo se verá el estado de error — esperado, pero requiere que el usuario configure sus credenciales antes de probar el flujo de éxito.
- **Remitente no verificado en Resend.** Si `RESEND_FROM_EMAIL` no está verificado en la cuenta de Resend, la API devolverá error incluso con una key válida; el mensaje de error genérico en el terminal magenta no distingue esta causa de otras (fuera de alcance dar detalle granular del error de Resend en la UI).
