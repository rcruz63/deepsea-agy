# REGLAS MECÁNICAS CERRADAS: SUBMARINE COMMAND

Este documento consolida las fórmulas matemáticas y reglas de negocio cerradas que ya han sido implementadas y verificadas mediante tests unitarios.

---

## 1. Geometría y Métrica Hexagonal (`src/core/hex/`)

### 1.1. Coordenadas Axiales e Invariante Cúbico
- Cada celda se identifica mediante coordenadas axiales enteras `(q, r)`.
- La tercera coordenada cúbica se deriva implícitamente como `s = -q - r`, garantizando el invariante `q + r + s = 0`.
- La clave canónica de indexación en `Map<HexKey, TCell>` tiene siempre el formato exacto `"q,r"` (con normalización de `-0` a `0` para evitar colisiones de clave en JavaScript).

### 1.2. Vectores de Dirección (`POINTY_TOP`)
En orientación `POINTY_TOP`, los seis rumbos discretos en sentido horario son:
- `0` (`EAST`): `(+1, 0)`
- `1` (`SOUTHEAST`): `(0, +1)`
- `2` (`SOUTHWEST`): `(-1, +1)`
- `3` (`WEST`): `(-1, 0)`
- `4` (`NORTHWEST`): `(0, -1)`
- `5` (`NORTHEAST`): `(+1, -1)`

### 1.3. Distancia Hexagonal Exacta
La distancia mínima en pasos entre `origin(q1, r1)` y `destination(q2, r2)` equivale a la semidistancia de Manhattan en el espacio cúbico:
- `dq = q2 - q1`
- `dr = r2 - r1`
- `distance = (|dq| + |dq + dr| + |dr|) / 2`

### 1.4. Proyección Cartesiana 2D y Redondeo Cúbico
- **Orientación `POINTY_TOP` de radio `size`:**
  - `x = size * sqrt(3) * (q + r / 2)`
  - `y = size * (3 / 2) * r`
- **Redondeo fraccional:** Al convertir coordenadas cartesianas continuas a axiales fraccionales, se redondean `(q, r, s)` al entero más cercano y se reajusta la componente con mayor desviación absoluta para preservar `q + r + s = 0`.

---

## 2. Sistema de Torpedos y Armería (`src/core/armory/`)

### 2.1. Máquina de Estados de Tubo Individual
Cada tubo (`BOW` o `STERN`) transita exclusivamente según las siguientes reglas:
- `LOADED -> EMPTY`: Al disparar el tubo (`remainingReloadTurns = 0`, `isReloadPaused = false`).
- `EMPTY -> RELOADING`: Al ordenar recarga si existen reservas disponibles (o si `hasInfiniteReserveTorpedoes === true`). Asigna `remainingReloadTurns = reloadTurnsRequired`.
- `RELOADING -> RELOADING | LOADED`: Al avanzar un turno, si `isReloadPaused === false`, decrementa `remainingReloadTurns` en `1`. Al llegar a `0`, pasa a `LOADED`.
- `ANY -> DAMAGED`: Un impacto deja el tubo inoperativo (`remainingReloadTurns = 0`, `isReloadPaused = false`), bloqueando disparo y recarga hasta reparación en base.

### 2.2. Ruido Mecánico de Recarga
- Las maniobras de estiba y arrastre de torpedos generan ruido mecánico detectable por escoltas.
- Si al menos un tubo está en `RELOADING` con `isReloadPaused === false`, el submarino recibe la penalización acústica `reloadAcousticPenalty` definida en `DifficultyConfig`. Si todos los tubos en recarga están pausados (`isReloadPaused === true`), la penalización de recarga cae a `0`.

---

## 3. Perfiles de Dificultad (`src/core/difficulty/`)

| Parámetro | `EASY` | `NORMAL` | `HARD` |
| :--- | :---: | :---: | :---: |
| `hasInfiniteReserveTorpedoes` | `true` | `false` | `false` |
| `reloadTurnsRequired` | `2` | `4` | `5` |
| `reloadAcousticPenalty` | `5` | `25` | `35` |
| `impactAngleToleranceDegrees` | `70°` | `60°` | `50°` |
| `dudProbability` | `0.00` | `0.00` | `0.12` |
| `asdicAggressivenessMultiplier` | `0.75` | `1.00` | `1.35` |
| `strategicUncertaintyRadiusHexes` | `1` | `2` | `3` |

---

## 4. Capa Estratégica: Patrulla Oceánica (`src/layers/strategic/`)

### 4.1. Escala de Recursos (`fuel` y `battery`)
- Tanto el combustible diésel (`fuel`) como la carga de baterías eléctricas (`battery`) están acotados en el rango `[0, 100]`.

### 4.2. Movimiento y Balance Energético por Turno (4 Horas)
Solo son transitables las celdas de agua (`DEEP_WATER`, `COASTAL_WATER`) y bases navales (`NAVAL_BASE`); la costa (`LAND`) es intransitable.

| Postura | Distancia (Hex) | Variación de `fuel` | Variación de `battery` | Notas de Regla |
| :--- | :---: | :---: | :---: | :--- |
| `SURFACED` | `0` | `-1` | `+30` (máx. `100`) | Patrulla estacionaria y carga rápida con generadores diésel. |
| `SURFACED` | `1` | `-2` | `+20` (máx. `100`) | Crucero económico de superficie. |
| `SURFACED` | `2` | `-5` | `+10` (máx. `100`) | Forzar máquinas; penaliza consumo diésel y reduce margen de carga. |
| `SUBMERGED` | `0` | `0` | `-5` (mín. `0`) | Acecho silencioso sumergido. |
| `SUBMERGED` | `1` | `0` | `-15` (mín. `0`) | Tránsito sumergido con motores eléctricos (alcance máximo: `1` hex). |

- **Superficie forzada por batería agotada:** Si al cierre del movimiento o turno `battery` llega a `0`, el submarino pasa automáticamente a postura `SURFACED` (`depth = 'SURFACED'`).
- **Restricción por combustible:** En postura `SURFACED`, un alcance de `1` o `2` hexágonos solo es seleccionable si el submarino dispone de `fuel` suficiente para cubrir su coste (`>= 2` o `>= 5` respectivamente). En `SUBMERGED`, mover `1` hexágono requiere `battery >= 15` (o al agotarse a `0` fuerza salida a superficie al final del turno).

### 4.3. Recarga de Torpedos en Escala Estratégica
- Dado que un turno estratégico representa **4 horas**, al avanzar un turno estratégico se ejecutan suficientes ticks de recarga sobre `TorpedoArmory` para que todo tubo en estado `RELOADING` con `isReloadPaused === false` complete su ciclo y pase a `LOADED`.

### 4.4. Escenario Atlántico (`12x8`), Ruta Mercante e Intercepción
- El mapa estratégico inicial de `12x8` hexágonos contiene mar abierto, una franja costera intransitable (`LAND`), una base naval de salida (`NAVAL_BASE`) y al menos un buque mercante móvil que avanza `1` hexágono por turno siguiendo su ruta de tránsito.
- **Disparo de Intercepción (`EncounterContext`):** Cuando al término del movimiento del submarino o del avance del mercante ambos se encuentran en el mismo hexágono o en hexágonos adyacentes (`calculateHexDistance <= 1`), el motor estratégico habilita la intercepción y construye un `EncounterContext` inmutable para `GameFlowController`.
