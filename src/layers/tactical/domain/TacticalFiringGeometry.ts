import type {
  DifficultyConfig,
  FiringSolutionContext,
  TargetBowSide,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexDirection,
  calculateHexDistance,
  calculateNavalBearingDegrees,
  getHexNeighbor,
} from '../../../core/hex/index.ts';
import type {
  TacticalGeometryTelemetry,
  TacticalMerchantSnapshot,
  TacticalSubmarineSnapshot,
} from './TacticalTypes.ts';

// Calcula distancia métrica (1 hex = 500m), Ángulo en la Proa (AOB 0°..180°) y banda (PORT/STARBOARD) hacia el periscopio Arcade

export const METERS_PER_TACTICAL_HEX = 500;
export const MIN_TORPEDO_FIRING_RANGE_HEXES = 1;
export const MAX_TORPEDO_FIRING_RANGE_HEXES = 4;

export interface AngleOnBowCalculation {
  readonly targetAngleOnBowDeg: number;
  readonly targetBowSide: TargetBowSide;
}

// Mide el ángulo relativo desde la proa del mercante hasta la línea visual mercante->submarino para determinar AOB y banda
export function calculateTargetAngleOnBow(
  submarineCoordinate: AxialCoordinate,
  merchantCoordinate: AxialCoordinate,
  merchantHeading: HexDirection,
): AngleOnBowCalculation {
  const merchantBowNeighbor = getHexNeighbor(merchantCoordinate, merchantHeading);
  const merchantCourseDeg = calculateNavalBearingDegrees(
    merchantCoordinate,
    merchantBowNeighbor,
  );
  const bearingMerchantToSubmarineDeg = calculateNavalBearingDegrees(
    merchantCoordinate,
    submarineCoordinate,
  );

  // Normaliza la diferencia angular al intervalo [-180°, +180°): positivo = Estribor (STARBOARD), negativo = Babor (PORT)
  const signedRelativeDeg =
    ((bearingMerchantToSubmarineDeg - merchantCourseDeg + 540) % 360) - 180;
  const targetBowSide: TargetBowSide =
    signedRelativeDeg >= 0 ? 'STARBOARD' : 'PORT';
  const targetAngleOnBowDeg = Math.round(Math.abs(signedRelativeDeg));

  return {
    targetAngleOnBowDeg,
    targetBowSide,
  };
}

export function hasLoadedTorpedoAvailable(armory: TorpedoArmoryState): boolean {
  return (
    armory.bowTubes.some((tube) => tube.status === 'LOADED') ||
    armory.sternTubes.some((tube) => tube.status === 'LOADED')
  );
}

export function evaluateTacticalFiringTelemetry(
  submarine: TacticalSubmarineSnapshot,
  merchant: TacticalMerchantSnapshot,
): TacticalGeometryTelemetry {
  const distanceHexes = calculateHexDistance(
    submarine.coordinate,
    merchant.coordinate,
  );
  const distanceMeters = distanceHexes * METERS_PER_TACTICAL_HEX;
  const { targetAngleOnBowDeg, targetBowSide } = calculateTargetAngleOnBow(
    submarine.coordinate,
    merchant.coordinate,
    merchant.heading,
  );

  const isDepthValidForPeriscope =
    submarine.depth === 'PERISCOPE_DEPTH' || submarine.depth === 'SURFACED';
  const isWithinFiringRange =
    distanceHexes >= MIN_TORPEDO_FIRING_RANGE_HEXES &&
    distanceHexes <= MAX_TORPEDO_FIRING_RANGE_HEXES;
  const canRaisePeriscopeToFire =
    isDepthValidForPeriscope &&
    isWithinFiringRange &&
    hasLoadedTorpedoAvailable(submarine.armory);

  return {
    distanceHexes,
    distanceMeters,
    targetAngleOnBowDeg,
    targetBowSide,
    canRaisePeriscopeToFire,
  };
}

export function buildTacticalFiringSolutionContext(
  submarine: TacticalSubmarineSnapshot,
  merchant: TacticalMerchantSnapshot,
  difficulty: DifficultyConfig,
  telemetry: TacticalGeometryTelemetry,
): FiringSolutionContext {
  return {
    contactId: merchant.contactId,
    armory: submarine.armory,
    difficulty,
    targetShip: {
      contactId: merchant.contactId,
      spec: merchant.spec,
      heading: merchant.heading,
      speedKnots: merchant.speedKnots,
    },
    relativeDistanceHexes: telemetry.distanceHexes,
    distanceMeters: telemetry.distanceMeters,
    targetAngleOnBowDeg: telemetry.targetAngleOnBowDeg,
    trueAngleOnBowDegrees: telemetry.targetAngleOnBowDeg,
    targetBowSide: telemetry.targetBowSide,
    targetSpeedKnots: merchant.speedKnots,
    hullIntegrityAtPeriscope: submarine.hullIntegrity,
  };
}
