import type { HexDirection } from '../hex/HexCoordinate.ts';
import type { DifficultyConfig } from './DifficultyConfig.ts';
import type { SubmarineState } from './SubmarineState.ts';
import type { SurfaceShipSpec } from './TheaterDefinition.ts';
import type { TorpedoArmoryState } from './TorpedoArmoryState.ts';

// Define las fronteras inmutables de paso de mensajes para que StrategicLayer, TacticalLayer y ArcadeLayer jamás se importen entre sí

export type TargetBowSide = 'PORT' | 'STARBOARD';

export interface TargetShipEncounterSnapshot {
  readonly contactId: string;
  readonly spec: SurfaceShipSpec;
  readonly heading: HexDirection;
  readonly speedKnots: number;
}

export interface EncounterContext {
  readonly submarine: SubmarineState;
  readonly difficulty: DifficultyConfig;
  readonly targetShip: TargetShipEncounterSnapshot;
}

export interface FiringSolutionContext {
  readonly contactId: string;
  readonly armory: TorpedoArmoryState;
  readonly difficulty: DifficultyConfig;
  readonly targetShip: TargetShipEncounterSnapshot;
  readonly relativeDistanceHexes: number;
  readonly distanceMeters: number;
  // Ángulo en la Proa (AOB 0°..180°) y banda (PORT/STARBOARD) reales para escalar y orientar la silueta en el periscopio Arcade
  readonly targetAngleOnBowDeg: number;
  readonly trueAngleOnBowDegrees: number;
  readonly targetBowSide: TargetBowSide;
  readonly targetSpeedKnots: number;
  readonly hullIntegrityAtPeriscope: number;
}

export type EncounterOutcomeReason =
  | 'TARGET_SUNK'
  | 'DISENGAGED'
  | 'SUBMARINE_DESTROYED';

export interface EncounterResult {
  readonly contactId: string;
  readonly outcome: EncounterOutcomeReason;
  readonly updatedArmory: TorpedoArmoryState;
  readonly hullDamageTaken: number;
  readonly isTargetSunk: boolean;
  readonly sunkTonnageAwarded: number;
  readonly tacticalTurnsElapsed: number;
}
