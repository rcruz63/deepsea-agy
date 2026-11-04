# FASE 2: CAMPAÑA ESTRATÉGICA, SENSORES, INCERTIDUMBRE Y TRANSICIÓN REAL

## 1. OBJETIVO Y FRONTERA DE ALCANCE DE LA FASE 2

Transformar la Capa Estratégica de un tablero omnisciente de prueba (`12x8`) en una **campaña de caza oceánica en el Atlántico Norte (`45x27`)** guiada por incertidumbre real de sensores, gestión de escala temporal (`24h` vs. `4h`), cartografía histórica *Marinequadrat* a pantalla completa (`100vw x 100vh`) y geometría auténtica de entrada y escape hacia la Capa Táctica.

### Reparto Estricto Fase 2 vs. Fase 3 (Camino A — Sin Parches Intermedios)
- **Entra en Fase 2:**
  - Sistema cartográfico *Marinequadrat* (`5x3` Grandes Cuadrantes de `9x9` = `45x27` hexágonos) con lámina histórica calibrada de fondo.
  - Doble escala temporal explícita (`TRÁNSITO 24H` con `6` ticks internos de `4h` e interrupción automática *auto-drop* vs. `PATRULLA 4H`) y consumo diésel recalibrado con precisión decimal (`0.1%`).
  - Niebla de guerra estratégica total: visión en `SURFACED` dependiente de Luz (`TimeOfDay`) y Clima (`WeatherState`), Hidrófono estratégico en `SUBMERGED` por conos de demora (`±15°`), y Radiogramas del BdU con radio de incertidumbre (`1..3 hex`) diferidos mientras se navega sumergido.
  - Corredores comerciales aliados entre puertos históricos con variación lateral (`±1 hex`).
  - Evolución de `EncounterContext` y `EncounterResult` (preparados con `ships[]` para convoyes futuros, persistencia de `fuel`/`battery`, luz/clima, geometría real de entrada al `15x15` y distanciamiento tras escape).
  - Ciclo multi-patrulla: retorno a bases del Eje, Informe de Patrulla (*Kriegstagebuch*), reparación/rearme con avance de calendario y regla *anti-softlock* por agotamiento energético en alta mar.
- **Queda documentado exclusivamente para Fase 3 (NO implementar en Fase 2):**
  - Múltiples barcos simultáneos en el tablero `15x15` (convoyes y escoltas que se separan para cazar al submarino).
  - Niebla acústica táctica en cota `DEEP` y detección visual en `SURFACED`/periscopio dentro del encuentro.
  - IA reactiva del mercante (zigzag, vigías, viraje evasivo, alarma `SSS`) y mercantes artillados (`DEMS`).
  - Cinemática 2D real `(x, y)` del blanco en el Periscopio Arcade (fin del tiempo infinito de apuntado y escape por distancia).

---

## 2. ESPECIFICACIÓN MECÁNICA Y MATEMÁTICA CERRADA

### 2.1. Sistema Cartográfico *Marinequadrat* (`MarineQuadratMapper`) y Escala `45x27`
- **Proyección Ortogonal *Odd-R*:** El teatro del Atlántico Norte mide **`45` columnas x `27` filas** (`1.215` celdas en `HexGridMap<StrategicMapCell>`, donde `1 hex ≈ 45 mn`). Para cada coordenada axial `(q, r)`, su posición ortogonal en carta es `col = q + Math.floor(r / 2)` (`0..44`) y `row = r` (`0..26`), alineándose sin distorsión con una lámina histórica rectangular.
- **Matriz `5x3` de Grandes Cuadrantes (`9x9` hexágonos cada uno):**
  - **Fila Norte (`row 0..8`):** `AD` (Groenlandia Sur / Estrecho de Dinamarca), `AE` (Islandia Sur), `AK` (Atlántico Norte Central), `AL` (*Western Approaches* Norte), `AM` (Irlanda / Escocia / **Liverpool**).
  - **Fila Central (`row 9..17`):** `BB` (**Halifax** / Nueva Escocia), `BC` (Gran Banco de Terranova), `BD` (*Mid-Atlantic Gap*), `BE` (Oeste del Golfo de Vizcaya), `BF` (Golfo de Vizcaya: **Brest**, **Lorient**, **Saint-Nazaire**).
  - **Fila Sur (`row 18..26`):** `CC` (Atlántico Occidental Sur), `CD` (Ruta Central Sur), `CE` (Azores), `CF` (Costa Atlántica Ibérica), `CG` (Estrecho de **Gibraltar** / Golfo de Cádiz).
- **Numeración Histórica `O(1)` de Subcuadrantes (`1..9` y `11..99`):**
  - Dado `localCol = col % 9` y `localRow = row % 9` dentro de su Gran Cuadrante:
    - **Subsector medio (`1..9`, bloque de `3x3` hex):** `midDigit = Math.floor(localRow / 3) * 3 + Math.floor(localCol / 3) + 1` (ej. orden de patrulla `"AK 5"`).
    - **Celda fina (`1..9` dentro del bloque `3x3`):** `subDigit = (localRow % 3) * 3 + (localCol % 3) + 1`.
    - **Código completo de dos dígitos (`11..99`):** `code = midDigit * 10 + subDigit` (ej. `"AL 44"`, produciendo en la fila superior de cada cuadrante la secuencia histórica `11,12,13 | 21,22,23 | 31,32,33` idéntica a la carta oficial `N.º 1546`).

### 2.2. Reloj de Patrulla, Luz (`TimeOfDay`), Clima (`WeatherState`) y Doble Escala (`24h` / `4h`)
- **Reloj Canónico de `4h`:** Cada tick operacional equivale siempre a `4 horas` (`00:00`, `04:00`, `08:00`, `12:00`, `16:00`, `20:00`):
  - `00:00` y `04:00` -> `NIGHT`
  - `08:00` -> `DAWN`
  - `12:00` y `16:00` -> `DAY`
  - `20:00` -> `DUSK`
- **Clima Dinámico (`WeatherState`):** Estados `CLEAR`, `OVERCAST` y `STORM` gobernados por una transición estocástica suave cada `3..6` ticks de `4h`.
- **Conmutador Explícito de Escala (`PATRULLA 4H` vs. `TRÁNSITO 24H`):**
  - **`PATRULLA 4H`:** Permite `SURFACED` (`0`, `1` o `2` hex) y `SUBMERGED` (`0` o `1` hex).
  - **`TRÁNSITO 24H`:** Exclusivo en postura `SURFACED`. Permite seleccionar un destino navegable hasta **`5 hex` (Crucero Económico)** u **`8 hex` (Tránsito Rápido)** mediante búsqueda de camino naval sobre celdas transitables. El motor resuelve internamente hasta **`6` ticks sucesivos de `4h`** avanzando contactos, reloj y clima en cada tick.
  - **Interrupción Automática (*Auto-Drop*):** Si al resolver cualquiera de los `6` sub-ticks de `4h` el submarino obtiene un contacto visual, entra en el área de un nuevo radiograma cercano (`<= 6 hex`) o alcanza su sector de patrulla asignado, el tránsito se detiene inmediatamente en el hexágono alcanzado y conmuta a `PATRULLA 4H`.

### 2.3. Tabla de Consumo Energético Recalibrada (`0.0% .. 100.0%`)
`fuel` y `battery` se almacenan con precisión de `0.1` en `[0, 100]` para ofrecer `~110 hex` de autonomía a crucero económico en el mapa `45x27`:

| Escala | Postura | Distancia | Coste `fuel` | Variación `battery` | Notas Operativas |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `4H` | `SURFACED` | `0 hex` | `-0.4%` | `+30.0%` | Patrulla estacionaria y carga rápida diésel. |
| `4H` | `SURFACED` | `1 hex` | `-0.9%` | `+20.0%` | Crucero económico (~111 hex de autonomía total). |
| `4H` | `SURFACED` | `2 hex` | `-2.8%` | `+10.0%` | Forzar máquinas en persecución (*end-around*). |
| `4H` | `SUBMERGED` | `0 hex` | `0.0%` | `-5.0%` | Escucha silenciosa óptima de hidrófono (*Horchrunde*). |
| `4H` | `SUBMERGED` | `1 hex` | `0.0%` | `-15.0%` | Avance sumergido con alcance acústico reducido. |
| `24H` | `SURFACED` | `1..5 hex` | `-0.9% / hex` (`-0.4%` por tick en espera) | `100.0%` | Tránsito oceánico económico (`6` ticks internos de `4h`). |
| `24H` | `SURFACED` | `6..8 hex` | `-1.6% / hex` | `100.0%` | Tránsito oceánico forzado (`6` ticks internos de `4h`). |

- **Regla *Anti-Softlock* en Alta Mar:** Si `fuel <= 0` y `battery <= 0` (o `fuel <= 0` impide alcanzar ningún hexágono), la patrulla finaliza automáticamente con estado `ABORTED_AT_SEA` (remolque de emergencia / pérdida operativa de la patrulla), mostrando el resumen sin bloquear la partida.

### 2.4. Sensores Estratégicos, Niebla de Guerra y Radiogramas del BdU
1. **Alcance Visual en `SURFACED` (revela posición exacta y rumbo):**
   - `DAY + CLEAR`: **`2 hex`**.
   - `DAY + OVERCAST`, `DAWN/DUSK + CLEAR` o `NIGHT + CLEAR`: **`1 hex`**.
   - `DAWN/DUSK + OVERCAST`, `NIGHT + OVERCAST` o cualquier hora en `STORM`: **`0 hex`** (solo mismo hexágono).
   - Estando `SUBMERGED`, el radio visual estratégico es `0 hex` (solo intercepción en el propio hexágono o detección previa por hidrófono).
2. **Hidrófono Estratégico en `SUBMERGED` (*Horchrunde*):**
   - Alcance máximo: **`5 hex`** estacionario (`0 hex` movidos) o **`3 hex`** en marcha (`1 hex` movido), con penalización de **`-1 hex` en `STORM`**.
   - Salida de sensor (`HydrophoneBearingContact`): **nunca** devuelve la coordenada del blanco; devuelve demora aproximada desde el submarino con error determinista/acotado (`±15°`) y nivel de intensidad (`STRONG` `1..2 hex`, `MEDIUM` `3 hex`, `WEAK` `4..5 hex`).
3. **Radiogramas del BdU y Cola Diferida en Inmersión:**
   - **Orden de Patrulla:** Al zarpar (y al cumplirse una orden), el BdU asigna un subsector de `3x3` (ej. `"Patrullar AK 5 durante 6 turnos de 4h"`).
   - **Reportes de Tráfico:** Generan marcas cartográficas centradas en un hexágono desviado aleatoriamente dentro de `strategicUncertaintyRadiusHexes` (`EASY: 1`, `NORMAL: 2`, `HARD: 3`), indicando código *Marinequadrat*, rumbo general y horas transcurridas desde el avistamiento (expiran tras `24h` / `6` ticks).
   - **Silencio de Radio bajo el Agua:** Mientras `stance === 'SUBMERGED'`, los nuevos radiogramas quedan en una cola interna del BdU y se entregan juntos en el instante en que el submarino pasa a `SURFACED`.

### 2.5. Puertos, Corredores Aliados (`±1 hex`), Contratos Multi-Barco y Transición Real al `15x15`
- **Bases del Eje (`NAVAL_BASE`):** `Brest`, `Lorient` y `Saint-Nazaire` en `BF`.
- **Puertos Aliados (`ALLIED_PORT` — intransitables por redes/minas portuarias):** `Halifax` (`BB`), `Liverpool` (`AM`) y `Gibraltar` (`CG`). Los mercantes nacen en un puerto aliado y recorren corredores transatlánticos aplicando una **variación lateral de `±1 hex`** respecto a la derrota nominal impresa en la carta, desapareciendo si alcanzan su destino.
- **Evolución de Contratos (`src/core/contracts/EncounterContracts.ts`):**
  - `EncounterContext` incorpora `ships: readonly TargetShipEncounterSnapshot[]` (en Fase 2 con `1` buque activo, dejando la firma lista para convoyes y escoltas en Fase 3), `timeOfDay`, `weather`, `interceptionDistanceHexes` (`0` o `1`) y `approachDirection` (`HexDirection` relativa).
  - `EncounterResult` incorpora `updatedFuel`, `updatedBattery`, `sunkShipIds: readonly string[]` y distingue `outcome: 'TARGET_SUNK' | 'TARGET_ESCAPED' | 'DISENGAGED' | 'SUBMARINE_DESTROYED'`.
- **Geometría Real de Entrada en `HexTacticalEngine` (`15x15`):**
  - El mercante toma su **`heading` estratégico real (`0..5`)** arrancando aguas arriba del centro `(7, 7)` (`4..5 hex` en dirección opuesta a su rumbo) para garantizar **11 a 12 turnos** de tránsito antes de escapar por el borde opuesto.
  - Si `interceptionDistanceHexes === 0` (emboscada en su misma casilla), el submarino inicia a **`4..5 hex`** en el sector delantero/través; si `interceptionDistanceHexes === 1`, inicia a **`6 hex`** en el **vector relativo real** desde el que entró en la carta estratégica (incluyendo persecución a remolque por popa si entró desde atrás).
- **Consecuencia Real de Escape / Ruptura:** Al volver a la Capa Estratégica sin hundir al contacto (`TARGET_ESCAPED` o `DISENGAGED`), se aplican `updatedFuel` y `updatedBattery`, el contacto avanza `1 hex` en su ruta y queda bloqueada su re-intercepción inmediata hasta el siguiente turno estratégico (obligando a maniobrar para volver a cortarle el paso).

---

## 3. HITOS DE IMPLEMENTACIÓN ATÓMICOS

### Hito 2.1: `MarineQuadratMapper`, Teatro Atlántico `45x27`, Rutas con Desvío y Escala `24H / 4H`
- Crear `MarineQuadratMapper` puro en `src/core/hex/` o `src/layers/strategic/domain/` con traducción `O(1)` bidireccional entre `AxialCoordinate` y códigos `AD..CG` + `1..9` / `11..99`.
- Sustituir el escenario `12x8` por el Teatro del Atlántico Norte `45x27` (`5x3` cuadrantes, bases de Brest/Lorient/Saint-Nazaire, puertos aliados bloqueados en Halifax/Liverpool/Gibraltar y corredores comerciales con deriva lateral `±1 hex`).
- Implementar en dominio la doble escala `PATRULLA 4H` / `TRÁNSITO 24H` (`6` sub-ticks internos con *auto-drop*), tabla de consumo decimal (`0.1%`) y condición `ABORTED_AT_SEA`.
- Suite completa de tests unitarios en Vitest para `MarineQuadratMapper`, rutas, consumo decimal y motor de `24h`.

### Hito 2.2: Niebla de Guerra, Ciclo Luz/Clima, Hidrófono por Cono y Radiogramas BdU
- Modelar el reloj de `4h` (`TimeOfDay`), la máquina de estados meteorológica (`WeatherState`) y el cálculo puro de visibilidad estratégica (`0..2 hex` en `SURFACED`).
- Implementar el Hidrófono estratégico (`HydrophoneSensorRules`) con conos de demora `±15°` e intensidad sin revelar coordenadas.
- Implementar el generador de Órdenes de Patrulla y Radiogramas del BdU con incertidumbre por dificultad (`1..3 hex`), caducidad temporal y cola retenida mientras `stance === 'SUBMERGED'`.
- Tests unitarios deterministas (con inyección de semilla/roll aleatorio) para visibilidad, conos de hidrófono y entrega diferida de radiogramas.

### Hito 2.3: Contratos `ships[]`, Geometría Real de Entrada al `15x15` y Escape con Consecuencia
- Actualizar `EncounterContext` y `EncounterResult` en `src/core/contracts/` añadiendo `ships[]`, `timeOfDay`, `weather`, geometría de aproximación, `updatedFuel`, `updatedBattery` y `TARGET_ESCAPED`.
- Implementar `TacticalSpawnGeometry.ts` en `src/layers/tactical/domain/` para posicionar mercante (con su rumbo real y `11-12` turnos de carrera a través de `(7,7)`) y submarino según el vector real de intercepción (`dist 0` vs. `dist 1`), mostrando Luz y Clima en el HUD táctico.
- Actualizar `StrategicEngine.applyEncounterResult` para persistir `fuel`/`battery` y adelantar/enfriar el contacto escapado evitando re-intercepciones gratuitas.
- Tests unitarios de geometría de spawn para los 6 rumbos axiales y test de integración de escape entre capas.

### Hito 2.4: Viewport `100vw x 100vh` HiDPI, Carta Histórica de Fondo y Cámara *Pan & Zoom*
- Adaptar `#game-canvas` y `src/main.ts` a `100vw x 100vh` con escalado `devicePixelRatio`, manteniendo las estaciones Táctica y Arcade `960x640` centradas, reescaladas y con transformación limpia de puntero sobre el fondo oscurecido de la carta histórica.
- Integrar la lámina cartográfica histórica calibrada a la matriz `45x27` (estética pergamino `N.º 1546`, costas sombreadas, tipografía hueca `AD..CG`), cámara *pan & zoom* (arrastre + rueda + centrado rápido) y rejilla hexagonal tenue con nivel de detalle según zoom (`AL 4` en vista oceánica vs. `AL 44` en vista de sector).
- Rediseñar el HUD estratégico con Barra de Mando Superior y Cartelas Flotantes inferiores (incluyendo clic en radiograma del BdU para desplazar la cámara hasta el cuadrante reportado y trazado en lápiz de áreas de incertidumbre y conos de hidrófono).

### Hito 2.5: Retorno a Base Naval, *Kriegstagebuch* y Campaña Multi-Patrulla
- Implementar la acción de atraque en bases navales aliadas (`Brest`, `Lorient`, `Saint-Nazaire`) y la pantalla/modal en Canvas del **Informe de Fin de Patrulla (*Kriegstagebuch*)**: días en el mar, evaluación de orden del BdU, desglose de buques y `BRT` hundidos, eficiencia de torpedos y tonelaje total de carrera.
- Implementar el ciclo de reabastecimiento completo, reparación de casco con avance de días de calendario en búnker y zarpe a la siguiente patrulla, además del flujo de cierre por `ABORTED_AT_SEA`.
- Pruebas unitarias y de integración del ciclo completo multi-patrulla.

---

## 4. CRITERIOS DE ACEPTACIÓN DE INGENIERÍA
- Estricto cumplimiento de `< 200` líneas por archivo y una única responsabilidad cohesiva por módulo (dividiendo renderizadores cartográficos, cámara, sensores y HUD en submódulos pequeños).
- **Cero bucles anidados (`Zero Nested Loops`)** en todo el repositorio, incluyendo la proyección *Marinequadrat*, el *culling* de celdas visibles de la cámara `45x27` y el avance de los `6` sub-ticks de `24h`.
- Aislamiento total entre `StrategicLayer`, `TacticalLayer` y `ArcadeLayer` a través de `GameFlowController`.
- `tsc --noEmit`, `vite build` y el 100% de la suite de Vitest en verde al cierre de cada hito, actualizando `/docs/STATUS.md`, `/docs/ARCHITECTURE.md`, `/docs/GAME_DESIGN.md` y `/CHANGELOG.md`.
