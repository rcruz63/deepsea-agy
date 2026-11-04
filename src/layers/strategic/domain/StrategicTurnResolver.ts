import type {
  CampaignState,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  areAxialCoordinatesEqual,
  isCoordinateInsidePatrolSector,
  resolveAdjacentHexDirection,
} from '../../../core/hex/index.ts';
import type { StrategicMapCell } from './AtlanticSectorScenario.ts';
import {
  advanceAllStrategicContacts,
  findInterceptableMerchant,
} from './StrategicMerchantController.ts';
import type { ReachableHexOption } from './StrategicMovementNavigator.ts';
import {
  ECONOMICAL_SURFACED_FUEL_PER_HEX,
  FORCED_TRANSIT_FUEL_PER_HEX,
  STATIONARY_SURFACED_FUEL_COST,
  applyStrategicMovementEnergy,
  completeStrategicTurnArmoryReload,
  isSubmarineStrandedAtSea,
} from './StrategicResourceRules.ts';
import {
  MAX_ECONOMICAL_TRANSIT_STEPS,
  WATCHES_PER_TWENTY_FOUR_HOURS,
} from './StrategicTransitPathfinder.ts';

// Orquesta el avance por guardia de 4h y la resolución paso a paso de TRÁNSITO 24H con interrupción automática (auto-drop)

function isOnFriendlyNavalBase(
  coordinate: AxialCoordinate,
  theater: TheaterDefinition,
): boolean {
  return theater.bases.some((base) => areAxialCoordinatesEqual(base.coordinate, coordinate));
}

export function resolveSingleWatchStep(
  state: CampaignState,
  selectedOption: ReachableHexOption,
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>,
): CampaignState {
  const movedSubmarine = applyStrategicMovementEnergy(state.submarine, selectedOption);
  const reloadedArmory = completeStrategicTurnArmoryReload(
    movedSubmarine.armory,
    state.difficulty,
  );
  const updatedSubmarine = { ...movedSubmarine, armory: reloadedArmory };
  const updatedContacts = advanceAllStrategicContacts(
    state.contacts,
    routesByContactId,
    grid,
    theater,
  );
  const stranded = isSubmarineStrandedAtSea(
    updatedSubmarine,
    isOnFriendlyNavalBase(updatedSubmarine.coordinate, theater),
  );

  return {
    ...state,
    turnNumber: state.turnNumber + 1,
    patrolStatus: stranded ? 'ABORTED_AT_SEA' : state.patrolStatus,
    submarine: updatedSubmarine,
    contacts: updatedContacts,
  };
}

function shouldInterruptTwentyFourHourTransit(
  state: CampaignState,
  theater: TheaterDefinition,
): boolean {
  if (state.patrolStatus !== 'ACTIVE') {
    return true;
  }
  if (findInterceptableMerchant(state.submarine.coordinate, state.contacts) !== undefined) {
    return true;
  }
  const order = state.activePatrolOrder;
  return (
    order !== null &&
    !order.isFulfilled &&
    theater.marineQuadratSpec !== undefined &&
    isCoordinateInsidePatrolSector(
      state.submarine.coordinate,
      order.targetSectorCode,
      theater.marineQuadratSpec,
    )
  );
}

export function resolveTwentyFourHourTransitMove(
  initialState: CampaignState,
  selectedOption: ReachableHexOption,
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>,
): CampaignState {
  const steps = selectedOption.pathSteps ?? [];
  const isForced = steps.length > MAX_ECONOMICAL_TRANSIT_STEPS;
  const totalTicks = Math.max(WATCHES_PER_TWENTY_FOUR_HOURS, steps.length);
  const perStepFuel = isForced
    ? -FORCED_TRANSIT_FUEL_PER_HEX
    : -ECONOMICAL_SURFACED_FUEL_PER_HEX;

  let currentState = initialState;
  for (let tickIndex = 0; tickIndex < totalTicks; tickIndex += 1) {
    const nextCoord = steps[tickIndex] ?? currentState.submarine.coordinate;
    const isMoving = tickIndex < steps.length;
    const stepOption: ReachableHexOption = {
      coordinate: nextCoord,
      stepDistance: isMoving ? 1 : 0,
      fuelDelta: isMoving ? perStepFuel : -STATIONARY_SURFACED_FUEL_COST,
      batteryDelta: isMoving ? 20 : 30,
      resultingHeading: isMoving
        ? resolveAdjacentHexDirection(
            currentState.submarine.coordinate,
            nextCoord,
            currentState.submarine.heading,
          )
        : currentState.submarine.heading,
    };

    currentState = resolveSingleWatchStep(
      currentState,
      stepOption,
      grid,
      theater,
      routesByContactId,
    );
    if (shouldInterruptTwentyFourHourTransit(currentState, theater)) {
      return { ...currentState, timeScale: 'PATROL_4H' };
    }
  }

  return currentState;
}
