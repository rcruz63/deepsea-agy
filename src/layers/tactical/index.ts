export type {
  TacticalCommand,
  TacticalDepth,
  TacticalGeometryTelemetry,
  TacticalHexCell,
  TacticalMerchantSnapshot,
  TacticalReachableOption,
  TacticalStateSnapshot,
  TacticalStepDistance,
  TacticalSubmarineSnapshot,
} from './domain/TacticalTypes.ts';

export {
  INITIAL_TACTICAL_MERCHANT_COORDINATE,
  INITIAL_TACTICAL_SUBMARINE_COORDINATE,
  TACTICAL_GRID_HEIGHT,
  TACTICAL_GRID_WIDTH,
  advanceTacticalMerchantStep,
  applyTacticalSubmarineMovement,
  calculateTacticalReachableOptions,
  createTacticalHexGrid,
  getMaxStepsForTacticalDepth,
  getTacticalMovementCost,
} from './domain/TacticalMovementRules.ts';

export {
  MAX_TORPEDO_FIRING_RANGE_HEXES,
  METERS_PER_TACTICAL_HEX,
  MIN_TORPEDO_FIRING_RANGE_HEXES,
  buildTacticalFiringSolutionContext,
  calculateTargetAngleOnBow,
  evaluateTacticalFiringTelemetry,
  hasLoadedTorpedoAvailable,
} from './domain/TacticalFiringGeometry.ts';

export {
  HexTacticalEngine,
  type HexTacticalEngineOptions,
} from './domain/HexTacticalEngine.ts';

export { TacticalStageView } from './view/TacticalStageView.ts';
