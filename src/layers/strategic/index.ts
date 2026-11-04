export {
  ATLANTIC_MERCHANT_ROUTES,
  ATLANTIC_SECTOR_THEATER,
  LORIENT_BASE_COORDINATE,
  createAtlanticHexGrid,
  createInitialAtlanticCampaignState,
  isNavigableStrategicTerrain,
} from './domain/AtlanticSectorScenario.ts';
export type { StrategicMapCell } from './domain/AtlanticSectorScenario.ts';

export {
  ALLIED_PORTS,
  AXIS_NAVAL_BASES,
  BREST_BASE_COORDINATE,
  GIBRALTAR_PORT_COORDINATE,
  HALIFAX_PORT_COORDINATE,
  LIVERPOOL_PORT_COORDINATE,
  LORIENT_NORTH_ATLANTIC_COORDINATE,
  NORTH_ATLANTIC_CORRIDORS,
  NORTH_ATLANTIC_THEATER,
  SAINT_NAZAIRE_BASE_COORDINATE,
  createNorthAtlanticHexGrid,
} from './domain/NorthAtlanticTheaterData.ts';

export {
  buildDriftedCorridorWaypoints,
  createCorridorMerchantContact,
  createInitialNorthAtlanticCampaignState,
  createInitialNorthAtlanticContacts,
} from './domain/StrategicCorridorGenerator.ts';

export {
  calculateReachableStrategicHexes,
  getMovementEnergyDelta,
  resolveAdjacentHexDirection,
} from './domain/StrategicMovementNavigator.ts';
export type {
  ReachableHexOption,
  StrategicStepDistance,
} from './domain/StrategicMovementNavigator.ts';

export {
  ECONOMICAL_SURFACED_FUEL_PER_HEX,
  FLANK_PATROL_FOUR_HOUR_FUEL_COST,
  FORCED_TRANSIT_FUEL_PER_HEX,
  MAX_RESOURCE_PERCENTAGE,
  MIN_RESOURCE_PERCENTAGE,
  STATIONARY_SURFACED_FUEL_COST,
  applyStrategicMovementEnergy,
  canSubmergeSubmarine,
  clampStrategicResource,
  completeStrategicTurnArmoryReload,
  isSubmarineStrandedAtSea,
  roundStrategicDecimal,
  switchStrategicSubmarineStance,
} from './domain/StrategicResourceRules.ts';

export {
  MAX_ECONOMICAL_TRANSIT_STEPS,
  MAX_FORCED_TRANSIT_STEPS,
  WATCHES_PER_TWENTY_FOUR_HOURS,
  calculateReachableTransitRoutes,
  calculateTwentyFourHourTransitFuelDelta,
} from './domain/StrategicTransitPathfinder.ts';
export type { TransitRouteNode } from './domain/StrategicTransitPathfinder.ts';

export {
  STRATEGIC_INTERCEPTION_RANGE_HEXES,
  advanceAllStrategicContacts,
  advanceSingleMerchantContact,
  buildStrategicEncounterContext,
  findInterceptableMerchant,
} from './domain/StrategicMerchantController.ts';

export { StrategicEngine } from './domain/StrategicEngine.ts';
export type { StrategicEngineOptions } from './domain/StrategicEngine.ts';

export { StrategicStageView } from './view/StrategicStageView.ts';
