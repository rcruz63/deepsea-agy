import { describe, expect, it } from 'vitest';
import type { EncounterContext } from '../../../src/core/contracts/index.ts';
import { getDifficultyConfig } from '../../../src/core/difficulty/DifficultyPresets.ts';
import {
  HEX_DIRECTIONS,
  type HexDirection,
  areAxialCoordinatesEqual,
  calculateHexDistance,
  createAxialCoordinate,
  getHexNeighbor,
} from '../../../src/core/hex/index.ts';
import { GameFlowController } from '../../../src/flow/index.ts';
import {
  ATLANTIC_SECTOR_THEATER,
  StrategicEngine,
  createInitialAtlanticCampaignState,
} from '../../../src/layers/strategic/index.ts';
import {
  HexTacticalEngine,
  SUBMARINE_ADJACENT_DISTANCE_HEXES,
  SUBMARINE_AMBUSH_DISTANCE_HEXES,
  computeTacticalEncounterSpawn,
  createTacticalHexGrid,
} from '../../../src/layers/tactical/index.ts';

function buildEncounterForHeading(
  merchantHeading: HexDirection,
  interceptionDistanceHexes: 0 | 1,
  approachDirection: HexDirection,
): EncounterContext {
  const campaign = createInitialAtlanticCampaignState(getDifficultyConfig('NORMAL'));
  const snapshot = {
    contactId: 'merchant_alpha',
    spec: ATLANTIC_SECTOR_THEATER.surfaceShipCatalog[0]!,
    heading: merchantHeading,
    speedKnots: 10,
  };
  return {
    submarine: campaign.submarine,
    difficulty: campaign.difficulty,
    ships: [snapshot],
    targetShip: snapshot,
    timeOfDay: 'NIGHT',
    weather: 'OVERCAST',
    interceptionDistanceHexes,
    approachDirection,
  };
}

function countMerchantStepsInsideBoard(merchantHeading: HexDirection): number {
  const grid = createTacticalHexGrid();
  const spawn = computeTacticalEncounterSpawn(
    grid,
    buildEncounterForHeading(merchantHeading, 1, 1),
  );
  let cursor = spawn.merchantCoordinate;
  let steps = 0;

  while (steps < 25) {
    const next = getHexNeighbor(cursor, merchantHeading);
    if (!grid.hasCell(next)) {
      return steps;
    }
    cursor = next;
    steps += 1;
  }
  return steps;
}

describe('TacticalSpawnGeometry & Escape Consequences', () => {
  it('guarantees >= 10 tactical turns of merchant travel across the 15x15 board for all 6 headings', () => {
    for (const heading of HEX_DIRECTIONS) {
      expect(countMerchantStepsInsideBoard(heading)).toBeGreaterThanOrEqual(10);
    }
  });

  it('places submarine at 4 hexes for same-hex ambush (dist 0) and 6 hexes for adjacent interception (dist 1)', () => {
    const grid = createTacticalHexGrid();
    const ambushSpawn = computeTacticalEncounterSpawn(
      grid,
      buildEncounterForHeading(0, 0, 1),
    );
    const adjacentSouthSpawn = computeTacticalEncounterSpawn(
      grid,
      buildEncounterForHeading(0, 1, 1),
    );
    const adjacentNorthSpawn = computeTacticalEncounterSpawn(
      grid,
      buildEncounterForHeading(0, 1, 4),
    );

    expect(
      calculateHexDistance(ambushSpawn.submarineCoordinate, ambushSpawn.merchantCoordinate),
    ).toBe(SUBMARINE_AMBUSH_DISTANCE_HEXES);
    expect(
      calculateHexDistance(
        adjacentSouthSpawn.submarineCoordinate,
        adjacentSouthSpawn.merchantCoordinate,
      ),
    ).toBe(SUBMARINE_ADJACENT_DISTANCE_HEXES);
    expect(
      areAxialCoordinatesEqual(
        adjacentSouthSpawn.submarineCoordinate,
        adjacentNorthSpawn.submarineCoordinate,
      ),
    ).toBe(false);
  });

  it('persists tactical fuel/battery and advances escaped contact +1 hex with 1-turn re-interception cooldown', () => {
    const baseState = createInitialAtlanticCampaignState();
    const strategicEngine = new StrategicEngine({
      initialState: {
        ...baseState,
        submarine: {
          ...baseState.submarine,
          coordinate: createAxialCoordinate(4, 4),
          stance: 'SUBMERGED',
          depth: 'PERISCOPE',
          fuel: 94.5,
          battery: 80,
        },
      },
    });
    const tacticalEngine = new HexTacticalEngine();
    const controller = new GameFlowController({
      strategicEngine,
      tacticalStage: tacticalEngine,
    });

    const originalMerchantCoord = strategicEngine.getState().contacts[0]!.coordinate;
    controller.beginTacticalEncounter();

    // Consumir batería moviendo 2 hex en cota de periscopio y luego romper contacto
    const stepOption = tacticalEngine
      .getViewState()
      .reachableOptions.find((opt) => opt.stepDistance === 2)!;
    tacticalEngine.executeCommand({
      type: 'MOVE_SUBMARINE',
      destination: stepOption.coordinate,
    });
    const disengageRes = tacticalEngine.executeCommand({ type: 'DISENGAGE' });
    expect(disengageRes.status).toBe('END_ENCOUNTER');

    const returned = controller.applyTacticalResolution(disengageRes);
    expect(returned.phase).toBe('STRATEGIC_PATROL');
    expect(returned.campaignState.submarine.fuel).toBe(94.5);
    expect(returned.campaignState.submarine.battery).toBeLessThan(80);

    const escapedContact = returned.campaignState.contacts[0]!;
    expect(areAxialCoordinatesEqual(escapedContact.coordinate, originalMerchantCoord)).toBe(false);
    expect(escapedContact.reinterceptCooldownTurns).toBe(1);
    expect(strategicEngine.getInterceptableContact()).toBeUndefined();
  });
});
