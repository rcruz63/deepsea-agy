import { describe, expect, it } from 'vitest';
import {
  addAxialCoordinates,
  areAxialCoordinatesEqual,
  createAxialCoordinate,
  getAllHexNeighbors,
  parseHexKey,
  rotateHexDirection,
  scaleAxialCoordinate,
  subtractAxialCoordinates,
  toHexKey,
} from '../../../src/core/hex/index.ts';

describe('HexCoordinate', () => {
  it('normalizes negative zero to preserve deterministic Map keys and structural equality', () => {
    const scaledOrigin = scaleAxialCoordinate(createAxialCoordinate(0, -3), 0);

    expect(Object.is(scaledOrigin.q, 0)).toBe(true);
    expect(Object.is(scaledOrigin.r, 0)).toBe(true);
    expect(toHexKey(scaledOrigin)).toBe('0,0');
  });

  it('rejects non-integer axial coordinates to prevent fractional corruption of grid keys', () => {
    expect(() => createAxialCoordinate(1.5, 0)).toThrow();
    expect(() => createAxialCoordinate(0, Number.NaN)).toThrow();
  });

  it('serializes and parses canonical "q,r" keys symmetrically', () => {
    const original = createAxialCoordinate(-4, 7);
    const key = toHexKey(original);

    expect(key).toBe('-4,7');
    expect(areAxialCoordinatesEqual(parseHexKey(key), original)).toBe(true);
  });

  it('rejects malformed hexagonal string keys', () => {
    expect(() => parseHexKey('4')).toThrow();
    expect(() => parseHexKey('4,2,1')).toThrow();
    expect(() => parseHexKey('4,')).toThrow();
    expect(() => parseHexKey('north,west')).toThrow();
  });

  it('performs exact vector addition and subtraction', () => {
    const first = createAxialCoordinate(3, -2);
    const second = createAxialCoordinate(-1, 5);

    expect(addAxialCoordinates(first, second)).toEqual({ q: 2, r: 3 });
    expect(subtractAxialCoordinates(first, second)).toEqual({ q: 4, r: -7 });
  });

  it('wraps hex directions cleanly across clockwise and counter-clockwise rotations', () => {
    expect(rotateHexDirection(0, 1)).toBe(1);
    expect(rotateHexDirection(5, 2)).toBe(1);
    expect(rotateHexDirection(0, -1)).toBe(5);
    expect(rotateHexDirection(2, -8)).toBe(0);
  });

  it('returns the six distinct adjacent coordinates around an origin', () => {
    const center = createAxialCoordinate(2, -1);
    const neighbors = getAllHexNeighbors(center);
    const uniqueKeys = new Set(neighbors.map(toHexKey));

    expect(neighbors).toHaveLength(6);
    expect(uniqueKeys.size).toBe(6);
    expect(uniqueKeys.has(toHexKey(center))).toBe(false);
  });
});
