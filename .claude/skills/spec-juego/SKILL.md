---
name: spec-juego
description: Diseña la spec de un juego nuevo para Arcade Vault — engine, canvas, HUD, cover, fila en la tabla games y leaderboard. Portando un juego de references/started-games/ o creándolo desde cero. Úsala antes de escribir código; la implementación la hace /spec-impl.
disable-model-invocation: true
argument-hint: "nombre del juego o carpeta de references/started-games/"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*), mcp__supabase__execute_sql, mcp__supabase__list_tables
---

# /spec-juego — Diseñador de specs para juegos nuevos

## Contexto de sesión

Fecha de hoy (úsala para el header de la spec, nunca la adivines):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

Juegos de referencia disponibles para portar:
!`ls references/started-games/ 2>/dev/null || echo "No hay carpeta references/started-games/"`

Engines ya portados a TypeScript:
!`ls lib/games/ 2>/dev/null || echo "lib/games/ no existe todavía"`

¿Ya existe el registro de juegos (evita repetir ese paso si ya se hizo)?
!`grep -l "registry" components/PlayerClient.tsx lib/games/registry.ts 2>/dev/null || echo "No existe lib/games/registry.ts todavía — el refactor sigue pendiente"`

---

Esta skill produce una spec lista para `/spec-impl` que agrega **un juego nuevo** a Arcade Vault, con su engine, su HUD, su cover y su entrada en el leaderboard. **No escribe código.**

## Base: usa la skill `/spec`, no la reinventes

Esta skill **no define su propio método para escribir specs** — es una especialización de `/spec` para el dominio "juego nuevo". Antes de hacer cualquier otra cosa:

1. Lee `.agents/skills/spec/SKILL.md` completo (el mismo archivo que usa `/spec`) y su `.agents/skills/spec/template.md`. Ese es el método a seguir: las cuatro fases (Entender el contexto → Aclarar con preguntas → Escribir la spec → Guardar), el formato de bloques de preguntas, el criterio de corte de la Fase 2, el modo "sección por sección" vs. "spec completa de una vez" en la Fase 3, y el esqueleto exacto de secciones del `template.md`.
2. Todo lo que sigue en este archivo (`SKILL.md` de `spec-juego`) y en `integracion.md` **complementa** ese método — no lo sustituye. Donde `spec/SKILL.md` dice "haz X", hazlo igual aquí. Lo que agrega `spec-juego` es: qué contexto adicional leer en la Fase 1 (el `game.js` de referencia, el catálogo de Supabase), qué categorías de preguntas son específicas de un juego en la Fase 2, y qué contenido concreto va en cada sección del `template.md` para este tipo de spec en la Fase 3.
3. Si alguna vez `spec/SKILL.md` cambia (nuevas reglas, nuevo formato de header, etc.), esta skill hereda ese cambio automáticamente por seguir leyéndolo en vivo — no dupliques su contenido aquí de forma que pueda quedar desactualizado.

Tu trabajo, siguiendo ese método: reunir los hechos concretos (del `game.js` de referencia si existe, o de las respuestas del usuario si no existe), hacer las preguntas que cambian el diseño, y escribir la spec siguiendo el `template.md` hasta que quede lista para guardar en `specs/`.

Además de `spec/template.md`, lee `integracion.md` (en el mismo directorio que esta skill) — describe el patrón de cableado end-to-end que toda spec generada aquí debe seguir, con los archivos y líneas reales del proyecto.

Tus respuestas deben estar en el mismo idioma que las specs existentes del proyecto (español, salvo que el usuario indique lo contrario) — la Fase 1 de `spec/SKILL.md` ya cubre esta regla, pero se reafirma aquí porque todas las specs de este proyecto están en español.

## Fase 1 — Identificar la fuente y el contexto

Esto extiende la Fase 1 de `spec/SKILL.md` (leer `CLAUDE.md`/`AGENTS.md`, mirar `specs/` existentes, heredar idioma y convenciones) con pasos propios del dominio "juego":

1. Lee `CLAUDE.md` (y `AGENTS.md` si `CLAUDE.md` lo referencia) para el contexto del proyecto.
2. Lee las dos specs más recientes de `specs/` (usa el listado de arriba) — en particular `05-juego-asteroides.md` y `06-leaderboard-y-catalogo-juegos.md` si existen, porque son el precedente exacto de "portar un juego real". Confirma el idioma y el esqueleto de secciones que usan.
3. Consulta el catálogo real de juegos en Supabase con `mcp__supabase__execute_sql`:
   ```sql
   select id, title, cat, color, cover from games order by id;
   ```
   Esto evita elegir un `id`/`cover`/`color` que ya existe y te da la paleta de categorías/colores en uso.
4. Resuelve `$ARGUMENTS` contra `references/started-games/` (ver listado arriba):
   - **Si hay una carpeta que coincide** (por nombre exacto o por tema, ej. "tetris" → `03-tetris`): lee su `game.js` completo, su `index.html` y su `README.md`/`CLAUDE.md`. Extrae y anota los hechos que la spec deberá citar tal cual — no los inventes ni los redondees:
     - Tamaño(s) del/los canvas (`width`/`height` en el HTML).
     - Elementos DOM del HUD fuera del canvas (`#score`, `#next-canvas`, `#overlay`, etc.).
     - Controles de teclado exactos.
     - Estados del juego (`playing`/`gameover`/etc.) y cómo se transiciona entre ellos.
     - Sistema de puntuación (constantes, tabla de puntos).
     - Clases/estructuras principales (para saber qué se porta "íntegro").
     - Assets externos: imágenes, sonidos, archivos de niveles (`levels.js` en Arkanoid).
   - **Si no hay carpeta que coincida**: dilo explícitamente ("no hay referencia en `references/started-games/` para X, se diseña desde cero") y pasa a la Fase 2 en modo diseño — las preguntas de mecánicas se vuelven más profundas porque no hay `game.js` del que extraer hechos.

## Fase 2 — Preguntar

Sigue el formato de la Fase 2 de `spec/SKILL.md` al pie de la letra: bloques de 3 a 5 preguntas (usa `AskUserQuestion` cuando la pregunta tenga opciones discretas, con tu recomendación marcada primero), espera respuesta antes de seguir al siguiente bloque, y no asumas nada que no esté confirmado por el usuario o extraído del `game.js`. Las categorías genéricas que ya pide `spec/SKILL.md` (Alcance, Datos, Integración, Persistencia, UX/estados, Riesgos, Decisiones cerradas) siguen aplicando — lo de abajo son las categorías **específicas de un juego** que debes añadir a ese catálogo:

1. **Identidad del juego** — `id` (slug, no debe chocar con los de Supabase), `title` (mayúsculas, para el HUD/covers), `short`, `long`, `cat` (`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`), `color` (`cyan`/`magenta`/`yellow`/`green`), valores iniciales de `best`/`plays`.
2. **Fidelidad al original** (solo si hay referencia) — ¿port literal sin retocar constantes de balance (velocidades, puntos, dificultad), como hizo la spec de Asteroides? Recomienda literal salvo que el usuario pida ajustes.
3. **Geometría del canvas** — tamaño del buffer interno. Si coincide con 4:3 (como 800×600), no hace falta letterbox. Si no (como el 300×600 de Tetris), confirma que se centra con letterbox dentro de `.crt-screen` (ver `integracion.md`) sin distorsionar.
4. **HUD** — además de `score`/`lives`/`level`, ¿qué otros campos expone el engine? (líneas, pieza siguiente, combo, tiempo restante de un power-up...). Decide con el usuario si van al `.player-hud` de React (como el `tripleShotRemaining` de Asteroides) o se dibujan dentro del canvas.
5. **Controles** — teclas exactas, activas solo mientras el canvas está montado. Controles táctiles quedan fuera de alcance salvo que el usuario los pida explícitamente.
6. **Pausa y fin de partida** — confirma el contrato ya establecido en el proyecto: `setPaused(true)` congela el loop sin resetear estado (ningún timer avanza); `onGameOver(finalScore)` se dispara una sola vez, exactamente al pasar a estado de derrota, y abre el modal de fin existente.
7. **Assets** — si el original trae sonidos/sprites (como Arkanoid), ¿se portan a `public/juegos/<slug>/` en esta spec o quedan fuera de alcance para una spec futura?
8. **Cover CSS** — idea visual de `.cover-<slug>` en 1-2 frases (solo gradientes CSS, sin imágenes, usando las variables `--cyan`/`--magenta`/`--yellow`/`--green`/`--ink`).
9. **Registro de juegos** — si el grep de arriba mostró que `lib/games/registry.ts` no existe todavía, confirma con el usuario que esta spec incluye ese refactor (recomendado: sí, es el segundo juego real y evita seguir apilando condicionales en `PlayerClient.tsx`). Si ya existe, la spec solo agrega una entrada.

Para de preguntar cuando puedas responder, sin asumir nada:

1. ¿Qué archivos van a aparecer o cambiar?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que la spec quedó completa?

## Fase 3 — Escribir la spec

Sigue la Fase 3 de `spec/SKILL.md`: mismo criterio para decidir entre "spec completa de una vez" (si ya puedes responder las tres preguntas de corte sin asumir nada) y "sección por sección con confirmación" (si algo quedó incompleto), y el mismo orden de secciones de `spec/template.md` (Header → Alcance → Modelo de datos → Plan de implementación → Criterios de aceptación → Decisiones → Riesgos). No dupliques aquí ese formato — dos precedentes concretos de este mismo dominio ya lo siguen y sirven de referencia de estilo: `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-catalogo-juegos.md`.

Lo que sí es propio de `spec-juego` es **qué contenido concreto va en cada sección** cuando el tema es "agregar un juego":

- **Header** — título con el patrón `NN · Juego real — NOMBRE ("ID")`, como en la spec 05. `Depende de` normalmente incluye las specs de plataforma base y las de leaderboard/Supabase (revisa cuáles existen en `specs/`).
- **Modelo de datos** — los tipos TS del engine: `<X>HudState`, `<X>Callbacks`, y la firma de `create<X>Game`. Si el juego no introduce estructuras nuevas más allá de eso, dilo explícitamente (regla del `template.md`).
- **Plan de implementación** — sigue el orden canónico de `integracion.md`, con rutas de archivo ya resueltas para el slug elegido (no genéricas):

1. Migración Supabase — fila en `games` con las columnas confirmadas en la Fase 2.
2. `.cover-<slug>` en `app/globals.css`.
3. `lib/games/<slug>/engine.ts` — port o diseño del engine.
4. `components/<X>Canvas.tsx` — wrapper cliente.
5. Si el registro no existe: crear `lib/games/registry.ts` y refactorizar `components/PlayerClient.tsx` para leerlo (sin cambiar comportamiento de los juegos simulados). Si ya existe: solo agregar la entrada del nuevo juego.
6. Assets a `public/juegos/<slug>/`, si aplica.
7. Verificación final: `npm run lint`, `npm run build`, prueba manual jugando el juego de punta a punta y confirmando que el resto de la biblioteca sigue intacta.

- **Criterios de aceptación** — booleanos y verificables (nada de "que se sienta bien"), incluyendo al menos uno por cada punto del plan de arriba.
- **Decisiones / Riesgos** — captura aquí las decisiones específicas de juego que ya trae por defecto esta skill (port literal vs. ajustado, letterbox sí/no, qué campos de HUD, si se hace el refactor a `registry.ts` ahora o no) con el motivo que dio el usuario.

## Fase 4 — Guardar

Sigue la Fase 4 de `spec/SKILL.md` tal cual: numeración `specs/NN-slug.md` (máximo existente + 1), slug kebab-case derivado del objetivo con el patrón `juego-<slug>` (ej. `07-juego-tetris.md`), fecha tomada del contexto de sesión, estado `Borrador` (nunca `Aprobado` automático), verificación de que las dependencias del header existan, y el mismo mensaje de confirmación final (ruta del archivo, recordatorio de estado, siguiente paso `/spec-impl NN-juego-<slug>`). También hereda el paso de **sembrar `specs/.spec-config.yml`** si no existe todavía.

**Detente ahí.** No propongas implementar, no escribas código, no toques Supabase en modo escritura.

## Reglas duras

- **Nunca escribas código en este comando.** Solo el archivo `.md` de la spec al final.
- **Nunca toques Supabase en modo escritura** (ni `apply_migration` ni `execute_sql` con `insert`/`update`/`delete`). Solo lectura (`select`) para conocer el catálogo existente.
- **Nunca inventes valores del `game.js` de referencia** (velocidades, puntos, tamaños, probabilidades). Léelos del archivo y cítalos; si algo no está claro, pregúntalo en vez de asumir.
- **Nunca propongas implementar la spec después de guardarla.** Tu trabajo termina al escribir el archivo. El usuario corre `/spec-impl` cuando esté listo.
- **No repreguntes en la Fase 3 lo que ya se respondió en la Fase 2.**
- **Si el juego es demasiado grande** (toca mecánicas de multijugador, requiere backend nuevo más allá de `games`/`scores`, o no cabe en una frase de objetivo), propone dividirlo en dos o más specs antes de continuar.

## Tono al preguntar

Directo y concreto, igual que `/spec`. No te disculpes por preguntar. Preguntas numeradas, una por línea, con recomendación marcada cuando ofrezcas opciones.

## Argumentos

`$ARGUMENTS` es el nombre o tema del juego (p. ej. `tetris`, `un juego de pong`), no necesariamente el nombre exacto de la carpeta de referencia — resuélvelo en la Fase 1. Si viene vacío, pregunta primero qué juego se quiere agregar.
