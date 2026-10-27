import { describe, expect, it, vi } from 'vitest';
import { fireTorpedoTubeInArmory } from '../../src/core/armory/index.ts';
import type { ITacticalStage } from '../../src/core/contracts/index.ts';
import { createAxialCoordinate } from '../../src/core/hex/index.ts';
import { GameFlowController } from '../../src/flow/index.ts';
import {
  StrategicEngine,
  createInitialAtlanticCampaignState,
} from '../../src/layers/strategic/index.ts';

describe('GameFlowController', () => {
  it('transitions from STRATEGIC_PATROL to TACTICAL_ENCOUNTER and back with EncounterResult', () => {
    const baseState = createInitialAtlanticCampaignState();
    const strategicEngine = new StrategicEngine({
      initialState: {
        ...baseState,
        submarine: {
          ...baseState.submarine,
          coordinate: createAxialCoordinate(3, 5),
        },
      },
    });

    const startEncounterSpy = vi.fn();
    const mockTacticalStage: ITacticalStage = {
      startEncounter: startEncounterSpy,
      executeCommand: () => ({ status: 'IN_PROGRESS' }),
      getViewState: () => ({}),
      getResolution: () => ({ status: 'IN_PROGRESS' }),
    };

    const controller = new GameFlowController({
      strategicEngine,
      tacticalStage: mockTacticalStage,
    });

    expect(controller.getSnapshot().phase).toBe('STRATEGIC_PATROL');

    const tacticalSnapshot = controller.beginTacticalEncounter();
    expect(tacticalSnapshot.phase).toBe('TACTICAL_ENCOUNTER');
    expect(startEncounterSpy).toHaveBeenCalledTimes(1);

    const updatedArmory = fireTorpedoTubeInArmory(
      baseState.submarine.armory,
      'BOW-1',
    );
    const returnedSnapshot = controller.completeEncounter({
      contactId: 'merchant_alpha',
      outcome: 'TARGET_SUNK',
      updatedArmory,
      hullDamageTaken: 0,
      isTargetSunk: true,
      sunkTonnageAwarded: 7100,
      tacticalTurnsElapsed: 3,
    });

    expect(returnedSnapshot.phase).toBe('STRATEGIC_PATROL');
    expect(returnedSnapshot.campaignState.totalSunkTonnage).toBe(7100);
    expect(returnedSnapshot.campaignState.contacts[0]?.isSunk).toBe(true);
  });

  it('rejects beginning an encounter when no merchant is within interception range', () => {
    const controller = new GameFlowController();
    expect(() => controller.beginTacticalEncounter()).toThrow();
  });
});
