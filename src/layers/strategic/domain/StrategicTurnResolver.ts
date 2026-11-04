import type { CampaignState, TheaterDefinition } from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  areAxialCoordinatesEqual,
  calculateHexDistance,
  isCoordinateInsidePatrolSector,
  resolveAdjacentHexDirection,
} from '../../../core/hex/index.ts';
import type { StrategicMapCell } from './AtlanticSectorScenario.ts';
import {
  advanceBduPatrolOrderProgress,
  maybeGenerateBduSightingReport,
} from './BduRadiogramController.ts';
import { buildKriegstagebuchSummary } from './PatrolRefitRules.ts';
import {
  advancePatrolClockFourHours,
  advanceWeatherState,
} from './StrategicEnvironmentRules.ts';
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
import { refreshCampaignSensorSuite } from './StrategicSensorSuite.ts';
import {
  MAX_ECONOMICAL_TRANSIT_STEPS,
  WATCHES_PER_TWENTY_FOUR_HOURS,
} from './StrategicTransitPathfinder.ts';

// Orquesta cada guardia de 4h (reloj, clima, sensores, BdU) y los 6 sub-ticks de TRÁNSITO 24H con auto-drop

const NEARBY_RADIOGRAM_INTERRUPT_HEXES = 6;

function isOnFriendlyNavalBase(coord: AxialCoordinate, theater: TheaterDefinition): boolean {
  return theater.bases.some((base) => areAxialCoordinatesEqual(base.coordinate, coord));
}

export function resolveSingleWatchStep(
  state: CampaignState,
  selectedOption: ReachableHexOption,
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
  routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>,
  randomRoll = 0.5,
): CampaignState {
  const movedSub = applyStrategicMovementEnergy(state.submarine, selectedOption);
  const reloadedArmory = completeStrategicTurnArmoryReload(movedSub.armory, state.difficulty);
  const updatedSubmarine = { ...movedSub, armory: reloadedArmory };
  const nextTurnNumber = state.turnNumber + 1;
  const nextClock = advancePatrolClockFourHours(state.clock);
  const nextWeather = advanceWeatherState(state.weather, state.weatherTurnsRemaining, randomRoll);
  const updatedContacts = advanceAllStrategicContacts(
    state.contacts,
    routesByContactId,
    grid,
    theater,
  );
  const nextOrder = advanceBduPatrolOrderProgress(
    state.activePatrolOrder,
    updatedSubmarine.coordinate,
    theater,
  );
  const stranded = isSubmarineStrandedAtSea(
    updatedSubmarine,
    isOnFriendlyNavalBase(updatedSubmarine.coordinate, theater),
  );

  const steppedState: CampaignState = {
    ...state,
    turnNumber: nextTurnNumber,
    clock: nextClock,
    weather: nextWeather.weather,
    weatherTurnsRemaining: nextWeather.weatherTurnsRemaining,
    patrolStatus: stranded ? 'ABORTED_AT_SEA' : state.patrolStatus,
    submarine: updatedSubmarine,
    contacts: updatedContacts,
    activePatrolOrder: nextOrder,
  };
  const withSummary: CampaignState =
    stranded && steppedState.lastPatrolSummary === null
      ? {
          ...steppedState,
          lastPatrolSummary: buildKriegstagebuchSummary(steppedState, theater, 'ABORTED_AT_SEA'),
        }
      : steppedState;
  const newReport = maybeGenerateBduSightingReport(withSummary, grid, theater, randomRoll);
  return refreshCampaignSensorSuite(withSummary, selectedOption.stepDistance, newReport);
}

function shouldInterruptTwentyFourHourTransit(
  state: CampaignState,
  theater: TheaterDefinition,
): boolean {
  if (state.patrolStatus !== 'ACTIVE' || state.visibleContactIds.length > 0) {
    return true;
  }
  if (
    findInterceptableMerchant(
      state.submarine.coordinate,
      state.contacts,
      state.visibleContactIds,
      false,
    ) !== undefined
  ) {
    return true;
  }
  const hasNearbyFreshRadiogram = state.deliveredRadiograms.some(
    (r) =>
      r.createdAtTurn === state.turnNumber &&
      calculateHexDistance(state.submarine.coordinate, r.centerCoordinate) <=
        NEARBY_RADIOGRAM_INTERRUPT_HEXES,
  );
  if (hasNearbyFreshRadiogram) {
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
  randomProvider: () => number = () => 0.5,
): CampaignState {
  const steps = selectedOption.pathSteps ?? [];
  const isForced = steps.length > MAX_ECONOMICAL_TRANSIT_STEPS;
  const totalTicks = Math.max(WATCHES_PER_TWENTY_FOUR_HOURS, steps.length);
  const perStepFuel = isForced ? -FORCED_TRANSIT_FUEL_PER_HEX : -ECONOMICAL_SURFACED_FUEL_PER_HEX;

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
      randomProvider(),
    );
    if (shouldInterruptTwentyFourHourTransit(currentState, theater)) {
      return { ...currentState, timeScale: 'PATROL_4H' };
    }
  }
  return currentState;
}
