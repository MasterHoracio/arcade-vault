# 04 · Integración de Supabase (cliente y conexión)

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-08-28

**Objetivo:** Conectar la aplicación de Next.js al proyecto Supabase ya existente (`ikrncmaaujyolztghiii`) instalando los clientes oficiales, las variables de entorno y el middleware de sesión, sin crear tablas ni implementar Auth/DB real todavía.

## Alcance

**Incluye:**

- Instalar las dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Crear `lib/supabase/client.ts`: cliente de navegador (`createBrowserClient`) para usar desde Client Components.
- Crear `lib/supabase/server.ts`: cliente de servidor (`createServerClient`) para usar desde Server Components y Route Handlers, con el manejo de cookies del patrón oficial de `@supabase/ssr`.
- Crear `middleware.ts` en la raíz del proyecto siguiendo el patrón oficial de `@supabase/ssr` para Next.js App Router: refresca la sesión de Supabase en cada request y sincroniza las cookies entre request/response.
- Actualizar `.env.example` agregando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como placeholders vacíos, junto a las variables ya existentes de Resend. El usuario completa los valores reales en `.env.local` (ya presente y ya en `.gitignore`).
- Crear `app/api/supabase-ping/route.ts`: un `GET` handler temporal que instancia el cliente de servidor y llama a `supabase.auth.getSession()`; responde `200` con `{ ok: true }` si el cliente se conecta sin error, o `500` con el mensaje de error si falla. Sirve para verificar la integración sin necesitar tablas ni pantallas de Auth todavía.

**No incluye:**

- Crear ninguna tabla, esquema o migración en la base de datos (`mcp__supabase__list_tables` confirma que el proyecto está vacío; se queda así al terminar esta spec).
- Reemplazar `av_user`/`localStorage` por Supabase Auth real, ni tocar `app/auth/page.tsx`. Queda para una spec futura de Auth.
- Reemplazar `av_scores`/`localStorage` por una tabla de puntuaciones en Supabase. Queda para una spec futura de DB.
- Row Level Security (RLS), políticas de acceso, o cualquier otra configuración de seguridad de tablas — no aplica todavía porque no hay tablas.
- Cambios a `components/Nav.tsx` o a cualquier pantalla existente (Biblioteca, Detalle, Reproductor, Salón, Acerca de).

## Modelo de datos

No se introducen estructuras de datos nuevas ni tablas en Supabase. Esta spec es exclusivamente la capa de conexión (clientes + middleware + ruta de verificación).

## Plan de implementación

1. **Dependencias** — `npm install @supabase/supabase-js @supabase/ssr`.
2. **Variables de entorno** — Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example` (vacías) y documentar en el mensaje final que el usuario debe completarlas en `.env.local` con la URL del proyecto (`https://ikrncmaaujyolztghiii.supabase.co`) y la publishable key (`sb_publishable_...`, obtenida desde el dashboard de Supabase).
3. **`lib/supabase/client.ts`** — Cliente de navegador con `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **`lib/supabase/server.ts`** — Cliente de servidor con `createServerClient` de `@supabase/ssr`, usando `cookies()` de `next/headers` para leer/escribir las cookies de sesión (patrón oficial: `getAll`/`setAll`).
5. **`middleware.ts`** — Middleware en la raíz que instancia el cliente de servidor con `createServerClient`, llama a `supabase.auth.getUser()` para refrescar la sesión, y sincroniza las cookies entre `request`/`response` (patrón oficial de `@supabase/ssr` para App Router). `matcher` excluye assets estáticos (`_next/static`, `_next/image`, `favicon.ico`).
6. **`app/api/supabase-ping/route.ts`** — Route handler `GET` que usa el cliente de `lib/supabase/server.ts`, llama a `supabase.auth.getSession()`, y responde `200 { ok: true }` o `500 { ok: false, error }`.
7. **Verificación final** — `npm run lint` y `npm run build` sin errores; con `.env.local` completo, `npm run dev` y visitar `/api/supabase-ping` en el navegador confirmando `200 { ok: true }`; detener el servidor, vaciar temporalmente `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` y confirmar que `/api/supabase-ping` responde `500`, luego restaurar el valor.

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` están instalados en `package.json`.
- [ ] `lib/supabase/client.ts` exporta una función que crea un cliente de navegador válido usando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] `lib/supabase/server.ts` exporta una función que crea un cliente de servidor válido, manejando cookies vía `next/headers`.
- [ ] `middleware.ts` existe en la raíz, refresca la sesión de Supabase en cada request, y excluye assets estáticos vía `matcher`.
- [ ] `GET /api/supabase-ping` responde `200 { ok: true }` cuando las variables de entorno son válidas.
- [ ] `GET /api/supabase-ping` responde `500` con un mensaje de error cuando la conexión falla (por ejemplo, `NEXT_PUBLIC_SUPABASE_URL` vacía).
- [ ] `.env.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales.
- [ ] El proyecto Supabase (`ikrncmaaujyolztghiii`) sigue sin tablas al finalizar esta spec (`list_tables` devuelve vacío).
- [ ] Ninguna pantalla existente (`/`, `/juegos`, `/salon`, `/auth`, `/acerca-de`) cambia de comportamiento.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Alcance limitado a la plomería de conexión, sin tablas ni Auth real.** Motivo (decisión del usuario): quiere separar "conectar Supabase" de "usar Supabase" — las specs de Auth y de puntuaciones se abordan después, sobre una base ya conectada.
- **`@supabase/ssr` en vez de solo `@supabase/supabase-js`.** Motivo (decisión del usuario, respuesta "ambos"): `@supabase/ssr` es el paquete oficial recomendado para App Router y depende internamente de `@supabase/supabase-js`, así que instalar `@supabase/ssr` cubre ambos.
- **Clientes en `lib/supabase/client.ts` y `lib/supabase/server.ts` (subcarpeta).** Motivo (decisión del usuario): sigue la convención oficial de la documentación de Supabase para Next.js, facilita encontrar código futuro relacionado (ej. `lib/supabase/middleware.ts` si se necesitara helper compartido).
- **Incluir `middleware.ts` en esta spec en vez de posponerlo a la spec de Auth.** Motivo (decisión del usuario): es parte del patrón oficial de `@supabase/ssr`; agregarlo ahora evita que la spec de Auth tenga que retocar la capa de conexión.
- **Ruta temporal `/api/supabase-ping` para verificar la integración.** Motivo (decisión del usuario): sin tablas ni pantallas de Auth no hay otra forma de confirmar que el cliente se conecta correctamente; queda en el repo como utilidad de diagnóstico, no se elimina automáticamente al terminar la spec.
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave `sb_publishable_...`) en vez de la `anon key` legacy (JWT).** Motivo: Supabase recomienda la publishable key para aplicaciones nuevas por mejor seguridad y rotación independiente; el proyecto ya tiene una publishable key activa (`sb_publishable_...`).
- **Se usa el proyecto Supabase existente (`ikrncmaaujyolztghiii`), no uno nuevo.** Motivo (decisión del usuario): ya está configurado en `.mcp.json` y `.env.local` ya tiene `SUPABASE_DB_PASSWORD`; confirmado vacío (0 tablas) antes de escribir esta spec.

## Riesgos identificados

- **Variables de entorno faltantes o incorrectas.** Si `.env.local` no tiene `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` válidos, `/api/supabase-ping` y cualquier código futuro que use los clientes fallará; esperado y es justamente lo que la ruta de verificación expone.
- **Middleware mal configurado puede romper rutas existentes.** Un `matcher` demasiado amplio en `middleware.ts` podría interceptar rutas estáticas o de API innecesariamente; se sigue el patrón oficial de `@supabase/ssr` y se verifica manualmente que las 5 pantallas existentes siguen funcionando tras agregarlo.
