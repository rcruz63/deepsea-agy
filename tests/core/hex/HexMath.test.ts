import { describe, expect, it } from 'vitest';
import {
  AxialCoordinate,
  calculateHexDistance,
  createAxialCoordinate,
  getHexRing,
  getHexesWithinRadius,
  interpolateHexLine,
  toHexKey,
} from '../../../src/core/hex/index.ts';

function verifyEveryCoordinateMatchesDistance(
  center: AxialCoordinate,
  coordinates: readonly AxialCoordinate[],
  expectedDistance: number,
): void {
  for (const coordinate of coordinates) {
    expect(calculateHexDistance(center, coordinate)).toBe(expectedDistance);
  }
}

function verifyConsecutiveStepAdjacency(path: readonly AxialCoordinate[]): void {
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1]!;
    const current = path[index]!;
    expect(calculateHexDistance(previous, current)).toBe(1);
  }
}

describe('HexMath', () => {
  it('computes exact axial-cube distances across cardinal and diagonal axes', () => {
    const origin = createAxialCoordinate(0, 0);
    const eastTarget = createAxialCoordinate(4, 0);
    const diagonalTarget = createAxialCoordinate(3, -5);

    expect(calculateHexDistance(origin, origin)).toBe(0);
    expect(calculateHexDistance(origin, eastTarget)).toBe(4);
    expect(calculateHexDistance(origin, diagonalTarget)).toBe(5);
    expect(calculateHexDistance(diagonalTarget, origin)).toBe(5);
  });

  it('returns only the center cell for a ring of radius zero', () => {
    const center = createAxialCoordinate(-2, 3);
    expect(getHexRing(center, 0)).toEqual([center]);
  });

  it('generates rings of 6*R unique cells all at exact distance R from the center', () => {
    const center = createAxialCoordinate(2, -1);
    const ringRadiusTwo = getHexRing(center, 2);
    const ringRadiusThree = getHexRing(center, 3);

    expect(ringRadiusTwo).toHaveLength(12);
    expect(new Set(ringRadiusTwo.map(toHexKey)).size).toBe(12);
    verifyEveryCoordinateMatchesDistance(center, ringRadiusTwo, 2);

    expect(ringRadiusThree).toHaveLength(18);
    expect(new Set(ringRadiusThree.map(toHexKey)).size).toBe(18);
    verifyEveryCoordinateMatchesDistance(center, ringRadiusThree, 3);
  });

  it('collects 1 + 3*R*(R+1) unique cells within a closed disk radius', () => {
    const center = createAxialCoordinate(0, 0);
    const diskRadiusTwo = getHexesWithinRadius(center, 2);

    expect(diskRadiusTwo).toHaveLength(19);
    expect(new Set(diskRadiusTwo.map(toHexKey)).size).toBe(19);
    for (const coordinate of diskRadiusTwo) {
      expect(calculateHexDistance(center, coordinate)).toBeLessThanOrEqual(2);
    }
  });

  it('rejects negative or non-integer search radii', () => {
    const center = createAxialCoordinate(0, 0);
    expect(() => getHexRing(center, -1)).toThrow();
    expect(() => getHexesWithinRadius(center, 1.2)).toThrow();
  });

  it('interpolates a contiguous step-by-step hex line between distant coordinates', () => {
    const origin = createAxialCoordinate(-2, 4);
    const destination = createAxialCoordinate(3, -1);
    const expectedDistance = calculateHexDistance(origin, destination);
    const line = interpolateHexLine(origin, destination);

    expect(line).toHaveLength(expectedDistance + 1);
    expect(line[0]).toEqual(origin);
    expect(line[line.length - 1]).toEqual(destination);
    verifyConsecutiveStepAdjacency(line);
  });
});
