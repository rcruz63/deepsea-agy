import { advanceArmoryReloadTurn } from '../../../core/armory/index.ts';
import type {
  DifficultyConfig,
  NavigationStance,
  SubmarineDepthLevel,
  SubmarineState,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import type { ReachableHexOption } from './StrategicMovementNavigator.ts';

// Aplica las reglas cerradas de balance energético (0..100), emersión forzada por agotamiento eléctrico y recarga de 4 horas

export const MIN_RESOURCE_PERCENTAGE = 0;
export const MAX_RESOURCE_PERCENTAGE = 100;

export function clampStrategicResource(value: number): number {
  return Math.max(
    MIN_RESOURCE_PERCENTAGE,
    Math.min(MAX_RESOURCE_PERCENTAGE, Math.round(value)),
  );
}

export function canSubmergeSubmarine(submarine: SubmarineState): boolean {
  return submarine.battery > MIN_RESOURCE_PERCENTAGE;
}

export function switchStrategicSubmarineStance(
  submarine: SubmarineState,
  targetStance: NavigationStance,
): SubmarineState {
  if (targetStance === 'SUBMERGED' && !canSubmergeSubmarine(submarine)) {
    throw new Error(
      'No es posible sumergirse con las baterías agotadas (battery === 0).',
    );
  }

  const nextDepth: SubmarineDepthLevel =
    targetStance === 'SURFACED' ? 'SURFACED' : 'PERISCOPE';

  return {
    ...submarine,
    stance: targetStance,
    depth: nextDepth,
  };
}

export function applyStrategicMovementEnergy(
  submarine: SubmarineState,
  selectedOption: ReachableHexOption,
): SubmarineState {
  const nextFuel = clampStrategicResource(submarine.fuel + selectedOption.fuelDelta);
  const nextBattery = clampStrategicResource(
    submarine.battery + selectedOption.batteryDelta,
  );

  // Al agotarse las baterías en inmersión, el submarino no puede mantener ventilación ni propulsión eléctrica y debe emerger
  const isForcedToSurface =
    submarine.stance === 'SUBMERGED' && nextBattery === MIN_RESOURCE_PERCENTAGE;
  const nextStance: NavigationStance = isForcedToSurface
    ? 'SURFACED'
    : submarine.stance;
  const nextDepth: SubmarineDepthLevel =
    nextStance === 'SURFACED' ? 'SURFACED' : submarine.depth;

  return {
    ...submarine,
    coordinate: selectedOption.coordinate,
    heading: selectedOption.resultingHeading,
    stance: nextStance,
    depth: nextDepth,
    fuel: nextFuel,
    battery: nextBattery,
  };
}

// Como cada turno estratégico representa 4 horas de patrulla, se ejecutan todos los ticks requeridos por la dificultad para completar recargas activas
export function completeStrategicTurnArmoryReload(
  armory: TorpedoArmoryState,
  difficulty: DifficultyConfig,
): TorpedoArmoryState {
  let updatedArmory = armory;
  for (let tick = 0; tick < difficulty.reloadTurnsRequired; tick += 1) {
    updatedArmory = advanceArmoryReloadTurn(updatedArmory);
  }
  return updatedArmory;
}
