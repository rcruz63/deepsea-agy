import { describe, expect, it } from 'vitest';
import { createInitialTorpedoArmory } from '../../../src/core/armory/index.ts';
import type { FiringSolutionContext } from '../../../src/core/contracts/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import {
  getShipRecognitionEntry,
  resolveTorpedoShot,
  type TdcFiringInput,
} from '../../../src/layers/arcade-torpedo/index.ts';

function createFiringContext(
  overrides: Partial<FiringSolutionContext> = {},
): FiringSolutionContext {
  const difficulty = getDifficultyConfig('NORMAL');
  return {
    contactId: 'merchant_1',
    armory: createInitialTorpedoArmory(4, 1, 7),
    difficulty,
    targetShip: {
      contactId: 'merchant_1',
      spec: {
        specId: 'LIBERTY_CARGO',
        className: 'Mercante Estándar (Liberty)',
        tonnage: 7100,
        draftMeters: 7.5,
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
    ...overrides,
  };
}

function createExactTdcInput(
  overrides: Partial<TdcFiringInput> = {},
): TdcFiringInput {
  return {
    selectedTubeId: 'BOW-1',
    recognizedShipType: 'LIBERTY_CARGO',
    pistolType: 'IMPACT',
    torpedoDepthMeters: 5.0,
    estimatedSpeedKnots: 10,
    estimatedAobDeg: 90,
    ...overrides,
  };
}

describe('TorpedoResolutionEngine (TDC Trigonometry & Fuse Physics)', () => {
  const libertyEntry = getShipRecognitionEntry('LIBERTY_CARGO');

  it('resolves HIT_HULL with 1 damage when TDC estimation is accurate and depth <= draft', () => {
    const context = createFiringContext();
    const input = createExactTdcInput({
      pistolType: 'IMPACT',
      torpedoDepthMeters: 6.0,
    });

    const resolution = resolveTorpedoShot(context, input, libertyEntry, 0.99);

    expect(resolution.outcome).toBe('HIT_HULL');
    expect(resolution.damageInflicted).toBe(1);
    expect(resolution.longitudinalMissMeters).toBe(0);
    expect(resolution.impactObliquityDeg).toBe(0);
  });

  it('resolves MISSED_AHEAD when player overestimates target speed beyond half ship length', () => {
    const context = createFiringContext({ distanceMeters: 1500 });
    const input = createExactTdcInput({
      estimatedSpeedKnots: 20,
    });

    const resolution = resolveTorpedoShot(context, input, libertyEntry, 0.99);

    expect(resolution.outcome).toBe('MISSED_AHEAD');
    expect(resolution.damageInflicted).toBe(0);
    expect(resolution.longitudinalMissMeters).toBeGreaterThan(67.5);
  });

  it('resolves MISSED_ASTERN when player underestimates target speed beyond half ship length', () => {
    const context = createFiringContext({ distanceMeters: 1500 });
    const input = createExactTdcInput({
      estimatedSpeedKnots: 0,
    });

    const resolution = resolveTorpedoShot(context, input, libertyEntry, 0.99);

    expect(resolution.outcome).toBe('MISSED_ASTERN');
    expect(resolution.damageInflicted).toBe(0);
    expect(resolution.longitudinalMissMeters).toBeLessThan(-67.5);
  });

  it('resolves GLANCING_DUD when impact obliquity exceeds difficulty tolerance or dud roll triggers', () => {
    // AOB 20° -> oblicuidad |90 - 20| = 70° > 60° (tolerancia en NORMAL)
    const steepAngleContext = createFiringContext({ targetAngleOnBowDeg: 20 });
    const steepInput = createExactTdcInput({ estimatedAobDeg: 20 });

    const steepResolution = resolveTorpedoShot(
      steepAngleContext,
      steepInput,
      libertyEntry,
      0.99,
    );
    expect(steepResolution.outcome).toBe('GLANCING_DUD');
    expect(steepResolution.damageInflicted).toBe(0);

    // En HARD (dudProbability = 0.25), un randomRoll de 0.10 provoca fallo de espoleta incluso a 90°
    const hardContext = createFiringContext({
      difficulty: getDifficultyConfig('HARD'),
    });
    const hardDudResolution = resolveTorpedoShot(
      hardContext,
      createExactTdcInput(),
      libertyEntry,
      0.1,
    );
    expect(hardDudResolution.outcome).toBe('GLANCING_DUD');
  });

  it('resolves HIT_KEEL_MAGNETIC (2 damage) when MAGNETIC pistol passes within magnetic window beneath keel', () => {
    // Calado de LIBERTY_CARGO = 7.5m; ventana magnética en NORMAL = +1.5m (7.5m < cota <= 9.0m)
    const context = createFiringContext();
    const magneticInput = createExactTdcInput({
      pistolType: 'MAGNETIC',
      torpedoDepthMeters: 8.5,
    });

    const resolution = resolveTorpedoShot(
      context,
      magneticInput,
      libertyEntry,
      0.99,
    );

    expect(resolution.outcome).toBe('HIT_KEEL_MAGNETIC');
    expect(resolution.damageInflicted).toBe(2);
  });

  it('resolves PASSED_UNDER_KEEL when IMPACT pistol is set below draft or depth exceeds magnetic window', () => {
    const context = createFiringContext();
    const impactUnderKeel = createExactTdcInput({
      pistolType: 'IMPACT',
      torpedoDepthMeters: 8.5,
    });
    const tooDeepMagnetic = createExactTdcInput({
      pistolType: 'MAGNETIC',
      torpedoDepthMeters: 10.5,
    });

    expect(
      resolveTorpedoShot(context, impactUnderKeel, libertyEntry, 0.99).outcome,
    ).toBe('PASSED_UNDER_KEEL');
    expect(
      resolveTorpedoShot(context, tooDeepMagnetic, libertyEntry, 0.99).outcome,
    ).toBe('PASSED_UNDER_KEEL');
  });
});
