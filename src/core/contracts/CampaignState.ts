import type { AxialCoordinate, HexDirection } from '../hex/HexCoordinate.ts';
import type { DifficultyConfig } from './DifficultyConfig.ts';
import type {
  PatrolClockState,
  StrategicTimeScale,
  WeatherState,
} from './EnvironmentContracts.ts';
import type {
  BduPatrolOrder,
  BduRadiogramReport,
  HydrophoneBearingContact,
  KriegstagebuchPatrolSummary,
  PatrolStatus,
} from './StrategicIntelContracts.ts';
import type { SubmarineState } from './SubmarineState.ts';

// Agrupa el estado global de una patrulla para que la capa estratégica sea reproducible y serializable sin depender de la interfaz gráfica

export interface StrategicContactState {
  readonly contactId: string;
  readonly shipSpecId: string;
  readonly coordinate: AxialCoordinate;
  readonly heading: HexDirection;
  readonly isSunk: boolean;
  readonly corridorId?: string;
  readonly routeWaypoints?: readonly AxialCoordinate[];
  readonly waypointIndex?: number;
  readonly hasReachedDestination?: boolean;
  // Impide re-interceptar gratuitamente en el mismo turno a un contacto que acaba de escapar del tablero táctico 15x15
  readonly reinterceptCooldownTurns?: number;
}

export interface CampaignState {
  readonly theaterId: string;
  readonly turnNumber: number;
  readonly timeScale: StrategicTimeScale;
  readonly clock: PatrolClockState;
  readonly weather: WeatherState;
  readonly weatherTurnsRemaining: number;
  readonly patrolStatus: PatrolStatus;
  readonly difficulty: DifficultyConfig;
  readonly submarine: SubmarineState;
  readonly contacts: readonly StrategicContactState[];
  readonly visibleContactIds: readonly string[];
  readonly hydrophoneContacts: readonly HydrophoneBearingContact[];
  readonly activePatrolOrder: BduPatrolOrder | null;
  readonly deliveredRadiograms: readonly BduRadiogramReport[];
  readonly queuedSubmergedRadiograms: readonly BduRadiogramReport[];
  readonly patrolTorpedoesFired: number;
  readonly patrolTorpedoHits: number;
  readonly patrolSunkShipsCount: number;
  readonly patrolSunkTonnage: number;
  readonly totalSunkTonnage: number;
  readonly lastPatrolSummary: KriegstagebuchPatrolSummary | null;
}
