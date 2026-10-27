# ESTADO DEL PROYECTO (HANDOFF & TRACKING)

## Estado Actual (Resumen Ejecutivo)
El proyecto se encuentra en el arranque de la **Fase 1: Vertical Slice (Navegación, Aproximación y Disparo de Torpedo)**, específicamente en la etapa de diseño previo del **Hito 1.1 (Configuración Base, Contratos y Motor Hexagonal Puro)**. Se ha inicializado la documentación de gobernanza arquitectónica y se ha preparado la propuesta modular de ficheros para validación del usuario antes de escribir código fuente.

## Completado Recientemente
- Revisión integral de `/docs/GAME_DESIGN_VISION.md`, `/docs/phases/PHASE_01_VERTICAL_SLICE.md` y las reglas del *Engineering Charter*.
- Creación de `/docs/ARCHITECTURE.md` con el diagrama Mermaid de las 3 capas desacopladas, contratos de transición y diseño del motor hexagonal indexado.
- Creación inicial de `/docs/STATUS.md` y `/CHANGELOG.md` siguiendo el protocolo de continuidad entre sesiones.

## En Progreso (Working On)
- Validación de la propuesta de estructura de directorios y ficheros del **Hito 1.1** (sin código fuente generado todavía, a la espera de confirmación para iniciar la implementación atómica).

## Próximos Pasos (Backlog Inmediato)
1. **Configuración Base (Hito 1.1a):** Crear `package.json`, `tsconfig.json` (modo estricto), `vite.config.ts`, `.gitignore`, `index.html` y `src/main.ts`, verificando la ejecución de Vite y Vitest.
2. **Contratos y Dificultad (Hito 1.1b):** Implementar los contratos inmutables en `src/core/contracts/` (`DifficultyConfig`, `TorpedoArmoryState`, `TheaterDefinition`, `SubmarineState`, `CampaignState`, `EncounterContracts`, `ITacticalStage`) y los perfiles base en `src/core/difficulty/DifficultyPresets.ts`.
3. **Armería de Torpedos (Hito 1.1c):** Implementar `TorpedoTubeTransition.ts` y `TorpedoArmory.ts` en `src/core/armory/` (gestión de proa/popa/reserva, recarga por turnos, pausa silenciosa y penalización acústica según dificultad) con sus pruebas unitarias en `tests/core/armory/`.
4. **Motor Matemático Hexagonal (Hito 1.1d):** Implementar `HexCoordinate.ts`, `HexMath.ts`, `HexLayout.ts` y `HexGridMap.ts` en `src/core/hex/` garantizando cero bucles anidados y cobertura completa en `tests/core/hex/`.
5. **Cierre Documental del Hito 1.1:** Actualizar `/docs/STATUS.md` y `/CHANGELOG.md`, verificar límites de líneas (< 200 líneas por fichero) y realizar los commits atómicos correspondientes.

## Deuda Técnica y Decisiones Pendientes (Tech Debt)
- **Confirmación de estructura Hito 1.1:** Pendiente aprobación del usuario sobre el desglose de archivos propuesto antes de escribir código.
- **Orientación geométrica hexagonal:** Se propone `POINTY_TOP` como orientación estándar por defecto en `HexLayout.ts`, manteniendo soporte parametrizable para `FLAT_TOP`.
- **Persistencia de normas y fórmulas:** Evaluar con el usuario si desea guardar el *Engineering Charter* en `/docs/ENGINEERING_CHARTER.md` y crear `/docs/GAME_DESIGN.md` al consolidar las fórmulas cerradas de la Fase 1.
