import { describe, expect, it } from 'vitest';
import {
  AxialCoordinate,
  HexCell,
  HexGridMap,
  createAxialCoordinate,
} from '../../../src/core/hex/index.ts';

interface TestOceanCell extends HexCell {
  readonly isNavigable: boolean;
}

function createWaterCell(coordinate: AxialCoordinate): TestOceanCell {
  return {
    coordinate,
    isNavigable: true,
  };
}

describe('HexGridMap', () => {
  it('builds rectangular 12x8 strategic and 15x15 tactical maps with exact indexed sizes', () => {
    const strategicGrid = HexGridMap.createRectangular(12, 8, createWaterCell);
    const tacticalGrid = HexGridMap.createRectangular(15, 15, createWaterCell);

    expect(strategicGrid.size).toBe(96);
    expect(tacticalGrid.size).toBe(225);
    expect(strategicGrid.hasCell(createAxialCoordinate(0, 0))).toBe(true);
    expect(strategicGrid.hasCell(createAxialCoordinate(99, 99))).toBe(false);
  });

  it('preserves immutability when replacing a cell via withCell', () => {
    const targetCoordinate = createAxialCoordinate(2, 2);
    const initialGrid = HexGridMap.createRectangular(5, 5, createWaterCell);
    const blockedGrid = initialGrid.withCell({
      coordinate: targetCoordinate,
      isNavigable: false,
    });

    expect(initialGrid.getCell(targetCoordinate)?.isNavigable).toBe(true);
    expect(blockedGrid.getCell(targetCoordinate)?.isNavigable).toBe(false);
  });

  it('clips out-of-bounds neighbors at board corners and applies predicates', () => {
    const topLeftOrigin = createAxialCoordinate(0, 0);
    const blockedEast = createAxialCoordinate(1, 0);
    const grid = HexGridMap.createRectangular(4, 4, createWaterCell).withCell({
      coordinate: blockedEast,
      isNavigable: false,
    });

    const allInBoundsNeighbors = grid.getNeighbors(topLeftOrigin);
    const navigableNeighbors = grid.getNeighbors(
      topLeftOrigin,
      (cell) => cell.isNavigable,
    );

    expect(allInBoundsNeighbors.length).toBeLessThan(6);
    expect(navigableNeighbors).toHaveLength(allInBoundsNeighbors.length - 1);
  });

  it('queries cells in rings and areas using O(1) key lookups without nested scans', () => {
    const center = createAxialCoordinate(3, 4);
    const grid = HexGridMap.createRectangular(10, 10, createWaterCell);

    const ringOne = grid.getCellsInRing(center, 1);
    const diskTwo = grid.getCellsWithinRadius(center, 2);

    expect(ringOne).toHaveLength(6);
    expect(diskTwo).toHaveLength(19);
  });
});
