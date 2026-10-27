import { describe, expect, it } from 'vitest';
import {
  axialToCartesian,
  calculateNavalBearingDegrees,
  cartesianToAxial,
  createAxialCoordinate,
  roundFractionalAxial,
} from '../../../src/core/hex/index.ts';

describe('HexLayout', () => {
  it('converts axial coordinates to Cartesian points and back without drift in both orientations', () => {
    const sampleCoordinate = createAxialCoordinate(4, -3);
    const hexSize = 24;

    const pointyPoint = axialToCartesian(sampleCoordinate, hexSize, 'POINTY_TOP');
    const flatPoint = axialToCartesian(sampleCoordinate, hexSize, 'FLAT_TOP');

    expect(cartesianToAxial(pointyPoint, hexSize, 'POINTY_TOP')).toEqual(sampleCoordinate);
    expect(cartesianToAxial(flatPoint, hexSize, 'FLAT_TOP')).toEqual(sampleCoordinate);
  });

  it('snaps off-center Cartesian clicks inside a hex face back to the owning axial cell', () => {
    const targetCell = createAxialCoordinate(-2, 5);
    const hexSize = 30;
    const centerPoint = axialToCartesian(targetCell, hexSize, 'POINTY_TOP');
    const slightlyShiftedPoint = {
      x: centerPoint.x + 5,
      y: centerPoint.y - 4,
    };

    expect(cartesianToAxial(slightlyShiftedPoint, hexSize, 'POINTY_TOP')).toEqual(targetCell);
  });

  it('rebalances the component with largest rounding error when naive cube rounding violates q + r + s = 0', () => {
    // Con q=0.28 y r=0.30, s=-0.58 se redondearía ingenuamente a -1 rompiendo q+r+s=0; al tener s el mayor error (0.42), prevalece (0, 0)
    const centerWinner = roundFractionalAxial({ q: 0.28, r: 0.30 });
    // Con q=0.35 y r=0.45, s=-0.80 tiene error 0.20 y r acumula el mayor error (0.45), desplazando la celda hacia (0, 1)
    const neighborWinner = roundFractionalAxial({ q: 0.35, r: 0.45 });

    expect(centerWinner).toEqual({ q: 0, r: 0 });
    expect(neighborWinner).toEqual({ q: 0, r: 1 });
  });

  it('computes clockwise naval bearings with 0 degrees at North and 90 degrees at East', () => {
    const origin = createAxialCoordinate(0, 0);
    const dueEast = createAxialCoordinate(3, 0);
    const dueWest = createAxialCoordinate(-3, 0);
    // En POINTY_TOP, (q=1, r=-2) anula el desplazamiento horizontal (q + r/2 = 0) y queda exactamente al Norte (-Y)
    const dueNorth = createAxialCoordinate(1, -2);
    const dueSouth = createAxialCoordinate(-1, 2);

    expect(calculateNavalBearingDegrees(origin, dueNorth)).toBeCloseTo(0, 5);
    expect(calculateNavalBearingDegrees(origin, dueEast)).toBeCloseTo(90, 5);
    expect(calculateNavalBearingDegrees(origin, dueSouth)).toBeCloseTo(180, 5);
    expect(calculateNavalBearingDegrees(origin, dueWest)).toBeCloseTo(270, 5);
  });

  it('rejects non-positive hex radii during layout projection', () => {
    const origin = createAxialCoordinate(0, 0);
    expect(() => axialToCartesian(origin, 0)).toThrow();
    expect(() => cartesianToAxial({ x: 10, y: 10 }, -5)).toThrow();
  });
});
