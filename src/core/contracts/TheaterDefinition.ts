import type { AxialCoordinate } from '../hex/HexCoordinate.ts';

// Desacopla la lógica de campaña de teatros históricos concretos (Atlántico, Pacífico) cargando mapas y catálogos desde datos puros

export type HexTerrainType = 'DEEP_WATER' | 'COASTAL_WATER' | 'LAND' | 'NAVAL_BASE';

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

export interface TheaterDefinition {
  readonly theaterId: string;
  readonly name: string;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly bases: readonly NavalBaseDefinition[];
  readonly submarineCatalog: readonly SubmarineSpec[];
  readonly surfaceShipCatalog: readonly SurfaceShipSpec[];
}
