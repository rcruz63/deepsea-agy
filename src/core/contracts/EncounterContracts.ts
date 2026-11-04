import type { HexDirection } from '../hex/HexCoordinate.ts';
import type { DifficultyConfig } from './DifficultyConfig.ts';
import type { TimeOfDay, WeatherState } from './EnvironmentContracts.ts';
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
  // Lista multi-buque preparada para convoyes y escoltas destacables en Fase 3; en Fase 2 contiene al contacto interceptado
  readonly ships: readonly TargetShipEncounterSnapshot[];
  readonly targetShip: TargetShipEncounterSnapshot;
  readonly timeOfDay: TimeOfDay;
  readonly weather: WeatherState;
  readonly interceptionDistanceHexes: 0 | 1;
  readonly approachDirection: HexDirection;
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
  // Transporta el gasto energético de la maniobra táctica previa para que ArcadeLayer lo devuelva intacto en EncounterResult
  readonly fuelAtPeriscope: number;
  readonly batteryAtPeriscope: number;
  readonly timeOfDay?: TimeOfDay;
  readonly weather?: WeatherState;
  readonly submarineRelativeBearingDeg?: number;
}

export type EncounterOutcomeReason =
  | 'TARGET_SUNK'
  | 'TARGET_ESCAPED'
  | 'DISENGAGED'
  | 'SUBMARINE_DESTROYED';

export interface EncounterResult {
  readonly contactId: string;
  readonly outcome: EncounterOutcomeReason;
  readonly updatedArmory: TorpedoArmoryState;
  readonly updatedFuel: number;
  readonly updatedBattery: number;
  readonly hullDamageTaken: number;
  readonly isTargetSunk: boolean;
  readonly sunkShipIds: readonly string[];
  readonly sunkTonnageAwarded: number;
  readonly torpedoesFiredInEncounter: number;
  readonly torpedoHitsInEncounter: number;
  readonly tacticalTurnsElapsed: number;
}
