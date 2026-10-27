import { describe, expect, it } from 'vitest';
import {
  advanceTorpedoTubeReloadTurn,
  beginTorpedoTubeReload,
  createLoadedTorpedoTube,
  damageTorpedoTube,
  fireTorpedoFromTube,
  repairTorpedoTubeToEmpty,
  setTorpedoTubeReloadPaused,
} from '../../../src/core/armory/index.ts';

describe('TorpedoTubeTransition', () => {
  it('completes the standard lifecycle LOADED -> EMPTY -> RELOADING -> LOADED', () => {
    const initialTube = createLoadedTorpedoTube('BOW-1', 'BOW');
    const firedTube = fireTorpedoFromTube(initialTube);
    expect(firedTube.status).toBe('EMPTY');

    const reloadingTube = beginTorpedoTubeReload(firedTube, 2);
    expect(reloadingTube.status).toBe('RELOADING');
    expect(reloadingTube.remainingReloadTurns).toBe(2);

    const afterOneTurn = advanceTorpedoTubeReloadTurn(reloadingTube);
    expect(afterOneTurn.status).toBe('RELOADING');
    expect(afterOneTurn.remainingReloadTurns).toBe(1);

    const reloadedTube = advanceTorpedoTubeReloadTurn(afterOneTurn);
    expect(reloadedTube.status).toBe('LOADED');
    expect(reloadedTube.remainingReloadTurns).toBe(0);
  });

  it('prevents firing a tube that is empty, reloading, or damaged', () => {
    const emptyTube = fireTorpedoFromTube(createLoadedTorpedoTube('BOW-1', 'BOW'));
    const reloadingTube = beginTorpedoTubeReload(emptyTube, 3);
    const damagedTube = damageTorpedoTube(reloadingTube);

    expect(() => fireTorpedoFromTube(emptyTube)).toThrow();
    expect(() => fireTorpedoFromTube(reloadingTube)).toThrow();
    expect(() => fireTorpedoFromTube(damagedTube)).toThrow();
  });

  it('freezes reload progress while paused for silent running without losing turns', () => {
    const emptyTube = fireTorpedoFromTube(createLoadedTorpedoTube('STERN-1', 'STERN'));
    const reloadingTube = beginTorpedoTubeReload(emptyTube, 3);
    const afterFirstTurn = advanceTorpedoTubeReloadTurn(reloadingTube);
    const pausedTube = setTorpedoTubeReloadPaused(afterFirstTurn, true);

    const afterSilentTurn = advanceTorpedoTubeReloadTurn(pausedTube);
    expect(afterSilentTurn.remainingReloadTurns).toBe(2);
    expect(afterSilentTurn.isReloadPaused).toBe(true);

    const resumedTube = setTorpedoTubeReloadPaused(afterSilentTurn, false);
    const afterResumedTurn = advanceTorpedoTubeReloadTurn(resumedTube);
    expect(afterResumedTurn.remainingReloadTurns).toBe(1);
  });

  it('cancels reload when damaged and restores to EMPTY upon dockyard repair', () => {
    const emptyTube = fireTorpedoFromTube(createLoadedTorpedoTube('BOW-2', 'BOW'));
    const reloadingTube = beginTorpedoTubeReload(emptyTube, 4);
    const damagedTube = damageTorpedoTube(reloadingTube);

    expect(damagedTube.status).toBe('DAMAGED');
    expect(damagedTube.remainingReloadTurns).toBe(0);
    expect(() => beginTorpedoTubeReload(damagedTube, 4)).toThrow();

    const repairedTube = repairTorpedoTubeToEmpty(damagedTube);
    expect(repairedTube.status).toBe('EMPTY');
  });
});
