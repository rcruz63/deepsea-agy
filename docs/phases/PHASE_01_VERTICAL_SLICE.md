# FASE 1: VERTICAL SLICE (NAVEGACIÓN, APROXIMACIÓN Y DISPARO DE TORPEDO)

## 1. OBJETIVO DE LA FASE
Construir el flujo completo de las 3 capas conectadas (`Strategic` -> `Tactical` -> `Arcade Torpedo` -> `Strategic`) en TypeScript + Vite + Canvas 2D + Vitest, enfrentando al submarino contra un único buque mercante desarmado para validar la arquitectura, la matemática hexagonal, la gestión de tubos de torpedos y la mecánica de disparo TDC sin apilar todavía la complejidad de los destructores.

## 2. ENTREGABLES FUNCIONALES DE LA FASE 1

### Hito 1.1: Configuración Base, Contratos y Motor Hexagonal Puro
- Inicialización del proyecto con TypeScript estricto, Vite y Vitest.
- Implementación del módulo matemático de hexágonos (`src/core/hex/`) usando coordenadas axiales `(q, r)` e indexación por `Map<string, HexCell>` (cero bucles anidados).
- Definición de los contratos de transición en `src/core/contracts/`:
  - `CampaignState`, `SubmarineState`, `TorpedoArmoryState`, `DifficultyConfig`.
  - `EncounterContext` (datos que pasan del mapa estratégico al táctico) y `EncounterResult` (resultado que vuelve al estratégico).
  - Interfaz `ITacticalStage` para garantizar el desacoplamiento de la capa táctica.

### Hito 1.2: Capa Estratégica Mínima (`src/layers/strategic/`)
- Tablero hexagonal de un sector del Atlántico (ej. 12x8 hexágonos) con agua, costa y una base naval de salida.
- El submarino puede moverse hexágono a hexágono por turnos (en Superficie o Sumergido) consumiendo combustible/batería.
- Panel de estado de tubos lanzatorpedos (4 de proa, 1 de popa, reserva) con avance del temporizador de recarga por turno.
- Un contacto mercante móvil en el mapa; al coincidir en el mismo hexágono (o adyacente con intercepción aceptada), se dispara la transición a la Capa Táctica.

### Hito 1.3: Capa Táctica Hexagonal 15x15 (`src/layers/tactical/`)
- Tablero local de 15x15 hexágonos (turnos de 5 minutos).
- El mercante avanza en línea recta según su rumbo y velocidad.
- El jugador mueve el submarino (1 a 3 hexágonos según velocidad y cota) buscando colocarse a distancia óptima (2 a 4 hexágonos por el través del mercante).
- Botón/Acción "Subir Periscopio y Entrar en Posición de Tiro", que empaqueta la distancia relativa y el ángulo (AOB real) hacia la Capa Arcade.

### Hito 1.4: Capa Arcade - Ataque de Torpedos (`src/layers/arcade-torpedo/`)
- Vista de periscopio vectorial en Canvas 2D: muestra el horizonte, el mar y la silueta del mercante desplazándose y escalada según distancia y ángulo.
- Controles del jugador (TDC Arcade):
  1. Selector del Manual de Identificación (3 tipos de mercantes con distinto calado en metros).
  2. Selector de Espoleta (`IMPACT` vs. `MAGNETIC`) y profundidad del torpedo.
  3. Deslizadores visuales para estimar Velocidad del blanco y Ángulo en la Proa (AOB).
  4. Selección de tubo listo (`LOADED`) y botón de Disparo.
- Resolución física de la trayectoria:
  - Si el cálculo de velocidad/AOB es correcto, el torpedo intercepta al barco.
  - Si lleva espoleta de impacto y el ángulo es demasiado oblicuo (>60° de desviación respecto a la perpendicular), el torpedo rebota (*dud*).
  - Si lleva espoleta magnética y la profundidad está entre `calado` y `calado + 1.5m`, provoca daño crítico devastador; si es menor que el calado, funciona como impacto; si es muy profunda, pasa de largo por debajo.
- Retorno al mapa estratégico actualizando los torpedos gastados, los tubos vacíos (`EMPTY` -> listos para iniciar `RELOADING`) y el tonelaje hundido.

## 3. CRITERIOS DE ACEPTACIÓN DE INGENIERÍA
- Cobertura de tests unitarios en Vitest para: distancias hexagonales, máquina de estados de recarga de tubos, y geometría de intercepción/espoleta de torpedos.
- Ningún archivo supera las 200 líneas.
- Cero bucles anidados en todo el repositorio.
- `/docs/STATUS.md`, `/docs/ARCHITECTURE.md` y `/CHANGELOG.md` creados y actualizados tras cada hito.
