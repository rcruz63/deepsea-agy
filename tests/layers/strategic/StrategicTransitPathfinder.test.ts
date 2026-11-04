import { describe, expect, it } from 'vitest';
import {
  offsetColumnRowToAxialCoord,
  resolveSectorCenterCoordinate,
} from '../../../src/core/hex/index.ts';
import {
  BREST_BASE_COORDINATE,
  GIBRALTAR_PORT_COORDINATE,
  HALIFAX_PORT_COORDINATE,
  LIVERPOOL_PORT_COORDINATE,
  NORTH_ATLANTIC_CORRIDORS,
  StrategicEngine,
  buildDriftedCorridorWaypoints,
  createInitialNorthAtlanticCampaignState,
  createNorthAtlanticHexGrid,
} from '../../../src/layers/strategic/index.ts';

describe('NorthAtlanticTheater & StrategicTransitPathfinder (45x27, 24H/4H, Corridors)', () => {
  it('creates a 45x27 grid (1215 cells) with navigable Axis bases and impassable Allied ports', () => {
    const grid = createNorthAtlanticHexGrid();
    expect(grid.size).toBe(45 * 27);
    expect(grid.getCell(BREST_BASE_COORDINATE)?.terrain).toBe('NAVAL_BASE');
    expect(grid.getCell(HALIFAX_PORT_COORDINATE)?.terrain).toBe('ALLIED_PORT');
    expect(grid.getCell(LIVERPOOL_PORT_COORDINATE)?.terrain).toBe('ALLIED_PORT');
    expect(grid.getCell(GIBRALTAR_PORT_COORDINATE)?.terrain).toBe('ALLIED_PORT');
  });

  it('generates continuous navigable merchant waypoints with ±1 hex lateral drift across seeds', () => {
    const grid = createNorthAtlanticHexGrid();
    const corridor = NORTH_ATLANTIC_CORRIDORS[0]!;
    const routeA = buildDriftedCorridorWaypoints(grid, corridor, 1);
    const routeB = buildDriftedCorridorWaypoints(grid, corridor, 2);

    expect(routeA.length).toBeGreaterThan(20);
    // Ambas rutas evitan tierra y puertos aliados bloqueados
    expect(
      routeA.every((coord) => {
        const terrain = grid.getCell(coord)?.terrain;
        return terrain === 'DEEP_WATER' || terrain === 'COASTAL_WATER' || terrain === 'NAVAL_BASE';
      }),
    ).toBe(true);
    // Semillas distintas desplazan lateralmente el corredor para evitar raíles fijos
    expect(routeA).not.toEqual(routeB);
  });

  it('allows up to 8-hex transit in TRANSIT_24H while SURFACED and auto-drops to PATROL_4H upon entering assigned patrol sector', () => {
    const grid = createNorthAtlanticHexGrid();
    const baseState = createInitialNorthAtlanticCampaignState(undefined, grid);
    const be5Center = resolveSectorCenterCoordinate('BE 5')!;
    const startWestOfBiscay = offsetColumnRowToAxialCoord(35, 13);

    const engine = new StrategicEngine({
      grid,
      initialState: {
        ...baseState,
        submarine: { ...baseState.submarine, coordinate: startWestOfBiscay },
        contacts: [],
      },
    });

    engine.setTimeScale('TRANSIT_24H');
    const transitOptions = engine.getReachableHexes();
    expect(transitOptions.some((opt) => opt.stepDistance === 8)).toBe(true);

    const stateAfterTransit = engine.executeTurnMove(be5Center);
    // Al entrar en el sector ordenado BE 5, el tránsito se interrumpe automáticamente a PATROL_4H
    expect(stateAfterTransit.timeScale).toBe('PATROL_4H');
    expect(stateAfterTransit.submarine.fuel).toBeLessThan(100);
  });

  it('triggers ABORTED_AT_SEA instead of softlocking when fuel and battery are exhausted at sea', () => {
    const grid = createNorthAtlanticHexGrid();
    const baseState = createInitialNorthAtlanticCampaignState(undefined, grid);
    const openOceanCoord = offsetColumnRowToAxialCoord(22, 13);

    const engine = new StrategicEngine({
      grid,
      initialState: {
        ...baseState,
        submarine: {
          ...baseState.submarine,
          coordinate: openOceanCoord,
          stance: 'SUBMERGED',
          depth: 'PERISCOPE',
          fuel: 0.2,
          battery: 5,
        },
        contacts: [],
      },
    });

    const resultState = engine.executeTurnMove(openOceanCoord);
    expect(resultState.submarine.battery).toBe(0);
    expect(resultState.submarine.stance).toBe('SURFACED');
    expect(resultState.patrolStatus).toBe('ABORTED_AT_SEA');
  });
});
