# ESTADO DEL PROYECTO (HANDOFF & TRACKING)

## Estado Actual (Resumen Ejecutivo)
Estamos en la **Fase 1: Vertical Slice (Navegación, Aproximación y Disparo de Torpedo)** con los **Hitos 1.1, 1.2 y 1.3 completados y verificados al 100%** (`tsc --noEmit`, `vite build` y 13 suites / 54 tests unitarios en Vitest pasando). La Capa Táctica Hexagonal `15x15` (`src/layers/tactical/`) opera tras el contrato polimórfico `ITacticalStage`, emitiendo el `FiringSolutionContext` completo (`distanceMeters`, `targetAngleOnBowDeg`, `targetBowSide`, `targetSpeedKnots`) hacia `GameFlowController`. El proyecto está listo para iniciar el **Hito 1.4 (Capa Arcade — Ataque de Torpedos y TDC)**.

## Completado Recientemente
- Documentación de los requisitos estratégicos de Fase 2 en `/docs/GAME_DESIGN_VISION.md` y `/docs/GAME_DESIGN.md` (layout Full-Viewport `100vw x 100vh` con cámara *pan & zoom* y HUD superior, carta náutica histórica con `MarineQuadratMapper` `AL 44`/`AK 63`, y doble escala de zoom `24h` tránsito vs `4h` patrulla).
- Implementación del dominio táctico en `src/layers/tactical/domain/`:
  - `TacticalMovementRules.ts`: Tablero `15x15` (`1 hex = 500m`), cotas (`SURFACED` 0..3 hex, `PERISCOPE_DEPTH` 0..2 hex, `DEEP` 0..1 hex) en un único bucle plano sobre `getCellsWithinRadius`, bloqueo de superposición sobre el hexágono del mercante y escape automático del blanco al rebasar el borde del tablero.
  - `TacticalFiringGeometry.ts`: Ventana óptima de disparo (`1..4` hexágonos), conversión a metros (`distanceMeters`) y cálculo trigonométrico de `targetAngleOnBowDeg` (`0°..180°`) y banda `targetBowSide` (`PORT` | `STARBOARD`).
  - `HexTacticalEngine.ts`: Implementación pura de `ITacticalStage` con turnos de 5 minutos y avance de `1 tick` de recarga por turno en `TorpedoArmory`.
- Vista vectorial Canvas 2D en `src/layers/tactical/view/` (`TacticalBoardRenderer`, `TacticalHudRenderer`, `TacticalStageView`) y conexión en `GameFlowController` hacia el stub del Hito 1.4 (`EncounterStubView`).
- Suite de pruebas ampliada a **13 archivos / 54 tests en verde** (`tests/layers/tactical/` y `tests/flow/`).

## En Progreso (Working On)
- Ninguna tarea abierta: **Hito 1.3 cerrado**. A la espera de iniciar el diseño previo del **Hito 1.4** (`src/layers/arcade-torpedo/`).

## Próximos Pasos (Backlog Inmediato)
1. **Diseño Previo del Hito 1.4:** Documentar en `/docs/GAME_DESIGN.md` las fórmulas cerradas de intercepción TDC y resolución de espoletas (`IMPACT` vs `MAGNETIC`), y proponer la estructura de `src/layers/arcade-torpedo/`.
2. **Motor de Balística y Espoletas (`src/layers/arcade-torpedo/domain/`):** Implementar la geometría de intercepción según velocidad/AOB estimados, rebote por ángulo oblicuo (`> 60°` o según `impactAngleToleranceDegrees` de `DifficultyConfig`) y ventana magnética bajo la quilla (`[calado, calado + 1.5m]`).
3. **Vista de Periscopio y Controles TDC (Canvas 2D):** Renderizar el horizonte marino, silueta escalada y orientada según `distanceMeters`, `targetAngleOnBowDeg` y `targetBowSide`, Manual de Identificación de 3 mercantes, selector de espoleta/profundidad, deslizadores de AOB/velocidad y disparo de tubo `LOADED`.
4. **Cierre del Vertical Slice (Fase 1):** Sustituir `EncounterStubView` por el módulo Arcade real en `GameFlowController`, devolviendo `EncounterResult` al mapa estratégico.
5. **Arranque de Fase 2:** Implementar el rediseño estratégico Full-Viewport (`100vw x 100vh`), `MarineQuadratMapper` y doble zoom `24h/4h`.

## Deuda Técnica y Decisiones Pendientes (Tech Debt)
- `EncounterStubView.ts` sirve actualmente como pantalla puente del Hito 1.4 al recibir `FiringSolutionContext`; será reemplazado por `src/layers/arcade-torpedo/` en el Hito 1.4.
- Todos los archivos del repositorio cumplen el límite estricto (< 200 líneas) y cero bucles anidados.
