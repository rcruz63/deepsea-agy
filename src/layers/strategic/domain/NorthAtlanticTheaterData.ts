import type {
  AlliedPortDefinition,
  CommercialRouteCorridor,
  NavalBaseDefinition,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  DEFAULT_NORTH_ATLANTIC_QUADRAT_SPEC,
  HexGridMap,
  areAxialCoordinatesEqual,
  axialToOffsetColumnRow,
  getAllHexNeighbors,
  offsetColumnRowToAxialCoord,
} from '../../../core/hex/index.ts';
import type { StrategicMapCell } from './AtlanticSectorScenario.ts';

// Define declarativamente la carta histórica 45x27 (5x3 cuadrantes Marinequadrat) con bases en Vizcaya, puertos aliados y derrotas

interface OffsetRect {
  readonly minCol: number;
  readonly maxCol: number;
  readonly minRow: number;
  readonly maxRow: number;
}

// Masas continentales e insulares del Atlántico Norte alineadas con los cuadrantes AD..CG de la carta N.º 1546
const NORTH_ATLANTIC_LAND_RECTS: readonly OffsetRect[] = [
  { minCol: 0, maxCol: 5, minRow: 0, maxRow: 3 },     // Groenlandia Sur (AD)
  { minCol: 12, maxCol: 16, minRow: 1, maxRow: 3 },   // Islandia (AE)
  { minCol: 0, maxCol: 3, minRow: 9, maxRow: 16 },    // Labrador y Nueva Escocia (BB)
  { minCol: 6, maxCol: 8, minRow: 11, maxRow: 13 },   // Terranova (BB/BC)
  { minCol: 36, maxCol: 37, minRow: 6, maxRow: 8 },   // Irlanda (AM)
  { minCol: 40, maxCol: 43, minRow: 3, maxRow: 10 },  // Gran Bretaña (AM)
  { minCol: 42, maxCol: 44, minRow: 11, maxRow: 17 }, // Costa Atlántica Francesa (BF)
  { minCol: 38, maxCol: 44, minRow: 18, maxRow: 23 }, // Península Ibérica (CF/CG)
  { minCol: 39, maxCol: 44, minRow: 26, maxRow: 26 }, // Norte de Marruecos (CG)
  { minCol: 22, maxCol: 23, minRow: 21, maxRow: 21 }, // Islas Azores (CE)
];

export const BREST_BASE_COORDINATE = offsetColumnRowToAxialCoord(40, 12);
export const LORIENT_NORTH_ATLANTIC_COORDINATE = offsetColumnRowToAxialCoord(41, 13);
export const SAINT_NAZAIRE_BASE_COORDINATE = offsetColumnRowToAxialCoord(41, 15);

export const HALIFAX_PORT_COORDINATE = offsetColumnRowToAxialCoord(4, 14);
export const LIVERPOOL_PORT_COORDINATE = offsetColumnRowToAxialCoord(39, 7);
export const GIBRALTAR_PORT_COORDINATE = offsetColumnRowToAxialCoord(40, 24);

export const AXIS_NAVAL_BASES: readonly NavalBaseDefinition[] = [
  { baseId: 'base_brest', name: 'Brest', coordinate: BREST_BASE_COORDINATE },
  { baseId: 'base_lorient', name: 'Lorient', coordinate: LORIENT_NORTH_ATLANTIC_COORDINATE },
  { baseId: 'base_st_nazaire', name: 'Saint-Nazaire', coordinate: SAINT_NAZAIRE_BASE_COORDINATE },
];

export const ALLIED_PORTS: readonly AlliedPortDefinition[] = [
  { portId: 'port_halifax', name: 'Halifax', coordinate: HALIFAX_PORT_COORDINATE },
  { portId: 'port_liverpool', name: 'Liverpool', coordinate: LIVERPOOL_PORT_COORDINATE },
  { portId: 'port_gibraltar', name: 'Gibraltar', coordinate: GIBRALTAR_PORT_COORDINATE },
];

export const NORTH_ATLANTIC_CORRIDORS: readonly CommercialRouteCorridor[] = [
  {
    corridorId: 'corridor_hx_eastbound',
    name: 'Ruta HX (Halifax -> Liverpool)',
    originPortId: 'port_halifax',
    destinationPortId: 'port_liverpool',
    nominalWaypoints: [
      offsetColumnRowToAxialCoord(5, 14),
      offsetColumnRowToAxialCoord(11, 14),
      offsetColumnRowToAxialCoord(19, 10),
      offsetColumnRowToAxialCoord(28, 6),
      offsetColumnRowToAxialCoord(35, 4),
      offsetColumnRowToAxialCoord(39, 6),
    ],
    lateralDriftHexes: 1,
  },
  {
    corridorId: 'corridor_on_westbound',
    name: 'Ruta ON (Liverpool -> Halifax)',
    originPortId: 'port_liverpool',
    destinationPortId: 'port_halifax',
    nominalWaypoints: [
      offsetColumnRowToAxialCoord(39, 9),
      offsetColumnRowToAxialCoord(34, 10),
      offsetColumnRowToAxialCoord(24, 12),
      offsetColumnRowToAxialCoord(14, 15),
      offsetColumnRowToAxialCoord(5, 15),
    ],
    lateralDriftHexes: 1,
  },
  {
    corridorId: 'corridor_hg_northbound',
    name: 'Ruta HG (Gibraltar -> Liverpool)',
    originPortId: 'port_gibraltar',
    destinationPortId: 'port_liverpool',
    nominalWaypoints: [
      offsetColumnRowToAxialCoord(39, 24),
      offsetColumnRowToAxialCoord(36, 21),
      offsetColumnRowToAxialCoord(35, 16),
      offsetColumnRowToAxialCoord(35, 11),
      offsetColumnRowToAxialCoord(39, 9),
    ],
    lateralDriftHexes: 1,
  },
];

export const NORTH_ATLANTIC_THEATER: TheaterDefinition = {
  theaterId: 'north_atlantic_1941',
  name: 'Atlántico Norte — Marinequadrat Nr. 1546',
  gridWidth: 45,
  gridHeight: 27,
  bases: AXIS_NAVAL_BASES,
  alliedPorts: ALLIED_PORTS,
  routeCorridors: NORTH_ATLANTIC_CORRIDORS,
  marineQuadratSpec: DEFAULT_NORTH_ATLANTIC_QUADRAT_SPEC,
  chartAssetUrl: '/docs/mapa_2.jpg',
  submarineCatalog: [
    {
      specId: 'type_viic',
      className: 'U-Boat Tipo VIIC',
      bowTubeCount: 4,
      sternTubeCount: 1,
      initialReserveTorpedoes: 7,
      maxFuel: 100,
      maxBattery: 100,
      maxHullIntegrity: 100,
    },
  ],
  surfaceShipCatalog: [
    { specId: 'LIBERTY_CARGO', className: 'Mercante Estándar Liberty', tonnage: 7100, draftMeters: 7.5, cruiseSpeedKnots: 10, isArmedEscort: false },
    { specId: 'T2_TANKER', className: 'Petrolero Oceánico T2', tonnage: 10500, draftMeters: 9.5, cruiseSpeedKnots: 11, isArmedEscort: false },
    { specId: 'COASTAL_FREIGHTER', className: 'Carguero Costero', tonnage: 2500, draftMeters: 4.5, cruiseSpeedKnots: 8, isArmedEscort: false },
  ],
};

function isCoordinateLand(coordinate: AxialCoordinate): boolean {
  const { col, row } = axialToOffsetColumnRow(coordinate);
  return NORTH_ATLANTIC_LAND_RECTS.some(
    (rect) => col >= rect.minCol && col <= rect.maxCol && row >= rect.minRow && row <= rect.maxRow,
  );
}

function resolveNorthAtlanticCell(coordinate: AxialCoordinate): StrategicMapCell {
  const base = AXIS_NAVAL_BASES.find((b) => areAxialCoordinatesEqual(b.coordinate, coordinate));
  if (base !== undefined) {
    return { coordinate, terrain: 'NAVAL_BASE', label: base.name.toUpperCase() };
  }
  const allied = ALLIED_PORTS.find((p) => areAxialCoordinatesEqual(p.coordinate, coordinate));
  if (allied !== undefined) {
    return { coordinate, terrain: 'ALLIED_PORT', label: allied.name.toUpperCase() };
  }
  if (isCoordinateLand(coordinate)) {
    return { coordinate, terrain: 'LAND' };
  }
  const touchesCoast = getAllHexNeighbors(coordinate).some(isCoordinateLand);
  return { coordinate, terrain: touchesCoast ? 'COASTAL_WATER' : 'DEEP_WATER' };
}

export function createNorthAtlanticHexGrid(): HexGridMap<StrategicMapCell> {
  return HexGridMap.createRectangular(
    NORTH_ATLANTIC_THEATER.gridWidth,
    NORTH_ATLANTIC_THEATER.gridHeight,
    resolveNorthAtlanticCell,
  );
}
