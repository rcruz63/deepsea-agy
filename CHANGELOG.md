# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
