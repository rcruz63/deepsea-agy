import type {
  CampaignState,
  EncounterResult,
  StrategicContactState,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import { type AxialCoordinate, type HexGridMap, areAxialCoordinatesEqual } from '../../../core/hex/index.ts';
import {
  DEFAULT_ATLANTIC_WAYPOINTS,
  type StrategicMapCell,
} from './AtlanticSectorScenario.ts';
import { buildKriegstagebuchSummary } from './PatrolRefitRules.ts';
import { createCorridorMerchantContact } from './StrategicCorridorGenerator.ts';
import { advanceSingleMerchantContact } from './StrategicMerchantController.ts';
import { clampStrategicResource, isSubmarineStrandedAtSea } from './StrategicResourceRules.ts';
import { refreshCampaignSensorSuite } from './StrategicSensorSuite.ts';

// Aplica el EncounterResult devuelto por las capas inferiores: persiste energía/armería y aleja +1 hex al contacto escapado

function resolveUpdatedContactAfterEncounter(
  contact: StrategicContactState,
  result: EncounterResult,
  route: readonly AxialCoordinate[] | undefined,
): StrategicContactState {
  if (contact.contactId !== result.contactId) {
    return contact;
  }
  if (result.isTargetSunk || result.sunkShipIds.includes(contact.contactId)) {
    return { ...contact, isSunk: true, reinterceptCooldownTurns: 0 };
  }
  // Si el mercante escapa o se rompe contacto, gana +1 hex de ventaja y 1 guardia de enfriamiento contra re-intercepción gratuita
  const stepped = advanceSingleMerchantContact(contact, route);
  return { ...stepped, reinterceptCooldownTurns: 1 };
}

export function applyEncounterOutcomeToCampaign(
  state: CampaignState,
  result: EncounterResult,
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>,
): {
  readonly nextState: CampaignState;
  readonly nextRoutes: Readonly<Record<string, readonly AxialCoordinate[]>>;
} {
  const nextHull = clampStrategicResource(state.submarine.hullIntegrity - result.hullDamageTaken);
  const updatedContacts: StrategicContactState[] = state.contacts.map((contact) =>
    resolveUpdatedContactAfterEncounter(contact, result, routesByContactId[contact.contactId]),
  );
  let nextRoutes = routesByContactId;

  if (result.isTargetSunk && theater.surfaceShipCatalog.length > 0) {
    const ordinal = updatedContacts.length;
    if ((theater.routeCorridors?.length ?? 0) > 0) {
      updatedContacts.push(createCorridorMerchantContact(grid, theater, ordinal, 0));
    } else {
      const nextSpec = theater.surfaceShipCatalog[ordinal % theater.surfaceShipCatalog.length]!;
      const wp = DEFAULT_ATLANTIC_WAYPOINTS[(ordinal * 3) % DEFAULT_ATLANTIC_WAYPOINTS.length]!;
      const newId = `merchant_${ordinal + 1}`;
      nextRoutes = { ...nextRoutes, [newId]: DEFAULT_ATLANTIC_WAYPOINTS };
      updatedContacts.push({
        contactId: newId,
        shipSpecId: nextSpec.specId,
        coordinate: wp,
        heading: 0,
        isSunk: false,
      });
    }
  }

  const nextSubmarine = {
    ...state.submarine,
    hullIntegrity: nextHull,
    fuel: clampStrategicResource(result.updatedFuel),
    battery: clampStrategicResource(result.updatedBattery),
    armory: result.updatedArmory,
  };
  const isAtBase = theater.bases.some((b) => areAxialCoordinatesEqual(b.coordinate, nextSubmarine.coordinate));
  const stranded = isSubmarineStrandedAtSea(nextSubmarine, isAtBase);

  const rawNextState: CampaignState = {
    ...state,
    patrolStatus: stranded ? 'ABORTED_AT_SEA' : state.patrolStatus,
    submarine: nextSubmarine,
    contacts: updatedContacts,
    patrolTorpedoesFired: state.patrolTorpedoesFired + result.torpedoesFiredInEncounter,
    patrolTorpedoHits: state.patrolTorpedoHits + result.torpedoHitsInEncounter,
    patrolSunkShipsCount: state.patrolSunkShipsCount + (result.isTargetSunk ? 1 : 0),
    patrolSunkTonnage: state.patrolSunkTonnage + result.sunkTonnageAwarded,
    totalSunkTonnage: state.totalSunkTonnage + result.sunkTonnageAwarded,
  };

  const withSummary: CampaignState =
    stranded && rawNextState.lastPatrolSummary === null
      ? {
          ...rawNextState,
          lastPatrolSummary: buildKriegstagebuchSummary(rawNextState, theater, 'ABORTED_AT_SEA'),
        }
      : rawNextState;

  return {
    nextRoutes,
    nextState: refreshCampaignSensorSuite(withSummary, 0, null),
  };
}
