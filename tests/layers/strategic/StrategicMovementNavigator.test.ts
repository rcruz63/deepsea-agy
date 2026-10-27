import { describe, expect, it } from 'vitest';
import {
  HexGridMap,
  areAxialCoordinatesEqual,
  createAxialCoordinate,
  toHexKey,
} from '../../../src/core/hex/index.ts';
import {
  type StrategicMapCell,
  calculateReachableStrategicHexes,
  createAtlanticHexGrid,
  createInitialAtlanticCampaignState,
} from '../../../src/layers/strategic/index.ts';

function createCustomBarrierGrid(): HexGridMap<StrategicMapCell> {
  // Bloquea completamente el anillo 1 alrededor de (2, 2) con tierra salvo la propia celda central
  const baseGrid = HexGridMap.createRectangular<StrategicMapCell>(
    6,
    6,
    (coordinate) => ({
      coordinate,
      terrain: 'DEEP_WATER',
    }),
  );

  const center = createAxialCoordinate(2, 2);
  let walledGrid = baseGrid;
  for (const neighbor of baseGrid.getNeighbors(center)) {
    walledGrid = walledGrid.withCell({
      coordinate: neighbor.coordinate,
      terrain: 'LAND',
    });
  }
  return walledGrid;
}

describe('StrategicMovementNavigator', () => {
  it('offers 0, 1, and 2 step options with exact energy deltas when SURFACED with full fuel', () => {
    const grid = createAtlanticHexGrid();
    const state = createInitialAtlanticCampaignState();
    const openWaterSubmarine = {
      ...state.submarine,
      coordinate: createAxialCoordinate(2, 2),
      stance: 'SURFACED' as const,
      fuel: 100,
    };

    const options = calculateReachableStrategicHexes(grid, openWaterSubmarine);
    const stepZero = options.find((opt) => opt.stepDistance === 0);
    const stepOne = options.find((opt) => opt.stepDistance === 1);
    const stepTwo = options.find((opt) => opt.stepDistance === 2);

    expect(stepZero).toMatchObject({ fuelDelta: -1, batteryDelta: 30 });
    expect(stepOne).toMatchObject({ fuelDelta: -2, batteryDelta: 20 });
    expect(stepTwo).toMatchObject({ fuelDelta: -5, batteryDelta: 10 });
  });

  it('restricts SUBMERGED movement to 0 or 1 hexes and never allows 2 hexes', () => {
    const grid = createAtlanticHexGrid();
    const state = createInitialAtlanticCampaignState();
    const submergedSubmarine = {
      ...state.submarine,
      coordinate: createAxialCoordinate(2, 2),
      stance: 'SUBMERGED' as const,
      depth: 'PERISCOPE' as const,
    };

    const options = calculateReachableStrategicHexes(grid, submergedSubmarine);
    const stepZero = options.find((opt) => opt.stepDistance === 0);
    const stepOne = options.find((opt) => opt.stepDistance === 1);
    const anyStepTwo = options.some((opt) => opt.stepDistance === 2);

    expect(stepZero).toMatchObject({ fuelDelta: 0, batteryDelta: -5 });
    expect(stepOne).toMatchObject({ fuelDelta: 0, batteryDelta: -15 });
    expect(anyStepTwo).toBe(false);
  });

  it('disables 2-hex flank movement when SURFACED fuel is below 5', () => {
    const grid = createAtlanticHexGrid();
    const state = createInitialAtlanticCampaignState();
    const lowFuelSubmarine = {
      ...state.submarine,
      coordinate: createAxialCoordinate(2, 2),
      fuel: 4,
    };

    const options = calculateReachableStrategicHexes(grid, lowFuelSubmarine);

    expect(options.some((opt) => opt.stepDistance === 1)).toBe(true);
    expect(options.some((opt) => opt.stepDistance === 2)).toBe(false);
  });

  it('prevents entering LAND cells or jumping 2 hexes across an impassable LAND barrier', () => {
    const walledGrid = createCustomBarrierGrid();
    const state = createInitialAtlanticCampaignState();
    const trappedSubmarine = {
      ...state.submarine,
      coordinate: createAxialCoordinate(2, 2),
    };

    const options = calculateReachableStrategicHexes(walledGrid, trappedSubmarine);

    expect(options).toHaveLength(1);
    expect(
      areAxialCoordinatesEqual(options[0]!.coordinate, createAxialCoordinate(2, 2)),
    ).toBe(true);
    expect(toHexKey(options[0]!.coordinate)).toBe('2,2');
  });
});
