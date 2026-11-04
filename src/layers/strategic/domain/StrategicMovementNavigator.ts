import type {
  NavigationStance,
  StrategicTimeScale,
  SubmarineState,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexDirection,
  type HexGridMap,
  type HexKey,
  resolveAdjacentHexDirection,
  toHexKey,
} from '../../../core/hex/index.ts';
import {
  type StrategicMapCell,
  isNavigableStrategicTerrain,
} from './AtlanticSectorScenario.ts';
import {
  ECONOMICAL_SURFACED_FUEL_PER_HEX,
  FLANK_PATROL_FOUR_HOUR_FUEL_COST,
  STATIONARY_SURFACED_FUEL_COST,
} from './StrategicResourceRules.ts';
import { calculateReachableTransitRoutes } from './StrategicTransitPathfinder.ts';

export { resolveAdjacentHexDirection };

// Calcula destinos alcanzables en PATRULLA 4H (0..2 hex) y delega TRÁNSITO 24H (0..8 hex) sin bucles anidados

export type StrategicStepDistance = number;

export interface ReachableHexOption {
  readonly coordinate: AxialCoordinate;
  readonly stepDistance: StrategicStepDistance;
  readonly fuelDelta: number;
  readonly batteryDelta: number;
  readonly resultingHeading: HexDirection;
  readonly pathSteps?: readonly AxialCoordinate[];
}

interface MovementEnergyDelta {
  readonly fuelDelta: number;
  readonly batteryDelta: number;
}

const SURFACED_PATROL_ENERGY: Readonly<Record<0 | 1 | 2, MovementEnergyDelta>> = {
  0: { fuelDelta: -STATIONARY_SURFACED_FUEL_COST, batteryDelta: 30 },
  1: { fuelDelta: -ECONOMICAL_SURFACED_FUEL_PER_HEX, batteryDelta: 20 },
  2: { fuelDelta: -FLANK_PATROL_FOUR_HOUR_FUEL_COST, batteryDelta: 10 },
};

const SUBMERGED_PATROL_ENERGY: Readonly<Record<0 | 1, MovementEnergyDelta>> = {
  0: { fuelDelta: 0, batteryDelta: -5 },
  1: { fuelDelta: 0, batteryDelta: -15 },
};

function isNavigableCell(cell: StrategicMapCell): boolean {
  return isNavigableStrategicTerrain(cell.terrain);
}

export function getMovementEnergyDelta(
  stance: NavigationStance,
  stepDistance: 0 | 1 | 2,
): MovementEnergyDelta {
  if (stance === 'SURFACED') {
    return SURFACED_PATROL_ENERGY[stepDistance];
  }
  if (stepDistance === 2) {
    throw new Error('Un submarino sumergido nunca puede desplazarse 2 hexágonos en un turno.');
  }
  return SUBMERGED_PATROL_ENERGY[stepDistance];
}

function collectStepOneOptions(
  grid: HexGridMap<StrategicMapCell>,
  submarine: SubmarineState,
  optionsByKey: Map<HexKey, ReachableHexOption>,
): readonly AxialCoordinate[] {
  const stepOneEnergy = getMovementEnergyDelta(submarine.stance, 1);
  const directNeighbors = grid.getNeighbors(submarine.coordinate, isNavigableCell);
  const stepOneCoordinates: AxialCoordinate[] = [];

  for (const cell of directNeighbors) {
    stepOneCoordinates.push(cell.coordinate);
    optionsByKey.set(toHexKey(cell.coordinate), {
      coordinate: cell.coordinate,
      stepDistance: 1,
      fuelDelta: stepOneEnergy.fuelDelta,
      batteryDelta: stepOneEnergy.batteryDelta,
      resultingHeading: resolveAdjacentHexDirection(
        submarine.coordinate,
        cell.coordinate,
        submarine.heading,
      ),
      pathSteps: [cell.coordinate],
    });
  }

  return stepOneCoordinates;
}

function collectStepTwoFromIntermediateCell(
  grid: HexGridMap<StrategicMapCell>,
  intermediateCoordinate: AxialCoordinate,
  originOption: ReachableHexOption,
  fallbackHeading: HexDirection,
  optionsByKey: Map<HexKey, ReachableHexOption>,
): void {
  const stepTwoEnergy = getMovementEnergyDelta('SURFACED', 2);
  const secondRingCells = grid.getNeighbors(intermediateCoordinate, isNavigableCell);

  for (const targetCell of secondRingCells) {
    const key = toHexKey(targetCell.coordinate);
    if (!optionsByKey.has(key)) {
      optionsByKey.set(key, {
        coordinate: targetCell.coordinate,
        stepDistance: 2,
        fuelDelta: stepTwoEnergy.fuelDelta,
        batteryDelta: stepTwoEnergy.batteryDelta,
        resultingHeading: resolveAdjacentHexDirection(
          intermediateCoordinate,
          targetCell.coordinate,
          fallbackHeading,
        ),
        pathSteps: [...(originOption.pathSteps ?? []), targetCell.coordinate],
      });
    }
  }
}

export function calculateReachableStrategicHexes(
  grid: HexGridMap<StrategicMapCell>,
  submarine: SubmarineState,
  timeScale: StrategicTimeScale = 'PATROL_4H',
): readonly ReachableHexOption[] {
  if (timeScale === 'TRANSIT_24H' && submarine.stance === 'SURFACED') {
    return calculateReachableTransitRoutes(grid, submarine).map((route) => ({
      coordinate: route.coordinate,
      stepDistance: route.stepDistance,
      fuelDelta: route.totalFuelDelta,
      batteryDelta: 100,
      resultingHeading: route.resultingHeading,
      pathSteps: route.pathSteps,
    }));
  }

  const optionsByKey = new Map<HexKey, ReachableHexOption>();
  const stationaryEnergy = getMovementEnergyDelta(submarine.stance, 0);
  optionsByKey.set(toHexKey(submarine.coordinate), {
    coordinate: submarine.coordinate,
    stepDistance: 0,
    fuelDelta: stationaryEnergy.fuelDelta,
    batteryDelta: stationaryEnergy.batteryDelta,
    resultingHeading: submarine.heading,
    pathSteps: [],
  });

  const canStepOne =
    submarine.stance === 'SURFACED'
      ? submarine.fuel >= ECONOMICAL_SURFACED_FUEL_PER_HEX
      : submarine.battery > 0;
  if (!canStepOne) {
    return Array.from(optionsByKey.values());
  }

  const stepOneCoords = collectStepOneOptions(grid, submarine, optionsByKey);
  if (submarine.stance === 'SURFACED' && submarine.fuel >= FLANK_PATROL_FOUR_HOUR_FUEL_COST) {
    for (const midCoord of stepOneCoords) {
      const midOption = optionsByKey.get(toHexKey(midCoord))!;
      collectStepTwoFromIntermediateCell(grid, midCoord, midOption, submarine.heading, optionsByKey);
    }
  }

  return Array.from(optionsByKey.values());
}
