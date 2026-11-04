import type {
  CampaignState,
  EncounterContext,
  StrategicContactState,
  SurfaceShipSpec,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  areAxialCoordinatesEqual,
  calculateHexDistance,
} from '../../../core/hex/index.ts';
import type { StrategicMapCell } from './AtlanticSectorScenario.ts';
import { createCorridorMerchantContact } from './StrategicCorridorGenerator.ts';
import { resolveAdjacentHexDirection } from './StrategicMovementNavigator.ts';

// Gestiona el avance de convoyes por corredores transatlánticos y evalúa la condición de intercepción (distancia <= 1 sin enfriamiento)

export const STRATEGIC_INTERCEPTION_RANGE_HEXES = 1;

function findWaypointIndex(
  route: readonly AxialCoordinate[],
  coordinate: AxialCoordinate,
): number {
  return route.findIndex((waypoint) => areAxialCoordinatesEqual(waypoint, coordinate));
}

function advanceAlongCorridorWaypoints(
  contact: StrategicContactState,
): StrategicContactState {
  const waypoints = contact.routeWaypoints!;
  const nextCooldown = Math.max(0, (contact.reinterceptCooldownTurns ?? 0) - 1);
  if (contact.isSunk || contact.hasReachedDestination || waypoints.length === 0) {
    return { ...contact, reinterceptCooldownTurns: nextCooldown };
  }

  const nextIndex = (contact.waypointIndex ?? 0) + 1;
  if (nextIndex >= waypoints.length) {
    return { ...contact, hasReachedDestination: true, reinterceptCooldownTurns: 0 };
  }

  const nextCoordinate = waypoints[nextIndex]!;
  return {
    ...contact,
    coordinate: nextCoordinate,
    heading: resolveAdjacentHexDirection(contact.coordinate, nextCoordinate, contact.heading),
    waypointIndex: nextIndex,
    reinterceptCooldownTurns: nextCooldown,
  };
}

export function advanceSingleMerchantContact(
  contact: StrategicContactState,
  route: readonly AxialCoordinate[] | undefined,
): StrategicContactState {
  if (contact.routeWaypoints !== undefined) {
    return advanceAlongCorridorWaypoints(contact);
  }
  const nextCooldown = Math.max(0, (contact.reinterceptCooldownTurns ?? 0) - 1);
  if (contact.isSunk || route === undefined || route.length === 0) {
    return { ...contact, reinterceptCooldownTurns: nextCooldown };
  }

  const currentWaypointIndex = findWaypointIndex(route, contact.coordinate);
  const nextWaypointIndex =
    currentWaypointIndex === -1 ? 0 : (currentWaypointIndex + 1) % route.length;
  const nextCoordinate = route[nextWaypointIndex]!;
  return {
    ...contact,
    coordinate: nextCoordinate,
    heading: resolveAdjacentHexDirection(contact.coordinate, nextCoordinate, contact.heading),
    reinterceptCooldownTurns: nextCooldown,
  };
}

export function advanceAllStrategicContacts(
  contacts: readonly StrategicContactState[],
  routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>,
  grid?: HexGridMap<StrategicMapCell>,
  theater?: TheaterDefinition,
): readonly StrategicContactState[] {
  const stepped = contacts.map((contact) =>
    advanceSingleMerchantContact(contact, routesByContactId[contact.contactId]),
  );
  if (grid === undefined || theater === undefined || (theater.routeCorridors?.length ?? 0) === 0) {
    return stepped;
  }

  const activeCount = stepped.filter((c) => !c.isSunk && !c.hasReachedDestination).length;
  return activeCount >= 3
    ? stepped
    : [...stepped, createCorridorMerchantContact(grid, theater, stepped.length, 0)];
}

export function findInterceptableMerchant(
  submarineCoordinate: AxialCoordinate,
  contacts: readonly StrategicContactState[],
  visibleContactIds?: readonly string[],
  isSubmerged = false,
): StrategicContactState | undefined {
  return contacts.find((contact) => {
    if (
      contact.isSunk ||
      contact.hasReachedDestination ||
      (contact.reinterceptCooldownTurns ?? 0) > 0
    ) {
      return false;
    }
    const distance = calculateHexDistance(submarineCoordinate, contact.coordinate);
    if (distance > STRATEGIC_INTERCEPTION_RANGE_HEXES) {
      return false;
    }
    // En la misma casilla (dist 0) o sumergido con hidrófono a corta distancia siempre se detecta; a 1 hex en superficie exige visibilidad
    if (visibleContactIds === undefined || distance === 0 || isSubmerged) {
      return true;
    }
    return visibleContactIds.includes(contact.contactId);
  });
}

function resolveSurfaceShipSpec(
  theater: TheaterDefinition,
  shipSpecId: string,
): SurfaceShipSpec {
  const spec = theater.surfaceShipCatalog.find((entry) => entry.specId === shipSpecId);
  if (spec === undefined) {
    throw new Error(`No existe la especificación "${shipSpecId}" en "${theater.theaterId}".`);
  }
  return spec;
}

export function buildStrategicEncounterContext(
  campaignState: CampaignState,
  theater: TheaterDefinition,
  targetContact: StrategicContactState,
): EncounterContext {
  const shipSpec = resolveSurfaceShipSpec(theater, targetContact.shipSpecId);
  const rawDistance = calculateHexDistance(
    campaignState.submarine.coordinate,
    targetContact.coordinate,
  );
  const interceptionDistanceHexes: 0 | 1 = rawDistance === 0 ? 0 : 1;
  const approachDirection = resolveAdjacentHexDirection(
    targetContact.coordinate,
    campaignState.submarine.coordinate,
    campaignState.submarine.heading,
  );
  const primarySnapshot = {
    contactId: targetContact.contactId,
    spec: shipSpec,
    heading: targetContact.heading,
    speedKnots: shipSpec.cruiseSpeedKnots,
  };
  return {
    submarine: campaignState.submarine,
    difficulty: campaignState.difficulty,
    ships: [primarySnapshot],
    targetShip: primarySnapshot,
    timeOfDay: campaignState.clock.timeOfDay,
    weather: campaignState.weather,
    interceptionDistanceHexes,
    approachDirection,
  };
}
