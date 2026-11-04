import type {
  BduPatrolOrder,
  BduRadiogramReport,
  CampaignState,
  NavigationStance,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  isCoordinateInsidePatrolSector,
  resolveMarineQuadrat,
} from '../../../core/hex/index.ts';
import {
  type StrategicMapCell,
  isNavigableStrategicTerrain,
} from './AtlanticSectorScenario.ts';

// Gestiona órdenes de sector del BdU y reportes de radio con radio de incertidumbre (1..3 hex) retenidos durante la inmersión

export const RADIOGRAM_EXPIRATION_WATCH_TURNS = 6;
export const RADIOGRAM_EMISSION_INTERVAL_TURNS = 3;

export const BDU_HUNTING_SECTORS_POOL: readonly string[] = [
  'BE 5',
  'AL 4',
  'AK 6',
  'BD 5',
  'AL 5',
  'CF 2',
];

export function createNextBduPatrolOrder(orderOrdinal: number): BduPatrolOrder {
  const sector =
    BDU_HUNTING_SECTORS_POOL[orderOrdinal % BDU_HUNTING_SECTORS_POOL.length]!;
  return {
    orderId: `order_patrol_${orderOrdinal + 1}`,
    targetSectorCode: sector,
    requiredWatchTurns: 6,
    completedWatchTurns: 0,
    isFulfilled: false,
  };
}

export function advanceBduPatrolOrderProgress(
  order: BduPatrolOrder | null,
  submarineCoordinate: AxialCoordinate,
  theater: TheaterDefinition,
): BduPatrolOrder | null {
  if (order === null || order.isFulfilled || theater.marineQuadratSpec === undefined) {
    return order;
  }
  const isInside = isCoordinateInsidePatrolSector(
    submarineCoordinate,
    order.targetSectorCode,
    theater.marineQuadratSpec,
  );
  if (!isInside) {
    return order;
  }
  const nextCompleted = order.completedWatchTurns + 1;
  return {
    ...order,
    completedWatchTurns: nextCompleted,
    isFulfilled: nextCompleted >= order.requiredWatchTurns,
  };
}

export function maybeGenerateBduSightingReport(
  state: CampaignState,
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  rollZeroToOne: number,
): BduRadiogramReport | null {
  if (
    theater.marineQuadratSpec === undefined ||
    state.turnNumber % RADIOGRAM_EMISSION_INTERVAL_TURNS !== 0
  ) {
    return null;
  }
  const activeContacts = state.contacts.filter(
    (c) => !c.isSunk && !c.hasReachedDestination,
  );
  if (activeContacts.length === 0) {
    return null;
  }

  const pickIndex =
    Math.floor(state.turnNumber / RADIOGRAM_EMISSION_INTERVAL_TURNS) %
    activeContacts.length;
  const target = activeContacts[pickIndex]!;
  const radius = state.difficulty.strategicUncertaintyRadiusHexes;
  const candidates = grid.getCellsWithinRadius(
    target.coordinate,
    radius,
    (cell) => isNavigableStrategicTerrain(cell.terrain),
  );
  const clampedRoll = Math.max(0, Math.min(0.9999, rollZeroToOne));
  const displacedCell =
    candidates[Math.floor(clampedRoll * candidates.length)]?.coordinate ??
    target.coordinate;
  const quadrat = resolveMarineQuadrat(displacedCell, theater.marineQuadratSpec);

  return {
    reportId: `bdu_msg_t${state.turnNumber}`,
    reportedQuadratCode: quadrat?.fullCode ?? 'UNKNOWN',
    centerCoordinate: displacedCell,
    uncertaintyRadiusHexes: radius,
    estimatedHeading: target.heading,
    createdAtTurn: state.turnNumber,
    expiresAtTurn: state.turnNumber + RADIOGRAM_EXPIRATION_WATCH_TURNS,
  };
}

export function routeAndExpireBduRadiograms(
  delivered: readonly BduRadiogramReport[],
  queuedSubmerged: readonly BduRadiogramReport[],
  incomingReport: BduRadiogramReport | null,
  currentStance: NavigationStance,
  currentTurn: number,
): {
  readonly deliveredRadiograms: readonly BduRadiogramReport[];
  readonly queuedSubmergedRadiograms: readonly BduRadiogramReport[];
} {
  const validDelivered = delivered.filter((r) => r.expiresAtTurn > currentTurn);
  const validQueued = queuedSubmerged.filter((r) => r.expiresAtTurn > currentTurn);

  // Bajo el agua no se recibe onda de mando; los avisos quedan pendientes hasta que la antena emerge a superficie
  if (currentStance === 'SUBMERGED') {
    return {
      deliveredRadiograms: validDelivered,
      queuedSubmergedRadiograms:
        incomingReport !== null ? [...validQueued, incomingReport] : validQueued,
    };
  }

  return {
    deliveredRadiograms: [
      ...validDelivered,
      ...validQueued,
      ...(incomingReport !== null ? [incomingReport] : []),
    ],
    queuedSubmergedRadiograms: [],
  };
}
