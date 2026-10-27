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
  calculateReachableStrategicHexes,
  getMovementEnergyDelta,
  resolveAdjacentHexDirection,
} from './domain/StrategicMovementNavigator.ts';
export type {
  ReachableHexOption,
  StrategicStepDistance,
} from './domain/StrategicMovementNavigator.ts';

export {
  MAX_RESOURCE_PERCENTAGE,
  MIN_RESOURCE_PERCENTAGE,
  applyStrategicMovementEnergy,
  canSubmergeSubmarine,
  clampStrategicResource,
  completeStrategicTurnArmoryReload,
  switchStrategicSubmarineStance,
} from './domain/StrategicResourceRules.ts';

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
