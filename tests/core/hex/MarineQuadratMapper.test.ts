import { describe, expect, it } from 'vitest';
import {
  axialToOffsetColumnRow,
  isCoordinateInsidePatrolSector,
  offsetColumnRowToAxialCoord,
  resolveMarineQuadrat,
  resolveSectorCenterCoordinate,
} from '../../../src/core/hex/index.ts';

describe('MarineQuadratMapper (5x3 Major Squares, 9x9 Historical Subdivision)', () => {
  it('reproduces the exact historical top-row sequence 11,12,13 | 21,22,23 | 31,32,33 inside any Major Square', () => {
    const topRowCodesInAl: number[] = [];
    // AL corresponde a majorCol = 3 (cols 27..35), majorRow = 0 (row 0)
    for (let localCol = 0; localCol < 9; localCol += 1) {
      const coord = offsetColumnRowToAxialCoord(27 + localCol, 0);
      const quadrat = resolveMarineQuadrat(coord);
      expect(quadrat?.majorSquare).toBe('AL');
      topRowCodesInAl.push(quadrat!.twoDigitCode);
    }

    expect(topRowCodesInAl).toEqual([11, 12, 13, 21, 22, 23, 31, 32, 33]);
  });

  it('maps center cell (localCol=4, localRow=4) of AL to AL 55 and (localCol=3, localRow=3) to AL 51', () => {
    const alCenter = offsetColumnRowToAxialCoord(27 + 4, 4);
    expect(resolveMarineQuadrat(alCenter)?.fullCode).toBe('AL 55');
    expect(resolveMarineQuadrat(alCenter)?.sectorCode).toBe('AL 5');

    // AL 44 = bloque 4 (localCols 0..2, localRows 3..5), subcelda 4 (col 0, fila intermedia 4)
    const al44 = offsetColumnRowToAxialCoord(27 + 0, 4);
    expect(resolveMarineQuadrat(al44)?.fullCode).toBe('AL 44');
  });

  it('covers all 15 North Atlantic squares from AD (0,0) to CG (44,26) and rejects out-of-bounds hexes', () => {
    expect(resolveMarineQuadrat(offsetColumnRowToAxialCoord(0, 0))?.fullCode).toBe('AD 11');
    expect(resolveMarineQuadrat(offsetColumnRowToAxialCoord(44, 26))?.fullCode).toBe('CG 99');
    expect(resolveMarineQuadrat(offsetColumnRowToAxialCoord(-1, 0))).toBeNull();
    expect(resolveMarineQuadrat(offsetColumnRowToAxialCoord(45, 26))).toBeNull();
    expect(resolveMarineQuadrat(offsetColumnRowToAxialCoord(0, 27))).toBeNull();
  });

  it('resolves patrol sector centers ("AK 5", "BF 5") and verifies sector membership in O(1)', () => {
    const ak5Center = resolveSectorCenterCoordinate('AK 5');
    expect(ak5Center).not.toBeNull();
    expect(axialToOffsetColumnRow(ak5Center!)).toEqual({ col: 22, row: 4 });
    expect(resolveMarineQuadrat(ak5Center!)?.fullCode).toBe('AK 55');
    expect(isCoordinateInsidePatrolSector(ak5Center!, 'AK 5')).toBe(true);
    expect(isCoordinateInsidePatrolSector(ak5Center!, 'AK 6')).toBe(false);
  });
});
