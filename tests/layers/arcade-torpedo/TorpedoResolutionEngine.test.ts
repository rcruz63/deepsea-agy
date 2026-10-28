import { describe, expect, it } from 'vitest';
import { createInitialTorpedoArmory } from '../../../src/core/armory/index.ts';
import type { FiringSolutionContext } from '../../../src/core/contracts/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import {
  calculateLeadAngleOffsetDeg,
  calculateTorpedoRunTimings,
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
    torpedoDepthMeters: 4.5,
    estimatedSpeedKnots: 10,
    estimatedAobDeg: 90,
    ...overrides,
  };
}

describe('TorpedoResolutionEngine (Lead Angle, Run Time & Fuse Physics)', () => {
  const libertyEntry = getShipRecognitionEntry('LIBERTY_CARGO');

  it('resolves HIT_HULL with 2 critical damage on dead-center IMPACT hit and 1 damage on off-center hit', () => {
    const context = createFiringContext();
    const centerInput = createExactTdcInput({
      pistolType: 'IMPACT',
      torpedoDepthMeters: 4.5,
    });

    const centerResolution = resolveTorpedoShot(
      context,
      centerInput,
      libertyEntry,
      0.99,
    );
    expect(centerResolution.outcome).toBe('HIT_HULL');
    expect(centerResolution.damageInflicted).toBe(2);
    expect(centerResolution.longitudinalMissMeters).toBe(0);

    // Con un ligero desvío de velocidad (+5 kn -> +40m de desvío en proa), golpea la proa con 1 punto de daño
    const bowHitResolution = resolveTorpedoShot(
      context,
      createExactTdcInput({ estimatedSpeedKnots: 15, torpedoDepthMeters: 3.0 }),
      libertyEntry,
      0.99,
    );
    expect(bowHitResolution.outcome).toBe('HIT_HULL');
    expect(bowHitResolution.damageInflicted).toBe(1);
    expect(bowHitResolution.longitudinalMissMeters).toBe(40);
  });

  it('calculates longer torpedo run times as distance or lead angle increases', () => {
    const closeRun = calculateTorpedoRunTimings(500, 0);
    const farRun = calculateTorpedoRunTimings(1500, 0);
    const angledFarRun = calculateTorpedoRunTimings(1500, 25);

    expect(farRun.realNavalRunSeconds).toBeGreaterThan(
      closeRun.realNavalRunSeconds,
    );
    expect(angledFarRun.realNavalRunSeconds).toBeGreaterThan(
      farRun.realNavalRunSeconds,
    );

    const starboardLead = calculateLeadAngleOffsetDeg(10, 90, 'STARBOARD');
    const portLead = calculateLeadAngleOffsetDeg(10, 90, 'PORT');
    expect(starboardLead).toBeGreaterThan(0);
    expect(portLead).toBe(-starboardLead);
  });

  it('resolves MISSED_AHEAD and MISSED_ASTERN when longitudinal miss exceeds half ship length', () => {
    const context = createFiringContext({ distanceMeters: 1500 });
    const aheadResolution = resolveTorpedoShot(
      context,
      createExactTdcInput({ estimatedSpeedKnots: 20 }),
      libertyEntry,
      0.99,
    );
    const asternResolution = resolveTorpedoShot(
      context,
      createExactTdcInput({ estimatedSpeedKnots: 0 }),
      libertyEntry,
      0.99,
    );

    expect(aheadResolution.outcome).toBe('MISSED_AHEAD');
    expect(asternResolution.outcome).toBe('MISSED_ASTERN');
  });

  it('resolves GLANCING_DUD only on extreme obliquity (> 70° in NORMAL) or dud roll in HARD', () => {
    // AOB 10° -> oblicuidad |90 - 10| = 80° > 70° (tolerancia en NORMAL)
    const extremeContext = createFiringContext({ targetAngleOnBowDeg: 10 });
    const extremeInput = createExactTdcInput({ estimatedAobDeg: 10 });

    const steepResolution = resolveTorpedoShot(
      extremeContext,
      extremeInput,
      libertyEntry,
      0.99,
    );
    expect(steepResolution.outcome).toBe('GLANCING_DUD');

    const hardContext = createFiringContext({
      difficulty: getDifficultyConfig('HARD'),
    });
    const hardDudResolution = resolveTorpedoShot(
      hardContext,
      createExactTdcInput(),
      libertyEntry,
      0.05,
    );
    expect(hardDudResolution.outcome).toBe('GLANCING_DUD');
  });

  it('resolves HIT_KEEL_MAGNETIC (2 damage) and PASSED_UNDER_KEEL according to depth and pistol', () => {
    const context = createFiringContext();
    const magneticHit = resolveTorpedoShot(
      context,
      createExactTdcInput({ pistolType: 'MAGNETIC', torpedoDepthMeters: 8.5 }),
      libertyEntry,
      0.99,
    );
    const impactUnderKeel = resolveTorpedoShot(
      context,
      createExactTdcInput({ pistolType: 'IMPACT', torpedoDepthMeters: 8.5 }),
      libertyEntry,
      0.99,
    );

    expect(magneticHit.outcome).toBe('HIT_KEEL_MAGNETIC');
    expect(magneticHit.damageInflicted).toBe(2);
    expect(impactUnderKeel.outcome).toBe('PASSED_UNDER_KEEL');
  });
});
