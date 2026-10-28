# REGLAS MECÁNICAS CERRADAS: SUBMARINE COMMAND

Este documento consolida las fórmulas matemáticas y reglas de negocio cerradas del proyecto.

---

## 1. Geometría y Métrica Hexagonal (`src/core/hex/`)

### 1.1. Coordenadas Axiales e Invariante Cúbico
- Cada celda se identifica mediante coordenadas axiales enteras `(q, r)` con coordenada cúbica implícita `s = -q - r` (`q + r + s = 0`).
- La clave canónica en `Map<HexKey, TCell>` tiene siempre el formato `"q,r"` (normalizando `-0` a `0`).

### 1.2. Vectores de Dirección (`POINTY_TOP`)
En sentido horario: `0` (`+1, 0` Este), `1` (`0, +1` Sureste), `2` (`-1, +1` Suroeste), `3` (`-1, 0` Oeste), `4` (`0, -1` Noroeste), `5` (`+1, -1` Noreste).

### 1.3. Distancia Hexagonal y Proyección 2D
- **Distancia exacta `O(1)`:** `distance = (|dq| + |dq + dr| + |dr|) / 2`.
- **Proyección `POINTY_TOP` de radio `size`:** `x = size * sqrt(3) * (q + r / 2)`, `y = size * (3 / 2) * r`.
- **Demora náutica (`calculateNavalBearingDegrees`):** `0°` al Norte (`-Y`), sentido horario (`90°` Este, `180°` Sur, `270°` Oeste).

---

## 2. Sistema de Torpedos y Armería (`src/core/armory/`)

### 2.1. Máquina de Estados de Tubo Individual
- `LOADED -> EMPTY`: Al disparar el tubo (`remainingReloadTurns = 0`, `isReloadPaused = false`).
- `EMPTY -> RELOADING`: Al ordenar recarga si existen reservas (o `hasInfiniteReserveTorpedoes === true`), asignando `remainingReloadTurns = reloadTurnsRequired`.
- `RELOADING -> RELOADING | LOADED`: Al avanzar un turno táctico, si `isReloadPaused === false`, decrementa `remainingReloadTurns` en `1` hasta llegar a `0` (`LOADED`).
- `ANY -> DAMAGED`: Inutiliza el tubo hasta reparación en base.

### 2.2. Ruido Mecánico de Recarga
- Si al menos un tubo está en `RELOADING` con `isReloadPaused === false`, genera la penalización acústica `reloadAcousticPenalty` del `DifficultyConfig`.

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

### 4.1. Balance Energético por Turno Operacional (4 Horas — Fase 1)
Recursos `fuel` y `battery` acotados en `[0, 100]`. La costa (`LAND`) es intransitable.

| Postura | Distancia (Hex) | Variación de `fuel` | Variación de `battery` | Notas de Regla |
| :--- | :---: | :---: | :---: | :--- |
| `SURFACED` | `0` | `-1` | `+30` (máx. `100`) | Patrulla estacionaria y carga rápida diésel. |
| `SURFACED` | `1` | `-2` | `+20` (máx. `100`) | Crucero económico de superficie. |
| `SURFACED` | `2` | `-5` | `+10` (máx. `100`) | Forzar máquinas en superficie. |
| `SUBMERGED` | `0` | `0` | `-5` (mín. `0`) | Acecho silencioso sumergido. |
| `SUBMERGED` | `1` | `0` | `-15` (mín. `0`) | Tránsito sumergido (alcance máximo: `1` hex). |

- **Emersión forzada:** Si `battery === 0` al cerrar el turno, el submarino pasa automáticamente a `SURFACED`.
- **Recarga de torpedos en 4h:** Un turno estratégico completa todos los ticks de recarga de los tubos en `RELOADING` no pausados.
- **Intercepción (`EncounterContext`):** Habilitada cuando `calculateHexDistance(sub, merchant) <= 1`.

### 4.2. Especificación de Evolución Estratégica para Fase 2 (Cerrada en Diseño)
1. **Viewport Completo (`100vw x 100vh`) y HUD Superior:** Lienzo a pantalla completa con cámara *pan & zoom*, barra de mando superior y cartelas flotantes sobre la carta.
2. **Estética Cartográfica y *Marinequadrat* (`NavalGridSystem`):** Estilo en papel de la *Kriegsmarine* con puertos históricos (Brest, Saint-Nazaire, Halifax, Liverpool, Gibraltar) y `MarineQuadratMapper` para traducir `(q, r)` a nomenclatura naval alemana (`AD`, `AE`, `AK`, `AL`, `AM`, `BE`, `BF` + subcuadrante `11..99`, ej. `AL 44`, `AK 63`).
3. **Doble Zoom y Consumo Variable:** Zoom 1 (*Carta Oceánica / Tránsito*, turnos de `24h` con tabla de consumo de crucero oceánico) y Zoom 2 (*Carta de Sector / Patrulla*, turnos de `4h` con tabla operacional e hidrófono).

---

## 5. Capa Táctica: Aproximación 15x15 (`src/layers/tactical/`) — Turnos de 5 Minutos

### 5.1. Escala del Tablero y Avance del Contacto
- Tablero hexagonal local de `15x15` celdas donde **`1 hexágono = 500 metros`** y **`1 turno = 5 minutos`**.
- El mercante inicia en la zona central y avanza `1` hexágono por turno siguiendo su vector de rumbo (`heading`).
- Cada turno táctico avanza **`1 tick`** en la recarga de `TorpedoArmory` (`advanceArmoryReloadTurn`).

### 5.2. Cotas Tácticas (`TacticalDepth`), Velocidad y Consumo por Turno (5m)

| Cota Táctica | Alcance (Hex) | Coste `fuel` | Coste `battery` | Regla Operativa |
| :--- | :---: | :---: | :---: | :--- |
| `SURFACED` | `0..3` | `0 hex: 0` \| `1-2 hex: -1` \| `3 hex: -2` | `0` | Permite flanqueo rápido y disparo en superficie. |
| `PERISCOPE_DEPTH` | `0..2` | `0` | `0 hex: 0` \| `1 hex: -1` \| `2 hex: -3` | Cota estándar de ataque; habilita el periscopio. |
| `DEEP` | `0..1` | `0` | `0 hex: 0` \| `1 hex: -1` | Navegación profunda; **bloquea** el periscopio. |

- Si `battery` cae a `0` en `PERISCOPE_DEPTH` o `DEEP`, el submarino es forzado automáticamente a `SURFACED`.

### 5.3. Ventana de Disparo y Geometría del `FiringSolutionContext`
- **Condición de disparo:** Cota `PERISCOPE_DEPTH` o `SURFACED`, al menos un tubo en estado `LOADED`, y distancia axial al mercante entre **`1` y `4` hexágonos** (`500m <= distanceMeters <= 2000m`).
- **Distancia en metros (`distanceMeters`):** `relativeDistanceHexes * 500`.
- **Ángulo en la Proa (`targetAngleOnBowDeg`):** Ángulo absoluto en `[0°, 180°]` entre el rumbo de proa del mercante y la demora náutica desde el mercante hacia el submarino (`0°` = proa pura, `90°` = través perpendicular óptimo, `180°` = popa).
