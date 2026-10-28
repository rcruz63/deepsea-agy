export {
  SHIP_RECOGNITION_CATALOG,
  getShipRecognitionEntry,
  resolveActualShipRecognitionEntry,
} from './domain/ShipRecognitionManual.ts';
export type {
  RecognizedShipClass,
  ShipRecognitionEntry,
} from './domain/ShipRecognitionManual.ts';

export type {
  TdcFiringInput,
  TorpedoArcadeStateSnapshot,
  TorpedoPistolType,
  TorpedoShotOutcomeType,
  TorpedoShotResolution,
} from './domain/TorpedoTypes.ts';

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

export { TorpedoArcadeStageView } from './view/TorpedoArcadeStageView.ts';
