# ARQUITECTURA DEL SISTEMA: SUBMARINE COMMAND

## 1. Principios Arquitectónicos Innegociables

1. **Separación Estricta Dominio vs. Vista:** Toda la lógica matemática, reglas tácticas, gestión de recursos y máquinas de estado residen en módulos puros de TypeScript sin dependencias del DOM ni de `CanvasRenderingContext2D`.
2. **Desacoplamiento Total de las 3 Capas:** Las capas `StrategicLayer`, `TacticalLayer` y `ArcadeLayer` tienen prohibido importarse entre sí o mutar el estado de otra capa. Toda transición ocurre a través de `GameFlowController` mediante contratos de datos inmutables (`readonly`).
3. **Diseño Multi-Teatro Basado en Datos:** Ninguna facción, mapa o catálogo de buques se codifica a fuego en las reglas; la campaña se alimenta de un `TheaterDefinition`.
4. **Cero Bucles Anidados (`Zero Nested Loops`):** Prohibido anidar iteraciones (`for`, `while`, `.forEach`, `.map`) dentro de una misma función. Las consultas espaciales utilizan indexación `O(1)` mediante `Map<HexKey, HexCell>` con claves axiales `"q,r"` y funciones semánticas de un único nivel de iteración.
5. **Alta Cohesión y Tamaño Acotado:** Una única responsabilidad por función (~15-25 líneas orientativas) y por archivo (límite estricto < 200 líneas).

---

## 2. Flujo Entre Capas y Contratos de Transición

```mermaid
flowchart TD
    GFC["GameFlowController (Coordinador de Estado)"]

    subgraph Core["Núcleo Puro Compartido (src/core)"]
        Contracts["contracts/ (Contratos Inmutables)"]
        Hex["hex/ (Matemática Axial y Map q,r)"]
        Armory["armory/ (TorpedoArmory y Tubos)"]
        Diff["difficulty/ (Perfiles DifficultyConfig)"]
    end

    subgraph Layers["Capas de Juego Aisladas (src/layers)"]
        Strategic["StrategicEngine ( Turnos de 4h )"]
        Tactical["ITacticalStage / HexTacticalEngine ( 15x15, Turnos de 5m )"]
        ArcadeTorp["TorpedoArcadeEngine: Módulo A ( Ataque TDC Periscopio )"]
    end

    GFC -->|"CampaignState"| Strategic
    Strategic -->|"EncounterContext"| GFC
    GFC -->|"EncounterContext"| Tactical
    Tactical -->|"FiringSolutionContext"| GFC
    GFC -->|"FiringSolutionContext"| ArcadeTorp
    Tactical -->|"EncounterResult (Ruptura de contacto)"| GFC
    ArcadeTorp -->|"EncounterResult (Impactos, Tonelaje y Armería)"| GFC
    GFC -->|"Actualiza CampaignState"| Strategic

    Strategic -.-> Core
    Tactical -.-> Core
    ArcadeTorp -.-> Core
```

---

## 3. Estructura de Directorios (Estado tras Cierre de Fase 2 — Hitos 2.0 a 2.5)

```text
/
├── AGENTS.md                             # Reglas de ingeniería activas automáticamente en cada sesión
├── CHANGELOG.md                          # Historial cronológico inverso (Keep a Changelog)
├── docs/
│   ├── ARCHITECTURE.md                   # Mapa modular, contratos y diagramas de flujo
│   ├── GAME_DESIGN.md                    # Fórmulas matemáticas y reglas mecánicas cerradas
│   ├── GAME_DESIGN_VISION.md             # Visión general y roadmap de las 6 fases
│   ├── IDEAS_BACKLOG.md                  # Ideas exploratorias aparcadas (prohibido auto-implementar)
│   ├── STATUS.md                         # Estado vivo del proyecto para handoff inmediato
│   └── phases/
│       ├── PHASE_01_VERTICAL_SLICE.md    # Especificación funcional de la Fase 1 (cerrada)
│       └── PHASE_02_STRATEGIC_CAMPAIGN.md # Especificación funcional y matemática de la Fase 2 (cerrada)
├── src/
│   ├── core/                             # Lógica de dominio pura compartida
│   │   ├── contracts/                    # Contratos congelados (Environment, StrategicIntel, Encounter ships[])
│   │   ├── difficulty/                   # Tabla de perfiles EASY, NORMAL, HARD
│   │   ├── armory/                       # Máquina de estados de tubos y reserva de torpedos
│   │   └── hex/                          # Geometría axial (q, r), HexGridMap y MarineQuadratMapper (AD..CG 11..99)
│   ├── layers/
│   │   ├── strategic/                    # Capa Estratégica 45x27 Marinequadrat (Fase 2 completada)
│   │   │   ├── domain/                   # Teatro Atlántico, escala 24H/4H, reloj/clima, hidrófono, BdU y PatrolRefitRules
│   │   │   └── view/                     # Lámina Nr. 1546 cacheada, cámara pan/zoom, niebla, barra superior, cartelas y KTB
│   │   ├── tactical/                     # Capa Táctica 15x15 tras ITacticalStage
│   │   │   ├── domain/                   # TacticalSpawnGeometry (entrada real), cotas, AOB/banda y HexTacticalEngine
│   │   │   └── view/                     # Plotter 15x15, anillo de tiro 1..4 hex, HUD con luz/clima y periscopio
│   │   └── arcade-torpedo/               # Capa Arcade Módulo A: Periscopio 360° y TDC
│   │       ├── domain/                   # ShipRecognitionManual, PeriscopeKinematics, TorpedoResolutionEngine y TorpedoArcadeEngine
│   │       └── view/                     # PeriscopeTargetRenderer, PeriscopeLensRenderer, TdcControlPanelRenderer y TorpedoArcadeStageView
│   ├── flow/                             # GameFlowController y GameFlowState (Ciclo 3 capas cerrado)
│   ├── shell/                            # ViewportFrameComposer (100% x 100dvh HiDPI + consola 960x640 sobre carta atenuada)
│   └── main.ts                           # Arranque Canvas 2D conectado a ViewportFrameComposer y GameFlowController
└── tests/
    ├── core/                             # Tests unitarios de dominio nuclear (hex, armory y MarineQuadratMapper)
    ├── layers/
    │   ├── strategic/                    # Tests de navegación, tránsito 24H, sensores/BdU, cámara y multi-patrulla
    │   ├── tactical/                     # Tests de spawn relativo 15x15, movimiento, geometría AOB y escape
    │   └── arcade-torpedo/               # Tests de trigonometría TDC, espoletas y secuencia multidisparo
    └── flow/                             # Tests de integración del ciclo completo de las 3 capas
```

---

## 4. Contratos Globales de Datos (`src/core/contracts/`)

| Contrato | Responsabilidad en la Arquitectura |
| :--- | :--- |
| `DifficultyConfig` | Parametriza reserva infinita/finita, turnos de recarga, penalización acústica, tolerancia de espoleta, probabilidad de *dud* e incertidumbre estratégica. |
| `EnvironmentContracts` | Tipa la escala temporal (`PATROL_4H` / `TRANSIT_24H`), el reloj de guardia (`PatrolClockState`), luz (`TimeOfDay`) y meteorología (`WeatherState`). |
| `StrategicIntelContracts` | Aísla la inteligencia bajo niebla de guerra (`HydrophoneBearingContact`, `BduPatrolOrder`, `BduRadiogramReport` y `KriegstagebuchPatrolSummary`). |
| `TorpedoArmoryState` | Modela individualmente `bowTubes`, `sternTubes` y `reserveTorpedoes`. Cada tubo gestiona su estado (`LOADED`, `RELOADING`, `EMPTY`, `DAMAGED`), turnos restantes y pausa silenciosa (`isReloadPaused`). |
| `TheaterDefinition` | Define declarativamente dimensiones, bases propias, puertos aliados bloqueados (`ALLIED_PORT`), corredores comerciales con deriva, rejilla *Marinequadrat* y catálogos. |
| `SubmarineState` | Posición axial, rumbo, postura (`SURFACED` / `SUBMERGED`), cota, combustible, baterías, integridad del casco y `TorpedoArmoryState`. |
| `CampaignState` | Estado raíz de la patrulla activa: escala, reloj, clima, submarino, contactos, IDs visibles, conos de hidrófono, cola de radiogramas BdU y resumen de patrulla. |
| `EncounterContext` | Fotografía inmutable enviada hacia `ITacticalStage`: lista `ships[]`, luz/clima, distancia (`0`/`1`) y dirección axial real de aproximación. |
| `FiringSolutionContext` | Fotografía geométrica, ambiental y energética (`fuelAtPeriscope`, `batteryAtPeriscope`) enviada hacia `ArcadeLayer` al subir el periscopio. |
| `EncounterResult` | Resultado inmutable devuelto a `StrategicLayer` (armería, `updatedFuel`, `updatedBattery`, daño, `sunkShipIds`, escape `TARGET_ESCAPED`, disparos/aciertos y turnos). |
| `ITacticalStage` | Contrato polimórfico que aísla la implementación del tablero táctico (hexagonal 15x15 vs. futuro ploteo polar por anillos). |

---

## 5. Modelo Matemático Hexagonal (`src/core/hex/`)

- **Sistema de Coordenadas:** Axial `(q, r)` con tercera coordenada cúbica implícita `s = -q - r` (`q + r + s = 0`), óptimo para distancias exactas en `O(1)` y trazado de anillos sin trigonometría costosa.
- **Orientación Base:** `POINTY_TOP` por defecto (configurable en `HexLayout`), alineando los rumbos náuticos con los seis lados del hexágono.
- **Indexación Espacial:** Todo tablero se almacena en `HexGridMap<TCell>` sobre un `ReadonlyMap<HexKey, TCell>` indexado por la clave canónica `"q,r"`, evitando matrices bidimensionales `grid[x][y]` y garantizando búsquedas directas libres de bucles anidados.
