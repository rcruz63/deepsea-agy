# ESTADO DEL PROYECTO (HANDOFF & TRACKING)

## Estado Actual (Resumen Ejecutivo)
Estamos en la **Fase 1: Vertical Slice (Navegación, Aproximación y Disparo de Torpedo)** con el **Hito 1.1 completado y verificado al 100%** (`tsc --noEmit`, `vite build` y 30/30 tests unitarios en Vitest pasando). El repositorio cuenta con las reglas de ingeniería persistidas en `AGENTS.md`, contratos globales inmutables entre capas, gestión de armería de torpedos parametrizada por dificultad y motor matemático hexagonal libre de bucles anidados. El proyecto está listo para iniciar el **Hito 1.2 (Capa Estratégica Mínima)**.

## Completado Recientemente
- Persistencia automática del *Engineering Charter* en `/AGENTS.md` (cargado por defecto en nuevas sesiones y portable en Git) y reglas numéricas cerradas en `/docs/GAME_DESIGN.md`.
- Configuración base del proyecto con TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Vite y Vitest.
- Definición de contratos inmutables en `src/core/contracts/` (`CampaignState`, `SubmarineState`, `TorpedoArmoryState`, `DifficultyConfig`, `TheaterDefinition`, `EncounterContext`, `FiringSolutionContext`, `EncounterResult`, `ITacticalStage`) y perfiles `EASY`/`NORMAL`/`HARD` en `src/core/difficulty/DifficultyPresets.ts`.
- Máquina de estados pura de tubos lanzatorpedos y armería en `src/core/armory/` (proa, popa, reserva finita/infinita, pausa silenciosa y penalización acústica).
- Motor matemático hexagonal axial `(q, r)` e índice espacial inmutable `HexGridMap<TCell>` sobre `Map<HexKey, TCell>` en `src/core/hex/` con cero bucles anidados.
- Cobertura unitaria completa en `tests/core/hex/` y `tests/core/armory/` (6 suites, 30 tests en verde).

## En Progreso (Working On)
- Ninguna tarea abierta: **Hito 1.1 cerrado**. A la espera de iniciar el diseño previo del **Hito 1.2** (`src/layers/strategic/`).

## Próximos Pasos (Backlog Inmediato)
1. **Diseño Previo del Hito 1.2:** Proponer la estructura modular de `src/layers/strategic/` y datos declarativos del sector Atlántico inicial (`12x8` hexágonos con agua, costa y base naval).
2. **Motor de Dominio Estratégico:** Implementar reglas puras de movimiento por turnos (Superficie vs. Sumergido), consumo de combustible/batería y avance de recarga de tubos por turno.
3. **Contacto Mercante e Intercepción:** Implementar el desplazamiento del mercante móvil y la detección de coincidencia/adyacencia para emitir `EncounterContext`.
4. **Vista Estratégica Vectorial (Canvas 2D):** Renderizar el mapa hexagonal `12x8`, postura del submarino y panel instrumental de tubos lanzatorpedos desacoplado de las reglas.
5. **Esqueleto Inicial de `GameFlowController`:** Conectar el ciclo de turnos estratégicos y el disparo de transición hacia `ITacticalStage`.

## Deuda Técnica y Decisiones Pendientes (Tech Debt)
- Sin deuda técnica en el código implementado: todos los archivos se mantienen entre 9 y 167 líneas (límite < 200) y con cero bucles anidados.
- En el Hito 1.2 deberá definirse en `/docs/GAME_DESIGN.md` la tasa exacta de consumo de diésel en superficie y de batería en inmersión por turno estratégico de 4 horas.
