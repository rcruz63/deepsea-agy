import type {
  CampaignState,
  EncounterContext,
  StrategicContactState,
  SurfaceShipSpec,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  areAxialCoordinatesEqual,
  calculateHexDistance,
} from '../../../core/hex/index.ts';
import { resolveAdjacentHexDirection } from './StrategicMovementNavigator.ts';

// Gestiona el avance de convoyes/mercantes por sus rutas de tránsito y evalúa la condición de intercepción (distancia axial <= 1)

export const STRATEGIC_INTERCEPTION_RANGE_HEXES = 1;

function findWaypointIndex(
  route: readonly AxialCoordinate[],
  coordinate: AxialCoordinate,
): number {
  return route.findIndex((waypoint) => areAxialCoordinatesEqual(waypoint, coordinate));
}

export function advanceSingleMerchantContact(
  contact: StrategicContactState,
  route: readonly AxialCoordinate[] | undefined,
): StrategicContactState {
  if (contact.isSunk || route === undefined || route.length === 0) {
    return contact;
  }

  const currentWaypointIndex = findWaypointIndex(route, contact.coordinate);
  const nextWaypointIndex =
    currentWaypointIndex === -1 ? 0 : (currentWaypointIndex + 1) % route.length;
  const nextCoordinate = route[nextWaypointIndex]!;
  const nextHeading = resolveAdjacentHexDirection(
    contact.coordinate,
    nextCoordinate,
    contact.heading,
  );

  return {
    ...contact,
    coordinate: nextCoordinate,
    heading: nextHeading,
  };
}

export function advanceAllStrategicContacts(
  contacts: readonly StrategicContactState[],
  routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>,
): readonly StrategicContactState[] {
  return contacts.map((contact) =>
    advanceSingleMerchantContact(contact, routesByContactId[contact.contactId]),
  );
}

export function findInterceptableMerchant(
  submarineCoordinate: AxialCoordinate,
  contacts: readonly StrategicContactState[],
): StrategicContactState | undefined {
  return contacts.find(
    (contact) =>
      !contact.isSunk &&
      calculateHexDistance(submarineCoordinate, contact.coordinate) <=
        STRATEGIC_INTERCEPTION_RANGE_HEXES,
  );
}

function resolveSurfaceShipSpec(
  theater: TheaterDefinition,
  shipSpecId: string,
): SurfaceShipSpec {
  const spec = theater.surfaceShipCatalog.find((entry) => entry.specId === shipSpecId);
  if (spec === undefined) {
    throw new Error(
      `No existe la especificación de buque "${shipSpecId}" en el teatro "${theater.theaterId}".`,
    );
  }
  return spec;
}

export function buildStrategicEncounterContext(
  campaignState: CampaignState,
  theater: TheaterDefinition,
  targetContact: StrategicContactState,
): EncounterContext {
  const shipSpec = resolveSurfaceShipSpec(theater, targetContact.shipSpecId);
  return {
    submarine: campaignState.submarine,
    difficulty: campaignState.difficulty,
    targetShip: {
      contactId: targetContact.contactId,
      spec: shipSpec,
      heading: targetContact.heading,
      speedKnots: shipSpec.cruiseSpeedKnots,
    },
  };
}
