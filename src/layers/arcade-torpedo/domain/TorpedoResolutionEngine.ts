import type {
  DifficultyConfig,
  EncounterResult,
  FiringSolutionContext,
} from '../../../core/contracts/index.ts';
import {
  calculateLeadAngleOffsetDeg,
  calculateTorpedoRunTimings,
} from './PeriscopeKinematics.ts';
import type { ShipRecognitionEntry } from './ShipRecognitionManual.ts';
import type {
  TdcFiringInput,
  TorpedoArcadeStateSnapshot,
  TorpedoShotOutcomeType,
  TorpedoShotResolution,
} from './TorpedoTypes.ts';

// Resuelve el desvío longitudinal en el cruce y la física de espoleta (impacto en casco, crítico central o magnético bajo quilla)

export const EASY_MAGNETIC_WINDOW_METERS = 2.0;
export const STANDARD_MAGNETIC_WINDOW_METERS = 1.5;
const CRITICAL_HULL_CENTER_RATIO = 0.225;

export function getMagneticWindowMeters(difficulty: DifficultyConfig): number {
  return difficulty.level === 'EASY'
    ? EASY_MAGNETIC_WINDOW_METERS
    : STANDARD_MAGNETIC_WINDOW_METERS;
}

export function calculateLongitudinalMissMeters(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
  manualAimOffsetDeg?: number,
): number {
  if (manualAimOffsetDeg !== undefined) {
    const requiredLeadDeg = calculateLeadAngleOffsetDeg(
      firingContext.targetSpeedKnots,
      firingContext.targetAngleOnBowDeg,
      firingContext.targetBowSide,
    );
    const bowSign = firingContext.targetBowSide === 'STARBOARD' ? 1 : -1;
    const angularErrorDeg = (manualAimOffsetDeg - requiredLeadDeg) * bowSign;
    const missMeters =
      firingContext.distanceMeters * Math.tan((angularErrorDeg * Math.PI) / 180);
    return Math.round(missMeters * 10) / 10;
  }

  const distanceKilometers = firingContext.distanceMeters / 1000;
  const speedErrorMeters =
    (input.estimatedSpeedKnots - firingContext.targetSpeedKnots) * 8 * distanceKilometers;
  const aobErrorMeters =
    (input.estimatedAobDeg - firingContext.targetAngleOnBowDeg) * 1.2 * distanceKilometers;

  return Math.round((speedErrorMeters + aobErrorMeters) * 10) / 10;
}

function evaluateDepthAndPistolOutcome(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
  actualTargetEntry: ShipRecognitionEntry,
  longitudinalMissMeters: number,
  impactObliquityDeg: number,
  randomRoll: number,
): { readonly outcome: TorpedoShotOutcomeType; readonly damageInflicted: number } {
  const { difficulty } = firingContext;
  const actualDraftMeters = actualTargetEntry.draftMeters;
  const magneticWindow = getMagneticWindowMeters(difficulty);
  const isRandomDud = randomRoll < difficulty.dudProbability;

  // Caso 1: La cota es menor o igual al calado; golpea el casco. Un impacto centrado en la sala de máquinas causa daño crítico (2 HP)
  if (input.torpedoDepthMeters <= actualDraftMeters) {
    const isTooOblique = impactObliquityDeg > difficulty.impactAngleToleranceDegrees;
    if (isTooOblique || isRandomDud) {
      return { outcome: 'GLANCING_DUD', damageInflicted: 0 };
    }
    const isDeadCenterHit =
      input.pistolType === 'IMPACT' &&
      Math.abs(longitudinalMissMeters) <= actualTargetEntry.lengthMeters * CRITICAL_HULL_CENTER_RATIO;
    return { outcome: 'HIT_HULL', damageInflicted: isDeadCenterHit ? 2 : 1 };
  }

  // Caso 2: Pasa inmediatamente bajo la quilla dentro de la ventana de inducción magnética
  if (input.torpedoDepthMeters <= actualDraftMeters + magneticWindow) {
    if (input.pistolType === 'MAGNETIC') {
      return isRandomDud
        ? { outcome: 'GLANCING_DUD', damageInflicted: 0 }
        : { outcome: 'HIT_KEEL_MAGNETIC', damageInflicted: 2 };
    }
    return { outcome: 'PASSED_UNDER_KEEL', damageInflicted: 0 };
  }

  return { outcome: 'PASSED_UNDER_KEEL', damageInflicted: 0 };
}

export function resolveTorpedoShot(
  firingContext: FiringSolutionContext,
  input: TdcFiringInput,
  actualTargetEntry: ShipRecognitionEntry,
  randomRoll = 0.5,
  manualAimOffsetDeg?: number,
): TorpedoShotResolution {
  const longitudinalMissMeters = calculateLongitudinalMissMeters(
    firingContext,
    input,
    manualAimOffsetDeg,
  );
  const halfHullLength = actualTargetEntry.lengthMeters / 2;
  const impactObliquityDeg = Math.abs(90 - firingContext.targetAngleOnBowDeg);
  const { realNavalRunSeconds } = calculateTorpedoRunTimings(
    firingContext.distanceMeters,
    manualAimOffsetDeg ?? 0,
  );

  let outcome: TorpedoShotOutcomeType = 'MISSED_AHEAD';
  let damageInflicted = 0;

  if (longitudinalMissMeters < -halfHullLength) {
    outcome = 'MISSED_ASTERN';
  } else if (longitudinalMissMeters <= halfHullLength) {
    const evaluated = evaluateDepthAndPistolOutcome(
      firingContext,
      input,
      actualTargetEntry,
      longitudinalMissMeters,
      impactObliquityDeg,
      randomRoll,
    );
    outcome = evaluated.outcome;
    damageInflicted = evaluated.damageInflicted;
  }

  return {
    firedTubeId: input.selectedTubeId,
    outcome,
    damageInflicted,
    longitudinalMissMeters,
    impactObliquityDeg,
    torpedoRunSeconds: realNavalRunSeconds,
    inputUsed: input,
    actualShipClass: actualTargetEntry.shipClass,
    actualDraftMeters: actualTargetEntry.draftMeters,
    actualLengthMeters: actualTargetEntry.lengthMeters,
    actualSpeedKnots: firingContext.targetSpeedKnots,
    actualAobDeg: firingContext.targetAngleOnBowDeg,
  };
}

export function buildArcadeEncounterResult(
  snapshot: TorpedoArcadeStateSnapshot,
  baseTacticalTurns: number,
): EncounterResult {
  const torpedoHits = snapshot.shotHistory.filter(
    (shot) => shot.damageInflicted > 0,
  ).length;
  return {
    contactId: snapshot.firingContext.contactId,
    outcome: snapshot.isTargetSunk ? 'TARGET_SUNK' : 'DISENGAGED',
    updatedArmory: snapshot.armory,
    updatedFuel: snapshot.firingContext.fuelAtPeriscope,
    updatedBattery: snapshot.firingContext.batteryAtPeriscope,
    hullDamageTaken: 0,
    isTargetSunk: snapshot.isTargetSunk,
    sunkShipIds: snapshot.isTargetSunk ? [snapshot.firingContext.contactId] : [],
    sunkTonnageAwarded: snapshot.isTargetSunk
      ? snapshot.actualTargetEntry.tonnage
      : 0,
    torpedoesFiredInEncounter: snapshot.shotHistory.length,
    torpedoHitsInEncounter: torpedoHits,
    tacticalTurnsElapsed: baseTacticalTurns + snapshot.extraReloadTurnsElapsed,
  };
}
