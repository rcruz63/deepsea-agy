import type {
  CampaignState,
  EncounterResult,
  StrategicContactState,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import type { AxialCoordinate, HexGridMap } from '../../../core/hex/index.ts';
import {
  DEFAULT_ATLANTIC_WAYPOINTS,
  type StrategicMapCell,
} from './AtlanticSectorScenario.ts';
import { createCorridorMerchantContact } from './StrategicCorridorGenerator.ts';
import { clampStrategicResource } from './StrategicResourceRules.ts';
import { refreshCampaignSensorSuite } from './StrategicSensorSuite.ts';

// Aplica de forma pura el EncounterResult devuelto por las capas inferiores actualizando tonelaje, combustible, armería y sensores

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
  const nextHull = clampStrategicResource(
    state.submarine.hullIntegrity - result.hullDamageTaken,
  );
  const updatedContacts: StrategicContactState[] = state.contacts.map((contact) =>
    contact.contactId === result.contactId && result.isTargetSunk
      ? { ...contact, isSunk: true }
      : contact,
  );
  let nextRoutes = routesByContactId;

  if (result.isTargetSunk && theater.surfaceShipCatalog.length > 0) {
    const ordinal = updatedContacts.length;
    if ((theater.routeCorridors?.length ?? 0) > 0) {
      updatedContacts.push(createCorridorMerchantContact(grid, theater, ordinal, 0));
    } else {
      const nextSpec =
        theater.surfaceShipCatalog[ordinal % theater.surfaceShipCatalog.length]!;
      const wp =
        DEFAULT_ATLANTIC_WAYPOINTS[(ordinal * 3) % DEFAULT_ATLANTIC_WAYPOINTS.length]!;
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

  const rawNextState: CampaignState = {
    ...state,
    submarine: {
      ...state.submarine,
      hullIntegrity: nextHull,
      fuel: clampStrategicResource(result.updatedFuel),
      battery: clampStrategicResource(result.updatedBattery),
      armory: result.updatedArmory,
    },
    contacts: updatedContacts,
    patrolTorpedoesFired: state.patrolTorpedoesFired + result.torpedoesFiredInEncounter,
    patrolTorpedoHits: state.patrolTorpedoHits + result.torpedoHitsInEncounter,
    patrolSunkShipsCount: state.patrolSunkShipsCount + (result.isTargetSunk ? 1 : 0),
    patrolSunkTonnage: state.patrolSunkTonnage + result.sunkTonnageAwarded,
    totalSunkTonnage: state.totalSunkTonnage + result.sunkTonnageAwarded,
  };

  return {
    nextRoutes,
    nextState: refreshCampaignSensorSuite(rawNextState, 0, null),
  };
}
