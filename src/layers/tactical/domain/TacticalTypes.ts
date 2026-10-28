import type {
  DifficultyConfig,
  SurfaceShipSpec,
  TargetBowSide,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import type {
  AxialCoordinate,
  HexCell,
  HexDirection,
} from '../../../core/hex/index.ts';

// Define los contratos internos del motor táctico 15x15 (turnos de 5 minutos) desacoplados de la vista Canvas

export type TacticalDepth = 'SURFACED' | 'PERISCOPE_DEPTH' | 'DEEP';

export type TacticalStepDistance = 0 | 1 | 2 | 3;

export interface TacticalHexCell extends HexCell {
  readonly coordinate: AxialCoordinate;
}

export interface TacticalReachableOption {
  readonly coordinate: AxialCoordinate;
  readonly stepDistance: TacticalStepDistance;
  readonly fuelCost: number;
  readonly batteryCost: number;
}

export interface TacticalSubmarineSnapshot {
  readonly coordinate: AxialCoordinate;
  readonly heading: HexDirection;
  readonly depth: TacticalDepth;
  readonly fuel: number;
  readonly battery: number;
  readonly hullIntegrity: number;
  readonly armory: TorpedoArmoryState;
}

export interface TacticalMerchantSnapshot {
  readonly contactId: string;
  readonly spec: SurfaceShipSpec;
  readonly coordinate: AxialCoordinate;
  readonly heading: HexDirection;
  readonly speedKnots: number;
}

export interface TacticalGeometryTelemetry {
  readonly distanceHexes: number;
  readonly distanceMeters: number;
  readonly targetAngleOnBowDeg: number;
  readonly targetBowSide: TargetBowSide;
  readonly canRaisePeriscopeToFire: boolean;
}

export interface TacticalStateSnapshot {
  readonly turnNumber: number;
  readonly difficulty: DifficultyConfig;
  readonly submarine: TacticalSubmarineSnapshot;
  readonly merchant: TacticalMerchantSnapshot;
  readonly reachableOptions: readonly TacticalReachableOption[];
  readonly telemetry: TacticalGeometryTelemetry;
}

export type TacticalCommand =
  | { readonly type: 'SET_DEPTH'; readonly depth: TacticalDepth }
  | { readonly type: 'MOVE_SUBMARINE'; readonly destination: AxialCoordinate }
  | { readonly type: 'START_TUBE_RELOAD'; readonly tubeId: string }
  | { readonly type: 'RAISE_PERISCOPE_AND_LOCK' }
  | { readonly type: 'DISENGAGE' };
