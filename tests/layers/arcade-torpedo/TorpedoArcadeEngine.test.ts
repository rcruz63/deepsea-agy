import { describe, expect, it } from 'vitest';
import { createInitialTorpedoArmory } from '../../../src/core/armory/index.ts';
import type { FiringSolutionContext } from '../../../src/core/contracts/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import { TorpedoArcadeEngine } from '../../../src/layers/arcade-torpedo/index.ts';

function createFiringContextForClass(
  specId: 'COASTAL_FREIGHTER' | 'LIBERTY_CARGO' | 'T2_TANKER',
  tonnage: number,
  draftMeters: number,
  rawAobDeg = 90,
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
    targetAngleOnBowDeg: rawAobDeg,
    trueAngleOnBowDegrees: rawAobDeg,
    targetBowSide: 'STARBOARD',
    targetSpeedKnots: 10,
    hullIntegrityAtPeriscope: 100,
  };
}

describe('TorpedoArcadeEngine (Periscope Lead Aiming, Torpedo Run & Multi-Shot)', () => {
  it('damages a 2-HP LIBERTY_CARGO with an off-center HIT_HULL (1/2) and sinks it with a second shot', () => {
    const engine = new TorpedoArcadeEngine();
    engine.startAttack(
      createFiringContextForClass('LIBERTY_CARGO', 7100, 7.5),
    );

    // Disparo ligeramente adelantado (+40m, hacia proa) con cota 4.5m -> 1/2 de daño
    engine.updateTdcInput({
      pistolType: 'IMPACT',
      torpedoDepthMeters: 4.5,
      estimatedSpeedKnots: 15,
      estimatedAobDeg: 90,
    });

    const firstShot = engine.fireSelectedTorpedo(0.99);
    expect(firstShot.outcome).toBe('HIT_HULL');
    expect(firstShot.damageInflicted).toBe(1);

    const afterFirstSnapshot = engine.getSnapshot();
    expect(afterFirstSnapshot.targetDamageTaken).toBe(1);
    expect(afterFirstSnapshot.isTargetSunk).toBe(false);
    expect(afterFirstSnapshot.currentInput.selectedTubeId).toBe('BOW-2');

    // Segundo disparo con BOW-2 a cota 3.0m -> 2/2 de daño -> HUNDIDO
    engine.updateTdcInput({ torpedoDepthMeters: 3.0 });
    const secondShot = engine.fireSelectedTorpedo(0.99);
    expect(secondShot.outcome).toBe('HIT_HULL');

    const afterSecondSnapshot = engine.getSnapshot();
    expect(afterSecondSnapshot.isTargetSunk).toBe(true);
    expect(engine.buildEncounterResult().sunkTonnageAwarded).toBe(7100);
  });

  it('normalizes bow/stern tactical angles (0°/180°) so IMPACT torpedoes at 4.5m, 3m, and 2m always detonate', () => {
    const engine = new TorpedoArcadeEngine();
    // Incluso entrando con AOB = 0° desde la misma fila r=7 del mapa táctico, el periscopio garantiza ángulo óptimo de través
    engine.startAttack(
      createFiringContextForClass('COASTAL_FREIGHTER', 2500, 4.5, 0),
    );

    const initialSnapshot = engine.getSnapshot();
    expect(initialSnapshot.firingContext.targetAngleOnBowDeg).toBe(75);
    expect(
      Math.abs(90 - initialSnapshot.firingContext.targetAngleOnBowDeg),
    ).toBeLessThanOrEqual(
      initialSnapshot.firingContext.difficulty.impactAngleToleranceDegrees,
    );

    // Avanza el barco durante 25 segundos mientras el jugador gira el periscopio a +30°: verifica que NO se teletransporta a la izquierda
    engine.setPeriscopeBearing(30);
    for (let step = 0; step < 25; step += 1) {
      engine.stepSimulation(1.0);
    }
    expect(engine.getSnapshot().targetBearingDeg).toBeGreaterThan(0);

    // Apunta con adelanto delante de la proa (+14°) y lanza con espoleta de IMPACTO a 3.0m de profundidad
    const currentTargetBearing = engine.getSnapshot().targetBearingDeg;
    engine.setPeriscopeBearing(currentTargetBearing + 14.0);
    engine.updateTdcInput({ pistolType: 'IMPACT', torpedoDepthMeters: 3.0 });

    const run = engine.launchTorpedoRun();
    expect(run).not.toBeNull();

    const finalSnapshot = engine.stepSimulation(5.0, 0.99);
    expect(finalSnapshot.lastShotResolution?.outcome).toBe('HIT_HULL');
    expect(finalSnapshot.isTargetSunk).toBe(true);
  });
});
