import { describe, expect, it } from 'vitest';
import type { PatrolClockState } from '../../../src/core/contracts/index.ts';
import {
  createAxialCoordinate,
  offsetColumnRowToAxialCoord,
  resolveSectorCenterCoordinate,
} from '../../../src/core/hex/index.ts';
import {
  HYDROPHONE_UNCERTAINTY_ARC_DEGREES,
  NORTH_ATLANTIC_THEATER,
  StrategicEngine,
  advanceBduPatrolOrderProgress,
  advancePatrolClockFourHours,
  createInitialNorthAtlanticCampaignState,
  createNorthAtlanticHexGrid,
  evaluateHydrophoneContacts,
  resolveHydrophoneMaxRangeHexes,
  resolveStrategicVisualRangeHexes,
} from '../../../src/layers/strategic/index.ts';

describe('StrategicEnvironmentRules, StrategicHydrophoneRules & BduRadiogramController', () => {
  it('calculates bridge visual range according to stance, daylight, and sea state', () => {
    expect(resolveStrategicVisualRangeHexes('SURFACED', 'DAY', 'CLEAR')).toBe(2);
    expect(resolveStrategicVisualRangeHexes('SURFACED', 'DAY', 'OVERCAST')).toBe(1);
    expect(resolveStrategicVisualRangeHexes('SURFACED', 'NIGHT', 'CLEAR')).toBe(1);
    expect(resolveStrategicVisualRangeHexes('SURFACED', 'DAWN', 'OVERCAST')).toBe(0);
    expect(resolveStrategicVisualRangeHexes('SURFACED', 'DAY', 'STORM')).toBe(0);
    expect(resolveStrategicVisualRangeHexes('SUBMERGED', 'DAY', 'CLEAR')).toBe(0);
  });

  it('cycles the 4-hour watch clock across 24 hours and increments campaignDay at midnight', () => {
    let clock: PatrolClockState = {
      patrolNumber: 1,
      campaignDay: 1,
      hourOfDay: 8,
      timeOfDay: 'DAWN',
    };

    for (let watch = 0; watch < 6; watch += 1) {
      clock = advancePatrolClockFourHours(clock);
    }

    expect(clock.campaignDay).toBe(2);
    expect(clock.hourOfDay).toBe(8);
    expect(clock.timeOfDay).toBe('DAWN');
  });

  it('evaluates submerged hydrophone contacts with 5/3 hex range, storm penalty, and ±15° bearing cones without coordinates', () => {
    expect(resolveHydrophoneMaxRangeHexes('SURFACED', 0, 'CLEAR')).toBe(0);
    expect(resolveHydrophoneMaxRangeHexes('SUBMERGED', 0, 'CLEAR')).toBe(5);
    expect(resolveHydrophoneMaxRangeHexes('SUBMERGED', 1, 'CLEAR')).toBe(3);
    expect(resolveHydrophoneMaxRangeHexes('SUBMERGED', 0, 'STORM')).toBe(4);
    expect(resolveHydrophoneMaxRangeHexes('SUBMERGED', 1, 'STORM')).toBe(2);

    const grid = createNorthAtlanticHexGrid();
    const baseState = createInitialNorthAtlanticCampaignState(undefined, grid);
    const subCoord = offsetColumnRowToAxialCoord(20, 12);
    const nearTarget = createAxialCoordinate(subCoord.q + 2, subCoord.r);
    const mediumTarget = createAxialCoordinate(subCoord.q + 4, subCoord.r);

    const submergedSub = {
      ...baseState.submarine,
      coordinate: subCoord,
      stance: 'SUBMERGED' as const,
      depth: 'PERISCOPE' as const,
    };
    const contacts = [
      {
        contactId: 'c_near',
        shipSpecId: 'freighter_liberty',
        coordinate: nearTarget,
        heading: 0 as const,
        isSunk: false,
      },
      {
        contactId: 'c_far_4',
        shipSpecId: 'tanker_t2',
        coordinate: mediumTarget,
        heading: 0 as const,
        isSunk: false,
      },
    ];

    const stationaryReadings = evaluateHydrophoneContacts(
      submergedSub,
      0,
      'CLEAR',
      contacts,
      5,
    );
    expect(stationaryReadings).toHaveLength(2);
    expect(stationaryReadings[0]?.strength).toBe('STRONG');
    expect(stationaryReadings[1]?.strength).toBe('WEAK');
    expect(stationaryReadings[0]?.uncertaintyArcDeg).toBe(HYDROPHONE_UNCERTAINTY_ARC_DEGREES);
    expect('coordinate' in stationaryReadings[0]!).toBe(false);

    // Al mover 1 hex sumergido, el radio baja a 3 hex y pierde el contacto a distancia 4
    const movingReadings = evaluateHydrophoneContacts(submergedSub, 1, 'CLEAR', contacts, 5);
    expect(movingReadings).toHaveLength(1);
    expect(movingReadings[0]?.contactId).toBe('c_near');
  });

  it('queues BdU radiograms while SUBMERGED and flushes them immediately upon surfacing', () => {
    const grid = createNorthAtlanticHexGrid();
    const openSea = offsetColumnRowToAxialCoord(20, 12);
    const baseState = createInitialNorthAtlanticCampaignState(undefined, grid);
    const engine = new StrategicEngine({
      grid,
      theater: NORTH_ATLANTIC_THEATER,
      initialState: {
        ...baseState,
        turnNumber: 2,
        submarine: {
          ...baseState.submarine,
          coordinate: openSea,
          stance: 'SUBMERGED',
          depth: 'PERISCOPE',
        },
      },
      randomProvider: () => 0.4,
    });

    // Avanzar al turno 3 (múltiplo de RADIOGRAM_EMISSION_INTERVAL_TURNS = 3) estando sumergido
    const submergedState = engine.executeTurnMove(openSea);
    expect(submergedState.turnNumber).toBe(3);
    expect(submergedState.deliveredRadiograms).toHaveLength(0);
    expect(submergedState.queuedSubmergedRadiograms).toHaveLength(1);

    // Al emerger la antena recibe el radiograma retenido
    const surfacedState = engine.setStance('SURFACED');
    expect(surfacedState.queuedSubmergedRadiograms).toHaveLength(0);
    expect(surfacedState.deliveredRadiograms).toHaveLength(1);
    expect(surfacedState.deliveredRadiograms[0]?.reportedQuadratCode).not.toBe('UNKNOWN');
  });

  it('marks BdU patrol sector order fulfilled after 6 watch turns inside the target 3x3 sector', () => {
    const insideBe5 = resolveSectorCenterCoordinate('BE 5')!;
    let order = createInitialNorthAtlanticCampaignState().activePatrolOrder;

    for (let watch = 0; watch < 6; watch += 1) {
      expect(order?.isFulfilled).toBe(false);
      order = advanceBduPatrolOrderProgress(order, insideBe5, NORTH_ATLANTIC_THEATER);
    }

    expect(order?.completedWatchTurns).toBe(6);
    expect(order?.isFulfilled).toBe(true);
  });
});
