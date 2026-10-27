import type {
  DifficultyConfig,
  DifficultyLevel,
} from '../contracts/DifficultyConfig.ts';

// Define los valores canónicos de los tres perfiles para que todas las capas consuman una única fuente de verdad inmutable

export const DIFFICULTY_PRESETS: Readonly<Record<DifficultyLevel, DifficultyConfig>> = {
  EASY: {
    level: 'EASY',
    hasInfiniteReserveTorpedoes: true,
    reloadTurnsRequired: 2,
    reloadAcousticPenalty: 5,
    impactAngleToleranceDegrees: 70,
    dudProbability: 0,
    asdicAggressivenessMultiplier: 0.75,
    strategicUncertaintyRadiusHexes: 1,
  },
  NORMAL: {
    level: 'NORMAL',
    hasInfiniteReserveTorpedoes: false,
    reloadTurnsRequired: 4,
    reloadAcousticPenalty: 25,
    impactAngleToleranceDegrees: 60,
    dudProbability: 0,
    asdicAggressivenessMultiplier: 1.0,
    strategicUncertaintyRadiusHexes: 2,
  },
  HARD: {
    level: 'HARD',
    hasInfiniteReserveTorpedoes: false,
    reloadTurnsRequired: 5,
    reloadAcousticPenalty: 35,
    impactAngleToleranceDegrees: 50,
    dudProbability: 0.12,
    asdicAggressivenessMultiplier: 1.35,
    strategicUncertaintyRadiusHexes: 3,
  },
};

export function getDifficultyConfig(level: DifficultyLevel): DifficultyConfig {
  return DIFFICULTY_PRESETS[level];
}
