import type { MarineQuadratGridSpec } from '../contracts/TheaterDefinition.ts';
import {
  type AxialCoordinate,
  createAxialCoordinate,
} from './HexCoordinate.ts';

// Traduce coordenadas axiales a la cuadrícula histórica Marinequadrat de la Kriegsmarine en O(1) sin bucles mediante proyección odd-r

export interface OffsetCoordinate {
  readonly col: number;
  readonly row: number;
}

export interface MarineQuadratDesignation {
  readonly majorSquare: string;
  readonly midDigit: number;
  readonly subDigit: number;
  readonly twoDigitCode: number;
  readonly sectorCode: string;
  readonly fullCode: string;
}

export const DEFAULT_NORTH_ATLANTIC_QUADRAT_SPEC: MarineQuadratGridSpec = {
  majorCols: 5,
  majorRows: 3,
  majorSquareSize: 9,
  majorLabelsRowMajor: [
    'AD', 'AE', 'AK', 'AL', 'AM',
    'BB', 'BC', 'BD', 'BE', 'BF',
    'CC', 'CD', 'CE', 'CF', 'CG',
  ],
};

// Convierte coordenada axial a columna/fila rectangular odd-r para alinear los hexágonos con los cuadrantes ortogonales de la carta
export function axialToOffsetColumnRow(
  coordinate: AxialCoordinate,
): OffsetCoordinate {
  return {
    col: coordinate.q + Math.floor(coordinate.r / 2),
    row: coordinate.r,
  };
}

export function offsetColumnRowToAxialCoord(
  col: number,
  row: number,
): AxialCoordinate {
  return createAxialCoordinate(col - Math.floor(row / 2), row);
}

export function resolveMarineQuadrat(
  coordinate: AxialCoordinate,
  spec: MarineQuadratGridSpec = DEFAULT_NORTH_ATLANTIC_QUADRAT_SPEC,
): MarineQuadratDesignation | null {
  const { col, row } = axialToOffsetColumnRow(coordinate);
  const totalWidth = spec.majorCols * spec.majorSquareSize;
  const totalHeight = spec.majorRows * spec.majorSquareSize;

  if (col < 0 || col >= totalWidth || row < 0 || row >= totalHeight) {
    return null;
  }

  const majorCol = Math.floor(col / spec.majorSquareSize);
  const majorRow = Math.floor(row / spec.majorSquareSize);
  const majorSquare =
    spec.majorLabelsRowMajor[majorRow * spec.majorCols + majorCol];
  if (majorSquare === undefined) {
    return null;
  }

  const localCol = col % spec.majorSquareSize;
  const localRow = row % spec.majorSquareSize;
  // Replica la subdivisión oficial 3x3: primer dígito = bloque medio (1..9), segundo dígito = celda fina (1..9 -> 11..99)
  const midDigit = Math.floor(localRow / 3) * 3 + Math.floor(localCol / 3) + 1;
  const subDigit = (localRow % 3) * 3 + (localCol % 3) + 1;
  const twoDigitCode = midDigit * 10 + subDigit;

  return {
    majorSquare,
    midDigit,
    subDigit,
    twoDigitCode,
    sectorCode: `${majorSquare} ${midDigit}`,
    fullCode: `${majorSquare} ${twoDigitCode}`,
  };
}

export function resolveSectorCenterCoordinate(
  sectorCode: string,
  spec: MarineQuadratGridSpec = DEFAULT_NORTH_ATLANTIC_QUADRAT_SPEC,
): AxialCoordinate | null {
  const parts = sectorCode.trim().split(/\s+/);
  if (parts.length !== 2) {
    return null;
  }
  const majorIndex = spec.majorLabelsRowMajor.indexOf(parts[0]!);
  const midDigit = Number(parts[1]);
  if (majorIndex < 0 || !Number.isInteger(midDigit) || midDigit < 1 || midDigit > 9) {
    return null;
  }

  const majorCol = majorIndex % spec.majorCols;
  const majorRow = Math.floor(majorIndex / spec.majorCols);
  const blockCol = (midDigit - 1) % 3;
  const blockRow = Math.floor((midDigit - 1) / 3);

  const centerCol = majorCol * spec.majorSquareSize + blockCol * 3 + 1;
  const centerRow = majorRow * spec.majorSquareSize + blockRow * 3 + 1;
  return offsetColumnRowToAxialCoord(centerCol, centerRow);
}

export function isCoordinateInsidePatrolSector(
  coordinate: AxialCoordinate,
  sectorCode: string,
  spec: MarineQuadratGridSpec = DEFAULT_NORTH_ATLANTIC_QUADRAT_SPEC,
): boolean {
  return resolveMarineQuadrat(coordinate, spec)?.sectorCode === sectorCode;
}
