import { describe, expect, it } from 'vitest';
import { fireTorpedoTubeInArmory } from '../../../src/core/armory/index.ts';
import {
  BASE_REFIT_DAYS,
  BREST_BASE_COORDINATE,
  NORTH_ATLANTIC_THEATER,
  StrategicEngine,
  TOWED_RESCUE_PENALTY_DAYS,
  createInitialNorthAtlanticCampaignState,
  createNorthAtlanticHexGrid,
} from '../../../src/layers/strategic/index.ts';
import { offsetColumnRowToAxialCoord } from '../../../src/core/hex/index.ts';

describe('PatrolRefitRules, Kriegstagebuch & Multi-Patrol Campaign', () => {
  it('allows docking at Brest/Lorient/Saint-Nazaire after turn 1, computes refit days, and restores 100% on next patrol', () => {
    const grid = createNorthAtlanticHexGrid();
    const baseState = createInitialNorthAtlanticCampaignState(undefined, grid);
    const spentArmory = fireTorpedoTubeInArmory(baseState.submarine.armory, 'BOW-1');

    const engine = new StrategicEngine({
      grid,
      theater: NORTH_ATLANTIC_THEATER,
      initialState: {
        ...baseState,
        turnNumber: 18,
        clock: { patrolNumber: 1, campaignDay: 4, hourOfDay: 16, timeOfDay: 'DAY' },
        submarine: {
          ...baseState.submarine,
          coordinate: BREST_BASE_COORDINATE,
          fuel: 38.4,
          battery: 55,
          hullIntegrity: 80,
          armory: spentArmory,
        },
        patrolTorpedoesFired: 4,
        patrolTorpedoHits: 3,
        patrolSunkShipsCount: 2,
        patrolSunkTonnage: 17600,
        totalSunkTonnage: 17600,
      },
    });

    expect(engine.canDockAtBase()).toBe(true);
    const dockedState = engine.dockAtNavalBase();
    expect(dockedState.patrolStatus).toBe('DOCKED_AT_BASE');
    expect(dockedState.lastPatrolSummary).not.toBeNull();
    expect(dockedState.lastPatrolSummary?.baseName).toBe('Brest');
    // 14 días base + 4 días casco (20% daño -> 2*2) + 1 día rearme (4 torpedos) = 19 días
    expect(dockedState.lastPatrolSummary?.refitDaysAdded).toBe(BASE_REFIT_DAYS + 4 + 1);
    expect(dockedState.lastPatrolSummary?.shipsSunkCount).toBe(2);

    const nextPatrolState = engine.startNextPatrol();
    expect(nextPatrolState.patrolStatus).toBe('ACTIVE');
    expect(nextPatrolState.turnNumber).toBe(1);
    expect(nextPatrolState.clock.patrolNumber).toBe(2);
    expect(nextPatrolState.clock.campaignDay).toBe(4 + 19);
    expect(nextPatrolState.submarine.coordinate).toEqual(BREST_BASE_COORDINATE);
    expect(nextPatrolState.submarine.fuel).toBe(100);
    expect(nextPatrolState.submarine.battery).toBe(100);
    expect(nextPatrolState.submarine.hullIntegrity).toBe(100);
    expect(nextPatrolState.submarine.armory.bowTubes[0]?.status).toBe('LOADED');
    expect(nextPatrolState.patrolSunkTonnage).toBe(0);
    expect(nextPatrolState.totalSunkTonnage).toBe(17600);
    expect(nextPatrolState.activePatrolOrder?.targetSectorCode).not.toBe('BE 5');
  });

  it('automatically generates ABORTED_AT_SEA Kriegstagebuch summary with tow penalty when stranded in open ocean', () => {
    const grid = createNorthAtlanticHexGrid();
    const baseState = createInitialNorthAtlanticCampaignState(undefined, grid);
    const midOcean = offsetColumnRowToAxialCoord(20, 12);

    const engine = new StrategicEngine({
      grid,
      theater: NORTH_ATLANTIC_THEATER,
      initialState: {
        ...baseState,
        turnNumber: 12,
        submarine: {
          ...baseState.submarine,
          coordinate: midOcean,
          stance: 'SUBMERGED',
          depth: 'PERISCOPE',
          fuel: 0.2,
          battery: 5,
        },
      },
    });

    const strandedState = engine.executeTurnMove(midOcean);
    expect(strandedState.patrolStatus).toBe('ABORTED_AT_SEA');
    expect(strandedState.lastPatrolSummary?.endReason).toBe('ABORTED_AT_SEA');
    expect(strandedState.lastPatrolSummary?.refitDaysAdded).toBe(
      BASE_REFIT_DAYS + TOWED_RESCUE_PENALTY_DAYS,
    );

    const recoveredState = engine.startNextPatrol();
    expect(recoveredState.patrolStatus).toBe('ACTIVE');
    expect(recoveredState.clock.patrolNumber).toBe(2);
    expect(recoveredState.submarine.fuel).toBe(100);
  });
});
