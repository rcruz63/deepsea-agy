import type {
  DifficultyConfig,
  FiringSolutionContext,
} from '../../../core/contracts/index.ts';
import type { ShipRecognitionEntry } from './ShipRecognitionManual.ts';
import type {
  TdcFiringInput,
  TorpedoShotOutcomeType,
  TorpedoShotResolution,
} from './TorpedoTypes.ts';

// Resuelve de forma pura la intercepción longitudinal y la interacción física entre profundidad, calado y espoleta

export const EASY_MAGNETIC_WINDOW_METERS = 2.0;
export const STANDARD_MAGNETIC_WINDOW_METERS = 1.5;

export function getMagneticWindowMeters(difficulty: DifficultyConfig): number {
  return difficulty.level === 'EASY'
    ? EASY_MAGNETIC_WINDOW_METERS
    : STANDARD_MAGNETIC_WINDOW_METERS;
}

// El error de predicción en el TDC se amplifica con la distancia al blanco; positivo indica cruce por delante de la proa
export function calculateLongitudinalMissMeters(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
): number {
  const distanceKilometers = firingContext.distanceMeters / 1000;
  const speedErrorMeters =
    (input.estimatedSpeedKnots - firingContext.targetSpeedKnots) *
    8 *
    distanceKilometers;
  const aobErrorMeters =
    (input.estimatedAobDeg - firingContext.targetAngleOnBowDeg) *
    1.2 *
    distanceKilometers;

  return Math.round((speedErrorMeters + aobErrorMeters) * 10) / 10;
}

function evaluateDepthAndPistolOutcome(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
  actualDraftMeters: number,
  impactObliquityDeg: number,
  randomRoll: number,
): { readonly outcome: TorpedoShotOutcomeType; readonly damageInflicted: number } {
  const { difficulty } = firingContext;
  const magneticWindow = getMagneticWindowMeters(difficulty);
  const isRandomDud = randomRoll < difficulty.dudProbability;

  // Caso 1: La cota del torpedo es menor o igual al calado; impacta físicamente contra las planchas del casco
  if (input.torpedoDepthMeters <= actualDraftMeters) {
    const isTooOblique =
      impactObliquityDeg > difficulty.impactAngleToleranceDegrees;
    if (isTooOblique || isRandomDud) {
      return { outcome: 'GLANCING_DUD', damageInflicted: 0 };
    }
    return { outcome: 'HIT_HULL', damageInflicted: 1 };
  }

  // Caso 2: Pasa inmediatamente bajo la quilla dentro de la ventana de inducción magnética
  if (input.torpedoDepthMeters <= actualDraftMeters + magneticWindow) {
    if (input.pistolType === 'MAGNETIC') {
      if (isRandomDud) {
        return { outcome: 'GLANCING_DUD', damageInflicted: 0 };
      }
      return { outcome: 'HIT_KEEL_MAGNETIC', damageInflicted: 2 };
    }
    return { outcome: 'PASSED_UNDER_KEEL', damageInflicted: 0 };
  }

  // Caso 3: Excede la ventana magnética y se pierde en aguas profundas bajo el buque
  return { outcome: 'PASSED_UNDER_KEEL', damageInflicted: 0 };
}

export function resolveTorpedoShot(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
  actualTargetEntry: ShipRecognitionEntry,
  randomRoll = 0.5,
): TorpedoShotResolution {
  const longitudinalMissMeters = calculateLongitudinalMissMeters(
    firingContext,
    input,
  );
  const halfHullLength = actualTargetEntry.lengthMeters / 2;
  const impactObliquityDeg = Math.abs(90 - firingContext.targetAngleOnBowDeg);

  if (longitudinalMissMeters > halfHullLength) {
    return buildResolutionRecord(
      firingContext,
      input,
      actualTargetEntry,
      'MISSED_AHEAD',
      0,
      longitudinalMissMeters,
      impactObliquityDeg,
    );
  }

  if (longitudinalMissMeters < -halfHullLength) {
    return buildResolutionRecord(
      firingContext,
      input,
      actualTargetEntry,
      'MISSED_ASTERN',
      0,
      longitudinalMissMeters,
      impactObliquityDeg,
    );
  }

  const { outcome, damageInflicted } = evaluateDepthAndPistolOutcome(
    firingContext,
    input,
    actualTargetEntry.draftMeters,
    impactObliquityDeg,
    randomRoll,
  );

  return buildResolutionRecord(
    firingContext,
    input,
    actualTargetEntry,
    outcome,
    damageInflicted,
    longitudinalMissMeters,
    impactObliquityDeg,
  );
}

function buildResolutionRecord(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
  actualTargetEntry: ShipRecognitionEntry,
  outcome: TorpedoShotOutcomeType,
  damageInflicted: number,
  longitudinalMissMeters: number,
  impactObliquityDeg: number,
): TorpedoShotResolution {
  return {
    firedTubeId: input.selectedTubeId,
    outcome,
    damageInflicted,
    longitudinalMissMeters,
    impactObliquityDeg,
    inputUsed: input,
    actualShipClass: actualTargetEntry.shipClass,
    actualDraftMeters: actualTargetEntry.draftMeters,
    actualLengthMeters: actualTargetEntry.lengthMeters,
    actualSpeedKnots: firingContext.targetSpeedKnots,
    actualAobDeg: firingContext.targetAngleOnBowDeg,
  };
}
