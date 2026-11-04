# BACKLOG DE IDEAS Y HITOS OPCIONALES POR FASE (`IDEAS_BACKLOG`)

> [!CAUTION]
> **AVISO ESTRICTO DE GOBERNANZA PARA AGENTES DE IA Y DESARROLLADORES — PROHIBIDO AUTO-IMPLEMENTAR:**
> Este documento recoge **Hitos Opcionales (*Stretch Goals*)** asignados al cierre de su fase natural del roadmap.
> 1. **NINGÚN AGENTE TIENE AUTORIZACIÓN PARA IMPLEMENTAR, PREPARAR CONTRATOS NI ESCRIBIR CÓDIGO DE ESTOS HITOS POR INICIATIVA PROPIA.**
> 2. **Protocolo de Puerta de Fase (*Phase Gate*):** Únicamente cuando se hayan completado y verificado al 100% los hitos obligatorios de una fase, el agente consultará al usuario: *"¿Activamos alguno de los Hitos Opcionales de esta fase o pasamos directamente a la siguiente?"*. Solo tras un **"sí"** explícito del usuario se trasladará esa tarea al documento `docs/phases/PHASE_XX_*.md` correspondiente.

---

## Matriz de Encaje en el Roadmap (Cuándo evaluar cada idea y por qué)

| Código Opcional | Idea / Mecánica | Fase Recomendada | Dependencias Previas Necesarias |
| :--- | :--- | :---: | :--- |
| **`Hito 3.OPT`** | Cañón de Cubierta `88mm` + Buques Trampa *Q-Ships* | **Cierre de Fase 3** | Detección en superficie, mercantes `DEMS` e IA reactiva (Fase 3). |
| **`Hito 5.OPT-A`** | Minijuego Arcade *Flak* (`20mm/37mm`) vs. Avión | **Cierre de Fase 5** | Evento aéreo estratégico y Módulo C *Crash Dive* (Fase 5). |
| **`Hito 5.OPT-B`** | Vacas Lecheras (*Tipo XIV Milchkuh*) en Alta Mar | **Cierre de Fase 5** | Consumo/citas en `45x27` (Fase 2) + amenaza aérea/eventos (Fase 5). |
| **`Hito 5.OPT-C`** | Infiltración en Puertos Aliados (*Scapa Flow*) | **Cierre de Fase 5** | Reflectores/escoltas (Fase 3), minas/daños (Fase 4) y eventos BdU (Fase 5). |
| **`Hito 6.OPT`** | Tecnología `1939–1945` y Veteranía de Tripulación | **Cierre de Fase 6** | Escoltas (F3), ASW/ASDIC (F4) y Aviación/Radar (F5) ya operativos. |

> **Nota sobre Fase 2 y Fase 4:** Se dejan deliberadamente sin hitos opcionales para no retrasar en **Fase 2** la llegada del combate táctico antiprevisibilidad (Fase 3), ni desviar el foco en **Fase 4** de la física del módulo ASW y cargas de profundidad.

---

## Detalle de cada Hito Opcional

### 1. `Hito 3.OPT` (Cierre de Fase 3) — Cañón de Cubierta de `88mm` y Buques Trampa *Q-Ships*
- **Por qué van juntos en Fase 3:** Son las dos caras del mismo dilema táctico. Sin el cañón de `88mm` el jugador jamás tendría incentivos para emerger cerca de un mercante; sin *Q-Ships* (sumados a los `DEMS`), el cañón de `88mm` podría volverse munición gratis sin riesgo.
- **Mecánica:**
  - **Cañón `88mm`:** Permite atacar o rematar en `SURFACED` a mercantes solitarios desarmados o averiados (`1 HP`) ahorrando torpedos de la reserva.
  - **Contrapeso (*Q-Ships*):** Ciertos contactos con silueta idéntica a un carguero inofensivo en el Manual de Reconocimiento ocultan artillería tras mamparos abatibles; si el U-Boot emerge confiado a corta distancia, abren fuego causando daños al casco de presión (pudiendo bloquear la inmersión si cae bajo un umbral crítico).

---

### 2. `Hito 5.OPT-A` (Cierre de Fase 5) — Minijuego Arcade Antiaéreo (*Flak* vs. Avión en Picado)
- **Por qué en Fase 5:** Aprovecha directamente el disparador de ataque aéreo del **Módulo Arcade C (*Crash Dive*)** convirtiendo un evento lineal en una decisión táctica real.
- **Mecánica:** Cuando un *Sunderland*, *Catalina* o *Liberator* sorprende al U-Boot en superficie, el jugador elige entre **Inmersión de Emergencia (*Crash Dive*)** o **Batirse al *Flak* (`20mm / 37mm`)** (vital si está en aguas someras o con tanques de lastre averiados). Vista en Canvas 2D desde la torreta calculando el adelanto (*lead*) de trazadoras contra el avión en picado antes de la suelta de bombas.

---

### 3. `Hito 5.OPT-B` (Cierre de Fase 5) — Submarinos Nodriza Tipo XIV (*Milchkuh* / "Vacas Lecheras")
- **Por qué en Fase 5 y no en Fase 2:** Aunque en Fase 2 ya existen el mapa `45x27` y el combustible decimal, sin patrullas aéreas aliadas repostar en mitad del océano sería un "cheque gratis" sin peligro. En Fase 5, citarse por radiograma con una *Milchkuh* exige permanecer **varias horas inmóvil en `SURFACED`** con mangueras tendidas, disparando el riesgo real de ser sorprendido por aviación antisubmarina.
- **Mecánica:** Cita secreta por radio en un subcuadrante oceánico apartado para transferir diésel y un cupo limitado de torpedos sin regresar a Vizcaya.

---

### 4. `Hito 5.OPT-C` (Cierre de Fase 5) — Misiones Especiales de Infiltración en Puertos Aliados
- **Por qué en Fase 5:** Combina las patrulleras/reflectores de Fase 3, las redes/minas y el fondo marino somero (sin cota `DEEP`) de Fase 4, y el sistema de órdenes especiales del BdU de Fase 5.
- **Mecánica:** Mientras en patrulla ordinaria Liverpool, Gibraltar o Halifax son casillas bloqueadas, una orden especial del BdU habilita un tablero táctico costero nocturno (estilo *U-47* en *Scapa Flow*) sorteando redes, campos de minas y corrientes estrechas contra objetivos fondeados de alto tonelaje.

---

### 5. `Hito 6.OPT` (Cierre de Fase 6) — Progresión Tecnológica (`1939–1945`) y Veteranía de Tripulación
- **Por qué en Fase 6:** Cada avance histórico interactúa con un módulo distinto del juego, por lo que brilla cuando las 3 capas y los 3 minijuegos Arcade están terminados:
  - **Tecnologías del U-Boot según año de campaña:** Detector pasivo de radar *Metox* (alerta temprana frente a aviones/escoltas de Fases 3 y 5), señuelos químicos *Bold* (falsos ecos contra el ASDIC de Fase 4), torpedos acústicos *T5 Zaunkönig* (autodefensa contra escoltas de Fase 3) y *Schnorchel* (recarga diésel a cota de periscopio).
  - **Veteranía de Tripulación:** Oficiales e hidrofonistas que ganan experiencia entre patrullas (reduciendo ticks de recarga, estrechando el error `±15°` del hidrófono o acelerando el control de inundaciones).
