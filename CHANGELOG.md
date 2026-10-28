# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
