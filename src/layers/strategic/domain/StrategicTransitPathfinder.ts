import type { SubmarineState } from '../../../core/contracts/index.ts';
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
  FORCED_TRANSIT_FUEL_PER_HEX,
  STATIONARY_SURFACED_FUEL_COST,
  roundStrategicDecimal,
} from './StrategicResourceRules.ts';

// Calcula rutas navales de 1 a 8 hexágonos para el modo TRÁNSITO 24H evitando bucles anidados mediante expansión delegada

export const MAX_ECONOMICAL_TRANSIT_STEPS = 5;
export const MAX_FORCED_TRANSIT_STEPS = 8;
export const WATCHES_PER_TWENTY_FOUR_HOURS = 6;

export interface TransitRouteNode {
  readonly coordinate: AxialCoordinate;
  readonly pathSteps: readonly AxialCoordinate[];
  readonly stepDistance: number;
  readonly totalFuelDelta: number;
  readonly resultingHeading: HexDirection;
}

function isNavigableCell(cell: StrategicMapCell): boolean {
  return isNavigableStrategicTerrain(cell.terrain);
}

export function calculateTwentyFourHourTransitFuelDelta(stepCount: number): number {
  if (stepCount <= 0) {
    return roundStrategicDecimal(
      -STATIONARY_SURFACED_FUEL_COST * WATCHES_PER_TWENTY_FOUR_HOURS,
    );
  }
  if (stepCount <= MAX_ECONOMICAL_TRANSIT_STEPS) {
    const idleWatches = Math.max(0, WATCHES_PER_TWENTY_FOUR_HOURS - stepCount);
    const moveCost = stepCount * ECONOMICAL_SURFACED_FUEL_PER_HEX;
    const idleCost = idleWatches * STATIONARY_SURFACED_FUEL_COST;
    return roundStrategicDecimal(-(moveCost + idleCost));
  }
  return roundStrategicDecimal(-stepCount * FORCED_TRANSIT_FUEL_PER_HEX);
}

function expandTransitFrontierNode(
  grid: HexGridMap<StrategicMapCell>,
  current: TransitRouteNode,
  availableFuel: number,
  visitedByKey: Map<HexKey, TransitRouteNode>,
  queue: TransitRouteNode[],
): void {
  if (current.stepDistance >= MAX_FORCED_TRANSIT_STEPS) {
    return;
  }
  const neighbors = grid.getNeighbors(current.coordinate, isNavigableCell);
  const nextStepCount = current.stepDistance + 1;
  const fuelDelta = calculateTwentyFourHourTransitFuelDelta(nextStepCount);

  if (availableFuel + fuelDelta < 0) {
    return;
  }

  for (const neighborCell of neighbors) {
    const key = toHexKey(neighborCell.coordinate);
    if (visitedByKey.has(key)) {
      continue;
    }
    const nextNode: TransitRouteNode = {
      coordinate: neighborCell.coordinate,
      pathSteps: [...current.pathSteps, neighborCell.coordinate],
      stepDistance: nextStepCount,
      totalFuelDelta: fuelDelta,
      resultingHeading: resolveAdjacentHexDirection(
        current.coordinate,
        neighborCell.coordinate,
        current.resultingHeading,
      ),
    };
    visitedByKey.set(key, nextNode);
    queue.push(nextNode);
  }
}

export function calculateReachableTransitRoutes(
  grid: HexGridMap<StrategicMapCell>,
  submarine: SubmarineState,
): readonly TransitRouteNode[] {
  if (submarine.stance !== 'SURFACED') {
    return [];
  }

  const originFuelDelta = calculateTwentyFourHourTransitFuelDelta(0);
  const rootNode: TransitRouteNode = {
    coordinate: submarine.coordinate,
    pathSteps: [],
    stepDistance: 0,
    totalFuelDelta: submarine.fuel + originFuelDelta >= 0 ? originFuelDelta : -submarine.fuel,
    resultingHeading: submarine.heading,
  };

  const visitedByKey = new Map<HexKey, TransitRouteNode>([
    [toHexKey(submarine.coordinate), rootNode],
  ]);
  const queue: TransitRouteNode[] = [rootNode];
  let cursor = 0;

  while (cursor < queue.length) {
    const currentNode = queue[cursor]!;
    cursor += 1;
    expandTransitFrontierNode(
      grid,
      currentNode,
      submarine.fuel,
      visitedByKey,
      queue,
    );
  }

  return Array.from(visitedByKey.values());
}
