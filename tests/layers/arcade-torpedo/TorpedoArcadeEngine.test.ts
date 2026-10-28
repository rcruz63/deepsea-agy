import { describe, expect, it } from 'vitest';
import { createInitialTorpedoArmory } from '../../../src/core/armory/index.ts';
import type { FiringSolutionContext } from '../../../src/core/contracts/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import { TorpedoArcadeEngine } from '../../../src/layers/arcade-torpedo/index.ts';

function createFiringContextForClass(
  specId: 'COASTAL_FREIGHTER' | 'LIBERTY_CARGO' | 'T2_TANKER',
  tonnage: number,
  draftMeters: number,
): FiringSolutionContext {
  const difficulty = getDifficultyConfig('NORMAL');
  return {
    contactId: 'merchant_1',
    armory: createInitialTorpedoArmory(4, 1, 7),
    difficulty,
    targetShip: {
      contactId: 'merchant_1',
      spec: {
        specId,
        className: specId,
        tonnage,
        draftMeters,
        cruiseSpeedKnots: 10,
        isArmedEscort: false,
      },
      heading: 0,
      speedKnots: 10,
    },
    relativeDistanceHexes: 2,
    distanceMeters: 1000,
    targetAngleOnBowDeg: 90,
    trueAngleOnBowDegrees: 90,
    targetBowSide: 'STARBOARD',
    targetSpeedKnots: 10,
    hullIntegrityAtPeriscope: 100,
  };
}

describe('TorpedoArcadeEngine (Multi-Shot Sequence & Armory State)', () => {
  it('sinks a 2-HP LIBERTY_CARGO with two consecutive HIT_HULL shots from BOW-1 and BOW-2', () => {
    const engine = new TorpedoArcadeEngine();
    engine.startAttack(
      createFiringContextForClass('LIBERTY_CARGO', 7100, 7.5),
    );

    engine.updateTdcInput({
      pistolType: 'IMPACT',
      torpedoDepthMeters: 5.0,
      estimatedSpeedKnots: 10,
      estimatedAobDeg: 90,
    });

    // Primer disparo con BOW-1: 1/2 de daño, el blanco sigue a flote y BOW-2 pasa a ser seleccionado automáticamente
    const firstShot = engine.fireSelectedTorpedo(0.99);
    expect(firstShot.outcome).toBe('HIT_HULL');

    const afterFirstSnapshot = engine.getSnapshot();
    expect(afterFirstSnapshot.targetDamageTaken).toBe(1);
    expect(afterFirstSnapshot.isTargetSunk).toBe(false);
    expect(afterFirstSnapshot.armory.bowTubes[0]?.status).toBe('RELOADING');
    expect(afterFirstSnapshot.currentInput.selectedTubeId).toBe('BOW-2');

    // Segundo disparo en la misma sesión de periscopio con BOW-2: 2/2 de daño -> HUNDIDO
    const secondShot = engine.fireSelectedTorpedo(0.99);
    expect(secondShot.outcome).toBe('HIT_HULL');

    const afterSecondSnapshot = engine.getSnapshot();
    expect(afterSecondSnapshot.targetDamageTaken).toBe(2);
    expect(afterSecondSnapshot.isTargetSunk).toBe(true);

    const encounterResult = engine.buildEncounterResult();
    expect(encounterResult.outcome).toBe('TARGET_SUNK');
    expect(encounterResult.isTargetSunk).toBe(true);
    expect(encounterResult.sunkTonnageAwarded).toBe(7100);
    expect(encounterResult.updatedArmory.reserveTorpedoes).toBe(5);
  });

  it('sinks a 2-HP T2_TANKER in a single shot using a MAGNETIC keel hit and allows advancing reload ticks', () => {
    const engine = new TorpedoArcadeEngine();
    engine.startAttack(createFiringContextForClass('T2_TANKER', 10500, 9.5));

    engine.updateTdcInput({
      recognizedShipType: 'T2_TANKER',
      pistolType: 'MAGNETIC',
      torpedoDepthMeters: 10.5,
      estimatedSpeedKnots: 10,
      estimatedAobDeg: 90,
    });

    const shot = engine.fireSelectedTorpedo(0.99);
    expect(shot.outcome).toBe('HIT_KEEL_MAGNETIC');
    expect(engine.getSnapshot().isTargetSunk).toBe(true);

    // Avanzar 4 ticks de 5 minutos en dificultad NORMAL (4 turnos de recarga) completa la recarga de BOW-1
    engine.advanceFiveMinuteReloadTick();
    engine.advanceFiveMinuteReloadTick();
    engine.advanceFiveMinuteReloadTick();
    engine.advanceFiveMinuteReloadTick();
    expect(engine.getSnapshot().armory.bowTubes[0]?.status).toBe('LOADED');
  });
});
