import { createInitialTorpedoArmory } from '../../../core/armory/index.ts';
import type {
  CampaignState,
  DifficultyConfig,
  HexTerrainType,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import { getDifficultyConfig } from '../../../core/difficulty/DifficultyPresets.ts';
import {
  type AxialCoordinate,
  type HexCell,
  HexGridMap,
  areAxialCoordinatesEqual,
  createAxialCoordinate,
  toHexKey,
} from '../../../core/hex/index.ts';

// Define declarativamente el sector Atlántico 12x8, el catálogo de buques y la ruta mercante sin acoplar datos a las reglas del motor

export interface StrategicMapCell extends HexCell {
  readonly terrain: HexTerrainType;
  readonly label?: string;
}

export const LORIENT_BASE_COORDINATE: AxialCoordinate = createAxialCoordinate(10, 1);

// Franja costera oriental y escollo central para forzar maniobras de rodeo y validar el bloqueo de salto de 2 hexágonos
const IMPASSABLE_LAND_KEYS: ReadonlySet<string> = new Set([
  '11,0', '11,1', '10,2', '10,3', '9,4', '9,5', '8,6', '8,7', '4,3', '5,3',
]);

const COASTAL_WATER_KEYS: ReadonlySet<string> = new Set([
  '10,0', '9,1', '9,2', '9,3', '8,4', '8,5', '7,6', '7,7', '3,3', '4,2', '5,2', '6,3',
]);

export const ATLANTIC_SECTOR_THEATER: TheaterDefinition = {
  theaterId: 'atlantic_sector_01',
  name: 'Atlántico Norte — Golfo de Vizcaya',
  gridWidth: 12,
  gridHeight: 8,
  bases: [
    {
      baseId: 'base_lorient',
      name: 'Base Lorient',
      coordinate: LORIENT_BASE_COORDINATE,
    },
  ],
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
    {
      specId: 'freighter_liberty',
      className: 'Carguero Clase Liberty',
      tonnage: 7100,
      draftMeters: 8.4,
      cruiseSpeedKnots: 10,
      isArmedEscort: false,
    },
    {
      specId: 'tanker_t2',
      className: 'Petrolero Costero T2',
      tonnage: 10400,
      draftMeters: 9.1,
      cruiseSpeedKnots: 11,
      isArmedEscort: false,
    },
    {
      specId: 'coaster_tramp',
      className: 'Vapor Mercante Ligero',
      tonnage: 3200,
      draftMeters: 5.5,
      cruiseSpeedKnots: 8,
      isArmedEscort: false,
    },
  ],
};

// Ruta circular en aguas abiertas que avanza 1 hexágono por turno de 4 horas
export const ATLANTIC_MERCHANT_ROUTES: Readonly<
  Record<string, readonly AxialCoordinate[]>
> = {
  merchant_alpha: [
    createAxialCoordinate(3, 5),
    createAxialCoordinate(4, 5),
    createAxialCoordinate(5, 5),
    createAxialCoordinate(6, 4),
    createAxialCoordinate(7, 3),
    createAxialCoordinate(7, 2),
    createAxialCoordinate(6, 2),
    createAxialCoordinate(5, 1),
    createAxialCoordinate(4, 1),
    createAxialCoordinate(3, 2),
    createAxialCoordinate(2, 3),
    createAxialCoordinate(2, 4),
  ],
};

export function isNavigableStrategicTerrain(terrain: HexTerrainType): boolean {
  return terrain !== 'LAND';
}

function resolveAtlanticCellTerrain(coordinate: AxialCoordinate): StrategicMapCell {
  if (areAxialCoordinatesEqual(coordinate, LORIENT_BASE_COORDINATE)) {
    return { coordinate, terrain: 'NAVAL_BASE', label: 'LORIENT' };
  }
  const key = toHexKey(coordinate);
  if (IMPASSABLE_LAND_KEYS.has(key)) {
    return { coordinate, terrain: 'LAND' };
  }
  if (COASTAL_WATER_KEYS.has(key)) {
    return { coordinate, terrain: 'COASTAL_WATER' };
  }
  return { coordinate, terrain: 'DEEP_WATER' };
}

export function createAtlanticHexGrid(): HexGridMap<StrategicMapCell> {
  return HexGridMap.createRectangular(
    ATLANTIC_SECTOR_THEATER.gridWidth,
    ATLANTIC_SECTOR_THEATER.gridHeight,
    resolveAtlanticCellTerrain,
  );
}

export function createInitialAtlanticCampaignState(
  difficulty: DifficultyConfig = getDifficultyConfig('NORMAL'),
): CampaignState {
  const submarineSpec = ATLANTIC_SECTOR_THEATER.submarineCatalog[0]!;
  return {
    theaterId: ATLANTIC_SECTOR_THEATER.theaterId,
    turnNumber: 1,
    difficulty,
    submarine: {
      specId: submarineSpec.specId,
      coordinate: LORIENT_BASE_COORDINATE,
      heading: 3,
      stance: 'SURFACED',
      depth: 'SURFACED',
      fuel: submarineSpec.maxFuel,
      battery: submarineSpec.maxBattery,
      hullIntegrity: submarineSpec.maxHullIntegrity,
      armory: createInitialTorpedoArmory(
        submarineSpec.bowTubeCount,
        submarineSpec.sternTubeCount,
        submarineSpec.initialReserveTorpedoes,
      ),
    },
    contacts: [
      {
        contactId: 'merchant_alpha',
        shipSpecId: 'freighter_liberty',
        coordinate: createAxialCoordinate(3, 5),
        heading: 0,
        isSunk: false,
      },
    ],
    totalSunkTonnage: 0,
  };
}
