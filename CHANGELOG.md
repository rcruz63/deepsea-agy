# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Hito 2.0 — Congelación de Contratos Globales de Fase 2 (`src/core/contracts/`):**
  - Nuevos módulos `EnvironmentContracts.ts` y `StrategicIntelContracts.ts` para reloj de guardia de `4h`, meteorología, conos de hidrófono, órdenes/radiogramas del BdU y resumen *Kriegstagebuch*.
  - Ampliados `TheaterDefinition`, `CampaignState`, `EncounterContext`, `FiringSolutionContext` y `EncounterResult` con soporte `ships[]`, puertos aliados bloqueados (`ALLIED_PORT`), corredores comerciales, geometría de intercepción real, persistencia de `fuel`/`battery` y desenlace `TARGET_ESCAPED`.
- **Especificación Cerrada de Fase 2, Roadmap Antiprevisibilidad e `IDEAS_BACKLOG.md` (`docs/`):**
  - Creado `docs/phases/PHASE_02_STRATEGIC_CAMPAIGN.md` con los 5 hitos atómicos (Hitos 2.1 a 2.5) y las reglas matemáticas cerradas del Teatro Atlántico `45x27` (*Marinequadrat* `5x3` de `9x9` con códigos `11..99`), doble escala `24H / 4H` con `6` sub-ticks e interrupción automática, consumo diésel decimal (`0.1%`), niebla de guerra estratégica (visual por luz/clima, hidrófono por cono `±15°` y radiogramas BdU diferidos en inmersión), corredores aliados con desvío `±1 hex`, contratos `ships[]` + geometría real de entrada/escape al `15x15`, carta histórica `100vw x 100vh` HiDPI y retorno multi-patrulla (*Kriegstagebuch*).
  - Creado `docs/IDEAS_BACKLOG.md` con protocolo *Phase Gate* anti-implementación autónoma y matriz de hitos opcionales por fase (`3.OPT` Cañón de `88mm` + *Q-Ships* en Fase 3; `5.OPT-A/B/C` *Flak* vs. avión, Vacas Lecheras Tipo XIV e infiltración en puertos aliados en Fase 5; `6.OPT` tecnología `1939–1945` y veteranía de tripulación en Fase 6), además de las cartas históricas de referencia (`docs/mapa_1.jpg`, `docs/mapa_2.jpg`, `docs/mapa3.jpg`).
  - Actualizados `docs/GAME_DESIGN_VISION.md`, `docs/GAME_DESIGN.md` (§4.2) y `docs/STATUS.md` con el reparto Fase 2 vs. Fase 3 (incluyendo cinemática 2D real `(x, y)` del periscopio en Fase 3 para eliminar el tiempo infinito de apuntado).
- **Periscopio de 360°, Arcos de Tiro de Proa/Popa y Timón del Submarino (`src/layers/arcade-torpedo/`, `src/layers/tactical/`):**
  - Cálculo de la marcación relativa real `submarineRelativeBearingDeg` (`[-180°, +180°)`) en `TacticalFiringGeometry.ts` según la orientación hexagonal del submarino al subir el periscopio, haciendo que el mercante aparezca en proa, través o popa según la aproximación táctica real.
  - Periscopio circular continuo de `360°` (`PeriscopeKinematics.ts`) con arcos de giroscopio reales: **Arco de Proa (`BOW`, `±45°`)** exclusivo para `BOW-1..4`, **Arco de Popa (`STERN`, `±135°..180°`)** exclusivo para `STERN-1`, y **Zona Muerta Lateral (`DEAD_ZONE`, `45°..135°`)** con bloqueo de disparo.
  - Control de timón del submarino (`steerSubmarine`, teclas `Q`/`E` y botones de consola) en `TorpedoArcadeEngine.ts`, `TdcControlPanelRenderer.ts` y `TorpedoArcadeStageView.ts` para virar el casco durante el periscopio y alinear los tubos delanteros o traseros.

### Changed
- **Simplificación de la Consola de Periscopio y Corrección de Geometría de Impacto (`src/layers/arcade-torpedo/`):**
  - Eliminados los botones redundantes de velocidad estimada, AOB estimado y caja fantasma en `TdcControlPanelRenderer.ts` y `PeriscopeTargetRenderer.ts`.
  - Normalizado el ángulo de través al abrir el periscopio (`normalizePeriscopeBroadsideAob`) y expresado el ángulo de incidencia en casco (`90° = perpendicular óptimo`) en `PeriscopeLensRenderer.ts`.
  - Ampliado el horizonte del blanco a `±58°` y el giro del periscopio a `±45°` en `PeriscopeKinematics.ts` para evitar que el barco salte a la izquierda cuando se apunta hacia `+30°`.

### Added
- **Mejora Jugable y Visual del Periscopio (`src/layers/arcade-torpedo/`):**
  - Giro interactivo del periscopio (`PeriscopeKinematics.ts`) mediante teclado (`A`/`D` o `◄`/`►`), clic directo sobre la lente o consola TDC para adelantar el disparo (*lead angle*) frente al avance lateral en tiempo real del mercante.
  - Carrera animada del torpedo con cuenta atrás naval (`24s..98s` según distancia `500m..2000m` y ángulo de adelanto $\cos \theta$) y estela de burbujas avanzando hacia el horizonte.
  - Nuevo módulo visual `PeriscopeTargetRenderer.ts` con géiser de agua y fogonazo en el punto exacto del impacto, llamas y columna de humo negro en buques dañados (`1/2 HP`), y gráfico de hundimiento con fractura del casco en V.
  - Impacto crítico (`2 HP`) al acertar con espoleta `IMPACT` en la sección central del casco (sala de máquinas) y ajuste automático de cota sugerida al cambiar de clase o espoleta en el TDC.
- **Hito 1.4 — Capa Arcade: Ataque de Torpedos (`src/layers/arcade-torpedo/`) y Cierre de Fase 1:**
  - Reglas mecánicas y fórmulas cerradas del Módulo Arcade A (Periscopio, TDC y física de espoletas) documentadas en `/docs/GAME_DESIGN.md` (§6).
  - Catálogo de reconocimiento de buques (`ShipRecognitionManual.ts`) con 3 clases (`COASTAL_FREIGHTER` 85m/4.5m/2500 BRT/1 HP, `LIBERTY_CARGO` 135m/7.5m/7100 BRT/2 HP, `T2_TANKER` 160m/9.5m/10500 BRT/2 HP).
  - Motor trigonométrico y físico de resolución de torpedos (`TorpedoResolutionEngine.ts`) que calcula el desvío longitudinal en el cruce (`longitudinalMissMeters`), ángulo de oblicuidad y desenlace (`HIT_KEEL_MAGNETIC`, `HIT_HULL`, `GLANCING_DUD`, `PASSED_UNDER_KEEL`, `MISSED_AHEAD`, `MISSED_ASTERN`).
  - Motor de sesión de periscopio (`TorpedoArcadeEngine.ts`) con soporte para múltiples disparos consecutivos sobre blancos de 2 HP, consumo y transición de tubos a `RELOADING`, avance táctico de 5 minutos (`advanceFiveMinuteReloadTick`) y emisión de `EncounterResult`.
  - Renderizadores Canvas 2D de periscopio sin spoilers previos al disparo (`PeriscopeLensRenderer.ts`), consola interactiva del TDC (`TdcControlPanelRenderer.ts`) y vista coordinadora (`TorpedoArcadeStageView.ts`).
  - Generación continua de contactos mercantes de reemplazo en `StrategicEngine.applyEncounterResult` al hundir un buque enemigo, y extracción de `resolveAdjacentHexDirection` a `src/core/hex/` para garantizar aislamiento total entre las 3 capas.
  - Nuevas suites de tests unitarios en `tests/layers/arcade-torpedo/` y test de ciclo completo de las 3 capas en `tests/flow/GameFlowController.test.ts` (15 suites / 62 tests en verde).
- **Hito 1.3 — Capa Táctica Hexagonal 15x15 y Especificación Estratégica de Fase 2:**
  - Documentación en `/docs/GAME_DESIGN_VISION.md` y `/docs/GAME_DESIGN.md` del diseño estratégico final para la Fase 2: layout Full-Viewport (`100vw x 100vh`) con cámara *pan & zoom* y HUD superior, estética cartográfica con sistema *Marinequadrat* (`MarineQuadratMapper`) y doble escala de zoom (`24h` tránsito / `4h` patrulla).
  - Ampliación de `FiringSolutionContext` en `src/core/contracts/EncounterContracts.ts` con `distanceMeters`, `targetAngleOnBowDeg`, `targetBowSide` (`PORT` | `STARBOARD`) y `targetSpeedKnots`.
  - Motor de dominio táctico en `src/layers/tactical/domain/` (`TacticalTypes`, `TacticalMovementRules`, `TacticalFiringGeometry`, `HexTacticalEngine`) implementando `ITacticalStage` con tablero `15x15` (`1 hex = 500m`), cotas (`SURFACED`, `PERISCOPE_DEPTH`, `DEEP`), avance de `1 tick` de recarga por turno de 5 minutos, bloqueo de superposición con el blanco y escape automático por borde del mapa.
  - Vista táctica vectorial en `src/layers/tactical/view/` (`TacticalBoardRenderer`, `TacticalHudRenderer`, `TacticalStageView`) e integración completa en `GameFlowController` y `EncounterStubView`.
  - Nuevas suites de tests unitarios en `tests/layers/tactical/` y `tests/flow/` (13 suites / 54 tests en verde).
- **Hito 1.2 — Capa Estratégica Mínima y Esqueleto de `GameFlowController`:**
  - Reglas mecánicas del turno estratégico de 4 horas documentadas en `/docs/GAME_DESIGN.md` (escalas 0..100 de diésel y batería, alcances 0/1/2 por postura, emersión forzada a batería 0, recarga completa de tubos e intercepción a distancia `<= 1`).
  - Motor de dominio estratégico puro en `src/layers/strategic/domain/` (`AtlanticSectorScenario`, `StrategicMovementNavigator`, `StrategicResourceRules`, `StrategicMerchantController`, `StrategicEngine`) sin dependencias del DOM/Canvas y libre de bucles anidados.
  - Vista vectorial Canvas 2D en `src/layers/strategic/view/` (`StrategicMapRenderer`, `StrategicUnitRenderer`, `StrategicHudRenderer`, `StrategicInputHandler`, `StrategicStageView`) con carta náutica `12x8`, distinción visual entre alcance de 1 y 2 hexágonos, y HUD interactivo de recursos y 5 tubos lanzatorpedos.
  - Coordinador `GameFlowController` y vista puente `EncounterStubView` en `src/flow/` para gestionar la transición `EncounterContext` y el retorno `EncounterResult`.
  - Nuevas suites de tests unitarios en `tests/layers/strategic/` y `tests/flow/` (43 tests totales en verde).
- **Hito 1.1 — Configuración Base, Contratos y Motor Hexagonal Puro:**
  - Configuración estricta de TypeScript, Vite y Vitest (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`).
  - Reglas de ingeniería persistidas en `/AGENTS.md` para carga automática entre sesiones y equipos, junto con `/docs/GAME_DESIGN.md`.
  - Contratos globales inmutables en `src/core/contracts/` (`DifficultyConfig`, `TorpedoArmoryState`, `TheaterDefinition`, `SubmarineState`, `CampaignState`, `EncounterContracts` e interfaz polimórfica `ITacticalStage`).
  - Perfiles de dificultad `EASY`, `NORMAL` y `HARD` en `src/core/difficulty/DifficultyPresets.ts`.
  - Máquina de estados pura de tubos lanzatorpedos y armería (`src/core/armory/`) con reservas finitas/infinitas, pausa silenciosa y penalización acústica de recarga.
  - Motor matemático hexagonal axial `(q, r)`, proyección cartesiana/demora náutica e indexación `O(1)` mediante `HexGridMap` (`src/core/hex/`) libre de bucles anidados.
  - Suite de 30 pruebas unitarias en `tests/core/` cubriendo geometría hexagonal, mapas indexados y armería de torpedos.
- Documentación inicial de gobernanza en `/docs/ARCHITECTURE.md`, `/docs/STATUS.md` y `/CHANGELOG.md`.

### Removed
- Eliminado `src/flow/EncounterStubView.ts` al completarse la integración de `TorpedoArcadeStageView` en el Hito 1.4.
