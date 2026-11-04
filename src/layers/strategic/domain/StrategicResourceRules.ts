import { advanceArmoryReloadTurn } from '../../../core/armory/index.ts';
import type {
  DifficultyConfig,
  NavigationStance,
  SubmarineDepthLevel,
  SubmarineState,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import type { ReachableHexOption } from './StrategicMovementNavigator.ts';

// Aplica el balance energético decimal (0.0%..100.0%) calibrado para ~111 hex de autonomía económica en el teatro 45x27

export const MIN_RESOURCE_PERCENTAGE = 0;
export const MAX_RESOURCE_PERCENTAGE = 100;

export const STATIONARY_SURFACED_FUEL_COST = 0.4;
export const ECONOMICAL_SURFACED_FUEL_PER_HEX = 0.9;
export const FLANK_PATROL_FOUR_HOUR_FUEL_COST = 2.8;
export const FORCED_TRANSIT_FUEL_PER_HEX = 1.6;

export function roundStrategicDecimal(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

export function clampStrategicResource(value: number): number {
  const clamped = Math.max(
    MIN_RESOURCE_PERCENTAGE,
    Math.min(MAX_RESOURCE_PERCENTAGE, value),
  );
  return roundStrategicDecimal(clamped);
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

  // Al agotarse las baterías en inmersión, el submarino no puede mantener propulsión eléctrica y debe emerger
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

// Detecta agotamiento irreversible en alta mar para cerrar la patrulla por rescate/abandono en lugar de bloquear la partida
export function isSubmarineStrandedAtSea(
  submarine: SubmarineState,
  isOnFriendlyBase: boolean,
): boolean {
  if (isOnFriendlyBase) {
    return false;
  }
  return submarine.fuel < STATIONARY_SURFACED_FUEL_COST && submarine.battery <= 0;
}

// Cada guardia estratégica de 4 horas completa los ticks requeridos por la dificultad en tubos activos no pausados
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
