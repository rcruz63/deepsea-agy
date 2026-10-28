import type {
  FiringSolutionContext,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import type {
  RecognizedShipClass,
  ShipRecognitionEntry,
} from './ShipRecognitionManual.ts';

// Define los contratos de entrada del TDC y el informe de telemetría posdisparo sin acoplarse al renderizado del periscopio

export type TorpedoPistolType = 'IMPACT' | 'MAGNETIC';

export type TorpedoShotOutcomeType =
  | 'HIT_KEEL_MAGNETIC'
  | 'HIT_HULL'
  | 'GLANCING_DUD'
  | 'PASSED_UNDER_KEEL'
  | 'MISSED_AHEAD'
  | 'MISSED_ASTERN';

export interface TdcFiringInput {
  readonly selectedTubeId: string;
  readonly recognizedShipType: RecognizedShipClass;
  readonly pistolType: TorpedoPistolType;
  readonly torpedoDepthMeters: number;
  readonly estimatedSpeedKnots: number;
  readonly estimatedAobDeg: number;
}

export interface TorpedoShotResolution {
  readonly firedTubeId: string;
  readonly outcome: TorpedoShotOutcomeType;
  readonly damageInflicted: number;
  readonly longitudinalMissMeters: number;
  readonly impactObliquityDeg: number;
  readonly inputUsed: TdcFiringInput;
  readonly actualShipClass: RecognizedShipClass;
  readonly actualDraftMeters: number;
  readonly actualLengthMeters: number;
  readonly actualSpeedKnots: number;
  readonly actualAobDeg: number;
}

export interface TorpedoArcadeStateSnapshot {
  readonly firingContext: FiringSolutionContext;
  readonly currentInput: TdcFiringInput;
  readonly recognizedManualEntry: ShipRecognitionEntry;
  readonly actualTargetEntry: ShipRecognitionEntry;
  readonly armory: TorpedoArmoryState;
  readonly targetDamageTaken: number;
  readonly targetMaxHitPoints: number;
  readonly isTargetSunk: boolean;
  readonly lastShotResolution: TorpedoShotResolution | null;
  readonly shotHistory: readonly TorpedoShotResolution[];
  readonly extraReloadTurnsElapsed: number;
}
