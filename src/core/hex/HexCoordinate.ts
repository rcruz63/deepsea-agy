// Modela coordenadas axiales discretas (q, r) donde la tercera componente cúbica s = -q - r permanece implícita para ahorrar memoria y evitar estados inconsistentes

export interface AxialCoordinate {
  readonly q: number;
  readonly r: number;
}

export type HexKey = string;

export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export const HEX_DIRECTIONS: readonly HexDirection[] = [0, 1, 2, 3, 4, 5];

// Vectores unitarios en orientación POINTY_TOP ordenados en sentido horario (Este, Sureste, Suroeste, Oeste, Noroeste, Noreste)
export const HEX_DIRECTION_VECTORS: Readonly<Record<HexDirection, AxialCoordinate>> = {
  0: { q: 1, r: 0 },
  1: { q: 0, r: 1 },
  2: { q: -1, r: 1 },
  3: { q: -1, r: 0 },
  4: { q: 0, r: -1 },
  5: { q: 1, r: -1 },
};

// Evita el valor -0 de IEEE 754 tras multiplicaciones o restas para que Object.is y las comparaciones estructurales sean deterministas
function normalizeNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

export function createAxialCoordinate(q: number, r: number): AxialCoordinate {
  if (!Number.isInteger(q) || !Number.isInteger(r)) {
    throw new Error(`Las coordenadas axiales deben ser enteras; recibido (${q}, ${r}).`);
  }
  return {
    q: normalizeNegativeZero(q),
    r: normalizeNegativeZero(r),
  };
}

export function toHexKey(coordinate: AxialCoordinate): HexKey {
  return `${normalizeNegativeZero(coordinate.q)},${normalizeNegativeZero(coordinate.r)}`;
}

export function parseHexKey(key: HexKey): AxialCoordinate {
  const parts = key.split(',');
  if (parts.length !== 2 || parts[0]?.trim() === '' || parts[1]?.trim() === '') {
    throw new Error(`Clave hexagonal inválida "${key}". Se esperaba el formato canónico "q,r".`);
  }
  const q = Number(parts[0]);
  const r = Number(parts[1]);
  return createAxialCoordinate(q, r);
}

export function areAxialCoordinatesEqual(
  first: AxialCoordinate,
  second: AxialCoordinate,
): boolean {
  return first.q === second.q && first.r === second.r;
}

export function addAxialCoordinates(
  first: AxialCoordinate,
  second: AxialCoordinate,
): AxialCoordinate {
  return createAxialCoordinate(first.q + second.q, first.r + second.r);
}

export function subtractAxialCoordinates(
  first: AxialCoordinate,
  second: AxialCoordinate,
): AxialCoordinate {
  return createAxialCoordinate(first.q - second.q, first.r - second.r);
}

export function scaleAxialCoordinate(
  coordinate: AxialCoordinate,
  factor: number,
): AxialCoordinate {
  return createAxialCoordinate(coordinate.q * factor, coordinate.r * factor);
}

export function rotateHexDirection(
  direction: HexDirection,
  clockwiseSteps: number,
): HexDirection {
  const normalizedDirection = (((direction + clockwiseSteps) % 6) + 6) % 6;
  return normalizedDirection as HexDirection;
}

export function getDirectionVector(direction: HexDirection): AxialCoordinate {
  return HEX_DIRECTION_VECTORS[direction];
}

export function getHexNeighbor(
  origin: AxialCoordinate,
  direction: HexDirection,
): AxialCoordinate {
  return addAxialCoordinates(origin, getDirectionVector(direction));
}

export function getAllHexNeighbors(origin: AxialCoordinate): readonly AxialCoordinate[] {
  const neighbors: AxialCoordinate[] = [];
  for (const direction of HEX_DIRECTIONS) {
    neighbors.push(getHexNeighbor(origin, direction));
  }
  return neighbors;
}
