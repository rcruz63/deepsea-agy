import { describe, expect, it } from 'vitest';
import {
  findTorpedoTubeById,
  fireTorpedoTubeInArmory,
} from '../../../src/core/armory/index.ts';
import { createAxialCoordinate } from '../../../src/core/hex/index.ts';
import {
  StrategicEngine,
  createInitialAtlanticCampaignState,
} from '../../../src/layers/strategic/index.ts';

describe('StrategicEngine', () => {
  it('advances turn, updates resources, completes tube reload, and moves merchant 1 hex', () => {
    const baseState = createInitialAtlanticCampaignState();
    const firedArmory = fireTorpedoTubeInArmory(
      baseState.submarine.armory,
      'BOW-1',
    );
    const engine = new StrategicEngine({
      initialState: {
        ...baseState,
        submarine: {
          ...baseState.submarine,
          battery: 70,
          armory: firedArmory,
        },
      },
    });

    engine.startTubeReload('BOW-1');
    expect(
      findTorpedoTubeById(engine.getState().submarine.armory, 'BOW-1')?.status,
    ).toBe('RELOADING');

    // Avanza 1 hexágono hacia el Oeste desde Lorient (10,1) -> (9,1)
    const nextState = engine.executeTurnMove(createAxialCoordinate(9, 1));

    expect(nextState.turnNumber).toBe(2);
    expect(nextState.submarine.coordinate).toEqual({ q: 9, r: 1 });
    expect(nextState.submarine.fuel).toBe(98);
    expect(nextState.submarine.battery).toBe(90);
    expect(findTorpedoTubeById(nextState.submarine.armory, 'BOW-1')?.status).toBe(
      'LOADED',
    );
    expect(nextState.contacts[0]?.coordinate).toEqual({ q: 4, r: 5 });
  });

  it('detects interception when submarine and merchant are on adjacent or identical hexes (distance <= 1)', () => {
    const baseState = createInitialAtlanticCampaignState();
    const engineNearMerchant = new StrategicEngine({
      initialState: {
        ...baseState,
        submarine: {
          ...baseState.submarine,
          coordinate: createAxialCoordinate(3, 4),
        },
      },
    });

    const context = engineNearMerchant.createEncounterContext();
    expect(context).not.toBeNull();
    expect(context?.targetShip.contactId).toBe('merchant_alpha');
    expect(context?.targetShip.spec.tonnage).toBe(7100);
  });

  it('updates sunk tonnage, armory, and merchant status when applying EncounterResult', () => {
    const engine = new StrategicEngine();
    const initialArmory = engine.getState().submarine.armory;
    const armoryAfterShot = fireTorpedoTubeInArmory(initialArmory, 'BOW-1');

    const updatedState = engine.applyEncounterResult({
      contactId: 'merchant_alpha',
      outcome: 'TARGET_SUNK',
      updatedArmory: armoryAfterShot,
      hullDamageTaken: 10,
      isTargetSunk: true,
      sunkTonnageAwarded: 7100,
      tacticalTurnsElapsed: 4,
    });

    expect(updatedState.totalSunkTonnage).toBe(7100);
    expect(updatedState.submarine.hullIntegrity).toBe(90);
    expect(updatedState.contacts[0]?.isSunk).toBe(true);
    expect(
      findTorpedoTubeById(updatedState.submarine.armory, 'BOW-1')?.status,
    ).toBe('EMPTY');
  });
});
