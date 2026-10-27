# ESTADO DEL PROYECTO (HANDOFF & TRACKING)

## Estado Actual (Resumen Ejecutivo)
Estamos en la **Fase 1: Vertical Slice (Navegación, Aproximación y Disparo de Torpedo)** con los **Hitos 1.1 y 1.2 completados y verificados al 100%** (`tsc --noEmit`, `vite build` y 10 suites / 43 tests unitarios en Vitest pasando). La Capa Estratégica Mínima (`src/layers/strategic/`) y el coordinador `GameFlowController` (`src/flow/`) están operativos en Canvas 2D con separación total entre dominio y vista. El proyecto está listo para iniciar el **Hito 1.3 (Capa Táctica Hexagonal 15x15)**.

## Completado Recientemente
- Documentación de las reglas cerradas del turno estratégico de 4 horas en `/docs/GAME_DESIGN.md` (costes y recargas de `fuel`/`battery` en `SURFACED` vs `SUBMERGED`, emersión forzada con `battery === 0`, recarga completa de tubos activos e intercepción a distancia axial `<= 1`).
- Dominio puro de la capa estratégica en `src/layers/strategic/domain/`:
  - `AtlanticSectorScenario.ts`: Teatro Atlántico `12x8` con agua profunda, agua costera, costa intransitable (`LAND`), base naval de Lorient y ruta circular del mercante.
  - `StrategicMovementNavigator.ts`: Cálculo libre de bucles anidados del abanico alcanzable (`0`, `1` y `2` hexágonos) sin saltar barreras de tierra.
  - `StrategicResourceRules.ts`: Balance energético `0..100`, emersión automática al agotarse la batería y recarga de 4 horas sobre `TorpedoArmory`.
  - `StrategicMerchantController.ts` y `StrategicEngine.ts`: Avance de contactos por turno, detección de intercepción, emisión de `EncounterContext` y aplicación de `EncounterResult`.
- Vista vectorial Canvas 2D en `src/layers/strategic/view/` (`StrategicMapRenderer`, `StrategicUnitRenderer`, `StrategicHudRenderer`, `StrategicInputHandler`, `StrategicStageView`) con resaltado diferenciado `1 hex` vs `2 hex`, siluetas vectoriales y panel HUD de 4 tubos de proa + 1 de popa.
- Coordinador `GameFlowController` y pantalla temporal `EncounterStubView` en `src/flow/` para validar el viaje de ida y vuelta `EncounterContext -> EncounterResult`.
- Suite de pruebas ampliada a **10 archivos / 43 tests en verde** (`tests/layers/strategic/` y `tests/flow/`).

## En Progreso (Working On)
- Ninguna tarea abierta: **Hito 1.2 cerrado**. A la espera de iniciar el diseño previo del **Hito 1.3** (`src/layers/tactical/`).

## Próximos Pasos (Backlog Inmediato)
1. **Diseño Previo del Hito 1.3:** Definir las reglas cerradas del turno táctico de 5 minutos en `/docs/GAME_DESIGN.md` y proponer la estructura de `src/layers/tactical/` implementando `ITacticalStage`.
2. **Motor Táctico Hexagonal 15x15 (`HexTacticalEngine`):** Implementar el avance rectilíneo del mercante según rumbo/velocidad y el movimiento del submarino (1 a 3 hexágonos según velocidad y cota).
3. **Geometría de Posición de Tiro:** Calcular distancia relativa en hexágonos y Ángulo en la Proa real (`trueAngleOnBowDegrees`) para emitir `FiringSolutionContext` al subir el periscopio en rango óptimo (2 a 4 hexágonos).
4. **Vista Táctica Vectorial 15x15 (Canvas 2D):** Renderizar el tablero local, vectores de movimiento, controles de velocidad/cota y el botón "Subir Periscopio y Entrar en Posición de Tiro".
5. **Integración en `GameFlowController`:** Sustituir el paso directo al stub por la etapa `ITacticalStage` real y añadir sus pruebas unitarias en `tests/layers/tactical/`.

## Deuda Técnica y Decisiones Pendientes (Tech Debt)
- `EncounterStubView.ts` actúa actualmente como pantalla puente para validar el ciclo `Strategic <-> Tactical`; en el Hito 1.3 se conectará `ITacticalStage` para la aproximación `15x15` y en el Hito 1.4 el módulo Arcade de torpedos.
- Todos los archivos del repositorio cumplen el límite estricto (< 180 líneas, máximo 179 en `StrategicEngine.ts`) y cero bucles anidados.
