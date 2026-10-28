# ESTADO DEL PROYECTO (HANDOFF & TRACKING)

## Estado Actual (Resumen Ejecutivo)
La **Fase 1: Vertical Slice (Navegación, Aproximación y Disparo de Torpedo)** está **100% completada y verificada** (Hitos 1.1, 1.2, 1.3 y 1.4 cerrados; `tsc --noEmit`, `vite build` y 15 suites / 62 tests unitarios y de integración pasando en Vitest). El ciclo completo de las 3 capas (`StrategicLayer -> TacticalLayer -> ArcadeLayer -> StrategicLayer`) funciona de extremo a extremo a través de `GameFlowController` sin ninguna importación cruzada entre capas y con todos los archivos del repositorio por debajo del límite estricto de 200 líneas y cero bucles anidados. El proyecto está listo para iniciar la **Fase 2: Campaña Estratégica, Sensores e Inteligencia**.

## Completado Recientemente
- **Hito 1.4 — Capa Arcade: Ataque de Torpedos (`src/layers/arcade-torpedo/`) y Cierre del Ciclo de Fase 1:**
  - Documentación en `/docs/GAME_DESIGN.md` (§6) de las reglas mecánicas cerradas del Módulo Arcade A: catálogo de reconocimiento (`COASTAL_FREIGHTER` 85m/4.5m/1 HP, `LIBERTY_CARGO` 135m/7.5m/2 HP, `T2_TANKER` 160m/9.5m/2 HP), fórmula de desvío longitudinal en el cruce (`longitudinalMissMeters`) y matriz física de espoletas `IMPACT` vs `MAGNETIC`.
  - Motor de dominio puro en `src/layers/arcade-torpedo/domain/` (`ShipRecognitionManual.ts`, `TorpedoTypes.ts`, `TorpedoResolutionEngine.ts`, `TorpedoArcadeEngine.ts`) soportando secuencia multidisparo en la misma sesión de periscopio, consumo y recarga individual de tubos (`advanceFiveMinuteReloadTick`) y construcción de `EncounterResult`.
  - Vista de periscopio y consola TDC en `src/layers/arcade-torpedo/view/` (`PeriscopeLensRenderer.ts`, `TdcControlPanelRenderer.ts`, `TorpedoArcadeStageView.ts`) con deducción visual real sin spoilers previos al disparo (siluetas vectoriales distintivas por clase, recuadro guía fantasma cian de AOB y espuma de proa proporcional a la velocidad) e Informe de Telemetría posdisparo.
  - Eliminación de `EncounterStubView.ts`, aislamiento 100% estricto entre las 3 capas (`resolveAdjacentHexDirection` movido a `src/core/hex/`) y aparición continua de nuevos mercantes de reemplazo en `StrategicEngine.applyEncounterResult` al hundir un contacto.
  - Nuevas suites de tests en `tests/layers/arcade-torpedo/` y prueba de ciclo completo de las 3 capas en `tests/flow/GameFlowController.test.ts` (**15 suites / 62 tests en verde**).

## En Progreso (Working On)
- Ninguna tarea en curso. **Fase 1 finalizada al 100%**.

## Próximos Pasos (Backlog Inmediato — Fase 2: Campaña Estratégica, Sensores e Inteligencia)
1. **Hito 2.1 — Sistema Cartográfico *Marinequadrat* (`MarineQuadratMapper`) y Doble Escala Temporal (`24h` / `4h`):** Implementar en `src/core/hex/` o `src/layers/strategic/domain/` el traductor de coordenadas axiales `(q, r)` a nomenclatura naval alemana (`AL 44`, `AK 63`, sub-cuadrícula `1..9`) y la alternancia entre modo Tránsito Oceánico (`24h/turno`) y Patrulla Operativa (`4h/turno`).
2. **Hito 2.2 — Cámara Pan & Zoom a Pantalla Completa (`100vw x 100vh`) y Carta Náutica Histórica:** Rediseñar la vista de la Capa Estratégica para ocupar todo el viewport con estética de carta en papel de la *Kriegsmarine*, puertos históricos, rutas de convoyes discontinuas y barra de mando superior superpuesta.
3. **Hito 2.3 — Radiogramas del Bdu, Niebla de Guerra y Conos de Detección:** Incorporar incertidumbre de contactos según `DifficultyConfig.strategicContactUncertaintyHexes` y detección dependiente de meteorología, hora del día y postura (`SURFACED` vs `SUBMERGED`).
4. **Hito 2.4 — Retorno a Base Naval (Brest / Saint-Nazaire):** Implementar reabastecimiento de combustible (`fuel = 100`), torpedos (`reserveTorpedoes`), reparación de casco y resumen de patrulla.

## Deuda Técnica y Decisiones Pendientes (Tech Debt)
- Sin deuda técnica activa: `EncounterStubView.ts` ha sido eliminado y sustituido por `TorpedoArcadeStageView`, no existen importaciones cruzadas entre `src/layers/strategic/`, `src/layers/tactical/` y `src/layers/arcade-torpedo/`, y los 62 archivos `.ts` cumplen estrictamente `< 200` líneas y cero bucles anidados.
