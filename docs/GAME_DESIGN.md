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

### 4.2. Especificación Cerrada de Fase 2 (Ver Detalle en `docs/phases/PHASE_02_STRATEGIC_CAMPAIGN.md`)
1. **Matriz *Marinequadrat* `45x27` (`5x3` Cuadrantes de `9x9`):** Proyección ortogonal *odd-r* (`col = q + floor(r / 2)`, `row = r`) con numeración histórica `O(1)` (`AD..CG` + subsector `1..9` + celda `11..99`, ej. `AL 44`), bases del Eje (`Brest`, `Lorient`, `Saint-Nazaire`), puertos aliados cerrados por redes/minas (`Halifax`, `Liverpool`, `Gibraltar`) y corredores comerciales con deriva lateral `±1 hex`.
2. **Doble Escala (`TRÁNSITO 24H` / `PATRULLA 4H`) y Consumo Decimal (`0.1%`):** Selector explícito donde `24H` (`SURFACED`, `1..5 hex` económico u `6..8 hex` forzado) ejecuta `6` ticks internos de `4h` con interrupción automática (*auto-drop*) ante contactos o radiogramas cercanos. Consumo base: `-0.4%` espera, `-0.9%/hex` económico (~111 hex de autonomía), `-2.8%/4h` forzar máquinas (`2 hex`), y cierre `ABORTED_AT_SEA` si `fuel` y `battery` se agotan en alta mar.
3. **Niebla de Guerra Total, Sensores, Luz y Clima:** Radio visual en `SURFACED` de `0..2 hex` según `TimeOfDay` y `WeatherState`; Hidrófono en `SUBMERGED` (`5 hex` parado / `3 hex` en marcha, `-1` en `STORM`) devolviendo cono de demora `±15°` e intensidad sin casilla exacta; Radiogramas del BdU con radio de incertidumbre `1..3 hex` retenidos en cola mientras se navega sumergido.
4. **Geometría Real de Entrada/Escape (`EncounterContext` / `EncounterResult`) y *Kriegstagebuch*:** Contrato preparado con `ships[]`, `updatedFuel`, `updatedBattery`, `timeOfDay`, `weather`, rumbo real del mercante a través de `(7,7)` y spawn relativo del submarino (`dist 0` emboscada `4-5 hex` vs. `dist 1` sector real a `6 hex`), distanciando `+1 hex` al contacto si escapa del `15x15`. Viewport `100vw x 100vh` HiDPI con lámina histórica calibrada de fondo (y atenuada tras Táctico/Arcade `960x640`) e Informe de Patrulla multi-salida al atracar.

---

## 5. Capa Táctica: Aproximación 15x15 (`src/layers/tactical/`) — Turnos de 5 Minutos

### 5.1. Escala del Tablero y Avance del Contacto
- Tablero hexagonal local de `15x15` celdas donde **`1 hexágono = 500 metros`** y **`1 turno = 5 minutos`**.
- El mercante inicia en la zona central `(4, 7)` con rumbo transversal Este (`heading = 0`) y avanza `1` hexágono por turno hacia el borde Este, mientras el submarino inicia al sur `(4, 11)` para permitir una aproximación por el través sin bloqueos artificiales de popa pura (`AOB = 180°`).
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

---

## 6. Capa de Acción Arcade — Módulo A: Ataque de Torpedos (`src/layers/arcade-torpedo/`)

### 6.1. Catálogo del Manual de Reconocimiento de Buques

| Identificador (`RecognizedShipClass`) | Nombre | Eslora (`lengthMeters`) | Calado (`draftMeters`) | Tonelaje (`BRT`) | Resistencia (`maxHitPoints`) | Rasgos de Silueta |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `COASTAL_FREIGHTER` | Carguero Costero | `85m` | `4.5m` | `2500` | `1` | 1 chimenea a popa, 1 mástil central. |
| `LIBERTY_CARGO` | Mercante Estándar | `135m` | `7.5m` | `7100` | `2` | Superestructura central, 2 mástiles. |
| `T2_TANKER` | Petrolero Oceánico | `160m` | `9.5m` | `10500` | `2` | Puente a proa, pasarela larga, chimenea a popa. |

### 6.2. Periscopio de `360°`, Arcos de Tiro (`BOW` vs `STERN`), Timón y Carrera del Torpedo
- **Marcación Inicial Desviada (`submarineRelativeBearingDeg`):**
  - Al emerger a cota de periscopio desde el mapa táctico `15x15`, la posición angular inicial del mercante depende del rumbo real del submarino respecto al blanco más una desviación de escucha acústica (`±25°..±55°`), por lo que el objetivo no aparece siempre centrado en `0°` (puede aparecer en una banda lateral o por la popa si el mercante rebasó al submarino).
- **Periscopio de `360°` (`-180°..+180°`) y Arcos de Fuego por Montaje:**
  - `0°` corresponde a la **Proa del Submarino** y `±180°` a la **Popa del Submarino**.
  - **Arco de Proa (`BOW`, `|periscopeBearingDeg| <= 45°`):** Giroscopio frontal; habilita exclusivamente los **4 tubos de proa (`BOW-1..4`)**.
  - **Arco de Popa (`STERN`, `|periscopeBearingDeg| >= 135°`):** Giroscopio trasero; habilita exclusivamente el **tubo de popa (`STERN-1`)**.
  - **Zona Muerta del Través (`DEAD_ZONE`, `45° < |periscopeBearingDeg| < 135°`):** Ningún tubo puede disparar de costado; el jugador debe virar el submarino con el timón o esperar a que el blanco entre en arco.
- **Timón del Submarino (`steerSubmarine` — Teclas `Q` / `E`):**
  - Permite virar la proa del submarino a Babor (`-8°`) o Estribor (`+8°`) desde la propia vista de periscopio para meter al contacto dentro del arco de proa (`BOW`) o presentarle la popa para disparar `STERN-1`.
- **Tiempo de Carrera del Torpedo (`torpedoRunSeconds`):**
  - La velocidad del torpedo es de `40 nudos` (`~20.58 m/s`).
  - La distancia efectiva recorrida según el ángulo de adelanto $\theta$ es $d_{\text{eff}} = \text{distanceMeters} / \cos(\theta)$, por lo que el tiempo real de carrera es $T_{\text{naval}} = d_{\text{eff}} / 20.58\text{ s}$ (`~24s` a `500m` hasta `~98s` a `2000m`), comprimido visualmente en una carrera animada de `1.4s` a `4.2s` durante la cual el torpedo y el buque avanzan simultáneamente hacia el punto de encuentro.

### 6.3. Resolución Balística y de Espoleta (`TorpedoResolutionEngine`)
1. **Desvío Longitudinal en el Cruce (`longitudinalMissMeters`):**
   - Mide la distancia en metros entre el centro del buque y el punto de cruce del torpedo en el instante exacto en que este alcanza la línea del horizonte.
   - Si `longitudinalMissMeters > lengthMeters / 2` -> `MISSED_AHEAD` (falla por proa).
   - Si `longitudinalMissMeters < -lengthMeters / 2` -> `MISSED_ASTERN` (falla por popa).
2. **Evaluación de Cota y Espoleta (cuando `|longitudinalMissMeters| <= lengthMeters / 2`):**
   - **Caso 1 (`torpedoDepthMeters <= draftMeters` — Choque físico con el casco):**
     - `obliquityDeg = |90 - targetAngleOnBowDeg|`.
     - Si `obliquityDeg > impactAngleToleranceDegrees` (`70°` en Normal -> `AOB < 20°` o `AOB > 160°`) o actúa `dudProbability`, rebota sin detonar: `GLANCING_DUD` (`0` daño).
     - Si impacta en la sección central del buque (`|longitudinalMissMeters| <= lengthMeters * 0.225` con espoleta `IMPACT`, sala de máquinas/pañoles), causa **daño estructural crítico (`2` puntos de daño)** en `HIT_HULL`; en proa o popa causa `1` punto de daño.
   - **Caso 2 (`draftMeters < torpedoDepthMeters <= draftMeters + magneticWindowMeters`):**
     - `magneticWindowMeters = 2.0m` en `EASY` y `1.5m` en `NORMAL`/`HARD`.
     - Si `pistolType === 'MAGNETIC'`, detona bajo la quilla partiendo la viga maestra: `HIT_KEEL_MAGNETIC` (`2` puntos de daño crítico, hundimiento inmediato).
     - Si `pistolType === 'IMPACT'`, pasa sin contacto físico: `PASSED_UNDER_KEEL` (`0` daño).
   - **Caso 3 (`torpedoDepthMeters > draftMeters + magneticWindowMeters`):**
     - Pasa por debajo sin activar ninguna espoleta: `PASSED_UNDER_KEEL` (`0` daño).
