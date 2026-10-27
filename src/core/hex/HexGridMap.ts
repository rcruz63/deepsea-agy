import {
  AxialCoordinate,
  HexKey,
  createAxialCoordinate,
  getAllHexNeighbors,
  toHexKey,
} from './HexCoordinate.ts';
import { getHexRing, getHexesWithinRadius } from './HexMath.ts';

// Sustituye las matrices bidimensionales grid[x][y] por un índice Map<"q,r", TCell> inmutable para lograr acceso O(1) sin bucles anidados

export interface HexCell {
  readonly coordinate: AxialCoordinate;
}

// Desplaza q según la fila par/impar (odd-r offset) para que un tablero POINTY_TOP de ancho x alto conserve forma rectangular en pantalla
function offsetColumnRowToAxial(column: number, row: number): AxialCoordinate {
  const axialQ = column - Math.floor(row / 2);
  return createAxialCoordinate(axialQ, row);
}

function populateRectangularRow<TCell extends HexCell>(
  targetMap: Map<HexKey, TCell>,
  row: number,
  width: number,
  createCell: (coordinate: AxialCoordinate) => TCell,
): void {
  for (let column = 0; column < width; column += 1) {
    const coordinate = offsetColumnRowToAxial(column, row);
    targetMap.set(toHexKey(coordinate), createCell(coordinate));
  }
}

export class HexGridMap<TCell extends HexCell> {
  private readonly cellsByKey: ReadonlyMap<HexKey, TCell>;

  private constructor(cellsByKey: ReadonlyMap<HexKey, TCell>) {
    this.cellsByKey = cellsByKey;
  }

  public static fromCells<TCell extends HexCell>(
    cells: Iterable<TCell>,
  ): HexGridMap<TCell> {
    const indexedCells = new Map<HexKey, TCell>();
    for (const cell of cells) {
      indexedCells.set(toHexKey(cell.coordinate), cell);
    }
    return new HexGridMap(indexedCells);
  }

  public static createRectangular<TCell extends HexCell>(
    width: number,
    height: number,
    createCell: (coordinate: AxialCoordinate) => TCell,
  ): HexGridMap<TCell> {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error(
        `Las dimensiones del tablero deben ser enteros positivos; recibido ${width}x${height}.`,
      );
    }

    const indexedCells = new Map<HexKey, TCell>();
    for (let row = 0; row < height; row += 1) {
      populateRectangularRow(indexedCells, row, width, createCell);
    }
    return new HexGridMap(indexedCells);
  }

  public get size(): number {
    return this.cellsByKey.size;
  }

  public hasCell(coordinate: AxialCoordinate): boolean {
    return this.cellsByKey.has(toHexKey(coordinate));
  }

  public getCell(coordinate: AxialCoordinate): TCell | undefined {
    return this.cellsByKey.get(toHexKey(coordinate));
  }

  public getCellByKey(key: HexKey): TCell | undefined {
    return this.cellsByKey.get(key);
  }

  public withCell(updatedCell: TCell): HexGridMap<TCell> {
    const clonedCells = new Map(this.cellsByKey);
    clonedCells.set(toHexKey(updatedCell.coordinate), updatedCell);
    return new HexGridMap(clonedCells);
  }

  public values(): readonly TCell[] {
    return Array.from(this.cellsByKey.values());
  }

  public getNeighbors(
    origin: AxialCoordinate,
    predicate?: (cell: TCell) => boolean,
  ): readonly TCell[] {
    return this.collectExistingCells(getAllHexNeighbors(origin), predicate);
  }

  public getCellsInRing(
    center: AxialCoordinate,
    radius: number,
    predicate?: (cell: TCell) => boolean,
  ): readonly TCell[] {
    return this.collectExistingCells(getHexRing(center, radius), predicate);
  }

  public getCellsWithinRadius(
    center: AxialCoordinate,
    radius: number,
    predicate?: (cell: TCell) => boolean,
  ): readonly TCell[] {
    return this.collectExistingCells(getHexesWithinRadius(center, radius), predicate);
  }

  private collectExistingCells(
    coordinates: readonly AxialCoordinate[],
    predicate?: (cell: TCell) => boolean,
  ): readonly TCell[] {
    const matchedCells: TCell[] = [];
    for (const coordinate of coordinates) {
      const cell = this.cellsByKey.get(toHexKey(coordinate));
      if (cell !== undefined && (predicate === undefined || predicate(cell))) {
        matchedCells.push(cell);
      }
    }
    return matchedCells;
  }
}
