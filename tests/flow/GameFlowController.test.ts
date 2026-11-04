import { describe, expect, it, vi } from 'vitest';
import { fireTorpedoTubeInArmory } from '../../src/core/armory/index.ts';
import type { ITacticalStage } from '../../src/core/contracts/index.ts';
import { createAxialCoordinate } from '../../src/core/hex/index.ts';
import { GameFlowController } from '../../src/flow/index.ts';
import { TorpedoArcadeEngine } from '../../src/layers/arcade-torpedo/index.ts';
import {
  StrategicEngine,
  createInitialAtlanticCampaignState,
} from '../../src/layers/strategic/index.ts';
import { HexTacticalEngine } from '../../src/layers/tactical/index.ts';

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
      updatedFuel: 96,
      updatedBattery: 88,
      hullDamageTaken: 0,
      isTargetSunk: true,
      sunkShipIds: ['merchant_alpha'],
      sunkTonnageAwarded: 7100,
      torpedoesFiredInEncounter: 1,
      torpedoHitsInEncounter: 1,
      tacticalTurnsElapsed: 3,
    });

    expect(returnedSnapshot.phase).toBe('STRATEGIC_PATROL');
    expect(returnedSnapshot.campaignState.totalSunkTonnage).toBe(7100);
    expect(returnedSnapshot.campaignState.contacts[0]?.isSunk).toBe(true);
    // Verifica que aparece un nuevo contacto mercante de reemplazo tras hundir al objetivo
    expect(
      returnedSnapshot.campaignState.contacts.some((contact) => !contact.isSunk),
    ).toBe(true);
  });

  it('rejects beginning an encounter when no merchant is within interception range', () => {
    const controller = new GameFlowController();
    expect(() => controller.beginTacticalEncounter()).toThrow();
  });

  it('executes the complete 3-layer cycle: Strategic -> Tactical -> Arcade Torpedo -> Strategic', () => {
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
    const tacticalEngine = new HexTacticalEngine();
    const arcadeEngine = new TorpedoArcadeEngine();
    const controller = new GameFlowController({
      strategicEngine,
      tacticalStage: tacticalEngine,
    });

    // 1. Capa Estratégica -> Táctica (intercepción adyacente a 1 hex -> aparece a 6 hex tácticos y debe cerrar distancia)
    const tacticalSnapshot = controller.beginTacticalEncounter();
    expect(tacticalSnapshot.phase).toBe('TACTICAL_ENCOUNTER');

    // 2. Capa Táctica: maniobrar en superficie 3 hex hacia el mercante para entrar en ventana de tiro (<= 4 hex) y bajar a periscopio
    const viewBeforeClose = tacticalEngine.getViewState();
    const bestCloseOption = viewBeforeClose.reachableOptions.reduce((best, opt) => {
      const distOpt =
        Math.abs(opt.coordinate.q - viewBeforeClose.merchant.coordinate.q) +
        Math.abs(opt.coordinate.r - viewBeforeClose.merchant.coordinate.r);
      const distBest =
        Math.abs(best.coordinate.q - viewBeforeClose.merchant.coordinate.q) +
        Math.abs(best.coordinate.r - viewBeforeClose.merchant.coordinate.r);
      return distOpt < distBest ? opt : best;
    });
    tacticalEngine.executeCommand({
      type: 'MOVE_SUBMARINE',
      destination: bestCloseOption.coordinate,
    });
    tacticalEngine.executeCommand({
      type: 'SET_DEPTH',
      depth: 'PERISCOPE_DEPTH',
    });
    const resolution = tacticalEngine.executeCommand({
      type: 'RAISE_PERISCOPE_AND_LOCK',
    });
    expect(resolution.status).toBe('ENTER_TORPEDO_ATTACK');

    const arcadeSnapshot = controller.applyTacticalResolution(resolution);
    expect(arcadeSnapshot.phase).toBe('ARCADE_TORPEDO');
    if (arcadeSnapshot.phase !== 'ARCADE_TORPEDO') {
      throw new Error('Se esperaba ARCADE_TORPEDO');
    }

    // 3. Capa Arcade: configurar TDC con impacto magnético bajo quilla, apuntar al ángulo sugerido y hundir el blanco
    arcadeEngine.startAttack(arcadeSnapshot.activeFiringSolution);
    arcadeEngine.updateTdcInput({
      recognizedShipType: 'LIBERTY_CARGO',
      pistolType: 'MAGNETIC',
      torpedoDepthMeters: 8.5,
    });
    arcadeEngine.setPeriscopeBearing(arcadeEngine.getSnapshot().tdcSuggestedBearingDeg);

    const shot = arcadeEngine.fireSelectedTorpedo(0.99);
    expect(shot.outcome).toBe('HIT_KEEL_MAGNETIC');

    // 4. Retorno a Capa Estratégica con EncounterResult
    const finalSnapshot = controller.completeEncounter(
      arcadeEngine.buildEncounterResult(2),
    );
    expect(finalSnapshot.phase).toBe('STRATEGIC_PATROL');
    expect(finalSnapshot.campaignState.totalSunkTonnage).toBe(7100);
    expect(
      finalSnapshot.campaignState.submarine.armory.bowTubes[0]?.status,
    ).toBe('RELOADING');
  });
});
