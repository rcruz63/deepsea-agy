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
  submarineRelativeBearingDeg?: number,
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
    ...(submarineRelativeBearingDeg !== undefined
      ? { submarineRelativeBearingDeg }
      : {}),
  };
}

describe('TorpedoArcadeEngine (360° Periscope Arcs, Rudder Steering & Torpedo Run)', () => {
  it('damages a 2-HP LIBERTY_CARGO with an off-center HIT_HULL (1/2) and sinks it with a second shot', () => {
    const engine = new TorpedoArcadeEngine();
    engine.startAttack(
      createFiringContextForClass('LIBERTY_CARGO', 7100, 7.5),
    );

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

    engine.updateTdcInput({ torpedoDepthMeters: 3.0 });
    const secondShot = engine.fireSelectedTorpedo(0.99);
    expect(secondShot.outcome).toBe('HIT_HULL');
    expect(engine.getSnapshot().isTargetSunk).toBe(true);
    expect(engine.buildEncounterResult().sunkTonnageAwarded).toBe(7100);
  });

  it('normalizes bow/stern tactical angles (0°/180°) so IMPACT torpedoes at 4.5m, 3m, and 2m always detonate', () => {
    const engine = new TorpedoArcadeEngine();
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

    // El barco gira en 360° sin teletransportarse jamás al superar +30°
    engine.setPeriscopeBearing(30);
    for (let step = 0; step < 25; step += 1) {
      engine.stepSimulation(1.0);
    }
    expect(engine.getSnapshot().targetBearingDeg).toBeGreaterThan(0);

    const currentTargetBearing = engine.getSnapshot().targetBearingDeg;
    engine.setPeriscopeBearing(currentTargetBearing + 14.0);
    engine.updateTdcInput({ pistolType: 'IMPACT', torpedoDepthMeters: 3.0 });

    const run = engine.launchTorpedoRun();
    expect(run).not.toBeNull();

    const finalSnapshot = engine.stepSimulation(5.0, 0.99);
    expect(finalSnapshot.lastShotResolution?.outcome).toBe('HIT_HULL');
    expect(finalSnapshot.isTargetSunk).toBe(true);
  });

  it('enforces BOW (±45°), DEAD_ZONE, and STERN (±135°..180°) arcs and lets steerSubmarine align the target', () => {
    const engine = new TorpedoArcadeEngine();
    // El contacto aparece en marcación +60° (zona muerta lateral de estribor) desde el mapa táctico
    engine.startAttack(
      createFiringContextForClass('COASTAL_FREIGHTER', 2500, 4.5, 90, 60),
    );

    expect(engine.getSnapshot().targetBearingDeg).toBe(60);

    // Si giramos el periscopio a +74° para apuntar al barco en la zona lateral, estamos en DEAD_ZONE y el disparo se bloquea
    engine.setPeriscopeBearing(74);
    expect(engine.getSnapshot().activeFiringArc).toBe('DEAD_ZONE');
    expect(engine.launchTorpedoRun()).toBeNull();

    // Si giramos a popa (160°), se habilita automáticamente STERN-1 y se bloquean los tubos de proa
    engine.setPeriscopeBearing(160);
    expect(engine.getSnapshot().activeFiringArc).toBe('STERN');
    expect(engine.getSnapshot().currentInput.selectedTubeId).toBe('STERN-1');

    // Viramos el timón del submarino +40° a estribor: el barco pasa de +60° a +20° (dentro del arco de proa ±45°)
    engine.steerSubmarine(40);
    expect(engine.getSnapshot().targetBearingDeg).toBe(20);

    // Apuntamos a +34° (dentro del arco de proa BOW ±45°): ahora se selecciona BOW-1 y el torpedo puede dispararse
    engine.setPeriscopeBearing(34);
    expect(engine.getSnapshot().activeFiringArc).toBe('BOW');
    expect(engine.getSnapshot().currentInput.selectedTubeId).toBe('BOW-1');
    expect(engine.launchTorpedoRun()).not.toBeNull();
  });
});
