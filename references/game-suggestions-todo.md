# TODO — Sugerencias de juegos

Memoria del agente `game-planner`. Cada entrada es una sugerencia con su estado.
Estados: `[ ]` propuesto · `[x]` implementado · `[~]` descartado.
El agente lee este archivo antes de proponer y lo actualiza después. Puedes editarlo a mano.

## Implementados

- [x] **Arkanoid** (`arkanoid`, ARCADE) — spec 08.
- [x] **Asteroides** (`asteroides`, SHOOTER) — spec 05.
- [x] **Serpentina** (`serpentina`, ARCADE) — spec 09.
- [x] **Tetris** (`tetris`, PUZZLE) — spec 07.

## Propuestos

- [ ] **Duelo Pixel** (`duelo-pixel`, VERSUS) — sugerido 2026-09-01
  - Por qué: VERSUS está en 0 de los juegos reales (solo existe como fila mock en
    `games`, sin engine ni spec); es la categoría peor cubierta. Mecánica de paletas
    contra pelota es la más simple factible de las candidatas, encaja perfecto con
    score numérico monótono, y no repite ninguna mecánica ya implementada
    (breakout, shooter libre, snake, tetrominós).
  - Mecánica: dos paletas verticales, una CPU con IA simple, deflectan una pelota;
    puntaje = puntos anotados antes de perder.
  - Riesgos: bajos — un solo canvas, primitivas geométricas. Nota
    (2026-09-03): `cover-duelo` y la fila `games` con id `duelo-pixel` se
    eliminaron del catálogo (juego placeholder sin engine); habría que
    crear ambos desde cero al implementar esta propuesta.

- [ ] **Aleteo** (`aleteo`, ARCADE) — sugerido 2026-09-01
  - Por qué: variante de "vuelo continuo con un solo input" que no repite ninguna
    mecánica implementada (breakout, snake); estado mínimo (gravedad + un botón),
    la candidata más barata de ARCADE en esta tanda.
  - Mecánica: ave cae por gravedad constante, un tap la impulsa hacia arriba;
    esquiva pares de tuberías; puntaje = tuberías superadas.
  - Riesgos: bajos — primitivas geométricas, sin sprites necesarios, score
    monótono trivial para `saveScore`.

- [ ] **Duelo Rápido** (`duelo-rapido`, VERSUS) — sugerido 2026-09-01
  - Por qué: segundo representante de VERSUS con mecánica de reflejos puros
    (no paletas), diversifica frente a `duelo-pixel` sin competir por el mismo
    slot; requiere solo temporizador y detección de input.
  - Mecánica: espera la señal aleatoria y presiona antes que la CPU; puntaje =
    duelos ganados en racha antes de fallar un tiro anticipado.
  - Riesgos: bajos — sin física, un solo estado de temporizador; el reto es
    tunear la ventana de reacción de la IA.

- [ ] **Escuadrón** (`escuadron`, SHOOTER) — sugerido 2026-09-01
  - Por qué: shooter de scroll vertical, mecánicamente distinto del vuelo libre
    de `asteroides` (formaciones que bajan vs. campo de rocas); SHOOTER solo
    tiene un juego real, hay espacio para un segundo con mecánica propia.
  - Mecánica: nave asciende por scroll vertical infinito, esquiva y dispara a
    formaciones enemigas; puntaje = enemigos derribados, velocidad sube por nivel.
  - Riesgos: medio — requiere spawner de oleadas con patrones, pero sigue siendo
    solo primitivas de canvas y un `create<X>Game` estándar.

- [ ] **Buscaminas** (`buscaminas`, PUZZLE) — sugerido 2026-09-01
  - Por qué: PUZZLE solo tiene `tetris`; Buscaminas es lógica de grid pura, cero
    física, y encaja con un score incremental (celdas despejadas) en vez del
    tiempo-a-la-baja habitual del juego original.
  - Mecánica: grid con minas ocultas y números de pista; revelar una celda segura
    suma puntos, detonar una mina termina la partida.
  - Riesgos: bajo-medio — el algoritmo de flood-fill al revelar celdas vacías es
    la única lógica no trivial; sin assets, cover de gradientes simple.

- [ ] **Topos** (`topos`, ARCADE) — sugerido 2026-09-01
  - Por qué: reacción/timing en grid fijo, mecánica no representada aún en
    ARCADE (breakout y snake son de movimiento continuo); assets mínimos.
  - Mecánica: topos aparecen al azar en un grid de agujeros por una ventana
    corta; acertar a tiempo suma puntos, fallar o dejarlos escapar resta vidas.
  - Riesgos: bajos — un solo grid estático, sin colisiones complejas.

- [ ] **Hockey de Mesa** (`hockey-mesa`, VERSUS) — sugerido 2026-09-01
  - Por qué: tercer VERSUS con física de rebote de disco en vez de reflejos
    puros, cubre el hueco entre "duelo de reacción" y "duelo de paletas" sin
    duplicar ninguno de los dos.
  - Mecánica: disco rebota entre dos paletas horizontales en una mesa cerrada,
    CPU con IA simple; puntaje = goles anotados antes de que la CPU llegue al
    límite.
  - Riesgos: medio — física de rebote en dos ejes es más estado que un duelo de
    reflejos, pero sigue siendo primitivas de canvas.

- [ ] **Defensor de Base** (`defensor-base`, SHOOTER) — sugerido 2026-09-01
  - Por qué: shooter de torreta fija (360°) frente al vuelo libre de
    `asteroides` y el scroll vertical de Escuadrón; tercera variante de SHOOTER
    con identidad mecánica propia.
  - Mecánica: torreta central que rota y dispara a enemigos que se acercan desde
    los bordes de la pantalla; puntaje = oleadas repelidas.
  - Riesgos: medio — requiere lógica de spawn perimetral y rotación por ángulo,
    sin física compleja.

- [ ] **Fusión** (`fusion`, PUZZLE) — sugerido 2026-09-01
  - Por qué: variante tipo "2048", mecánica de deslizar y combinar totalmente
    distinta al encaje de piezas de `tetris`; score acumulado nativo, ideal para
    el leaderboard.
  - Mecánica: desliza el grid en 4 direcciones para fusionar tiles del mismo
    número hasta llegar al máximo; puntaje = suma de fusiones logradas.
  - Riesgos: bajos — grid fijo, sin física; la única lógica no trivial es el
    algoritmo de fusión y reacomodo por fila/columna.

- [ ] **Tumbolín** (`tumbolin`, ARCADE) — sugerido 2026-09-01
  - Por qué: pinball con física de rebote es una mecánica no representada en
    ARCADE (breakout mueve una sola paleta horizontal, esto son flippers +
    gravedad); buen contraste visual y de ritmo frente a `arkanoid`.
  - Mecánica: flippers controlados con teclado impulsan una bola que rebota en
    bumpers con física simple; puntaje = impactos en bumpers antes de perder la
    bola.
  - Riesgos: medio-alto — es la más exigente en física (ángulos de flipper,
    rebote realista) de esta tanda; vale la pena solo si hay margen de tiempo.

- [ ] **Boxeo Reflejo** (`boxeo-reflejo`, VERSUS) — sugerido 2026-09-01
  - Por qué: cuarto VERSUS de timing puro (golpe/esquiva) que reutiliza el mismo
    patrón barato de Duelo Rápido pero con una capa extra de secuencia, sin
    física ni multiplayer real.
  - Mecánica: secuencia de golpes y esquivas con ventana de tiempo corta contra
    un oponente CPU; puntaje = golpes conectados en racha antes de fallar.
  - Riesgos: bajos — mismo esqueleto que Duelo Rápido, solo cambia el patrón de
    secuencia y el arte del ring.

- [ ] **Torpedo** (`torpedo`, SHOOTER) — sugerido 2026-09-01
  - Por qué: shooter lateral de profundidad (submarino) distinto del vuelo
    libre y el scroll vertical ya listados; cuarta variante de SHOOTER, útil si
    el catálogo quiere más de una opción en esa categoría.
  - Mecánica: submarino se mueve en un eje lateral/profundidad y dispara
    torpedos a objetivos que cruzan la pantalla; puntaje = impactos certeros.
  - Riesgos: bajos — movimiento y disparo en línea recta, sin gravedad ni
    rotación libre.

- [ ] **Trío Mágico** (`trio-magico`, PUZZLE) — sugerido 2026-09-01
  - Por qué: match-3, mecánica de intercambio adyacente que no existe todavía
    en PUZZLE (Buscaminas es de revelado, `tetris` es de caída); combos dan
    score naturalmente escalonado.
  - Mecánica: intercambia gemas adyacentes en un grid para formar líneas de 3 o
    más; puntaje = gemas eliminadas por combo, con bonus por combos en cadena.
  - Riesgos: medio — detección de líneas y relleno en cascada del grid es la
    parte no trivial, pero es lógica pura sin física.

- [ ] **Saltarín** (`saltarin`, ARCADE) — sugerido 2026-09-01
  - Por qué: plataformas verticales infinitas (tipo Doodle Jump) con salto
    automático, distinto del ritmo de Aleteo (input continuo) y de Tumbolín
    (física de flippers); da variedad de "sensación" dentro de ARCADE.
  - Mecánica: el personaje rebota automáticamente entre plataformas generadas
    hacia arriba; puntaje = altura alcanzada, termina si cae fuera de cámara.
  - Riesgos: bajos-medio — generación procedural de plataformas es la única
    lógica no trivial.

- [ ] **Cuerda de Guerra** (`cuerda-guerra`, VERSUS) — sugerido 2026-09-01
  - Por qué: quinto VERSUS de tipo "mash de tecla" contra resistencia de CPU,
    variante de intensidad física distinta a los tres duelos de timing/paletas
    ya listados; útil como opción de menor prioridad si se quiere más variedad
    dentro de VERSUS.
  - Mecánica: alterna dos teclas rápidamente para mover el marcador de cuerda
    hacia tu lado contra la resistencia de la CPU; puntaje = rondas ganadas
    consecutivas.
  - Riesgos: bajos — una sola barra de progreso y un contador de input, sin
    colisiones.

- [ ] **Tiro al Blanco** (`tiro-blanco`, SHOOTER) — sugerido 2026-09-01
  - Por qué: shooter de mira/reticle sin nave que pilotar, mecánica de puntería
    pura distinta a las otras cuatro variantes de SHOOTER en esta lista; buena
    candidata de menor prioridad si se busca variedad extra en esa categoría.
  - Mecánica: mira controlada por mouse/teclado, blancos cruzan la pantalla a
    velocidad creciente; puntaje = blancos acertados, penalización por fallos.
  - Riesgos: bajos — sin física de proyectil ni movimiento del jugador.

- [ ] **Empuja Cajas** (`empuja-cajas`, PUZZLE) — sugerido 2026-09-01
  - Por qué: sokoban, mecánica de empuje en grid con solución única por nivel;
    quinta variante de PUZZLE, de menor prioridad por su scoring menos natural
    (basado en movimientos, no en combos).
  - Mecánica: movimiento en grid empujando cajas hacia marcas objetivo; puntaje
    = cajas colocadas correctamente antes de agotar el límite de movimientos.
  - Riesgos: medio — requiere generar niveles resolubles o un set curado a mano,
    y el score por "movimientos restantes" encaja menos naturalmente con el
    leaderboard que los otros PUZZLE de esta lista.

- [ ] **Excavadora** (`excavadora`, ARCADE) — sugerido 2026-09-01
  - Por qué: tipo Dig Dug — cavar túneles y reventar enemigos subterráneos; de
    menor prioridad en ARCADE por ser la más costosa de las cinco candidatas
    (movimiento en grid + IA de enemigos que persiguen por túneles).
  - Mecánica: cava túneles en movimiento de grid y dispara aire/arpón para
    inflar y reventar enemigos; puntaje = enemigos eliminados.
  - Riesgos: medio-alto — la IA de persecución por túneles generados es más
    estado que el resto de ARCADE en esta lista; similar al riesgo que descartó
    a Glotón.

- [ ] **Esgrima de Reflejos** (`esgrima-reflejos`, VERSUS) — sugerido 2026-09-01
  - Por qué: duelo de espadas por turnos con parry, variante de menor prioridad
    en VERSUS — mecánicamente cercana a Boxeo Reflejo (timing de golpe/bloqueo),
    aporta menos diversidad neta que las otras cuatro candidatas de la categoría.
  - Mecánica: bloquea el ataque de la CPU dentro de una ventana de parry y
    responde a tiempo; puntaje = golpes conectados antes de perder los 3 asaltos.
  - Riesgos: bajos — mismo esqueleto de timing que Boxeo Reflejo; se incluye más
    por completar variedad temática (espadas vs. puños) que por necesidad de
    balance.

- [ ] **Túnel de Fuego** (`tunel-fuego`, SHOOTER) — sugerido 2026-09-01
  - Por qué: shooter de scroll lateral infinito por un túnel estrecho; de menor
    prioridad por solaparse en sensación con Escuadrón (ambos son "esquivar y
    disparar en scroll"), aunque el eje de movimiento (lateral vs. vertical) es
    distinto.
  - Mecánica: nave en scroll lateral infinito esquiva y dispara para destruir
    bloques que cierran el paso; puntaje = distancia recorrida más destrucciones.
  - Riesgos: medio — generación procedural del túnel es la parte no trivial;
    es la quinta y última prioridad de SHOOTER en esta lista.

- [ ] **Quince Deslizante** (`quince-deslizante`, PUZZLE) — sugerido 2026-09-01
  - Por qué: 15-puzzle clásico (fichas deslizantes 4x4); última prioridad de
    PUZZLE en esta lista por el mismo motivo que Empuja Cajas — el scoring
    natural es por tiempo/movimientos, no por combos, así que encaja peor con
    el leaderboard sin un rediseño del cálculo de puntaje.
  - Mecánica: desliza fichas en un grid 4x4 para ordenarlas en secuencia antes
    de que se acabe el tiempo; puntaje = fichas ordenadas correctamente.
  - Riesgos: medio — barajado inicial debe garantizar solubilidad; scoring
    requiere más diseño que el resto de la lista para quedar monótono.

## Descartados

- [~] **Rocas** (`rocas`, SHOOTER) — descartado 2026-09-01
  - Por qué: duplica casi literalmente la mecánica de `asteroides` (nave que dispara
    y fragmenta rocas en gravedad cero) ya implementado; no aporta diversidad de
    mecánica y compite por la misma categoría/tono visual (amarillo vs cian, mismo
    concepto). Parece resto de datos mock previos a la migración a Supabase.

- [~] **Invasores** (`invasores`, SHOOTER) — descartado 2026-09-01
  - Por qué: SHOOTER ya tiene un representante real (`asteroides`); menor prioridad
    de balance que VERSUS, que está completamente vacío. Se reevalúa en una corrida
    futura si VERSUS deja de ser el hueco más urgente.

- [~] **Glotón** (`gloton`, ARCADE) — descartado 2026-09-01
  - Por qué: ARCADE ya tiene dos juegos reales (`arkanoid`, `serpentina`); además la
    IA de persecución de 4 fantasmas y el diseño de laberinto son más costosos que
    el resto de candidatas, mayor riesgo de complejidad para el patrón
    `create<X>Game` simple del proyecto.

- [~] **Ranaria** (`ranaria`, ARCADE) — descartado 2026-09-01
  - Por qué: mismo problema de balance que Glotón (ARCADE ya cubierto por dos
    juegos); patrones de tráfico en carriles con timer añaden más estado que el
    duelo de paletas, sin ganar diversidad de categoría.
