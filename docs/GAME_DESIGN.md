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
