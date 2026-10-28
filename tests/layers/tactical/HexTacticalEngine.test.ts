import { describe, expect, it } from 'vitest';
import {
  findTorpedoTubeById,
  fireTorpedoTubeInArmory,
  startTorpedoReloadInArmory,
} from '../../../src/core/armory/index.ts';
import type { EncounterContext } from '../../../src/core/contracts/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import { createAxialCoordinate } from '../../../src/core/hex/index.ts';
import {
  ATLANTIC_SECTOR_THEATER,
  createInitialAtlanticCampaignState,
} from '../../../src/layers/strategic/index.ts';
import { HexTacticalEngine } from '../../../src/layers/tactical/index.ts';

function createTestEncounterContext(): EncounterContext {
  const campaign = createInitialAtlanticCampaignState(
    getDifficultyConfig('NORMAL'),
  );
  return {
    submarine: campaign.submarine,
    difficulty: campaign.difficulty,
    targetShip: {
      contactId: 'merchant_alpha',
      spec: ATLANTIC_SECTOR_THEATER.surfaceShipCatalog[0]!,
      heading: 0,
      speedKnots: 10,
    },
  };
}

describe('HexTacticalEngine', () => {
  it('advances 1 reload tick per 5-minute tactical turn and moves the merchant 1 hex', () => {
    const baseContext = createTestEncounterContext();
    const firedArmory = fireTorpedoTubeInArmory(
      baseContext.submarine.armory,
      'BOW-1',
    );
    const reloadingArmory = startTorpedoReloadInArmory(
      firedArmory,
      'BOW-1',
      baseContext.difficulty,
    );

    const engine = new HexTacticalEngine({
      initialSubmarineCoordinate: createAxialCoordinate(4, 10),
      initialMerchantCoordinate: createAxialCoordinate(4, 7),
    });
    engine.startEncounter({
      ...baseContext,
      submarine: { ...baseContext.submarine, armory: reloadingArmory },
    });

    const resolution = engine.executeCommand({
      type: 'MOVE_SUBMARINE',
      destination: createAxialCoordinate(4, 9),
    });

    expect(resolution.status).toBe('IN_PROGRESS');
    const state = engine.getViewState();
    expect(state.turnNumber).toBe(2);
    expect(state.merchant.coordinate).toEqual({ q: 5, r: 7 });
    // En NORMAL empieza con 4 turnos; tras 1 turno táctico de 5m quedan 3 ticks
    expect(
      findTorpedoTubeById(state.submarine.armory, 'BOW-1')?.remainingReloadTurns,
    ).toBe(3);
  });

  it('emits FiringSolutionContext with distanceMeters, targetAngleOnBowDeg, and targetBowSide when locking target', () => {
    const engine = new HexTacticalEngine({
      initialSubmarineCoordinate: createAxialCoordinate(3, 9),
      initialMerchantCoordinate: createAxialCoordinate(4, 7),
    });
    engine.startEncounter(createTestEncounterContext());
    engine.executeCommand({ type: 'SET_DEPTH', depth: 'PERISCOPE_DEPTH' });

    const resolution = engine.executeCommand({
      type: 'RAISE_PERISCOPE_AND_LOCK',
    });

    expect(resolution.status).toBe('ENTER_TORPEDO_ATTACK');
    if (resolution.status === 'ENTER_TORPEDO_ATTACK') {
      expect(resolution.firingContext.distanceMeters).toBe(1000);
      expect(resolution.firingContext.targetAngleOnBowDeg).toBe(90);
      expect(resolution.firingContext.targetBowSide).toBe('STARBOARD');
      expect(resolution.firingContext.targetSpeedKnots).toBe(10);
    }
  });

  it('automatically resolves END_ENCOUNTER when merchant escapes off the 15x15 map edge', () => {
    const engine = new HexTacticalEngine({
      initialSubmarineCoordinate: createAxialCoordinate(4, 9),
      initialMerchantCoordinate: createAxialCoordinate(14, 0),
    });
    engine.startEncounter(createTestEncounterContext());

    const resolution = engine.executeCommand({
      type: 'MOVE_SUBMARINE',
      destination: createAxialCoordinate(4, 9),
    });

    expect(resolution.status).toBe('END_ENCOUNTER');
    if (resolution.status === 'END_ENCOUNTER') {
      expect(resolution.encounterResult.outcome).toBe('DISENGAGED');
      expect(resolution.encounterResult.isTargetSunk).toBe(false);
    }
  });
});
