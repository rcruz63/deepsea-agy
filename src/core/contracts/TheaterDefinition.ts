import type { AxialCoordinate } from '../hex/HexCoordinate.ts';

// Desacopla la lógica de campaña de teatros históricos concretos (Atlántico, Pacífico) cargando mapas, puertos, rutas y cuadrículas desde datos puros

export type HexTerrainType =
  | 'DEEP_WATER'
  | 'COASTAL_WATER'
  | 'LAND'
  | 'NAVAL_BASE'
  | 'ALLIED_PORT';

export interface SubmarineSpec {
  readonly specId: string;
  readonly className: string;
  readonly bowTubeCount: number;
  readonly sternTubeCount: number;
  readonly initialReserveTorpedoes: number;
  readonly maxFuel: number;
  readonly maxBattery: number;
  readonly maxHullIntegrity: number;
}

export interface SurfaceShipSpec {
  readonly specId: string;
  readonly className: string;
  readonly tonnage: number;
  // El calado real en metros determina la ventana letal de la espoleta magnética bajo la quilla en el módulo Arcade
  readonly draftMeters: number;
  readonly cruiseSpeedKnots: number;
  readonly isArmedEscort: boolean;
}

export interface NavalBaseDefinition {
  readonly baseId: string;
  readonly name: string;
  readonly coordinate: AxialCoordinate;
}

export interface AlliedPortDefinition {
  readonly portId: string;
  readonly name: string;
  // Casilla cerrada al U-Boot por redes antisubmarinas y minas portuarias en patrulla ordinaria
  readonly coordinate: AxialCoordinate;
}

export interface CommercialRouteCorridor {
  readonly corridorId: string;
  readonly name: string;
  readonly originPortId: string;
  readonly destinationPortId: string;
  readonly nominalWaypoints: readonly AxialCoordinate[];
  readonly lateralDriftHexes: 0 | 1;
}

export interface MarineQuadratGridSpec {
  readonly majorCols: number;
  readonly majorRows: number;
  readonly majorSquareSize: 9;
  readonly majorLabelsRowMajor: readonly string[];
}

export interface TheaterDefinition {
  readonly theaterId: string;
  readonly name: string;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly bases: readonly NavalBaseDefinition[];
  readonly alliedPorts?: readonly AlliedPortDefinition[];
  readonly routeCorridors?: readonly CommercialRouteCorridor[];
  readonly marineQuadratSpec?: MarineQuadratGridSpec;
  readonly chartAssetUrl?: string;
  readonly submarineCatalog: readonly SubmarineSpec[];
  readonly surfaceShipCatalog: readonly SurfaceShipSpec[];
}
