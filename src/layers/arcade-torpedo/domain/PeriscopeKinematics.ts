import type { FiringSolutionContext, TargetBowSide, TorpedoArmoryState } from '../../../core/contracts/index.ts';
import type { ActiveTorpedoRunState, PeriscopeFiringArc, TdcFiringInput } from './TorpedoTypes.ts';

// Modela la cinemática de 360° del periscopio, los arcos de tiro de proa (±45°) y popa (±135°..180°), el timón y la carrera del torpedo

export const TORPEDO_SPEED_KNOTS = 40;
export const BOW_ARC_LIMIT_DEG = 45;
export const STERN_ARC_MIN_DEG = 135;
export const MIN_TORPEDO_DEPTH_METERS = 1.0;
export const MAX_TORPEDO_DEPTH_METERS = 12.0;
const METERS_PER_SECOND_PER_KNOT = 0.514444;

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Envuelve cualquier ángulo al rango circular [-180°, +180°) donde 0° es Proa y ±180° es Popa del submarino
export function normalizeRelativeBearingDeg(bearingDeg: number): number {
  const wrapped = ((((bearingDeg + 180) % 360) + 360) % 360) - 180;
  return Math.round(wrapped * 10) / 10;
}

export function clampPeriscopeBearing(bearingDeg: number): number {
  return normalizeRelativeBearingDeg(bearingDeg);
}

// Calcula la diferencia angular mínima con signo en [-180°, +180°) para renderizar y medir errores a través de ±180°
export function calculateSignedAngularDeltaDeg(fromBearingDeg: number, toBearingDeg: number): number {
  return normalizeRelativeBearingDeg(toBearingDeg - fromBearingDeg);
}

// Determina qué batería de tubos tiene ángulo de giroscopio válido según hacia dónde apunte el periscopio
export function resolveActiveFiringArc(periscopeBearingDeg: number): PeriscopeFiringArc {
  const absBearing = Math.abs(normalizeRelativeBearingDeg(periscopeBearingDeg));
  if (absBearing <= BOW_ARC_LIMIT_DEG) {
    return 'BOW';
  }
  return absBearing >= STERN_ARC_MIN_DEG ? 'STERN' : 'DEAD_ZONE';
}

export function isTubeCompatibleWithArc(tubeId: string, arc: PeriscopeFiringArc): boolean {
  if (arc === 'BOW') {
    return tubeId.startsWith('BOW');
  }
  return arc === 'STERN' ? tubeId.startsWith('STERN') : false;
}

export function findPreferredLoadedTubeForArc(
  armory: TorpedoArmoryState,
  arc: PeriscopeFiringArc,
  currentSelectedTubeId?: string,
): string {
  const candidates =
    arc === 'STERN' ? armory.sternTubes : arc === 'BOW' ? armory.bowTubes : [...armory.bowTubes, ...armory.sternTubes];
  if (currentSelectedTubeId !== undefined && candidates.some((t) => t.tubeId === currentSelectedTubeId && t.status === 'LOADED')) {
    return currentSelectedTubeId;
  }
  const loadedInArc = candidates.find((t) => t.status === 'LOADED');
  if (loadedInArc !== undefined) {
    return loadedInArc.tubeId;
  }
  const anyLoaded = armory.bowTubes.find((t) => t.status === 'LOADED') ?? armory.sternTubes.find((t) => t.status === 'LOADED');
  return anyLoaded?.tubeId ?? 'BOW-1';
}

export function normalizePeriscopeBroadsideAob(rawAobDeg: number): number {
  return rawAobDeg < 55 ? 75 : rawAobDeg > 125 ? 105 : rawAobDeg;
}

export function mergeAndClampTdcInput(current: TdcFiringInput, partial: Partial<TdcFiringInput>): TdcFiringInput {
  return {
    selectedTubeId: partial.selectedTubeId ?? current.selectedTubeId,
    recognizedShipType: partial.recognizedShipType ?? current.recognizedShipType,
    pistolType: partial.pistolType ?? current.pistolType,
    torpedoDepthMeters:
      partial.torpedoDepthMeters !== undefined
        ? clampNumber(Math.round(partial.torpedoDepthMeters * 2) / 2, MIN_TORPEDO_DEPTH_METERS, MAX_TORPEDO_DEPTH_METERS)
        : current.torpedoDepthMeters,
    estimatedSpeedKnots:
      partial.estimatedSpeedKnots !== undefined ? clampNumber(Math.round(partial.estimatedSpeedKnots), 0, 20) : current.estimatedSpeedKnots,
    estimatedAobDeg:
      partial.estimatedAobDeg !== undefined ? clampNumber(Math.round(partial.estimatedAobDeg), 0, 180) : current.estimatedAobDeg,
  };
}

export function calculateLeadAngleOffsetDeg(speedKnots: number, angleOnBowDeg: number, bowSide: TargetBowSide): number {
  const bowSign = bowSide === 'STARBOARD' ? 1 : -1;
  const effectiveSin = Math.max(0.5, Math.abs(Math.sin((angleOnBowDeg * Math.PI) / 180)));
  const sinLead = Math.min(0.85, (speedKnots * effectiveSin) / TORPEDO_SPEED_KNOTS);
  return Math.round(bowSign * ((Math.asin(sinLead) * 180) / Math.PI) * 10) / 10;
}

export function calculateTorpedoRunTimings(
  distanceMeters: number,
  leadAngleDeg = 0,
): { readonly realNavalRunSeconds: number; readonly totalScreenSeconds: number } {
  const cosAngle = Math.max(0.7, Math.cos((leadAngleDeg * Math.PI) / 180));
  const realNavalRunSeconds =
    Math.round((distanceMeters / cosAngle / (TORPEDO_SPEED_KNOTS * METERS_PER_SECOND_PER_KNOT)) * 10) / 10;
  const totalScreenSeconds = Math.round(Math.max(1.3, Math.min(4.5, realNavalRunSeconds / 22)) * 100) / 100;
  return { realNavalRunSeconds, totalScreenSeconds };
}

export function advanceTargetHorizonBearing(
  currentTargetBearingDeg: number,
  firingContext: FiringSolutionContext,
  targetDamageTaken: number,
  deltaSeconds: number,
): number {
  const bowSign = firingContext.targetBowSide === 'STARBOARD' ? 1 : -1;
  const damageSpeedFactor = targetDamageTaken > 0 ? 0.5 : 1;
  const angularSpeedDegPerSec =
    bowSign * (firingContext.targetSpeedKnots / 10) * (1000 / firingContext.distanceMeters) * 0.85 * damageSpeedFactor;
  // El buque gira de forma continua alrededor de los 360° sin teletransportarse jamás
  return normalizeRelativeBearingDeg(currentTargetBearingDeg + angularSpeedDegPerSec * deltaSeconds);
}

export function stepActiveTorpedoRun(
  run: ActiveTorpedoRunState,
  firingContext: FiringSolutionContext,
  deltaSeconds: number,
): {
  readonly updatedRun: ActiveTorpedoRunState;
  readonly updatedTargetBearingDeg: number;
  readonly startTargetBearingDeg: number;
} {
  const nextElapsed = run.elapsedScreenSeconds + deltaSeconds;
  const progress = Math.min(1, nextElapsed / run.totalScreenSeconds);
  const requiredLeadDeg = calculateLeadAngleOffsetDeg(
    firingContext.targetSpeedKnots,
    firingContext.targetAngleOnBowDeg,
    firingContext.targetBowSide,
  );
  const startTargetBearingDeg = normalizeRelativeBearingDeg(run.targetArrivalBearingDeg - requiredLeadDeg);
  const updatedTargetBearingDeg = normalizeRelativeBearingDeg(startTargetBearingDeg + requiredLeadDeg * progress);
  return {
    updatedRun: { ...run, elapsedScreenSeconds: nextElapsed, progress },
    updatedTargetBearingDeg,
    startTargetBearingDeg,
  };
}
