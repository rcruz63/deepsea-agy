import type { EncounterContext } from '../../../core/contracts/index.ts';
import {
  HEX_DIRECTIONS,
  type AxialCoordinate,
  type HexDirection,
  type HexGridMap,
  addAxialCoordinates,
  areAxialCoordinatesEqual,
  calculateHexDistance,
  calculateNavalBearingDegrees,
  createAxialCoordinate,
  getDirectionVector,
  getHexNeighbor,
  getHexRing,
  rotateHexDirection,
  scaleAxialCoordinate,
} from '../../../core/hex/index.ts';
import type {
  TacticalDepth,
  TacticalHexCell,
  TacticalMerchantSnapshot,
  TacticalSubmarineSnapshot,
} from './TacticalTypes.ts';

// Calcula el despliegue inicial relativo en el tablero 15x15 según el rumbo real del mercante y el vector de intercepción

export const TACTICAL_BOARD_CENTER: AxialCoordinate = createAxialCoordinate(4, 7);
export const MERCHANT_UPSTREAM_OFFSET_HEXES = 4;
export const SUBMARINE_AMBUSH_DISTANCE_HEXES = 4;
export const SUBMARINE_ADJACENT_DISTANCE_HEXES = 6;

export interface TacticalEncounterSpawnLayout {
  readonly merchantCoordinate: AxialCoordinate;
  readonly merchantHeading: HexDirection;
  readonly submarineCoordinate: AxialCoordinate;
  readonly submarineHeading: HexDirection;
}

function angularDifferenceDegrees(angleA: number, angleB: number): number {
  return Math.abs(((angleA - angleB + 540) % 360) - 180);
}

// Orienta la proa del U-Boot hacia el blanco al iniciar la aproximación para evitar arrancar de espaldas o en zona muerta
export function resolveHeadingTowardTarget(
  fromCoordinate: AxialCoordinate,
  toCoordinate: AxialCoordinate,
  fallbackHeading: HexDirection,
): HexDirection {
  if (areAxialCoordinatesEqual(fromCoordinate, toCoordinate)) {
    return fallbackHeading;
  }
  const targetBearing = calculateNavalBearingDegrees(fromCoordinate, toCoordinate);
  let bestDirection = fallbackHeading;
  let bestDelta = Infinity;

  for (const direction of HEX_DIRECTIONS) {
    const neighbor = getHexNeighbor(fromCoordinate, direction);
    const dirBearing = calculateNavalBearingDegrees(fromCoordinate, neighbor);
    const delta = angularDifferenceDegrees(targetBearing, dirBearing);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestDirection = direction;
    }
  }
  return bestDirection;
}

function pickNearestValidRingCell(
  grid: HexGridMap<TacticalHexCell>,
  merchantCoord: AxialCoordinate,
  desiredRadius: number,
  idealSubCoord: AxialCoordinate,
): AxialCoordinate {
  if (
    grid.hasCell(idealSubCoord) &&
    !areAxialCoordinatesEqual(idealSubCoord, merchantCoord)
  ) {
    return idealSubCoord;
  }

  const ringCandidates = getHexRing(merchantCoord, desiredRadius).filter(
    (coord) => grid.hasCell(coord) && !areAxialCoordinatesEqual(coord, merchantCoord),
  );
  let chosen = TACTICAL_BOARD_CENTER;
  let minDistance = Infinity;

  for (const candidate of ringCandidates) {
    const dist = calculateHexDistance(candidate, idealSubCoord);
    if (dist < minDistance) {
      minDistance = dist;
      chosen = candidate;
    }
  }
  return chosen;
}

export function computeTacticalEncounterSpawn(
  grid: HexGridMap<TacticalHexCell>,
  context: EncounterContext,
): TacticalEncounterSpawnLayout {
  const merchantHeading = context.targetShip.heading;
  // Retrasa al mercante 4 hexágonos aguas arriba del centro (4,7) para garantizar 11 turnos de carrera útil antes del borde
  const upstreamDirection = rotateHexDirection(merchantHeading, 3);
  const merchantCoordinate = addAxialCoordinates(
    TACTICAL_BOARD_CENTER,
    scaleAxialCoordinate(getDirectionVector(upstreamDirection), MERCHANT_UPSTREAM_OFFSET_HEXES),
  );

  const desiredSubDistance =
    context.interceptionDistanceHexes === 0
      ? SUBMARINE_AMBUSH_DISTANCE_HEXES
      : SUBMARINE_ADJACENT_DISTANCE_HEXES;
  const approachDir: HexDirection =
    context.approachDirection ?? rotateHexDirection(context.submarine.heading, 3);
  const idealSubCoord = addAxialCoordinates(
    merchantCoordinate,
    scaleAxialCoordinate(getDirectionVector(approachDir), desiredSubDistance),
  );

  const submarineCoordinate = pickNearestValidRingCell(
    grid,
    merchantCoordinate,
    desiredSubDistance,
    idealSubCoord,
  );
  const submarineHeading = resolveHeadingTowardTarget(
    submarineCoordinate,
    merchantCoordinate,
    context.submarine.heading,
  );

  return {
    merchantCoordinate,
    merchantHeading,
    submarineCoordinate,
    submarineHeading,
  };
}

export function createInitialTacticalSnapshots(
  grid: HexGridMap<TacticalHexCell>,
  context: EncounterContext,
  customSubCoord?: AxialCoordinate,
  customMerchantCoord?: AxialCoordinate,
): {
  readonly submarine: TacticalSubmarineSnapshot;
  readonly merchant: TacticalMerchantSnapshot;
} {
  const initialDepth: TacticalDepth =
    context.submarine.stance === 'SURFACED' ? 'SURFACED' : 'PERISCOPE_DEPTH';
  const spawn = computeTacticalEncounterSpawn(grid, context);
  const merchantCoord = customMerchantCoord ?? spawn.merchantCoordinate;
  const subCoord = customSubCoord ?? spawn.submarineCoordinate;

  return {
    submarine: {
      coordinate: subCoord,
      heading: resolveHeadingTowardTarget(subCoord, merchantCoord, context.submarine.heading),
      depth: initialDepth,
      fuel: context.submarine.fuel,
      battery: context.submarine.battery,
      hullIntegrity: context.submarine.hullIntegrity,
      armory: context.submarine.armory,
    },
    merchant: {
      contactId: context.targetShip.contactId,
      spec: context.targetShip.spec,
      coordinate: merchantCoord,
      heading: spawn.merchantHeading,
      speedKnots: context.targetShip.speedKnots,
    },
  };
}
