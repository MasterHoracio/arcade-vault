# SPEC 13 — Medidas de seguridad básicas

> **Estado:** Draft
> **Depende de:** SPEC 04, SPEC 12
> **Fecha:** 2026-09-14
> **Objetivo:** Cerrar los hallazgos de `references/security/security-checklist.md` que siguen pendientes en el repo — revocar el `EXECUTE` público de las funciones `SECURITY DEFINER` de solo-trigger, agregar los 3 headers de seguridad HTTP en Next.js, validar en el cliente que toda contraseña nueva cumpla longitud y complejidad mínima, y proteger las rutas de autenticación en `proxy.ts` para que un usuario con sesión activa no vea las pantallas de login/registro, dejando el punto de extensión para rutas con auth forzada.

## Por qué esta spec existe

El checklist trae dos partes: una lista corta de 5 ítems y, debajo, el reporte crudo de `mcp__supabase__get_advisors`. Al re-correr ese advisor ahora mismo (2026-09-14) se encontró que:

- **RLS en `games` y `scores` ya está habilitado** (`rls_enabled: true` en ambas, confirmado vía `mcp__supabase__list_tables`) — quedó resuelto en SPEC 12, el checklist estaba desactualizado en ese punto.
- **Password mínimo, leaked password protection y signup rate limit** son configuración de Supabase Auth (dashboard), no código de este repo — el usuario ya los aplicó ahí. `auth_leaked_password_protection` seguía en `WARN` en el último `get_advisors`; se deja como criterio de aceptación re-verificarlo, sin bloquear el resto de la spec si la propagación tarda.
- El advisor **también** marca 3 funciones `SECURITY DEFINER` (`handle_new_user`, `sync_game_best`, `rls_auto_enable`) como ejecutables directamente por `anon`/`authenticated` vía `/rest/v1/rpc/...`. Son funciones pensadas para dispararse solo como trigger; nunca se llaman por RPC desde el código de la app. `increment_plays` es la excepción: `registerPlay` (`app/actions/games.ts`) sí la invoca a propósito vía `supabase.rpc()` para contar partidas de invitados, así que no se toca.
- El único ítem 100% código-en-repo que quedaba abierto era el de **headers de seguridad**, y a pedido del usuario se suma **validación de complejidad de contraseña** (no estaba en el checklist original, mínimo real hoy: `/auth` no valida nada, `/auth/nueva-contrasena` solo exige 6 caracteres).
- A pedido del usuario se suma también **protección de rutas de autenticación** en `proxy.ts`: hoy ese archivo solo refresca la sesión (`await supabase.auth.getUser()`) y no filtra nada — un usuario autenticado puede abrir `/auth` y ver el formulario de login y el tab "CREAR CUENTA" como si no tuviera sesión. Tampoco existe hoy ningún mecanismo central para forzar autenticación en rutas que lo necesiten — no hay un solo `redirect()` de guard en la app (el único guard es del lado del cliente, en `app/auth/nickname/page.tsx`). El proxy es el lugar natural para ambas cosas.

## Alcance

**Incluye:**

- Migración Supabase: `REVOKE EXECUTE ... FROM anon, authenticated` sobre `public.handle_new_user()`, `public.sync_game_best()` y `public.rls_auto_enable()`. `public.increment_plays(text)` no se toca.
- `next.config.ts`: función `headers()` async que aplica a toda ruta (`source: '/(.*)'`) los 3 headers del checklist: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- `app/auth/page.tsx`: constante `PASSWORD_PATTERN` (regex) y validación antes de llamar `supabase.auth.signUp` en el tab "CREAR CUENTA", mismo patrón que ya usa `NICKNAME_PATTERN` en ese archivo (constante local, validación inline, mensaje de error en mayúsculas).
- `app/auth/nueva-contrasena/page.tsx`: reemplaza el chequeo actual (`password.length < 6`) por la misma `PASSWORD_PATTERN`, con su propio mensaje de error.
- Regex de contraseña: mínimo 8 caracteres, al menos una minúscula, una mayúscula, un dígito y un símbolo del set estándar OWASP (`!@#$%^&*()_+-=[]{};':"\|,.<>/?~\``).
- `proxy.ts`: dos constantes a nivel de módulo — `AUTH_ROUTES` (rutas públicas de autenticación que se bloquean **con** sesión) y `PROTECTED_ROUTES` (rutas que exigen sesión; **nace vacío** en esta spec).
- `AUTH_ROUTES = ["/auth", "/auth/recuperar"]`. Con sesión válida, ambas responden `NextResponse.redirect(new URL("/", request.nextUrl))`.
- Match **exacto** de pathname (`AUTH_ROUTES.includes(path)`), no `startsWith`, para que las subrutas de `/auth` no se bloqueen por arrastre.
- Exclusiones explícitas de `AUTH_ROUTES` — estas rutas **no** se bloquean nunca aunque haya sesión, porque el usuario legítimamente ya está autenticado dentro de ellas: `/auth/callback` (route handler de `exchangeCodeForSession`; redirigirlo rompe OAuth y la confirmación de correo), `/auth/nickname` (el usuario de OAuth ya tiene sesión pero todavía no tiene fila en `profiles`; redirigirlo lo deja sin poder crear su perfil) y `/auth/nueva-contrasena` (se entra con la sesión de recuperación ya activa; redirigirlo impide cambiar la contraseña).
- `PROTECTED_ROUTES: string[] = []` más el bloque `if` que redirige a `/auth` cuando no hay sesión, dejado en su lugar y comentado como punto de extensión — agregar una ruta protegida a futuro es agregar su string a ese arreglo, nada más.
- El chequeo reutiliza el `user` que ya devuelve `await supabase.auth.getUser()` (hoy se descarta), sin agregar un segundo round-trip a Supabase. El `NextResponse.redirect` copia las cookies de `supabaseResponse` (`supabaseResponse.cookies.getAll().forEach(...)`) para no perder el token recién refrescado. `config.matcher` de `proxy.ts` se mantiene igual — el filtrado por ruta vive en los dos arreglos, no en el matcher.
- Re-verificación con `mcp__supabase__get_advisors` al cerrar la spec, para confirmar qué quedó resuelto y dejar registrado lo que siga pendiente fuera del repo.

**No incluye (para specs futuras o fuera del repo):**

- Cambiar longitud mínima, leaked password protection o signup rate limit vía migración/código — ya están configurados por el usuario directamente en el dashboard de Supabase Auth, fuera de este repo.
- Una server action nueva para revalidar la contraseña en el servidor — la validación de complejidad queda solo en cliente, como capa de UX; el enforcement duro del mínimo sigue siendo responsabilidad de Supabase Auth (ya configurado).
- Headers adicionales no listados en el checklist (`Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, etc.).
- Rate limiting o CAPTCHA a nivel de aplicación Next.js — se apoya en la configuración nativa de Supabase Auth.
- Cualquier alcance ya cerrado o descartado en SPEC 12 (página `/cuenta`, roles de administrador, magic link, etc.).
- Proteger rutas concretas con auth forzada (`/juegos/[id]/jugar`, una futura `/cuenta`, etc.) — esta spec solo deja el arreglo `PROTECTED_ROUTES` y su bloque de redirect listos y vacíos.
- Soporte de `?next=` / return-url tras el login: el redirect desde una `AUTH_ROUTE` con sesión va siempre a `/`.
- Mover el guard cliente de `app/auth/nickname/page.tsx` al proxy — sigue igual.
- Deep-link al tab "crear cuenta" (`?tab=up`) — hoy `tab` es estado local en `app/auth/page.tsx` y no hay `useSearchParams` en el proyecto.

## Modelo de datos

Esta spec no introduce estructuras de datos nuevas. Solo cambia permisos (`GRANT`/`REVOKE`) sobre funciones ya existentes de SPEC 12.

## Plan de implementación

1. **Migración Supabase** (vía `mcp__supabase__apply_migration`): `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;` y lo mismo para `public.sync_game_best()` y `public.rls_auto_enable()`. Verificación: `mcp__supabase__get_advisors(type: "security")` ya no lista esas 3 funciones en `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`, y sigue listando (o no) `increment_plays` sin cambios.
2. **`next.config.ts` — headers de seguridad.** Agregar `headers: async () => [{ source: '/(.*)', headers: securityHeaders }]` con los 3 headers del checklist. Manual: `npm run dev` y `curl -I http://localhost:3000/` confirma los 3 headers en la respuesta.
3. **`proxy.ts` — protección de rutas.** Declarar `AUTH_ROUTES` y `PROTECTED_ROUTES` a nivel de módulo. Capturar el resultado de `supabase.auth.getUser()` (`const { data: { user } } = await ...`). Si `user` existe y `AUTH_ROUTES.includes(request.nextUrl.pathname)` → redirect a `/` copiando las cookies de `supabaseResponse`. Si `!user` y `PROTECTED_ROUTES.includes(pathname)` → redirect a `/auth` (bloque inerte hoy, `PROTECTED_ROUTES` vacío). En caso contrario, `return supabaseResponse` como hoy. Antes de escribir, leer `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` (Next 16 renombró Middleware → Proxy). Manual: con sesión activa, navegar a `/auth` y a `/auth/recuperar` → ambas caen en `/`; sin sesión, ambas se ven normal; con sesión, `/auth/callback`, `/auth/nickname` y `/auth/nueva-contrasena` siguen accesibles.
4. **`app/auth/page.tsx` — validación de contraseña en signup.** Agregar `PASSWORD_PATTERN` y el chequeo dentro de `submit()` para `tab === "up"`, antes de llamar `signUp`, con mensaje de error en mayúsculas consistente con el resto del formulario. Manual: intentar crear cuenta con una contraseña débil (ej. `abc12345`) y confirmar que no se llama a Supabase; con una válida (ej. `Vault_2026!`) el flujo sigue normal.
5. **`app/auth/nueva-contrasena/page.tsx` — mismo patrón en reset.** Reemplazar el chequeo de longitud por `PASSWORD_PATTERN`, actualizar el mensaje de error. Manual: mismo par de casos (débil rechazada, válida completa el flujo) en esta pantalla.
6. **Verificación final.** `npm run lint` y `npm run build` sin errores. Registrar una cuenta nueva por email y guardar un puntaje para confirmar que el trigger `on_auth_user_created` y `sync_game_best` siguen funcionando tras revocar el `EXECUTE` directo. Re-correr `mcp__supabase__get_advisors(type: "security")` y registrar en la spec (al marcarla Implementada) qué hallazgos quedaron resueltos y cuáles siguen abiertos fuera del repo.

## Criterios de aceptación

- [ ] `mcp__supabase__get_advisors` ya no reporta `handle_new_user`, `sync_game_best` ni `rls_auto_enable` en los lints `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable`.
- [ ] `increment_plays` sigue siendo ejecutable por `anon`/`authenticated` (su `EXECUTE` no fue revocado).
- [ ] Registrar una cuenta por email y guardar un puntaje siguen funcionando después de la migración (el trigger de alta de perfil y la actualización de `games.best` se disparan igual que antes).
- [ ] Toda ruta responde con `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] En `/auth`, crear cuenta con una contraseña que no cumpla el patrón (falta mayúscula, minúscula, dígito o símbolo, o menos de 8 caracteres) muestra el error y no llama a `signUp`.
- [ ] En `/auth/nueva-contrasena`, fijar una contraseña que no cumpla el patrón muestra el error y no llama a `updateUser`.
- [ ] Una contraseña que cumple el patrón (ej. `Vault_2026!`) completa el flujo normal en ambas pantallas.
- [ ] Con sesión activa, navegar a `/auth` redirige a `/` y nunca se renderiza el formulario (ni el tab "CREAR CUENTA").
- [ ] Con sesión activa, navegar a `/auth/recuperar` redirige a `/`.
- [ ] Sin sesión, `/auth` y `/auth/recuperar` se ven y funcionan igual que hoy.
- [ ] Con sesión activa, `/auth/callback`, `/auth/nickname` y `/auth/nueva-contrasena` siguen accesibles — login con Google de un usuario sin perfil llega a `/auth/nickname`, y el enlace de reset de contraseña llega a `/auth/nueva-contrasena`.
- [ ] Tras el redirect desde `/auth`, la sesión sigue activa (el Nav muestra el nickname), confirmando que las cookies refrescadas no se perdieron.
- [ ] `PROTECTED_ROUTES` existe en `proxy.ts`, está vacío, y su bloque de redirect a `/auth` está escrito y comentado como punto de extensión.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **RLS en `games`/`scores` se documenta como ya resuelto (SPEC 12), sin criterio de aceptación que lo repita como trabajo nuevo.** Motivo (decisión del usuario): confirmado vía `list_tables` que ya está activo; no hay nada que implementar ahí.
- **Se revoca `EXECUTE` a `handle_new_user`, `sync_game_best` y `rls_auto_enable`, pero no a `increment_plays`.** Motivo (decisión del usuario): las tres primeras son funciones de trigger que nunca se llaman por RPC desde el código; `increment_plays` sí se invoca a propósito desde `registerPlay` para contar partidas de invitados sin sesión.
- **Longitud mínima, leaked password protection y signup rate limit quedan fuera de esta spec.** Motivo (decisión del usuario): ya los configuró directamente en el dashboard de Supabase Auth; no son cambios de este repo. Se deja como criterio de aceptación re-verificar `auth_leaked_password_protection` porque el último `get_advisors` corrido en esta spec todavía lo marcaba `WARN`.
- **Validación de contraseña solo en cliente, mismo patrón que `NICKNAME_PATTERN`.** Motivo (decisión del usuario): no existen server actions para signup/reset hoy (llaman a `supabase.auth.*` directo desde el cliente); se mantiene la misma convención en vez de introducir una capa server nueva. El enforcement duro de longitud queda en Supabase Auth, ya configurado.
- **Charset de símbolo: set estándar OWASP.** Motivo (decisión del usuario): cobertura amplia de símbolos de teclado en un único regex, en vez de un set reducido.
- **Solo los 3 headers del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).** Motivo (decisión del usuario): no se suma `Strict-Transport-Security` ni `Permissions-Policy` — se implementa exactamente lo que pide el checklist, sin ampliar el alcance.
- **Solo `/auth` y `/auth/recuperar` se bloquean con sesión activa.** Motivo (decisión del usuario): son las únicas dos pantallas pensadas para usuarios sin sesión. `/auth/callback`, `/auth/nickname` y `/auth/nueva-contrasena` se excluyen a propósito porque el usuario ya tiene sesión dentro de esos flujos.
- **El redirect va siempre a `/`, sin `?next=`.** Motivo (decisión del usuario): mantener el cambio simple; no hay hoy un flujo que dependa de volver a la ruta de origen.
- **`PROTECTED_ROUTES` nace vacío.** Motivo (decisión del usuario): se quiere el punto de extensión listo y documentado, pero elegir qué pantallas exigen sesión forzada es una decisión de producto de otra spec.
- **El chequeo se hace en el proxy sobre la sesión del cookie, no como reemplazo de RLS.** Motivo: la doc de Next 16 (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, sección "Use cases") es explícita en que Proxy sirve para _optimistic checks_ y no como solución completa de autorización; el enforcement real sigue en las políticas RLS de SPEC 12.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revocar `EXECUTE` sobre `handle_new_user`/`sync_game_best` podría romper el alta de perfil o la actualización de `games.best` si dependieran de una llamada RPC directa en vez de dispararse solo por trigger. | Los triggers se ejecutan con los privilegios de quien definió la función (`SECURITY DEFINER`), no requieren `EXECUTE` del rol que dispara el evento. Se verifica en el paso 6 del plan registrando una cuenta y guardando un puntaje tras la migración. |
| `auth_leaked_password_protection` puede seguir en `WARN` si la config del dashboard no se guardó o no propagó a tiempo.                                                                                        | Se re-corre `get_advisors` como último paso del plan y se documenta el resultado; no bloquea el resto de los criterios de aceptación de esta spec, que son sobre código del repo.                                                                       |
| La validación de complejidad de contraseña es solo cliente: un request directo a la API de Supabase Auth (sin pasar por el formulario) podría saltarse el chequeo de mayúscula/minúscula/dígito/símbolo.       | Supabase Auth ya aplica su propio mínimo de longitud (8, configurado en el dashboard); la complejidad completa queda como capa de UX, no de enforcement duro — decisión aceptada por el usuario.                                                        |
| Un match por `startsWith("/auth")` bloquearía `/auth/callback`, `/auth/nickname` y `/auth/nueva-contrasena`, rompiendo OAuth, el alta de perfil y el reset de contraseña.                                      | Match exacto con `AUTH_ROUTES.includes(pathname)` y las 3 rutas listadas explícitamente como excluidas en el alcance; se prueban una por una en el paso 3 del plan.                                                                                     |
| Devolver un `NextResponse.redirect` nuevo descarta las cookies que `setAll` escribió sobre `supabaseResponse`, perdiendo el token refrescado en ese request.                                                   | El redirect copia las cookies de `supabaseResponse` antes de devolverse; se verifica que tras el redirect desde `/auth` la sesión sigue activa (el Nav sigue mostrando el nickname).                                                                    |

## Lo que **no** está en esta spec

- Cambios a longitud mínima, leaked password protection o signup rate limit vía migración/código — ya configurados en el dashboard de Supabase Auth.
- Server action nueva para validar contraseña en el servidor.
- Headers adicionales (`Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, etc.) no listados en el checklist.
- Rate limiting o CAPTCHA a nivel de aplicación Next.js.
- Cualquier alcance ya cerrado en SPEC 12 (página `/cuenta`, roles de administrador, magic link, borrado de cuenta, otros proveedores OAuth).
- Proteger rutas concretas con auth forzada (`/juegos/[id]/jugar`, una futura `/cuenta`, etc.) — solo se deja el arreglo `PROTECTED_ROUTES` y su bloque de redirect listos y vacíos.
- Soporte de `?next=` / return-url tras el login.
- Mover el guard cliente de `app/auth/nickname/page.tsx` al proxy.
- Deep-link al tab "crear cuenta" (`?tab=up`) en `/auth`.

Cada uno de estos, si se necesita, va en su propia spec futura.
