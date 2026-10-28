import {
  type AxialCoordinate,
  HexGridMap,
  areAxialCoordinatesEqual,
  calculateHexDistance,
  createAxialCoordinate,
  getHexNeighbor,
} from '../../../core/hex/index.ts';
import {
  clampStrategicResource,
  resolveAdjacentHexDirection,
} from '../../strategic/index.ts';
import type {
  TacticalDepth,
  TacticalHexCell,
  TacticalMerchantSnapshot,
  TacticalReachableOption,
  TacticalStepDistance,
  TacticalSubmarineSnapshot,
} from './TacticalTypes.ts';

// Gobierna el tablero local 15x15, los alcances por cota (3/2/1 hex) en un único bucle plano y el avance del mercante

export const TACTICAL_GRID_WIDTH = 15;
export const TACTICAL_GRID_HEIGHT = 15;

// Centro de la fila 7 (columna 7 -> q = 7 - floor(7/2) = 4, r = 7) con 7 hexágonos de margen de tránsito hacia el Este
export const INITIAL_TACTICAL_MERCHANT_COORDINATE: AxialCoordinate =
  createAxialCoordinate(4, 7);

// Flanco sur de aproximación inicial a 4 hexágonos del mercante
export const INITIAL_TACTICAL_SUBMARINE_COORDINATE: AxialCoordinate =
  createAxialCoordinate(4, 11);

export function createTacticalHexGrid(): HexGridMap<TacticalHexCell> {
  return HexGridMap.createRectangular(
    TACTICAL_GRID_WIDTH,
    TACTICAL_GRID_HEIGHT,
    (coordinate) => ({ coordinate }),
  );
}

export function getMaxStepsForTacticalDepth(
  depth: TacticalDepth,
): TacticalStepDistance {
  switch (depth) {
    case 'SURFACED':
      return 3;
    case 'PERISCOPE_DEPTH':
      return 2;
    case 'DEEP':
      return 1;
  }
}

export function getTacticalMovementCost(
  depth: TacticalDepth,
  stepDistance: TacticalStepDistance,
): { readonly fuelCost: number; readonly batteryCost: number } {
  if (depth === 'SURFACED') {
    if (stepDistance === 0) {
      return { fuelCost: 0, batteryCost: 0 };
    }
    return { fuelCost: stepDistance === 3 ? 2 : 1, batteryCost: 0 };
  }

  if (depth === 'PERISCOPE_DEPTH') {
    if (stepDistance > 2) {
      throw new Error('En cota de periscopio no se pueden recorrer más de 2 hexágonos.');
    }
    const batteryCost = stepDistance === 0 ? 0 : stepDistance === 1 ? 1 : 3;
    return { fuelCost: 0, batteryCost };
  }

  if (stepDistance > 1) {
    throw new Error('En cota profunda (DEEP) solo se puede avanzar hasta 1 hexágono.');
  }
  return { fuelCost: 0, batteryCost: stepDistance === 1 ? 1 : 0 };
}

export function calculateTacticalReachableOptions(
  grid: HexGridMap<TacticalHexCell>,
  submarine: TacticalSubmarineSnapshot,
  merchantCoordinate: AxialCoordinate,
): readonly TacticalReachableOption[] {
  const maxSteps = getMaxStepsForTacticalDepth(submarine.depth);
  const candidateCells = grid.getCellsWithinRadius(submarine.coordinate, maxSteps);
  const options: TacticalReachableOption[] = [];

  for (const cell of candidateCells) {
    // Impide superponerse con el buque objetivo para garantizar distancia mínima de 1 hex (500 m)
    if (areAxialCoordinatesEqual(cell.coordinate, merchantCoordinate)) {
      continue;
    }

    const stepDistance = calculateHexDistance(
      submarine.coordinate,
      cell.coordinate,
    ) as TacticalStepDistance;
    const { fuelCost, batteryCost } = getTacticalMovementCost(
      submarine.depth,
      stepDistance,
    );

    if (submarine.fuel >= fuelCost && submarine.battery >= batteryCost) {
      options.push({
        coordinate: cell.coordinate,
        stepDistance,
        fuelCost,
        batteryCost,
      });
    }
  }

  return options;
}

export function applyTacticalSubmarineMovement(
  submarine: TacticalSubmarineSnapshot,
  selectedOption: TacticalReachableOption,
): TacticalSubmarineSnapshot {
  const nextFuel = clampStrategicResource(submarine.fuel - selectedOption.fuelCost);
  const nextBattery = clampStrategicResource(
    submarine.battery - selectedOption.batteryCost,
  );
  const nextDepth: TacticalDepth =
    submarine.depth !== 'SURFACED' && nextBattery === 0
      ? 'SURFACED'
      : submarine.depth;
  const nextHeading = resolveAdjacentHexDirection(
    submarine.coordinate,
    selectedOption.coordinate,
    submarine.heading,
  );

  return {
    ...submarine,
    coordinate: selectedOption.coordinate,
    heading: nextHeading,
    depth: nextDepth,
    fuel: nextFuel,
    battery: nextBattery,
  };
}

export interface MerchantStepOutcome {
  readonly updatedMerchant: TacticalMerchantSnapshot;
  readonly hasEscapedBoard: boolean;
}

export function advanceTacticalMerchantStep(
  grid: HexGridMap<TacticalHexCell>,
  merchant: TacticalMerchantSnapshot,
  submarineCoordinate: AxialCoordinate,
): MerchantStepOutcome {
  const nextCoordinate = getHexNeighbor(merchant.coordinate, merchant.heading);

  // Si el mercante rebasa el límite del tablero 15x15, escapa del sector local y concluye el encuentro
  if (!grid.hasCell(nextCoordinate)) {
    return {
      updatedMerchant: merchant,
      hasEscapedBoard: true,
    };
  }

  // Si el submarino bloquea exactamente la proa inmediata, el mercante mantiene celda para no colisionar a 0 metros
  if (areAxialCoordinatesEqual(nextCoordinate, submarineCoordinate)) {
    return {
      updatedMerchant: merchant,
      hasEscapedBoard: false,
    };
  }

  return {
    updatedMerchant: {
      ...merchant,
      coordinate: nextCoordinate,
    },
    hasEscapedBoard: false,
  };
}
