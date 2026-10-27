# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Hito 1.1 — Configuración Base, Contratos y Motor Hexagonal Puro:**
  - Configuración estricta de TypeScript, Vite y Vitest (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`).
  - Reglas de ingeniería persistidas en `/AGENTS.md` para carga automática entre sesiones y equipos, junto con `/docs/GAME_DESIGN.md`.
  - Contratos globales inmutables en `src/core/contracts/` (`DifficultyConfig`, `TorpedoArmoryState`, `TheaterDefinition`, `SubmarineState`, `CampaignState`, `EncounterContracts` e interfaz polimórfica `ITacticalStage`).
  - Perfiles de dificultad `EASY`, `NORMAL` y `HARD` en `src/core/difficulty/DifficultyPresets.ts`.
  - Máquina de estados pura de tubos lanzatorpedos y armería (`src/core/armory/`) con reservas finitas/infinitas, pausa silenciosa y penalización acústica de recarga.
  - Motor matemático hexagonal axial `(q, r)`, proyección cartesiana/demora náutica e indexación `O(1)` mediante `HexGridMap` (`src/core/hex/`) libre de bucles anidados.
  - Suite de 30 pruebas unitarias en `tests/core/` cubriendo geometría hexagonal, mapas indexados y armería de torpedos.
- Documentación inicial de gobernanza en `/docs/ARCHITECTURE.md`, `/docs/STATUS.md` y `/CHANGELOG.md`.
