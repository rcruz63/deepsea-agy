# VISIÓN GENERAL Y ARQUITECTURA DE DISEÑO: SUBMARINE COMMAND

## 1. CONCEPTO NUCLEAR
Juego táctico-arcade de submarinos en 2D con estética instrumental vectorial (cartografía náutica, pantallas de fósforo y siluetas de alto contraste). Combina la tensión posicional de un juego de mesa hexagonal con la habilidad de ejecución en tiempo real en tres minijuegos arcade, evitando tanto la simulación tediosa como el "mata-mata" sin reflexión.

## 2. ARQUITECTURA DE LAS 3 CAPAS (CONTRATOS DESACOPLADOS)
El juego opera mediante una máquina de estados principal (`GameFlowController`) que coordina tres motores independientes:

1. **Capa Estratégica (`StrategicEngine`):**
   - Tablero hexagonal a escala oceánica (turnos de 4 horas).
   - Gestión de ruta, postura (Superficie vs. Sumergido), combustible diésel, baterías eléctricas, integridad del casco y estado de los tubos lanzatorpedos.
   - Niebla de guerra activa: los reportes de radio muestran áreas de probabilidad; el hidrófono traza líneas de dirección de ruido sin revelar la distancia exacta.
2. **Capa Táctica (`TacticalEngine`):**
   - Implementada bajo una interfaz intercambiable (`ITacticalStage`) para permitir el tablero hexagonal local de 15x15 por turnos (implementación principal) o un futuro prototipo de ploteo polar por anillos.
   - Resuelve la maniobra de aproximación al convoy: posición relativa, velocidad vs. cavitación, profundidad y evasión de los conos de Radar y ASDIC de los escoltas antes de entrar en posición de disparo.
3. **Capa de Acción Arcade (`ArcadeEngine`):**
   - Tres módulos de acción en tiempo real independientes según el desencadenante:
     - **Módulo A (Ataque con Torpedos):** Vista de periscopio y TDC simplificado. Requiere identificar silueta en manual (calado), elegir espoleta (impacto vs. magnética), alinear ángulo en la proa (AOB) y estimar velocidad antes de que la escolta detecte el periscopio.
     - **Módulo B (Defensa Antisubmarina - ASW):** Vista en doble panel (corte vertical de profundidad con capa térmica/termoclina + pantalla cenital de barrido ASDIC). Evasión de cargas de profundidad jugando con timón, cota y silencio mecánico.
     - **Módulo C (Defensa Aérea / Crash Dive):** Evento rápido desde el mapa estratégico. Secuencia cronometrada de inmersión de emergencia controlando inclinación, tanques de lastre y profundidad antes del impacto de las bombas.

## 3. PRINCIPIOS DE DISEÑO TRANSVERSALES (INMUTABLES DESDE FASE 1)

### 3.1. Sistema de Torpedos y Recarga Realista (`TorpedoArmory`)
- Los torpedos NO son un simple contador global de disparo automático.
- El submarino dispone de tubos de proa (`bowTubes`), tubos de popa (`sternTubes`) y reservas internas (`reserveTorpedoes`).
- Cada tubo tiene estado propio: `LOADED`, `RELOADING`, `EMPTY`, `DAMAGED`.
- Recargar un tubo consume tiempo/turnos y **genera ruido mecánico** (penalización acústica en la capa táctica y en evasión ASW si no se pausa la recarga).

### 3.2. Perfiles de Dificultad (`DifficultyConfig`)
Todas las fórmulas leen de un objeto de configuración de dificultad:
- `EASY`: Reserva de torpedos infinita, recarga rápida sin penalización acústica severa, mayor tolerancia en el ángulo de impacto de la espoleta.
- `NORMAL`: Reserva histórica finita, tiempos de recarga estándar, ruido al recargar, fallos de espoleta si el ángulo o calado son incorrectos.
- `HARD`: Reserva finita, posibilidad de torpedos defectuosos (*duds*), escoltas con ASDIC agresivo y nubes de incertidumbre más amplias en el mapa estratégico.

### 3.3. Diseño Multi-Teatro Basado en Datos (Atlántico y Pacífico)
- Prohibido codificar facciones o mapas a fuego en la lógica.
- Toda campaña carga un `TheaterDefinition` (ej. `atlantic_theater`, `pacific_theater`) que define el mapa hexagonal, bases, rutas de convoyes y catálogo de unidades (`SubmarineSpec`, `SurfaceShipSpec`).

## 4. ROADMAP COMPLETO DEL PROYECTO (6 FASES)
- **FASE 1:** Esqueleto de 3 capas, mapa hexagonal básico, aproximación táctica 15x15 y ataque arcade con torpedos a mercante solitario (con gestión de tubos y dificultad).
- **FASE 2:** Hidrófono estratégico, contactos por radio con deriva aleatoria, ciclo día/noche, clima, combustible/baterías y ciclo de patrulla a base.
- **FASE 3:** Escoltas en tablero táctico, IA de patrulla, conos de Radar y ASDIC, detección por cavitación y ruido de recarga.
- **FASE 4:** Modo Arcade Antisubmarino (ASW) completo: cargas de profundidad, termoclina, barrido ASDIC activo y daños por inundación.
- **FASE 5:** Modo Arcade de Ataque Aéreo (*Crash Dive*) y sistema de eventos aleatorios en campaña.
- **FASE 6:** Escenario del Pacífico, catálogo de buques de guerra mayores, audio procedural (Web Audio API) y pulido final.

> **REGLA PARA EL AGENTE DE DESARROLLO:** Respeta siempre los contratos de datos de esta visión general, pero **SOLO** implementa las funcionalidades descritas en el documento de la fase activa actual.
