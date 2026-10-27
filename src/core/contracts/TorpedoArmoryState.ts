// Modela cada tubo lanzatorpedos como una máquina de estados individual porque el tiempo y el ruido de recarga condicionan la postura táctica

export type TorpedoTubeStatus = 'LOADED' | 'RELOADING' | 'EMPTY' | 'DAMAGED';

export type TorpedoTubeMount = 'BOW' | 'STERN';

export interface TorpedoTubeState {
  readonly tubeId: string;
  readonly mount: TorpedoTubeMount;
  readonly status: TorpedoTubeStatus;
  readonly remainingReloadTurns: number;
  // Permite ordenar silencio mecánico en aproximación táctica o evasión ASW sin perder el progreso de recarga ya acumulado
  readonly isReloadPaused: boolean;
}

export interface TorpedoArmoryState {
  readonly bowTubes: readonly TorpedoTubeState[];
  readonly sternTubes: readonly TorpedoTubeState[];
  readonly reserveTorpedoes: number;
}
