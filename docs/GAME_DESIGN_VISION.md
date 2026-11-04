# VISIÓN GENERAL Y ARQUITECTURA DE DISEÑO: SUBMARINE COMMAND

## 1. CONCEPTO NUCLEAR
Juego táctico-arcade de submarinos en 2D con estética instrumental e histórica (lámina cartográfica oficial de la *Kriegsmarine* en la capa estratégica y estaciones oscuras de instrumentos de fósforo y óptica en las capas táctica y arcade, reposando sobre la mesa de mapas atenuada). Combina la tensión posicional y la incertidumbre de sensores de un *wargame* hexagonal con la habilidad de ejecución en tiempo real en módulos arcade, evitando tanto la simulación tediosa como la omnisciencia previsible.

## 2. ARQUITECTURA DE LAS 3 CAPAS (CONTRATOS DESACOPLADOS)
El juego opera mediante una máquina de estados principal (`GameFlowController`) que coordina tres motores independientes sin importaciones cruzadas:

1. **Capa Estratégica (`StrategicEngine`):**
   - Teatro hexagonal a escala oceánica (`45x27` hexágonos en proyección rectangular *odd-r*, agrupados en `5x3` Grandes Cuadrantes *Marinequadrat* de `9x9`) con gestión de ruta, escala temporal, postura (`SURFACED` vs. `SUBMERGED`), combustible diésel decimal, baterías eléctricas, integridad del casco y armería de tubos lanzatorpedos.
   - **Niebla de guerra total por defecto:** ningún contacto enemigo se muestra fuera del alcance real de los sensores.
     - **Contacto visual (`SURFACED`):** radio `0..2 hex` dependiente de la hora del día (`NIGHT`, `DAWN`, `DAY`, `DUSK`) y del clima (`CLEAR`, `OVERCAST`, `STORM`).
     - **Hidrófono estratégico (`SUBMERGED` — *Horchrunde*):** alcance `3..5 hex` que traza conos de demora aproximada (`±15°`) e intensidad acústica (`WEAK`, `MEDIUM`, `STRONG`) sin revelar la casilla exacta.
     - **Radiogramas del BdU:** órdenes de sector y reportes de avistamiento con radio de incertidumbre (`1..3 hex` según dificultad) y marca de antigüedad, retenidos en cola mientras el submarino navega sumergido y entregados al emerger.
   - **Interfaz y Cartografía Histórica (`100vw x 100vh` HiDPI):**
     - Lámina de carta náutica histórica de fondo (estilo carta oficial `N.º 1546` en papel pergamino envejecido con cuadrantes impresos `AD..CG` y subcuadrantes `11..99`), rejilla hexagonal sutil superpuesta, trazos de lápiz/compás, cámara *pan & zoom*, barra de mando superior y cartelas flotantes (con salto automático de cámara al clicar un radiograma).
     - **Doble Escala Operativa con Interrupción Automática (*Auto-Drop*):**
       - *Modo Tránsito Oceánico (`24h` / turno):* Exclusivo en `SURFACED` (crucero de `5 hex` o forzar máquinas `8 hex`), simulando internamente `6` ticks de `4h` y deteniéndose de inmediato a modo `4h` si aparece un contacto o radiograma cercano.
       - *Modo Patrulla de Sector (`4h` / turno):* Escala táctica de caza con hidrófono, inmersión y aproximación a corredores comerciales aliados con deriva lateral (`±1 hex`).

2. **Capa Táctica (`TacticalEngine` tras `ITacticalStage`):**
   - Tablero hexagonal local de `15x15` celdas por turnos de 5 minutos (`1 hex = 500m`), renderizado como estación de ploteo centrada y reescalada sobre la carta histórica atenuada.
   - **Geometría Real de Entrada y Escape (desde Fase 2):** `EncounterContext` traslada el rumbo real del contacto, el vector relativo de intercepción desde la carta estratégica (`dist = 0` emboscada cercana vs. `dist = 1` aproximación abierta por proa, través o persecución de popa), la luz y el clima, además de persistir combustible/batería en `EncounterResult` y distanciar al contacto si logra escapar por el borde del tablero.
   - **Simulación Táctica Reactiva y Convoyes (Fase 3):** múltiples buques en pantalla (`ships[]`), escoltas que se destacan del convoy para cazar al submarino mientras los mercantes escapan, niebla acústica en cota `DEEP`, riesgo de detección visual en `SURFACED`/periscopio, IA reactiva del mercante (zigzag, vigías, viraje de huida, alarma `SSS`), mercantes artillados (`DEMS`), conos de Radar/ASDIC y penalización acústica por cavitación y recarga.

3. **Capa de Acción Arcade (`ArcadeEngine`):**
   - Tres módulos de acción en tiempo real independientes según el desencadenante:
     - **Módulo A (Ataque con Torpedos):** Vista de periscopio de `360°`, arcos reales de giroscopio (`BOW` / `STERN` / `DEAD_ZONE`), timón y consola TDC. En **Fase 3** evoluciona a **cinemática 2D real `(x, y)`** donde distancia, tamaño en lente y ángulo en la proa (`AOB`) varían segundo a segundo hasta que el buque escapa de alcance (eliminando el tiempo infinito de apuntado), sumado al riesgo de detección de la estela del periscopio.
     - **Módulo B (Defensa Antisubmarina - ASW):** Vista en doble panel (corte vertical de profundidad con termoclina + pantalla cenital de barrido ASDIC). Evasión de cargas de profundidad jugando con timón, cota y silencio mecánico.
     - **Módulo C (Defensa Aérea / *Crash Dive*):** Evento rápido desde el mapa estratégico. Secuencia cronometrada de inmersión de emergencia controlando inclinación, tanques de lastre y profundidad antes del impacto de las bombas.

## 3. PRINCIPIOS DE DISEÑO TRANSVERSALES (INMUTABLES DESDE FASE 1)

### 3.1. Sistema de Torpedos y Recarga Realista (`TorpedoArmory`)
- El submarino gestiona individualmente tubos de proa (`bowTubes`), tubos de popa (`sternTubes`) y reservas internas (`reserveTorpedoes`).
- Cada tubo tiene estado propio: `LOADED`, `RELOADING`, `EMPTY`, `DAMAGED`.
- Recargar un tubo consume turnos y **genera ruido mecánico** (`reloadAcousticPenalty` si no se pausa la recarga).

### 3.2. Perfiles de Dificultad (`DifficultyConfig`)
Todas las fórmulas leen de un contrato centralizado de dificultad:
- `EASY`: Reserva de torpedos infinita, recarga rápida, menor penalización acústica, mayor tolerancia angular de espoleta y radio de incertidumbre estratégica reducido (`1 hex`).
- `NORMAL`: Reserva histórica finita, tiempos estándar, ruido al recargar, fallos de espoleta por oblicuidad/calado e incertidumbre estratégica media (`2 hex`).
- `HARD`: Reserva finita, probabilidad de torpedos defectuosos (*duds*), escoltas con ASDIC agresivo e incertidumbre estratégica amplia (`3 hex`).

### 3.3. Diseño Multi-Teatro Basado en Datos (Atlántico y Pacífico)
- Prohibido codificar facciones o mapas a fuego en las reglas del motor.
- Toda campaña carga un `TheaterDefinition` declarativo que define dimensiones, lámina cartográfica, bases navales, puertos aliados, rutas comerciales y catálogos (`SubmarineSpec`, `SurfaceShipSpec`).

## 4. ROADMAP COMPLETO DEL PROYECTO (6 FASES)

- **FASE 1 (Completada):** Esqueleto de 3 capas, mapa hexagonal básico `12x8`, aproximación táctica `15x15` y ataque arcade de periscopio `360°` con gestión de tubos y espoletas. *(Ver [`docs/phases/PHASE_01_VERTICAL_SLICE.md`](phases/PHASE_01_VERTICAL_SLICE.md)).*
- **FASE 2 (Activa):** Campaña estratégica en el Atlántico Norte (`45x27` hexágonos, `5x3` cuadrantes *Marinequadrat* `9x9` con numeración `11..99`), viewport `100vw x 100vh` HiDPI con lámina histórica de fondo y mesa atenuada tras Táctico/Arcade, doble escala `24h / 4h` con *auto-drop* y consumo recalibrado, niebla de guerra total (visual por luz/clima, hidrófono por cono de demora y radiogramas BdU diferidos), corredores comerciales con desvío `±1 hex`, geometría real de entrada/escape en `EncounterContext` / `EncounterResult` (preparando `ships[]`) y ciclo multi-patrulla con retorno a base (*Kriegstagebuch*). *(Ver [`docs/phases/PHASE_02_STRATEGIC_CAMPAIGN.md`](phases/PHASE_02_STRATEGIC_CAMPAIGN.md)).*
- **FASE 3:** Profundidad táctica y cinemática antiprevisibilidad en combate: convoyes multi-buque (`ships[]`) y escoltas destacables en el `15x15`, niebla acústica en cota `DEEP`, riesgo de detección visual en `SURFACED` y de periscopio según luz/clima, IA reactiva del mercante (zigzag, vigías, viraje evasivo, socorro `SSS`), mercantes artillados `DEMS`, conos de Radar/ASDIC, ruido de cavitación/recarga, y **cinemática 2D real `(x, y)` en el Periscopio Arcade** (fin del tiempo infinito de apuntado, ángulos dinámicos y escape por distancia).
  - *Hito Opcional al cierre (`3.OPT`, bajo aprobación):* Cañón de cubierta de `88mm` en superficie + buques trampa *Q-Ships*.
- **FASE 4:** Modo Arcade Antisubmarino (ASW) completo: cargas de profundidad, termoclina, barrido ASDIC activo y daños por inundación y subsistemas.
- **FASE 5:** Modo Arcade de Ataque Aéreo (*Crash Dive*) y sistema de eventos aleatorios en campaña.
  - *Hitos Opcionales al cierre (`5.OPT-A/B/C`, bajo aprobación):* Duelo antiaéreo *Flak* vs. avión en picado, citas con Vacas Lecheras (*Tipo XIV Milchkuh*) y misiones especiales de infiltración en puertos aliados (*Scapa Flow*).
- **FASE 6:** Escenario del Pacífico, catálogo de buques de guerra mayores, audio procedural (Web Audio API) y pulido final.
  - *Hito Opcional al cierre (`6.OPT`, bajo aprobación):* Progresión tecnológica histórica `1939–1945` (*Metox*, *Bold*, *T5*, *Schnorchel*) y veteranía de tripulación.

> **REGLA DE GOBERNANZA PARA AGENTES:** Respeta siempre los contratos de datos de esta visión general, pero **SOLO** implementa las funcionalidades obligatorias descritas en el documento de la fase activa actual (`docs/phases/`). Los hitos opcionales detallados en [`docs/IDEAS_BACKLOG.md`](IDEAS_BACKLOG.md) tienen **puerta de bloqueo (*Phase Gate*)**: jamás se implementan por cuenta propia, sino únicamente preguntando al usuario al cerrar los hitos obligatorios de su fase correspondiente.
