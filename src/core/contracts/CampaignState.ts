import type { AxialCoordinate, HexDirection } from '../hex/HexCoordinate.ts';
import type { DifficultyConfig } from './DifficultyConfig.ts';
import type { SubmarineState } from './SubmarineState.ts';

// Agrupa el estado global de una patrulla para que la capa estratégica sea reproducible y serializable sin depender de la interfaz gráfica

export interface StrategicContactState {
  readonly contactId: string;
  readonly shipSpecId: string;
  readonly coordinate: AxialCoordinate;
  readonly heading: HexDirection;
  readonly isSunk: boolean;
}

export interface CampaignState {
  readonly theaterId: string;
  readonly turnNumber: number;
  readonly difficulty: DifficultyConfig;
  readonly submarine: SubmarineState;
  readonly contacts: readonly StrategicContactState[];
  readonly totalSunkTonnage: number;
}
