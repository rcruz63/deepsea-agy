import { setArmoryReloadPaused, startTorpedoReloadInArmory } from '../../../core/armory/index.ts';
import type {
  CampaignState,
  EncounterContext,
  EncounterResult,
  NavigationStance,
  StrategicTimeScale,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import { type AxialCoordinate, type HexGridMap, areAxialCoordinatesEqual } from '../../../core/hex/index.ts';
import {
  ATLANTIC_MERCHANT_ROUTES,
  ATLANTIC_SECTOR_THEATER,
  type StrategicMapCell,
  createAtlanticHexGrid,
} from './AtlanticSectorScenario.ts';
import { NORTH_ATLANTIC_THEATER, createNorthAtlanticHexGrid } from './NorthAtlanticTheaterData.ts';
import {
  canDockAtNavalBase,
  dockSubmarineAtNavalBase,
  prepareNextCampaignPatrol,
} from './PatrolRefitRules.ts';
import { createInitialNorthAtlanticCampaignState } from './StrategicCorridorGenerator.ts';
import { applyEncounterOutcomeToCampaign } from './StrategicEncounterOutcomeApplier.ts';
import { buildStrategicEncounterContext, findInterceptableMerchant } from './StrategicMerchantController.ts';
import { type ReachableHexOption, calculateReachableStrategicHexes } from './StrategicMovementNavigator.ts';
import { canSubmergeSubmarine } from './StrategicResourceRules.ts';
import { applyCampaignStanceChange, refreshCampaignSensorSuite } from './StrategicSensorSuite.ts';
import { resolveSingleWatchStep, resolveTwentyFourHourTransitMove } from './StrategicTurnResolver.ts';

// Fachada de dominio puro de la capa estratégica; coordina escala 24H/4H, sensores, BdU, consumo, armería y contactos

export interface StrategicEngineOptions {
  readonly initialState?: CampaignState;
  readonly grid?: HexGridMap<StrategicMapCell>;
  readonly theater?: TheaterDefinition;
  readonly routesByContactId?: Readonly<Record<string, readonly AxialCoordinate[]>>;
  readonly randomProvider?: () => number;
}

export class StrategicEngine {
  private state: CampaignState;
  private readonly grid: HexGridMap<StrategicMapCell>;
  private readonly theater: TheaterDefinition;
  private routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>;
  private readonly randomProvider: () => number;

  public constructor(options: StrategicEngineOptions = {}) {
    const isLegacySector =
      options.initialState?.theaterId === ATLANTIC_SECTOR_THEATER.theaterId;
    this.theater =
      options.theater ?? (isLegacySector ? ATLANTIC_SECTOR_THEATER : NORTH_ATLANTIC_THEATER);
    this.grid =
      options.grid ??
      (this.theater.theaterId === ATLANTIC_SECTOR_THEATER.theaterId
        ? createAtlanticHexGrid()
        : createNorthAtlanticHexGrid());
    const baseState =
      options.initialState ?? createInitialNorthAtlanticCampaignState(undefined, this.grid);
    this.state = refreshCampaignSensorSuite(baseState, 0, null);
    this.routesByContactId = options.routesByContactId ?? ATLANTIC_MERCHANT_ROUTES;
    this.randomProvider = options.randomProvider ?? (() => Math.random());
  }

  public getState(): CampaignState {
    return this.state;
  }

  public getGrid(): HexGridMap<StrategicMapCell> {
    return this.grid;
  }

  public getTheater(): TheaterDefinition {
    return this.theater;
  }

  public getReachableHexes(): readonly ReachableHexOption[] {
    return calculateReachableStrategicHexes(
      this.grid,
      this.state.submarine,
      this.state.timeScale,
    );
  }

  public getReachableOptionAt(destination: AxialCoordinate): ReachableHexOption | undefined {
    return this.getReachableHexes().find((option) =>
      areAxialCoordinatesEqual(option.coordinate, destination),
    );
  }

  public canSubmerge(): boolean {
    return canSubmergeSubmarine(this.state.submarine);
  }

  public setTimeScale(targetScale: StrategicTimeScale): CampaignState {
    if (targetScale === 'TRANSIT_24H' && this.state.submarine.stance !== 'SURFACED') {
      throw new Error('El modo TRÁNSITO 24H requiere navegar en superficie (SURFACED).');
    }
    this.state = { ...this.state, timeScale: targetScale };
    return this.state;
  }

  public setStance(targetStance: NavigationStance): CampaignState {
    this.state = applyCampaignStanceChange(this.state, targetStance);
    return this.state;
  }

  public startTubeReload(tubeId: string): CampaignState {
    const updatedArmory = startTorpedoReloadInArmory(
      this.state.submarine.armory,
      tubeId,
      this.state.difficulty,
    );
    this.state = { ...this.state, submarine: { ...this.state.submarine, armory: updatedArmory } };
    return this.state;
  }

  public setReloadPaused(isPaused: boolean): CampaignState {
    const updatedArmory = setArmoryReloadPaused(this.state.submarine.armory, isPaused);
    this.state = { ...this.state, submarine: { ...this.state.submarine, armory: updatedArmory } };
    return this.state;
  }

  public executeTurnMove(destination: AxialCoordinate): CampaignState {
    const selectedOption = this.getReachableOptionAt(destination);
    if (selectedOption === undefined) {
      throw new Error(`El hexágono (${destination.q}, ${destination.r}) no es alcanzable.`);
    }
    this.state =
      this.state.timeScale === 'TRANSIT_24H'
        ? resolveTwentyFourHourTransitMove(
            this.state,
            selectedOption,
            this.grid,
            this.theater,
            this.routesByContactId,
            this.randomProvider,
          )
        : resolveSingleWatchStep(
            this.state,
            selectedOption,
            this.grid,
            this.theater,
            this.routesByContactId,
            this.randomProvider(),
          );
    return this.state;
  }

  public getInterceptableContact() {
    const isLegacy = this.theater.theaterId === ATLANTIC_SECTOR_THEATER.theaterId;
    return findInterceptableMerchant(
      this.state.submarine.coordinate,
      this.state.contacts,
      isLegacy ? undefined : this.state.visibleContactIds,
      this.state.submarine.stance === 'SUBMERGED',
    );
  }

  public createEncounterContext(): EncounterContext | null {
    const targetContact = this.getInterceptableContact();
    return targetContact === undefined
      ? null
      : buildStrategicEncounterContext(this.state, this.theater, targetContact);
  }

  public applyEncounterResult(result: EncounterResult): CampaignState {
    const applied = applyEncounterOutcomeToCampaign(
      this.state,
      result,
      this.grid,
      this.theater,
      this.routesByContactId,
    );
    this.routesByContactId = applied.nextRoutes;
    this.state = applied.nextState;
    return this.state;
  }

  public canDockAtBase(): boolean {
    return canDockAtNavalBase(this.state, this.theater);
  }

  public dockAtNavalBase(): CampaignState {
    this.state = dockSubmarineAtNavalBase(this.state, this.theater);
    return this.state;
  }

  public startNextPatrol(): CampaignState {
    this.state = prepareNextCampaignPatrol(this.state, this.grid, this.theater);
    return this.state;
  }
}
