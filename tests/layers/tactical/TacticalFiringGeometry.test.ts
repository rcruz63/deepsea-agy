import { describe, expect, it } from 'vitest';
import { createInitialTorpedoArmory } from '../../../src/core/armory/index.ts';
import { createAxialCoordinate } from '../../../src/core/hex/index.ts';
import { ATLANTIC_SECTOR_THEATER } from '../../../src/layers/strategic/index.ts';
import {
  type TacticalMerchantSnapshot,
  type TacticalSubmarineSnapshot,
  calculateTargetAngleOnBow,
  evaluateTacticalFiringTelemetry,
} from '../../../src/layers/tactical/index.ts';

function createEastboundMerchant(): TacticalMerchantSnapshot {
  return {
    contactId: 'merchant_alpha',
    spec: ATLANTIC_SECTOR_THEATER.surfaceShipCatalog[0]!,
    coordinate: createAxialCoordinate(4, 7),
    heading: 0,
    speedKnots: 10,
  };
}

function createSubmarineAt(
  q: number,
  r: number,
  depth: TacticalSubmarineSnapshot['depth'] = 'PERISCOPE_DEPTH',
): TacticalSubmarineSnapshot {
  return {
    coordinate: createAxialCoordinate(q, r),
    heading: 5,
    depth,
    fuel: 90,
    battery: 90,
    hullIntegrity: 100,
    armory: createInitialTorpedoArmory(4, 1, 7),
  };
}

describe('TacticalFiringGeometry', () => {
  it('computes 0 deg AOB ahead of bow, 180 deg astern, and 90 deg beam on PORT and STARBOARD', () => {
    const merchant = createEastboundMerchant();

    // Directamente a proa del mercante rumbo Este (0) -> AOB 0°
    const aheadBow = calculateTargetAngleOnBow(
      createAxialCoordinate(7, 7),
      merchant.coordinate,
      merchant.heading,
    );
    expect(aheadBow.targetAngleOnBowDeg).toBe(0);

    // Directamente a popa del mercante -> AOB 180°
    const astern = calculateTargetAngleOnBow(
      createAxialCoordinate(1, 7),
      merchant.coordinate,
      merchant.heading,
    );
    expect(astern.targetAngleOnBowDeg).toBe(180);

    // Al Sur del mercante rumbo Este (q=3, r=9 anula dx respecto a q=4, r=7): costado de Estribor (STARBOARD) a 90°
    const starboardBeam = calculateTargetAngleOnBow(
      createAxialCoordinate(3, 9),
      merchant.coordinate,
      merchant.heading,
    );
    expect(starboardBeam).toEqual({
      targetAngleOnBowDeg: 90,
      targetBowSide: 'STARBOARD',
    });

    // Al Norte del mercante rumbo Este (q=5, r=5): costado de Babor (PORT) a 90°
    const portBeam = calculateTargetAngleOnBow(
      createAxialCoordinate(5, 5),
      merchant.coordinate,
      merchant.heading,
    );
    expect(portBeam).toEqual({
      targetAngleOnBowDeg: 90,
      targetBowSide: 'PORT',
    });
  });

  it('converts hex distance to meters (1 hex = 500m) and enables firing only at 1..4 hexes in valid depth', () => {
    const merchant = createEastboundMerchant();

    // A 2 hexágonos en PERISCOPE_DEPTH -> 1000 metros, listo para disparar
    const inRangePeriscope = evaluateTacticalFiringTelemetry(
      createSubmarineAt(3, 9, 'PERISCOPE_DEPTH'),
      merchant,
    );
    expect(inRangePeriscope.distanceHexes).toBe(2);
    expect(inRangePeriscope.distanceMeters).toBe(1000);
    expect(inRangePeriscope.canRaisePeriscopeToFire).toBe(true);

    // En cota DEEP no se puede subir periscopio aunque esté a 2 hexágonos
    const inRangeDeep = evaluateTacticalFiringTelemetry(
      createSubmarineAt(3, 9, 'DEEP'),
      merchant,
    );
    expect(inRangeDeep.canRaisePeriscopeToFire).toBe(false);

    // A 5 hexágonos (2500m) está fuera de la ventana óptima (1..4 hex)
    const tooFar = evaluateTacticalFiringTelemetry(
      createSubmarineAt(4, 12, 'PERISCOPE_DEPTH'),
      merchant,
    );
    expect(tooFar.distanceHexes).toBe(5);
    expect(tooFar.distanceMeters).toBe(2500);
    expect(tooFar.canRaisePeriscopeToFire).toBe(false);
  });
});
