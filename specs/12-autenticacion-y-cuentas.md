# SPEC 12 — Autenticación y cuentas

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-09-07
> **Objetivo:** Reemplazar el mock de `/auth` (`localStorage` bajo `av_user`) por autenticación real de Supabase (email+contraseña, Google, GitHub) con perfiles de jugador (`profiles.nickname`), vinculando `scores` a un usuario real y cerrando el RLS deshabilitado en `games` y `scores`.

## Por qué esta spec existe

`games` y `scores` tienen **Row Level Security deshabilitado** hoy: cualquiera con la key publicable del sitio puede leer, insertar o borrar cualquier fila de cualquier tabla, incluido el leaderboard. Esta spec no es solo una pantalla de login — es también el cierre de ese agujero, porque una política RLS correcta en `scores` (insert solo si `auth.uid() = user_id`) requiere que exista una sesión real primero.

## Alcance

**Incluye:**

- Registro e inicio de sesión con **email + contraseña**, con confirmación de correo obligatoria (Supabase envía el correo; sin confirmar, no hay sesión activa).
- Inicio de sesión con **OAuth Google** y **OAuth GitHub** (`supabase.auth.signInWithOAuth`).
- Ruta `/auth/callback` que intercambia el código de OAuth/confirmación de correo por una sesión (`exchangeCodeForSession`).
- Tabla nueva `public.profiles` con un `nickname` único por usuario (3–10 caracteres, `A-Z0-9_`, siempre en mayúsculas), creada automáticamente al registrarse por email vía trigger en `auth.users`.
- Ruta `/auth/nickname`: paso obligatorio tras el primer login por Google/GitHub cuando el usuario todavía no tiene fila en `profiles` (el proveedor no da un nickname arcade, solo nombre/usuario externo).
- Recuperación de contraseña: ruta `/auth/recuperar` (pide el correo, dispara `resetPasswordForEmail`) y `/auth/nueva-contrasena` (fija la nueva contraseña tras volver del enlace del correo).
- Un hook/provider de sesión compartido (`lib/supabase/session.ts` + `components/SessionProvider.tsx`) que expone el usuario y su `nickname` actual a los client components, sustituyendo toda lectura de `localStorage.av_user`.
- Botón de cuenta en `Nav.tsx`: sigue siendo "un clic cierra sesión" como hoy, pero ahora llama a `supabase.auth.signOut()` y refleja el `nickname` de `profiles`, no el `{name}` de `localStorage`.
- `PlayerClient.tsx`: sin sesión, el modal de fin de partida no muestra el input de nombre — muestra un CTA "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" que lleva a `/auth`. Con sesión, guarda automáticamente con el `nickname` del perfil (ya no se edita el nombre a mano en el modal).
- `HallOfFameClient.tsx`: deja de leer `av_user`; solo usa la sesión para, si existe, resaltar las filas del propio jugador (comportamiento ya existente, ahora con la fuente de datos correcta).
- Activar **RLS** en `games` (select público, sin insert/update/delete desde el cliente) y `scores` (select público, insert solo si `auth.uid() = user_id`, sin update/delete desde el cliente).
- Recrear `increment_plays` y el trigger `sync_game_best` como `SECURITY DEFINER` con `search_path` fijo, porque con RLS activo dejarían de poder escribir en `games` desde una llamada autenticada con permisos limitados.
- Migración de datos: agregar `scores.user_id` (`uuid`, FK a `auth.users`, `NOT NULL`), borrar las 18 filas históricas de `scores` (no tienen usuario real asociado) y resetear `games.best = 0` en las 5 filas de `games` (se conserva `games.plays`).
- Eliminar por completo `localStorage.av_user`: ninguna lectura ni escritura queda en el código tras esta spec.

**No incluye (para specs futuras):**

- Página `/cuenta` con historial de puntajes propios o edición de perfil.
- Menú desplegable de cuenta en el Nav (avatar, links a "Mi cuenta", etc.) — el botón sigue siendo un solo clic para cerrar sesión.
- Edición del `nickname` después de creado.
- Avatares o imagen de perfil.
- Roles o permisos de administrador.
- Magic link (login sin contraseña) — se descartó a favor de email+contraseña explícito.
- Borrado de cuenta (`auth.admin.deleteUser` o autoservicio).
- Cualquier otro proveedor OAuth además de Google y GitHub.
- Rate limiting o CAPTCHA en los formularios de auth (se apoya en las protecciones por defecto de Supabase Auth).

## Modelo de datos

```sql
-- Tabla nueva
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now(),
  constraint nickname_format check (nickname ~ '^[A-Z0-9_]{3,10}$')
);

-- Trigger: crea el perfil al registrarse por email (toma el nickname de
-- user_metadata, escrito por el formulario de registro antes del signUp).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'nickname' then
    insert into public.profiles (id, nickname)
    values (new.id, new.raw_user_meta_data->>'nickname');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- scores gana dueño real
alter table public.scores
  add column user_id uuid not null references auth.users(id);

-- Se borra el histórico sin usuario real y se resetea el récord mostrado.
delete from public.scores;
update public.games set best = 0;

-- RLS
alter table public.games enable row level security;
create policy "games_select_public" on public.games
  for select using (true);

alter table public.scores enable row level security;
create policy "scores_select_public" on public.scores
  for select using (true);
create policy "scores_insert_own" on public.scores
  for insert with check (auth.uid() = user_id);

-- Recreadas como SECURITY DEFINER para seguir funcionando con RLS activo
create or replace function public.increment_plays(p_game_id text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.games set plays = plays + 1
  where id = p_game_id
  returning plays;
$$;

create or replace function public.sync_game_best()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games
  set best = greatest(coalesce(best, 0), new.score)
  where id = new.game_id;
  return new;
end;
$$;
```

```ts
// lib/supabase/session.ts
export interface SessionUser {
  id: string;
  email: string | null;
  nickname: string | null; // null = falta completar /auth/nickname
}
```

`saveScore` (`app/actions/games.ts`) pasa a recibir `userId` en vez de confiar en `playerName` suelto: el `player_name` insertado en `scores` se resuelve en el server a partir de `profiles.nickname` del usuario autenticado, no del valor que mande el cliente.

## Plan de implementación

1. **Migración Supabase** (vía `mcp__supabase__apply_migration`) — crear `profiles`, el trigger `handle_new_user`, agregar `scores.user_id`, borrar el histórico de `scores`, resetear `games.best`, activar RLS con las políticas de arriba y recrear `increment_plays`/`sync_game_best` como `SECURITY DEFINER`. Verificación: `mcp__supabase__get_advisors` ya no reporta `rls_disabled`.
2. **`lib/supabase/session.ts` + `components/SessionProvider.tsx`** — provider que envuelve `app/layout.tsx`, se suscribe a `supabase.auth.onAuthStateChange`, y expone `{ user, nickname, loading }` vía un hook `useSession()`. No cambia ninguna pantalla todavía.
3. **`/auth` real** — pestaña "CREAR CUENTA" llama a `supabase.auth.signUp({ email, password, options: { data: { nickname } } })` con el campo de nickname agregado al formulario; pestaña "INICIAR SESIÓN" llama a `signInWithPassword`. Botones de Google/GitHub llaman a `signInWithOAuth`. Se quita "JUGAR COMO INVITADO" como escritura de `localStorage` (ya no hace falta: sin sesión, ya se juega como invitado por defecto).
4. **`/auth/callback`** — route handler que llama a `exchangeCodeForSession(code)` y redirige a `/auth/nickname` si el perfil no existe, o a `/` si ya existe.
5. **`/auth/nickname`** — formulario de un campo, valida el patrón `^[A-Z0-9_]{3,10}$` en cliente y servidor, inserta la fila en `profiles`, redirige a `/`.
6. **Recuperar contraseña** — `/auth/recuperar` llama a `resetPasswordForEmail` con `redirectTo` a `/auth/nueva-contrasena`; esa ruta llama a `supabase.auth.updateUser({ password })` usando la sesión de recuperación ya activa por el enlace.
7. **Rewire de consumidores** — `Nav.tsx`, `HallOfFameClient.tsx` y `PlayerClient.tsx` pasan a usar `useSession()` en vez de `localStorage.getItem("av_user")`; se borran todas las líneas que tocan `av_user`. `PlayerClient` reemplaza el input de nombre en el modal por el CTA a `/auth` cuando no hay sesión, y guarda automáticamente con el `nickname` de la sesión cuando sí la hay. `app/actions/games.ts`: `saveScore` deja de aceptar `playerName` y resuelve el nickname en el server desde `profiles` usando el usuario de la sesión del server client.
8. **Verificación final** — `npm run lint` y `npm run build` sin errores; registrar una cuenta por email, confirmar el correo, jugar y guardar un puntaje; cerrar sesión y confirmar que el modal de fin de partida ya no deja guardar; iniciar sesión con Google/GitHub en un usuario nuevo y confirmar que redirige a `/auth/nickname` antes de dejar continuar; recuperar contraseña de punta a punta; confirmar en `mcp__supabase__get_advisors` que no queda ninguna alerta `rls_disabled`.

## Criterios de aceptación

- [ ] `public.profiles` existe con `nickname` `UNIQUE` y el constraint de formato `^[A-Z0-9_]{3,10}$`.
- [ ] Registrarse por email crea la sesión solo después de confirmar el correo (sin confirmar, `signInWithPassword` falla).
- [ ] Iniciar sesión con Google o GitHub por primera vez redirige a `/auth/nickname` y no dispara doble alta en `profiles` si se repite el login.
- [ ] `scores.user_id` es `NOT NULL` y referencia `auth.users`; las 18 filas históricas fueron borradas y las 5 filas de `games` tienen `best = 0`.
- [ ] Con RLS activo, un usuario autenticado puede insertar en `scores` solo con su propio `user_id`; un intento de insertar con otro `user_id` es rechazado por la política.
- [ ] `mcp__supabase__get_advisors` ya no reporta la alerta `rls_disabled` para `games` ni `scores`.
- [ ] `increment_plays` y `sync_game_best` siguen funcionando (contador de partidas y récord del juego se actualizan) con RLS activo.
- [ ] Sin sesión, el modal de fin de partida en `/juegos/[id]/jugar` no permite guardar puntaje y muestra un CTA a `/auth`.
- [ ] Con sesión, terminar una partida guarda el puntaje automáticamente con el `nickname` del perfil, sin pedir escribirlo a mano.
- [ ] `Nav.tsx` refleja el `nickname` real de la sesión activa y `signOut()` limpia el estado en toda la app sin recargar la página.
- [ ] Recuperar contraseña funciona de punta a punta: pedir el enlace, abrirlo, fijar nueva contraseña, iniciar sesión con la nueva contraseña.
- [ ] Ninguna referencia a `localStorage` con la clave `av_user` queda en el código (`Nav.tsx`, `HallOfFameClient.tsx`, `PlayerClient.tsx`, `app/auth/page.tsx`).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Email+contraseña, Google y GitHub, sin magic link.** Motivo (decisión del usuario): cubre el caso principal (contraseña) y los dos accesos sociales más comunes; magic link se descarta por ahora para no sumar un tercer flujo de "espera al correo".
- **Sin cuenta se puede jugar pero no guardar puntaje**, en vez de bloquear el juego entero o seguir permitiendo guardar como invitado. Motivo (decisión del usuario): mantiene la fricción mínima para probar el catálogo, pero el leaderboard deja de aceptar nombres arbitrarios sin dueño.
- **Nickname en tabla `profiles` separada, no en `user_metadata`.** Motivo (decisión del usuario): permite un constraint `UNIQUE` real y una política RLS que lo referencia, algo que `raw_user_meta_data` no soporta de forma nativa.
- **Paso extra `/auth/nickname` tras OAuth**, en vez de autogenerar el nombre desde el proveedor. Motivo (decisión del usuario): Google/GitHub no garantizan un nombre corto ni único apto para el leaderboard arcade; se prefiere que el jugador lo elija una vez.
- **`scores.user_id` `NOT NULL` con borrado del histórico**, en vez de dejarlo nullable y conservar las 18 filas viejas. Motivo (decisión del usuario): todo puntaje futuro debe tener dueño verificable para que la política RLS de insert tenga sentido; se acepta perder el leaderboard de prueba actual.
- **RLS y las políticas de `games`/`scores` entran en esta misma spec**, no en una spec de seguridad aparte. Motivo (decisión del usuario): sin sesión real no hay `auth.uid()` contra el cual escribir la política de `scores`, así que separar RLS dejaría el agujero abierto un ciclo más.
- **`increment_plays`/`sync_game_best` recreadas como `SECURITY DEFINER`.** Motivo: hallazgo de la exploración — ambas son hoy funciones sin `SECURITY DEFINER`; con RLS activo y sin permisos de escritura directa sobre `games` para el rol autenticado, dejarían de poder actualizar `plays`/`best`. Se fija también `search_path` para evitar el riesgo de "search path hijacking" propio de `SECURITY DEFINER`.
- **Recuperación de contraseña sí entra en esta spec**; página `/cuenta` y menú de cuenta no. Motivo (decisión del usuario): recuperar contraseña es indispensable para que email+contraseña sea usable en producción; lo demás es conveniencia que puede esperar a otra spec.

## Riesgos identificados

| Riesgo                                                                                                                                                                           | Mitigación                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Google/GitHub OAuth requieren configurar credenciales en cada consola externa y en el dashboard de Supabase antes de que el login social funcione en producción.                 | Documentado como paso manual fuera del repo; en dev se puede probar solo con email+contraseña mientras no estén configurados.                |
| El correo de confirmación puede no llegar o caer en spam en el entorno de desarrollo.                                                                                            | Supabase permite reenviar la confirmación (`resend`); se deja como paso de soporte, no automatizado en esta spec.                            |
| Colisión de `nickname` al elegirlo en `/auth/nickname` o en el registro por email.                                                                                               | El `insert` falla por el `UNIQUE constraint`; el formulario muestra el error y pide otro nickname, sin caída de la app.                      |
| Las funciones `SECURITY DEFINER` recreadas se ejecutan con privilegios del dueño de la función: un `search_path` no fijado permitiría a un atacante inyectar un objeto homónimo. | Ambas funciones fijan `set search_path = public` explícitamente, siguiendo el patrón ya usado en `rls_auto_enable`.                          |
| Borrar las 18 filas de `scores` es irreversible una vez aplicada la migración.                                                                                                   | Se ejecuta como paso explícito y documentado del plan (paso 1), no accidental; el usuario ya aprobó perder el histórico de prueba en Fase 2. |

## Lo que **no** está en esta spec

- Página `/cuenta` con historial de puntajes propios.
- Menú desplegable de cuenta en el Nav.
- Edición de `nickname` después de creado.
- Avatares o imagen de perfil.
- Roles o permisos de administrador.
- Magic link.
- Borrado de cuenta.
- Otros proveedores OAuth además de Google y GitHub.
- Rate limiting o CAPTCHA en los formularios.

Cada uno de estos, si se necesita, va en su propia spec futura.
