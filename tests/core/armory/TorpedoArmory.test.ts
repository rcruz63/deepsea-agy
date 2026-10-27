import { describe, expect, it } from 'vitest';
import {
  advanceArmoryReloadTurn,
  calculateArmoryReloadNoise,
  canStartTorpedoReloadInArmory,
  createInitialTorpedoArmory,
  findTorpedoTubeById,
  fireTorpedoTubeInArmory,
  setArmoryReloadPaused,
  startTorpedoReloadInArmory,
} from '../../../src/core/armory/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';

describe('TorpedoArmory', () => {
  it('initializes independent bow and stern tube batteries with reserve stock', () => {
    const armory = createInitialTorpedoArmory(4, 1, 7);

    expect(armory.bowTubes).toHaveLength(4);
    expect(armory.sternTubes).toHaveLength(1);
    expect(armory.reserveTorpedoes).toBe(7);
    expect(findTorpedoTubeById(armory, 'BOW-4')?.status).toBe('LOADED');
    expect(findTorpedoTubeById(armory, 'STERN-1')?.status).toBe('LOADED');
  });

  it('consumes finite reserves and applies standard 4-turn reload in NORMAL difficulty', () => {
    const normalDifficulty = getDifficultyConfig('NORMAL');
    const initialArmory = createInitialTorpedoArmory(4, 1, 1);

    const afterFiringBow = fireTorpedoTubeInArmory(initialArmory, 'BOW-1');
    const afterFiringStern = fireTorpedoTubeInArmory(afterFiringBow, 'STERN-1');

    const reloadingArmory = startTorpedoReloadInArmory(
      afterFiringStern,
      'BOW-1',
      normalDifficulty,
    );

    expect(reloadingArmory.reserveTorpedoes).toBe(0);
    expect(findTorpedoTubeById(reloadingArmory, 'BOW-1')?.remainingReloadTurns).toBe(4);
    expect(
      canStartTorpedoReloadInArmory(reloadingArmory, 'STERN-1', normalDifficulty),
    ).toBe(false);
    expect(() =>
      startTorpedoReloadInArmory(reloadingArmory, 'STERN-1', normalDifficulty),
    ).toThrow();
  });

  it('preserves reserve count and reloads in 2 turns under EASY infinite-reserve rules', () => {
    const easyDifficulty = getDifficultyConfig('EASY');
    const depletedArmory = createInitialTorpedoArmory(2, 1, 0);
    const firedArmory = fireTorpedoTubeInArmory(depletedArmory, 'BOW-1');

    expect(canStartTorpedoReloadInArmory(firedArmory, 'BOW-1', easyDifficulty)).toBe(true);

    const reloadingArmory = startTorpedoReloadInArmory(
      firedArmory,
      'BOW-1',
      easyDifficulty,
    );
    expect(reloadingArmory.reserveTorpedoes).toBe(0);

    const afterOneTurn = advanceArmoryReloadTurn(reloadingArmory);
    const afterTwoTurns = advanceArmoryReloadTurn(afterOneTurn);
    expect(findTorpedoTubeById(afterTwoTurns, 'BOW-1')?.status).toBe('LOADED');
  });

  it('emits difficulty-scaled mechanical noise while reloading unless paused for silent running', () => {
    const hardDifficulty = getDifficultyConfig('HARD');
    const firedArmory = fireTorpedoTubeInArmory(
      createInitialTorpedoArmory(4, 1, 3),
      'STERN-1',
    );
    expect(calculateArmoryReloadNoise(firedArmory, hardDifficulty)).toBe(0);

    const reloadingArmory = startTorpedoReloadInArmory(
      firedArmory,
      'STERN-1',
      hardDifficulty,
    );
    expect(calculateArmoryReloadNoise(reloadingArmory, hardDifficulty)).toBe(35);

    const silentArmory = setArmoryReloadPaused(reloadingArmory, true);
    expect(calculateArmoryReloadNoise(silentArmory, hardDifficulty)).toBe(0);
  });
});
