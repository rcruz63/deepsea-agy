import { createInitialTorpedoArmory } from '../../../core/armory/index.ts';
import type {
  CampaignState,
  KriegstagebuchPatrolSummary,
  NavalBaseDefinition,
  StrategicContactState,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import { type HexGridMap, areAxialCoordinatesEqual } from '../../../core/hex/index.ts';
import type { StrategicMapCell } from './AtlanticSectorScenario.ts';
import { createNextBduPatrolOrder } from './BduRadiogramController.ts';
import { createCorridorMerchantContact } from './StrategicCorridorGenerator.ts';
import { refreshCampaignSensorSuite } from './StrategicSensorSuite.ts';

// Gobierna el atraque en bases amigas, el cálculo de dique seco/rearme, el informe KTB y el zarpe a la siguiente patrulla

export const BASE_REFIT_DAYS = 14;
export const TOWED_RESCUE_PENALTY_DAYS = 10;

export function findNavalBaseAtCoordinate(
  coordinate: CampaignState['submarine']['coordinate'],
  theater: TheaterDefinition,
): NavalBaseDefinition | undefined {
  return theater.bases.find((base) => areAxialCoordinatesEqual(base.coordinate, coordinate));
}

export function canDockAtNavalBase(
  state: CampaignState,
  theater: TheaterDefinition,
): boolean {
  if (state.patrolStatus !== 'ACTIVE' || state.turnNumber <= 1) {
    return false;
  }
  return findNavalBaseAtCoordinate(state.submarine.coordinate, theater) !== undefined;
}

export function calculatePatrolRefitDays(
  state: CampaignState,
  endReason: 'RETURNED_TO_BASE' | 'ABORTED_AT_SEA',
): number {
  const hullRepairDays = Math.ceil((100 - state.submarine.hullIntegrity) / 10) * 2;
  const torpedoRestockDays = Math.ceil(state.patrolTorpedoesFired / 4);
  const rescuePenalty = endReason === 'ABORTED_AT_SEA' ? TOWED_RESCUE_PENALTY_DAYS : 0;
  return BASE_REFIT_DAYS + hullRepairDays + torpedoRestockDays + rescuePenalty;
}

export function buildKriegstagebuchSummary(
  state: CampaignState,
  theater: TheaterDefinition,
  endReason: 'RETURNED_TO_BASE' | 'ABORTED_AT_SEA',
): KriegstagebuchPatrolSummary {
  const dockedBase = findNavalBaseAtCoordinate(state.submarine.coordinate, theater);
  const fallbackBase = theater.bases[1] ?? theater.bases[0];
  const daysAtSea = Math.max(1, Math.ceil((state.turnNumber - 1) / 6));

  return {
    patrolNumber: state.clock.patrolNumber,
    baseName: dockedBase?.name ?? fallbackBase?.name ?? 'Lorient',
    daysAtSea,
    refitDaysAdded: calculatePatrolRefitDays(state, endReason),
    patrolOrderFulfilled: state.activePatrolOrder?.isFulfilled ?? false,
    shipsSunkCount: state.patrolSunkShipsCount,
    patrolSunkTonnage: state.patrolSunkTonnage,
    careerSunkTonnage: state.totalSunkTonnage,
    torpedoesFired: state.patrolTorpedoesFired,
    torpedoHits: state.patrolTorpedoHits,
    endReason,
  };
}

export function dockSubmarineAtNavalBase(
  state: CampaignState,
  theater: TheaterDefinition,
): CampaignState {
  if (!canDockAtNavalBase(state, theater)) {
    throw new Error('El U-Boot debe encontrarse en una base naval propia tras haber zarpado.');
  }
  return {
    ...state,
    patrolStatus: 'DOCKED_AT_BASE',
    timeScale: 'PATROL_4H',
    lastPatrolSummary: buildKriegstagebuchSummary(state, theater, 'RETURNED_TO_BASE'),
  };
}

function createFreshPatrolCorridorTraffic(
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  patrolNumber: number,
): readonly StrategicContactState[] {
  if ((theater.routeCorridors?.length ?? 0) === 0) {
    return [];
  }
  const seedBase = patrolNumber * 5;
  return [
    createCorridorMerchantContact(grid, theater, seedBase, 0.3),
    createCorridorMerchantContact(grid, theater, seedBase + 1, 0.2),
    createCorridorMerchantContact(grid, theater, seedBase + 2, 0.45),
  ];
}

export function prepareNextCampaignPatrol(
  state: CampaignState,
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
): CampaignState {
  if (state.patrolStatus === 'ACTIVE') {
    throw new Error('No se puede iniciar una nueva patrulla mientras la actual sigue en curso.');
  }
  const summary =
    state.lastPatrolSummary ??
    buildKriegstagebuchSummary(state, theater, 'RETURNED_TO_BASE');
  const subSpec = theater.submarineCatalog[0]!;
  const dockedBase = findNavalBaseAtCoordinate(state.submarine.coordinate, theater);
  const departureCoord =
    state.patrolStatus === 'DOCKED_AT_BASE' && dockedBase !== undefined
      ? dockedBase.coordinate
      : (theater.bases[1]?.coordinate ?? theater.bases[0]!.coordinate);
  const nextPatrolNum = state.clock.patrolNumber + 1;
  const freshContacts = createFreshPatrolCorridorTraffic(grid, theater, nextPatrolNum);

  const restoredState: CampaignState = {
    ...state,
    turnNumber: 1,
    timeScale: 'PATROL_4H',
    clock: {
      patrolNumber: nextPatrolNum,
      campaignDay: state.clock.campaignDay + summary.refitDaysAdded,
      hourOfDay: 8,
      timeOfDay: 'DAWN',
    },
    weather: 'CLEAR',
    weatherTurnsRemaining: 4,
    patrolStatus: 'ACTIVE',
    submarine: {
      ...state.submarine,
      coordinate: departureCoord,
      heading: 3,
      stance: 'SURFACED',
      depth: 'SURFACED',
      fuel: subSpec.maxFuel,
      battery: subSpec.maxBattery,
      hullIntegrity: subSpec.maxHullIntegrity,
      armory: createInitialTorpedoArmory(
        subSpec.bowTubeCount,
        subSpec.sternTubeCount,
        subSpec.initialReserveTorpedoes,
      ),
    },
    contacts: freshContacts.length > 0 ? freshContacts : state.contacts,
    activePatrolOrder: createNextBduPatrolOrder(nextPatrolNum - 1),
    deliveredRadiograms: [],
    queuedSubmergedRadiograms: [],
    patrolTorpedoesFired: 0,
    patrolTorpedoHits: 0,
    patrolSunkShipsCount: 0,
    patrolSunkTonnage: 0,
    lastPatrolSummary: null,
  };

  return refreshCampaignSensorSuite(restoredState, 0, null);
}
