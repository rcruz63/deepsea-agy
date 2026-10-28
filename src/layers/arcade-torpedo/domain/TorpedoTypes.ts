import type {
  FiringSolutionContext,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import type {
  RecognizedShipClass,
  ShipRecognitionEntry,
} from './ShipRecognitionManual.ts';

// Define los contratos de entrada del TDC, giro de adelanto del periscopio, carrera del torpedo y telemetría posdisparo

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

export interface ActiveTorpedoRunState {
  readonly tubeId: string;
  readonly firedBearingDeg: number;
  readonly targetArrivalBearingDeg: number;
  readonly elapsedScreenSeconds: number;
  readonly totalScreenSeconds: number;
  readonly realNavalRunSeconds: number;
  readonly progress: number;
}

export interface TorpedoShotResolution {
  readonly firedTubeId: string;
  readonly outcome: TorpedoShotOutcomeType;
  readonly damageInflicted: number;
  readonly longitudinalMissMeters: number;
  readonly impactObliquityDeg: number;
  readonly torpedoRunSeconds: number;
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
  readonly periscopeBearingDeg: number;
  readonly targetBearingDeg: number;
  readonly tdcSuggestedBearingDeg: number;
  readonly activeTorpedoRun: ActiveTorpedoRunState | null;
  readonly targetDamageTaken: number;
  readonly targetMaxHitPoints: number;
  readonly isTargetSunk: boolean;
  readonly sinkingProgress: number;
  readonly lastShotResolution: TorpedoShotResolution | null;
  readonly shotHistory: readonly TorpedoShotResolution[];
  readonly extraReloadTurnsElapsed: number;
}
