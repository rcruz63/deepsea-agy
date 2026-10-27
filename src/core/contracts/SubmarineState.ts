import type { AxialCoordinate, HexDirection } from '../hex/HexCoordinate.ts';
import type { TorpedoArmoryState } from './TorpedoArmoryState.ts';

// Representa la fotografía persistente del submarino que viaja de forma inmutable entre patrulla estratégica y encuentros locales

export type NavigationStance = 'SURFACED' | 'SUBMERGED';

export type SubmarineDepthLevel = 'SURFACED' | 'PERISCOPE' | 'MEDIUM' | 'DEEP';

export interface SubmarineState {
  readonly specId: string;
  readonly coordinate: AxialCoordinate;
  readonly heading: HexDirection;
  readonly stance: NavigationStance;
  readonly depth: SubmarineDepthLevel;
  readonly fuel: number;
  readonly battery: number;
  readonly hullIntegrity: number;
  readonly armory: TorpedoArmoryState;
}
