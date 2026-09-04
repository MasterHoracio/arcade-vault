---
name: spec-impl-game
description: Implementa la spec de un juego nuevo y, al terminar, encadena skin-designer y mobile-porter sobre ese juego. Especializa /spec-impl para el flujo completo de agregar un juego.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Skill, Agent, Read, Glob, Grep, Bash(ls:*), Bash(cat:*), Bash(git branch:*), Bash(git status:*)
---

# /spec-impl-game — Implementa un juego nuevo y encadena skins + móvil

## Contexto de sesión

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

Engines ya portados (antes de implementar; úsalo para detectar cuál es nuevo en la Fase 2):
!`ls lib/games/ 2>/dev/null || echo "lib/games/ no existe todavía"`

Juegos con los 3 skins listos:
!`cat references/game-with-themes.md 2>/dev/null || echo "references/game-with-themes.md no existe todavía"`

Zonas ya portadas a móvil:
!`cat references/mobile-audit.md 2>/dev/null || echo "references/mobile-audit.md no existe todavía"`

---

Este comando encadena tres pasos que hoy se hacen a mano al agregar un juego:
implementar su spec, darle los 3 skins, y portar su canvas a móvil. Empaqueta la
secuencia — no reemplaza ninguno de los tres pasos ni decide nada por su cuenta
que ellos mismos no decidan ya.

## Fase 0 — No reinventar `/spec-impl`

Este skill **no define su propio método de implementación**. Lee
`.agents/skills/spec-impl/SKILL.md` completo — ese es el flujo real: las cuatro
fases (identificar spec → validar estado Aprobado → crear rama según
`AutoCreateBranch` → implementar paso a paso con pausas). Todo lo que sigue en
este archivo son los dos pasos que se agregan **después** de que `/spec-impl`
termine limpio, siguiendo el mismo patrón con el que `/spec-juego` se apoya en
`/spec` en vez de duplicarlo.

Si `.agents/skills/spec-impl/SKILL.md` cambia (nuevas reglas de validación,
nuevo formato de header), este comando hereda ese cambio automáticamente por
seguir leyéndolo en vivo — no copies su contenido aquí.

## Fase 1 — Implementar la spec

Invoca el skill `spec-impl` (herramienta `Skill`, nombre `spec-impl`) pasándole
`$ARGUMENTS` tal cual — el usuario puede haber escrito `12`, `12-frogger` o el
nombre completo del archivo; `/spec-impl` ya resuelve las tres formas en su
propia Fase 1. Sigue su flujo completo: pausas por paso, nunca commitear sin
que te lo pidan, hasta que declare que todos los pasos del plan están
implementados.

**Condición de aborto — regla dura.** Si `/spec-impl` se detiene por cualquier
motivo (estado de la spec distinto de "Aprobado", working tree sucio, una
ambigüedad que el usuario no resuelve, el usuario cancela a mitad del plan),
**termina aquí**. No lances `skin-designer` ni `mobile-porter`. No intentes
arreglar la spec ni el estado por tu cuenta. Reporta al usuario en qué fase de
`/spec-impl` se detuvo y por qué.

## Fase 2 — Derivar el `game-id`

Antes de los agentes necesitas el slug exacto del juego (el mismo `id` de la
tabla `games` y de `lib/games/<slug>/`). Resuélvelo en este orden:

1. Compara `ls lib/games/` ahora contra el listado de la sección "Contexto de
   sesión" de arriba — el directorio nuevo que no estaba antes es el juego.
2. Si hay duda, confírmalo contra el cuerpo de la spec implementada (la fila
   que agrega a la tabla `games`, campo `id`).

Si las dos fuentes no coinciden en un slug único, **para y pregúntale** el
`game-id` al usuario — no lo adivines. Es el argumento obligatorio de los dos
agentes que siguen; ninguno de los dos elige un juego por su cuenta si no se lo
das.

## Fase 3 — Encadenar los agentes, en serie

**Regla dura: una sola llamada a `Agent` por mensaje, nunca dos en el mismo
bloque de tool calls.** `mobile-porter` puede editar `components/<X>Canvas.tsx`
para el responsive, el mismo archivo que `skin-designer` edita para propagar la
prop `skin` — correrlos en paralelo los haría pisarse. Lanza uno, espera su
resultado completo, resume en el chat, y solo entonces lanza el otro.

1. Lanza `subagent_type: skin-designer` con un prompt que incluya, explícito:
   el `game-id` de la Fase 2, que el juego se acaba de implementar en esta
   misma sesión (rama `spec-NN-slug` activa), y que debe seguir su Fase 0-en-
   adelante normal (auditar contra `references/skins-contract.md`, implementar
   `clasico`/`neon`/`retro`, actualizar `references/game-with-themes.md`).
2. Espera a que termine. Resume en el chat qué reportó (skins agregados,
   archivos tocados, si `npm run lint`/`build` pasaron).
3. Lanza `subagent_type: mobile-porter` con un prompt que incluya, explícito:
   la zona es **el canvas de este juego** — `components/<X>Canvas.tsx` y su
   HUD dentro del Reproductor, no todo `/juegos/[id]/jugar` — y que actualice
   `references/mobile-audit.md`.
4. Espera a que termine. Resume igual.

Si alguno de los dos agentes reporta que la zona/juego no existe o pide
aclaración, detente y traslada la pregunta al usuario — no la respondas por
él.

## Cierre

Reporta al usuario, en un solo resumen:

- Spec implementada y rama activa.
- Skins agregados por `skin-designer` (o por qué no, si se detuvo).
- Hallazgos/cambios de `mobile-porter` (o por qué no, si se detuvo).
- El mismo recordatorio con el que cierra `/spec-impl`: verificar los criterios
  de aceptación de la spec uno por uno, actualizar su estado a "Implementado" y
  hacer el commit final antes de mergear la rama.

Este comando, igual que `/spec-impl`, **nunca commitea por su cuenta** — ni
después de la implementación, ni después de los agentes. Committear es decisión
y comando explícito del usuario.
