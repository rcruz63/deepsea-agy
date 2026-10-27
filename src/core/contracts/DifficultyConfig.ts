// Centraliza los modificadores numéricos de dificultad para que ninguna capa codifique tolerancias, reservas o penalizaciones acústicas a fuego

export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD';

export interface DifficultyConfig {
  readonly level: DifficultyLevel;
  readonly hasInfiniteReserveTorpedoes: boolean;
  readonly reloadTurnsRequired: number;
  readonly reloadAcousticPenalty: number;
  readonly impactAngleToleranceDegrees: number;
  readonly dudProbability: number;
  readonly asdicAggressivenessMultiplier: number;
  readonly strategicUncertaintyRadiusHexes: number;
}
