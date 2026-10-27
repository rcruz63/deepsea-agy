import {
  setArmoryReloadPaused,
  startTorpedoReloadInArmory,
} from '../../../core/armory/index.ts';
import type {
  CampaignState,
  EncounterContext,
  EncounterResult,
  NavigationStance,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  areAxialCoordinatesEqual,
} from '../../../core/hex/index.ts';
import {
  ATLANTIC_MERCHANT_ROUTES,
  ATLANTIC_SECTOR_THEATER,
  type StrategicMapCell,
  createAtlanticHexGrid,
  createInitialAtlanticCampaignState,
} from './AtlanticSectorScenario.ts';
import {
  advanceAllStrategicContacts,
  buildStrategicEncounterContext,
  findInterceptableMerchant,
} from './StrategicMerchantController.ts';
import {
  type ReachableHexOption,
  calculateReachableStrategicHexes,
} from './StrategicMovementNavigator.ts';
import {
  applyStrategicMovementEnergy,
  canSubmergeSubmarine,
  clampStrategicResource,
  completeStrategicTurnArmoryReload,
  switchStrategicSubmarineStance,
} from './StrategicResourceRules.ts';

// Fachada de dominio puro de la capa estratégica; coordina movimiento, consumo, armería y contactos sin acoplarse al DOM ni a Canvas

export interface StrategicEngineOptions {
  readonly initialState?: CampaignState;
  readonly grid?: HexGridMap<StrategicMapCell>;
  readonly theater?: TheaterDefinition;
  readonly routesByContactId?: Readonly<Record<string, readonly AxialCoordinate[]>>;
}

export class StrategicEngine {
  private state: CampaignState;
  private readonly grid: HexGridMap<StrategicMapCell>;
  private readonly theater: TheaterDefinition;
  private readonly routesByContactId: Readonly<Record<string, readonly AxialCoordinate[]>>;

  public constructor(options: StrategicEngineOptions = {}) {
    this.state = options.initialState ?? createInitialAtlanticCampaignState();
    this.grid = options.grid ?? createAtlanticHexGrid();
    this.theater = options.theater ?? ATLANTIC_SECTOR_THEATER;
    this.routesByContactId = options.routesByContactId ?? ATLANTIC_MERCHANT_ROUTES;
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
    return calculateReachableStrategicHexes(this.grid, this.state.submarine);
  }

  public getReachableOptionAt(destination: AxialCoordinate): ReachableHexOption | undefined {
    return this.getReachableHexes().find((option) =>
      areAxialCoordinatesEqual(option.coordinate, destination),
    );
  }

  public canSubmerge(): boolean {
    return canSubmergeSubmarine(this.state.submarine);
  }

  public setStance(targetStance: NavigationStance): CampaignState {
    this.state = {
      ...this.state,
      submarine: switchStrategicSubmarineStance(this.state.submarine, targetStance),
    };
    return this.state;
  }

  public startTubeReload(tubeId: string): CampaignState {
    const updatedArmory = startTorpedoReloadInArmory(
      this.state.submarine.armory,
      tubeId,
      this.state.difficulty,
    );
    this.state = {
      ...this.state,
      submarine: { ...this.state.submarine, armory: updatedArmory },
    };
    return this.state;
  }

  public setReloadPaused(isPaused: boolean): CampaignState {
    const updatedArmory = setArmoryReloadPaused(this.state.submarine.armory, isPaused);
    this.state = {
      ...this.state,
      submarine: { ...this.state.submarine, armory: updatedArmory },
    };
    return this.state;
  }

  public executeTurnMove(destination: AxialCoordinate): CampaignState {
    const selectedOption = this.getReachableOptionAt(destination);
    if (selectedOption === undefined) {
      throw new Error(
        `El hexágono (${destination.q}, ${destination.r}) no es alcanzable con la postura y recursos actuales.`,
      );
    }

    const movedSubmarine = applyStrategicMovementEnergy(this.state.submarine, selectedOption);
    const reloadedArmory = completeStrategicTurnArmoryReload(
      movedSubmarine.armory,
      this.state.difficulty,
    );
    const updatedContacts = advanceAllStrategicContacts(
      this.state.contacts,
      this.routesByContactId,
    );

    this.state = {
      ...this.state,
      turnNumber: this.state.turnNumber + 1,
      submarine: { ...movedSubmarine, armory: reloadedArmory },
      contacts: updatedContacts,
    };
    return this.state;
  }

  public getInterceptableContact() {
    return findInterceptableMerchant(this.state.submarine.coordinate, this.state.contacts);
  }

  public createEncounterContext(): EncounterContext | null {
    const targetContact = this.getInterceptableContact();
    return targetContact === undefined
      ? null
      : buildStrategicEncounterContext(this.state, this.theater, targetContact);
  }

  public applyEncounterResult(result: EncounterResult): CampaignState {
    const nextHull = clampStrategicResource(
      this.state.submarine.hullIntegrity - result.hullDamageTaken,
    );
    const updatedContacts = this.state.contacts.map((contact) =>
      contact.contactId === result.contactId && result.isTargetSunk
        ? { ...contact, isSunk: true }
        : contact,
    );

    this.state = {
      ...this.state,
      submarine: {
        ...this.state.submarine,
        hullIntegrity: nextHull,
        armory: result.updatedArmory,
      },
      contacts: updatedContacts,
      totalSunkTonnage: this.state.totalSunkTonnage + result.sunkTonnageAwarded,
    };
    return this.state;
  }
}
