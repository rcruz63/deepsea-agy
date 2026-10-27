import type {
  NavigationStance,
  SubmarineState,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  HEX_DIRECTIONS,
  type HexDirection,
  type HexKey,
  areAxialCoordinatesEqual,
  getHexNeighbor,
  toHexKey,
} from '../../../core/hex/index.ts';
import { HexGridMap } from '../../../core/hex/index.ts';
import {
  type StrategicMapCell,
  isNavigableStrategicTerrain,
} from './AtlanticSectorScenario.ts';

// Calcula el abanico de movimiento de 0, 1 y 2 hexágonos por turno sin bucles anidados ni saltos sobre costa intransitable

export type StrategicStepDistance = 0 | 1 | 2;

export interface ReachableHexOption {
  readonly coordinate: AxialCoordinate;
  readonly stepDistance: StrategicStepDistance;
  readonly fuelDelta: number;
  readonly batteryDelta: number;
  readonly resultingHeading: HexDirection;
}

interface MovementEnergyDelta {
  readonly fuelDelta: number;
  readonly batteryDelta: number;
}

const SURFACED_ENERGY_BY_STEP: Readonly<
  Record<StrategicStepDistance, MovementEnergyDelta>
> = {
  0: { fuelDelta: -1, batteryDelta: 30 },
  1: { fuelDelta: -2, batteryDelta: 20 },
  2: { fuelDelta: -5, batteryDelta: 10 },
};

const SUBMERGED_ENERGY_BY_STEP: Readonly<Record<0 | 1, MovementEnergyDelta>> = {
  0: { fuelDelta: 0, batteryDelta: -5 },
  1: { fuelDelta: 0, batteryDelta: -15 },
};

function isNavigableCell(cell: StrategicMapCell): boolean {
  return isNavigableStrategicTerrain(cell.terrain);
}

export function resolveAdjacentHexDirection(
  from: AxialCoordinate,
  to: AxialCoordinate,
  fallbackHeading: HexDirection,
): HexDirection {
  for (const direction of HEX_DIRECTIONS) {
    if (areAxialCoordinatesEqual(getHexNeighbor(from, direction), to)) {
      return direction;
    }
  }
  return fallbackHeading;
}

export function getMovementEnergyDelta(
  stance: NavigationStance,
  stepDistance: StrategicStepDistance,
): MovementEnergyDelta {
  if (stance === 'SURFACED') {
    return SURFACED_ENERGY_BY_STEP[stepDistance];
  }
  if (stepDistance === 2) {
    throw new Error('Un submarino sumergido nunca puede desplazarse 2 hexágonos en un turno.');
  }
  return SUBMERGED_ENERGY_BY_STEP[stepDistance];
}

function canExecuteStepOne(submarine: SubmarineState): boolean {
  if (submarine.stance === 'SURFACED') {
    return submarine.fuel >= 2;
  }
  return submarine.battery > 0;
}

function canExecuteStepTwo(submarine: SubmarineState): boolean {
  // Forzar máquinas a 2 hexágonos exige navegar en superficie con diésel suficiente para cubrir los 5 puntos de consumo
  return submarine.stance === 'SURFACED' && submarine.fuel >= 5;
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
    });
  }

  return stepOneCoordinates;
}

// Expande el segundo anillo desde cada celda intermedia navegable para impedir que el submarino salte sobre penínsulas o escollos
function collectStepTwoFromIntermediateCell(
  grid: HexGridMap<StrategicMapCell>,
  intermediateCoordinate: AxialCoordinate,
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
      });
    }
  }
}

export function calculateReachableStrategicHexes(
  grid: HexGridMap<StrategicMapCell>,
  submarine: SubmarineState,
): readonly ReachableHexOption[] {
  const optionsByKey = new Map<HexKey, ReachableHexOption>();
  const stationaryEnergy = getMovementEnergyDelta(submarine.stance, 0);

  optionsByKey.set(toHexKey(submarine.coordinate), {
    coordinate: submarine.coordinate,
    stepDistance: 0,
    fuelDelta: stationaryEnergy.fuelDelta,
    batteryDelta: stationaryEnergy.batteryDelta,
    resultingHeading: submarine.heading,
  });

  if (!canExecuteStepOne(submarine)) {
    return Array.from(optionsByKey.values());
  }

  const stepOneCoordinates = collectStepOneOptions(grid, submarine, optionsByKey);

  if (canExecuteStepTwo(submarine)) {
    for (const intermediateCoordinate of stepOneCoordinates) {
      collectStepTwoFromIntermediateCell(
        grid,
        intermediateCoordinate,
        submarine.heading,
        optionsByKey,
      );
    }
  }

  return Array.from(optionsByKey.values());
}
