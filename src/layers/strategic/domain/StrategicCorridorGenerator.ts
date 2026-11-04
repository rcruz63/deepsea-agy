import { createInitialTorpedoArmory } from '../../../core/armory/index.ts';
import type {
  CampaignState,
  CommercialRouteCorridor,
  DifficultyConfig,
  StrategicContactState,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import { getDifficultyConfig } from '../../../core/difficulty/DifficultyPresets.ts';
import {
  type AxialCoordinate,
  type HexDirection,
  type HexGridMap,
  areAxialCoordinatesEqual,
  getHexNeighbor,
  interpolateHexLine,
  resolveAdjacentHexDirection,
} from '../../../core/hex/index.ts';
import {
  type StrategicMapCell,
  isNavigableStrategicTerrain,
} from './AtlanticSectorScenario.ts';
import {
  LORIENT_NORTH_ATLANTIC_COORDINATE,
  NORTH_ATLANTIC_THEATER,
  createNorthAtlanticHexGrid,
} from './NorthAtlanticTheaterData.ts';

// Genera derrotas comerciales entre puertos aliados con deriva lateral (±1 hex) para impedir memorizar subcuadrantes exactos

function isCellNavigableInGrid(
  grid: HexGridMap<StrategicMapCell>,
  coordinate: AxialCoordinate,
): boolean {
  const cell = grid.getCell(coordinate);
  return cell !== undefined && isNavigableStrategicTerrain(cell.terrain);
}

function applyLateralAnchorDrift(
  grid: HexGridMap<StrategicMapCell>,
  anchor: AxialCoordinate,
  anchorIndex: number,
  totalAnchors: number,
  driftSeed: number,
  allowDrift: boolean,
): AxialCoordinate {
  if (!allowDrift || anchorIndex === 0 || anchorIndex === totalAnchors - 1) {
    return anchor;
  }
  const signedOffset = ((Math.abs(driftSeed + anchorIndex * 7) % 3) - 1) as -1 | 0 | 1;
  if (signedOffset === 0) {
    return anchor;
  }
  const lateralDirection: HexDirection = signedOffset > 0 ? 1 : 4;
  const candidate = getHexNeighbor(anchor, lateralDirection);
  return isCellNavigableInGrid(grid, candidate) ? candidate : anchor;
}

function appendSegmentSteps(
  grid: HexGridMap<StrategicMapCell>,
  fromAnchor: AxialCoordinate,
  toAnchor: AxialCoordinate,
  accumulated: AxialCoordinate[],
): void {
  const rawSteps = interpolateHexLine(fromAnchor, toAnchor);
  for (let index = 0; index < rawSteps.length; index += 1) {
    const step = rawSteps[index]!;
    const previous = accumulated[accumulated.length - 1];
    if (previous !== undefined && areAxialCoordinatesEqual(previous, step)) {
      continue;
    }
    if (isCellNavigableInGrid(grid, step)) {
      accumulated.push(step);
    }
  }
}

export function buildDriftedCorridorWaypoints(
  grid: HexGridMap<StrategicMapCell>,
  corridor: CommercialRouteCorridor,
  driftSeed: number,
): readonly AxialCoordinate[] {
  const anchors = corridor.nominalWaypoints.map((anchor, index) =>
    applyLateralAnchorDrift(
      grid,
      anchor,
      index,
      corridor.nominalWaypoints.length,
      driftSeed,
      corridor.lateralDriftHexes === 1,
    ),
  );

  const waypoints: AxialCoordinate[] = [];
  for (let index = 0; index < anchors.length - 1; index += 1) {
    appendSegmentSteps(grid, anchors[index]!, anchors[index + 1]!, waypoints);
  }
  return waypoints.length > 0 ? waypoints : corridor.nominalWaypoints;
}

export function createCorridorMerchantContact(
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  ordinal: number,
  startProgressRatio = 0,
): StrategicContactState {
  const corridors = theater.routeCorridors ?? [];
  const catalog = theater.surfaceShipCatalog;
  const chosenSpec = catalog[ordinal % catalog.length]!;
  const chosenCorridor = corridors[ordinal % corridors.length]!;
  const waypoints = buildDriftedCorridorWaypoints(grid, chosenCorridor, ordinal * 13 + 3);
  const clampedIndex = Math.min(
    Math.max(0, Math.floor((waypoints.length - 1) * startProgressRatio)),
    Math.max(0, waypoints.length - 2),
  );
  const currentCoord = waypoints[clampedIndex]!;
  const nextCoord = waypoints[clampedIndex + 1] ?? currentCoord;

  return {
    contactId: `convoy_${ordinal + 1}`,
    shipSpecId: chosenSpec.specId,
    coordinate: currentCoord,
    heading: resolveAdjacentHexDirection(currentCoord, nextCoord, 0),
    isSunk: false,
    corridorId: chosenCorridor.corridorId,
    routeWaypoints: waypoints,
    waypointIndex: clampedIndex,
    hasReachedDestination: false,
    reinterceptCooldownTurns: 0,
  };
}

export function createInitialNorthAtlanticContacts(
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
): readonly StrategicContactState[] {
  return [
    createCorridorMerchantContact(grid, theater, 0, 0.35),
    createCorridorMerchantContact(grid, theater, 1, 0.25),
    createCorridorMerchantContact(grid, theater, 2, 0.4),
  ];
}

export function createInitialNorthAtlanticCampaignState(
  difficulty: DifficultyConfig = getDifficultyConfig('NORMAL'),
  existingGrid?: HexGridMap<StrategicMapCell>,
): CampaignState {
  const grid = existingGrid ?? createNorthAtlanticHexGrid();
  const subSpec = NORTH_ATLANTIC_THEATER.submarineCatalog[0]!;
  return {
    theaterId: NORTH_ATLANTIC_THEATER.theaterId,
    turnNumber: 1,
    timeScale: 'PATROL_4H',
    clock: { patrolNumber: 1, campaignDay: 1, hourOfDay: 8, timeOfDay: 'DAWN' },
    weather: 'CLEAR',
    weatherTurnsRemaining: 4,
    patrolStatus: 'ACTIVE',
    difficulty,
    submarine: {
      specId: subSpec.specId,
      coordinate: LORIENT_NORTH_ATLANTIC_COORDINATE,
      heading: 3,
      stance: 'SURFACED',
      depth: 'SURFACED',
      fuel: subSpec.maxFuel,
      battery: subSpec.maxBattery,
      hullIntegrity: subSpec.maxHullIntegrity,
      armory: createInitialTorpedoArmory(subSpec.bowTubeCount, subSpec.sternTubeCount, subSpec.initialReserveTorpedoes),
    },
    contacts: createInitialNorthAtlanticContacts(grid, NORTH_ATLANTIC_THEATER),
    visibleContactIds: [],
    hydrophoneContacts: [],
    activePatrolOrder: {
      orderId: 'order_patrol_1',
      targetSectorCode: 'BE 5',
      requiredWatchTurns: 6,
      completedWatchTurns: 0,
      isFulfilled: false,
    },
    deliveredRadiograms: [],
    queuedSubmergedRadiograms: [],
    patrolTorpedoesFired: 0,
    patrolTorpedoHits: 0,
    patrolSunkShipsCount: 0,
    patrolSunkTonnage: 0,
    totalSunkTonnage: 0,
    lastPatrolSummary: null,
  };
}
