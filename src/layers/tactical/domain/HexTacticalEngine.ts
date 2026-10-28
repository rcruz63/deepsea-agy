import {
  advanceArmoryReloadTurn,
  startTorpedoReloadInArmory,
} from '../../../core/armory/index.ts';
import type {
  DifficultyConfig,
  EncounterContext,
  EncounterResult,
  ITacticalStage,
  TacticalStageResolution,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  areAxialCoordinatesEqual,
} from '../../../core/hex/index.ts';
import {
  buildTacticalFiringSolutionContext,
  evaluateTacticalFiringTelemetry,
} from './TacticalFiringGeometry.ts';
import {
  INITIAL_TACTICAL_MERCHANT_COORDINATE,
  INITIAL_TACTICAL_SUBMARINE_COORDINATE,
  advanceTacticalMerchantStep,
  applyTacticalSubmarineMovement,
  calculateTacticalReachableOptions,
  createTacticalHexGrid,
} from './TacticalMovementRules.ts';
import type {
  TacticalCommand,
  TacticalDepth,
  TacticalHexCell,
  TacticalMerchantSnapshot,
  TacticalStateSnapshot,
  TacticalSubmarineSnapshot,
} from './TacticalTypes.ts';

// Implementa ITacticalStage sobre el tablero hexagonal 15x15 con turnos de 5 minutos y avance de 1 tick de recarga por turno

export interface HexTacticalEngineOptions {
  readonly initialSubmarineCoordinate?: AxialCoordinate;
  readonly initialMerchantCoordinate?: AxialCoordinate;
}

export class HexTacticalEngine
  implements ITacticalStage<TacticalCommand, TacticalStateSnapshot>
{
  private readonly grid: HexGridMap<TacticalHexCell> = createTacticalHexGrid();
  private readonly customSubCoordinate: AxialCoordinate | undefined;
  private readonly customMerchantCoordinate: AxialCoordinate | undefined;
  private turnNumber = 1;
  private difficulty: DifficultyConfig | null = null;
  private submarine: TacticalSubmarineSnapshot | null = null;
  private merchant: TacticalMerchantSnapshot | null = null;
  private resolution: TacticalStageResolution = { status: 'IN_PROGRESS' };

  public constructor(options: HexTacticalEngineOptions = {}) {
    this.customSubCoordinate = options.initialSubmarineCoordinate;
    this.customMerchantCoordinate = options.initialMerchantCoordinate;
  }

  public getGrid(): HexGridMap<TacticalHexCell> {
    return this.grid;
  }

  public startEncounter(context: EncounterContext): void {
    const initialDepth: TacticalDepth =
      context.submarine.stance === 'SURFACED' ? 'SURFACED' : 'PERISCOPE_DEPTH';

    this.turnNumber = 1;
    this.difficulty = context.difficulty;
    this.submarine = {
      coordinate: this.customSubCoordinate ?? INITIAL_TACTICAL_SUBMARINE_COORDINATE,
      heading: 5,
      depth: initialDepth,
      fuel: context.submarine.fuel,
      battery: context.submarine.battery,
      hullIntegrity: context.submarine.hullIntegrity,
      armory: context.submarine.armory,
    };
    this.merchant = {
      contactId: context.targetShip.contactId,
      spec: context.targetShip.spec,
      coordinate: this.customMerchantCoordinate ?? INITIAL_TACTICAL_MERCHANT_COORDINATE,
      heading: context.targetShip.heading,
      speedKnots: context.targetShip.speedKnots,
    };
    this.resolution = { status: 'IN_PROGRESS' };
  }

  public executeCommand(command: TacticalCommand): TacticalStageResolution {
    const { submarine, difficulty } = this.assertInitialized();

    if (command.type === 'SET_DEPTH') {
      if (command.depth !== 'SURFACED' && submarine.battery <= 0) {
        throw new Error('No se puede adoptar cota sumergida con batería agotada (0%).');
      }
      this.submarine = { ...submarine, depth: command.depth };
      return this.resolution;
    }
    if (command.type === 'START_TUBE_RELOAD') {
      this.submarine = {
        ...submarine,
        armory: startTorpedoReloadInArmory(submarine.armory, command.tubeId, difficulty),
      };
      return this.resolution;
    }
    if (command.type === 'MOVE_SUBMARINE') {
      return this.handleMoveSubmarine(command.destination);
    }
    if (command.type === 'RAISE_PERISCOPE_AND_LOCK') {
      return this.handleRaisePeriscope();
    }
    this.resolution = { status: 'END_ENCOUNTER', encounterResult: this.buildDisengagedResult() };
    return this.resolution;
  }

  public getViewState(): TacticalStateSnapshot {
    const { submarine, merchant, difficulty } = this.assertInitialized();
    return {
      turnNumber: this.turnNumber,
      difficulty,
      submarine,
      merchant,
      reachableOptions: calculateTacticalReachableOptions(this.grid, submarine, merchant.coordinate),
      telemetry: evaluateTacticalFiringTelemetry(submarine, merchant),
    };
  }

  public getResolution(): TacticalStageResolution {
    return this.resolution;
  }

  private handleMoveSubmarine(destination: AxialCoordinate): TacticalStageResolution {
    const snapshot = this.getViewState();
    const selectedOption = snapshot.reachableOptions.find((option) =>
      areAxialCoordinatesEqual(option.coordinate, destination),
    );
    if (selectedOption === undefined) {
      throw new Error(`El hexágono táctico (${destination.q}, ${destination.r}) no es alcanzable.`);
    }

    const movedSubmarine = applyTacticalSubmarineMovement(snapshot.submarine, selectedOption);
    // Cada turno táctico de 5 minutos avanza exactamente 1 tick en la recarga de tubos
    const reloadedArmory = advanceArmoryReloadTurn(movedSubmarine.armory);
    const merchantStep = advanceTacticalMerchantStep(this.grid, snapshot.merchant, movedSubmarine.coordinate);

    this.submarine = { ...movedSubmarine, armory: reloadedArmory };
    this.merchant = merchantStep.updatedMerchant;
    this.turnNumber += 1;

    if (merchantStep.hasEscapedBoard) {
      this.resolution = { status: 'END_ENCOUNTER', encounterResult: this.buildDisengagedResult() };
    }
    return this.resolution;
  }

  private handleRaisePeriscope(): TacticalStageResolution {
    const snapshot = this.getViewState();
    if (!snapshot.telemetry.canRaisePeriscopeToFire) {
      throw new Error('No se cumplen las condiciones de cota, distancia (1..4 hex) o tubos cargados.');
    }
    this.resolution = {
      status: 'ENTER_TORPEDO_ATTACK',
      firingContext: buildTacticalFiringSolutionContext(
        snapshot.submarine,
        snapshot.merchant,
        snapshot.difficulty,
        snapshot.telemetry,
      ),
      tacticalTurnsElapsed: this.turnNumber - 1,
    };
    return this.resolution;
  }

  private buildDisengagedResult(): EncounterResult {
    const { submarine, merchant } = this.assertInitialized();
    return {
      contactId: merchant.contactId,
      outcome: 'DISENGAGED',
      updatedArmory: submarine.armory,
      hullDamageTaken: 0,
      isTargetSunk: false,
      sunkTonnageAwarded: 0,
      tacticalTurnsElapsed: this.turnNumber - 1,
    };
  }

  private assertInitialized() {
    if (this.submarine === null || this.merchant === null || this.difficulty === null) {
      throw new Error('HexTacticalEngine no ha sido inicializado con startEncounter.');
    }
    return { submarine: this.submarine, merchant: this.merchant, difficulty: this.difficulty };
  }
}
