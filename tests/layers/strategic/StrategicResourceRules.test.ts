import { describe, expect, it } from 'vitest';
import {
  findTorpedoTubeById,
  fireTorpedoTubeInArmory,
  setArmoryReloadPaused,
  startTorpedoReloadInArmory,
} from '../../../src/core/armory/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import { createAxialCoordinate } from '../../../src/core/hex/index.ts';
import {
  applyStrategicMovementEnergy,
  completeStrategicTurnArmoryReload,
  createInitialAtlanticCampaignState,
  switchStrategicSubmarineStance,
} from '../../../src/layers/strategic/index.ts';

describe('StrategicResourceRules', () => {
  it('applies surfaced diesel cost and clamps battery recharge at 100', () => {
    const initialSubmarine = {
      ...createInitialAtlanticCampaignState().submarine,
      fuel: 50,
      battery: 85,
    };

    const updated = applyStrategicMovementEnergy(initialSubmarine, {
      coordinate: createAxialCoordinate(9, 1),
      stepDistance: 1,
      fuelDelta: -2,
      batteryDelta: 20,
      resultingHeading: 3,
    });

    expect(updated.fuel).toBe(48);
    expect(updated.battery).toBe(100);
    expect(updated.stance).toBe('SURFACED');
  });

  it('forces the submarine to SURFACED automatically when battery drops to 0 while SUBMERGED', () => {
    const submergedLowBattery = {
      ...createInitialAtlanticCampaignState().submarine,
      stance: 'SUBMERGED' as const,
      depth: 'PERISCOPE' as const,
      battery: 15,
    };

    const afterOneHexMove = applyStrategicMovementEnergy(submergedLowBattery, {
      coordinate: createAxialCoordinate(9, 1),
      stepDistance: 1,
      fuelDelta: 0,
      batteryDelta: -15,
      resultingHeading: 3,
    });

    expect(afterOneHexMove.battery).toBe(0);
    expect(afterOneHexMove.stance).toBe('SURFACED');
    expect(afterOneHexMove.depth).toBe('SURFACED');
  });

  it('prevents submerging when battery is 0', () => {
    const depletedSubmarine = {
      ...createInitialAtlanticCampaignState().submarine,
      battery: 0,
    };

    expect(() =>
      switchStrategicSubmarineStance(depletedSubmarine, 'SUBMERGED'),
    ).toThrow();
  });

  it('completes active torpedo reloads in a single 4-hour strategic turn unless reload is paused', () => {
    const hardDifficulty = getDifficultyConfig('HARD');
    const baseArmory = createInitialAtlanticCampaignState(hardDifficulty).submarine
      .armory;
    const firedBoth = fireTorpedoTubeInArmory(
      fireTorpedoTubeInArmory(baseArmory, 'BOW-1'),
      'STERN-1',
    );
    const reloadingBow = startTorpedoReloadInArmory(
      firedBoth,
      'BOW-1',
      hardDifficulty,
    );
    const pausedBow = setArmoryReloadPaused(reloadingBow, true);
    const reloadingSternActive = startTorpedoReloadInArmory(
      pausedBow,
      'STERN-1',
      hardDifficulty,
    );

    const afterStrategicTurn = completeStrategicTurnArmoryReload(
      reloadingSternActive,
      hardDifficulty,
    );

    expect(findTorpedoTubeById(afterStrategicTurn, 'STERN-1')?.status).toBe('LOADED');
    expect(findTorpedoTubeById(afterStrategicTurn, 'BOW-1')?.status).toBe(
      'RELOADING',
    );
  });
});
