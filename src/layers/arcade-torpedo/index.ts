export {
  type RecognizedShipClass,
  type ShipRecognitionEntry,
  SHIP_RECOGNITION_CATALOG,
  getShipRecognitionEntry,
  resolveActualShipRecognitionEntry,
} from './domain/ShipRecognitionManual.ts';
export type {
  ActiveTorpedoRunState,
  PeriscopeFiringArc,
  TdcFiringInput,
  TorpedoArcadeStateSnapshot,
  TorpedoPistolType,
  TorpedoShotOutcomeType,
  TorpedoShotResolution,
} from './domain/TorpedoTypes.ts';
export {
  BOW_ARC_LIMIT_DEG,
  STERN_ARC_MIN_DEG,
  TORPEDO_SPEED_KNOTS,
  advanceTargetHorizonBearing,
  calculateLeadAngleOffsetDeg,
  calculateSignedAngularDeltaDeg,
  calculateTorpedoRunTimings,
  clampPeriscopeBearing,
  findPreferredLoadedTubeForArc,
  isTubeCompatibleWithArc,
  normalizePeriscopeBroadsideAob,
  normalizeRelativeBearingDeg,
  resolveActiveFiringArc,
  stepActiveTorpedoRun,
} from './domain/PeriscopeKinematics.ts';
export {
  EASY_MAGNETIC_WINDOW_METERS,
  STANDARD_MAGNETIC_WINDOW_METERS,
  calculateLongitudinalMissMeters,
  getMagneticWindowMeters,
  resolveTorpedoShot,
} from './domain/TorpedoResolutionEngine.ts';
export {
  MAX_TORPEDO_DEPTH_METERS,
  MIN_TORPEDO_DEPTH_METERS,
  TorpedoArcadeEngine,
} from './domain/TorpedoArcadeEngine.ts';
export { renderPeriscopeLensView } from './view/PeriscopeLensRenderer.ts';
export {
  type TdcControlRegion,
  renderTdcControlPanel,
} from './view/TdcControlPanelRenderer.ts';
export { TorpedoArcadeStageView } from './view/TorpedoArcadeStageView.ts';
