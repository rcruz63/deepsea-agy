import type {
  FiringSolutionContext,
  TargetBowSide,
} from '../../../core/contracts/index.ts';
import type { ActiveTorpedoRunState, TdcFiringInput } from './TorpedoTypes.ts';

// Modela la cinemática angular del periscopio: ángulo de adelanto (lead angle), tiempo de carrera del torpedo y deriva del blanco

export const TORPEDO_SPEED_KNOTS = 40;
export const MAX_PERISCOPE_BEARING_DEG = 45;
export const TARGET_HORIZON_LIMIT_DEG = 58;
export const MIN_TORPEDO_DEPTH_METERS = 1.0;
export const MAX_TORPEDO_DEPTH_METERS = 12.0;
const METERS_PER_SECOND_PER_KNOT = 0.514444;

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampPeriscopeBearing(bearingDeg: number): number {
  return clampNumber(
    Math.round(bearingDeg * 10) / 10,
    -MAX_PERISCOPE_BEARING_DEG,
    MAX_PERISCOPE_BEARING_DEG,
  );
}

// Normaliza el AOB al entrar al periscopio para garantizar que el buque navegue de través (55°..125°) coherente con su vista lateral
export function normalizePeriscopeBroadsideAob(rawAobDeg: number): number {
  if (rawAobDeg < 55) {
    return 75;
  }
  if (rawAobDeg > 125) {
    return 105;
  }
  return rawAobDeg;
}

export function mergeAndClampTdcInput(
  current: TdcFiringInput,
  partial: Partial<TdcFiringInput>,
): TdcFiringInput {
  return {
    selectedTubeId: partial.selectedTubeId ?? current.selectedTubeId,
    recognizedShipType: partial.recognizedShipType ?? current.recognizedShipType,
    pistolType: partial.pistolType ?? current.pistolType,
    torpedoDepthMeters:
      partial.torpedoDepthMeters !== undefined
        ? clampNumber(Math.round(partial.torpedoDepthMeters * 2) / 2, MIN_TORPEDO_DEPTH_METERS, MAX_TORPEDO_DEPTH_METERS)
        : current.torpedoDepthMeters,
    estimatedSpeedKnots:
      partial.estimatedSpeedKnots !== undefined
        ? clampNumber(Math.round(partial.estimatedSpeedKnots), 0, 20)
        : current.estimatedSpeedKnots,
    estimatedAobDeg:
      partial.estimatedAobDeg !== undefined
        ? clampNumber(Math.round(partial.estimatedAobDeg), 0, 180)
        : current.estimatedAobDeg,
  };
}

// Calcula cuántos grados por delante de la proa debe apuntarse el periscopio para interceptar al buque en movimiento
export function calculateLeadAngleOffsetDeg(
  speedKnots: number,
  angleOnBowDeg: number,
  bowSide: TargetBowSide,
): number {
  const bowSign = bowSide === 'STARBOARD' ? 1 : -1;
  const aobRadians = (angleOnBowDeg * Math.PI) / 180;
  const effectiveSin = Math.max(0.5, Math.abs(Math.sin(aobRadians)));
  const sinLead = Math.min(0.85, (speedKnots * effectiveSin) / TORPEDO_SPEED_KNOTS);
  const leadDeg = (Math.asin(sinLead) * 180) / Math.PI;
  return Math.round(bowSign * leadDeg * 10) / 10;
}

// El tiempo de carrera depende de la distancia al blanco (500m..2000m), la velocidad del torpedo y la secante del ángulo de adelanto
export function calculateTorpedoRunTimings(
  distanceMeters: number,
  leadAngleDeg = 0,
): { readonly realNavalRunSeconds: number; readonly totalScreenSeconds: number } {
  const cosAngle = Math.max(0.7, Math.cos((leadAngleDeg * Math.PI) / 180));
  const effectiveDistanceMeters = distanceMeters / cosAngle;
  const torpedoMetersPerSecond = TORPEDO_SPEED_KNOTS * METERS_PER_SECOND_PER_KNOT;
  const realNavalRunSeconds =
    Math.round((effectiveDistanceMeters / torpedoMetersPerSecond) * 10) / 10;
  const totalScreenSeconds =
    Math.round(Math.max(1.3, Math.min(4.5, realNavalRunSeconds / 22)) * 100) / 100;

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
    bowSign *
    (firingContext.targetSpeedKnots / 10) *
    (1000 / firingContext.distanceMeters) *
    0.85 *
    damageSpeedFactor;
  const nextBearing = currentTargetBearingDeg + angularSpeedDegPerSec * deltaSeconds;
  // Solo reinicia el tránsito cuando el buque rebasa ampliamente el arco máximo de giro del periscopio (±58° > ±45°)
  return Math.abs(nextBearing) > TARGET_HORIZON_LIMIT_DEG
    ? -bowSign * 38
    : nextBearing;
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
  const startTargetBearingDeg = run.targetArrivalBearingDeg - requiredLeadDeg;
  const updatedTargetBearingDeg = startTargetBearingDeg + requiredLeadDeg * progress;

  return {
    updatedRun: { ...run, elapsedScreenSeconds: nextElapsed, progress },
    updatedTargetBearingDeg,
    startTargetBearingDeg,
  };
}
