import { describe, expect, it } from 'vitest';
import { createInitialTorpedoArmory } from '../../../src/core/armory/index.ts';
import {
  areAxialCoordinatesEqual,
  createAxialCoordinate,
} from '../../../src/core/hex/index.ts';
import { ATLANTIC_SECTOR_THEATER } from '../../../src/layers/strategic/index.ts';
import {
  type TacticalMerchantSnapshot,
  type TacticalSubmarineSnapshot,
  advanceTacticalMerchantStep,
  applyTacticalSubmarineMovement,
  calculateTacticalReachableOptions,
  createTacticalHexGrid,
} from '../../../src/layers/tactical/index.ts';

function createSampleTacticalSubmarine(
  overrides: Partial<TacticalSubmarineSnapshot> = {},
): TacticalSubmarineSnapshot {
  return {
    coordinate: createAxialCoordinate(4, 9),
    heading: 5,
    depth: 'PERISCOPE_DEPTH',
    fuel: 80,
    battery: 80,
    hullIntegrity: 100,
    armory: createInitialTorpedoArmory(4, 1, 7),
    ...overrides,
  };
}

describe('TacticalMovementRules', () => {
  it('creates a 15x15 tactical hex board with 225 indexed cells', () => {
    const grid = createTacticalHexGrid();
    expect(grid.size).toBe(225);
  });

  it('enforces max movement range by depth (SURFACED=3, PERISCOPE_DEPTH=2, DEEP=1)', () => {
    const grid = createTacticalHexGrid();
    const distantMerchant = createAxialCoordinate(1, 1);

    const surfacedOptions = calculateTacticalReachableOptions(
      grid,
      createSampleTacticalSubmarine({ depth: 'SURFACED' }),
      distantMerchant,
    );
    const periscopeOptions = calculateTacticalReachableOptions(
      grid,
      createSampleTacticalSubmarine({ depth: 'PERISCOPE_DEPTH' }),
      distantMerchant,
    );
    const deepOptions = calculateTacticalReachableOptions(
      grid,
      createSampleTacticalSubmarine({ depth: 'DEEP' }),
      distantMerchant,
    );

    expect(Math.max(...surfacedOptions.map((o) => o.stepDistance))).toBe(3);
    expect(Math.max(...periscopeOptions.map((o) => o.stepDistance))).toBe(2);
    expect(Math.max(...deepOptions.map((o) => o.stepDistance))).toBe(1);
  });

  it('excludes the merchant hex from reachable destinations to prevent overlap at 0m', () => {
    const grid = createTacticalHexGrid();
    const sub = createSampleTacticalSubmarine({
      coordinate: createAxialCoordinate(4, 8),
    });
    const adjacentMerchant = createAxialCoordinate(4, 7);

    const options = calculateTacticalReachableOptions(
      grid,
      sub,
      adjacentMerchant,
    );
    const containsMerchantHex = options.some((opt) =>
      areAxialCoordinatesEqual(opt.coordinate, adjacentMerchant),
    );

    expect(containsMerchantHex).toBe(false);
  });

  it('deducts exact battery cost in PERISCOPE_DEPTH (-1 for 1 hex, -3 for 2 hexes) and forces surface at 0', () => {
    const sub = createSampleTacticalSubmarine({
      depth: 'PERISCOPE_DEPTH',
      battery: 3,
    });
    const afterTwoHexMove = applyTacticalSubmarineMovement(sub, {
      coordinate: createAxialCoordinate(4, 7),
      stepDistance: 2,
      fuelCost: 0,
      batteryCost: 3,
    });

    expect(afterTwoHexMove.battery).toBe(0);
    expect(afterTwoHexMove.depth).toBe('SURFACED');
  });

  it('flags hasEscapedBoard when the merchant steps outside the 15x15 grid boundary', () => {
    const grid = createTacticalHexGrid();
    const eastEdgeMerchant: TacticalMerchantSnapshot = {
      contactId: 'merchant_alpha',
      spec: ATLANTIC_SECTOR_THEATER.surfaceShipCatalog[0]!,
      coordinate: createAxialCoordinate(14, 0),
      heading: 0,
      speedKnots: 10,
    };

    const stepOutcome = advanceTacticalMerchantStep(
      grid,
      eastEdgeMerchant,
      createAxialCoordinate(4, 9),
    );
    expect(stepOutcome.hasEscapedBoard).toBe(true);
  });
});
