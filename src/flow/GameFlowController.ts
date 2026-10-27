import type {
  EncounterContext,
  EncounterResult,
  FiringSolutionContext,
  ITacticalStage,
} from '../core/contracts/index.ts';
import { StrategicEngine } from '../layers/strategic/domain/StrategicEngine.ts';
import type { GameFlowSnapshot } from './GameFlowState.ts';

// Coordinador central desacoplado; transfiere contratos inmutables entre StrategicEngine, ITacticalStage y Arcade sin que las capas se conozcan

export interface GameFlowControllerDependencies {
  readonly strategicEngine?: StrategicEngine;
  readonly tacticalStage?: ITacticalStage;
}

export class GameFlowController {
  private readonly strategicEngine: StrategicEngine;
  private readonly tacticalStage: ITacticalStage | undefined;
  private activeEncounter: EncounterContext | null = null;
  private activeFiringSolution: FiringSolutionContext | null = null;

  public constructor(dependencies: GameFlowControllerDependencies = {}) {
    this.strategicEngine = dependencies.strategicEngine ?? new StrategicEngine();
    this.tacticalStage = dependencies.tacticalStage;
  }

  public getStrategicEngine(): StrategicEngine {
    return this.strategicEngine;
  }

  public getSnapshot(): GameFlowSnapshot {
    const campaignState = this.strategicEngine.getState();

    if (this.activeEncounter !== null && this.activeFiringSolution !== null) {
      return {
        phase: 'ARCADE_TORPEDO',
        campaignState,
        activeEncounter: this.activeEncounter,
        activeFiringSolution: this.activeFiringSolution,
      };
    }

    if (this.activeEncounter !== null) {
      return {
        phase: 'TACTICAL_ENCOUNTER',
        campaignState,
        activeEncounter: this.activeEncounter,
      };
    }

    return {
      phase: 'STRATEGIC_PATROL',
      campaignState,
    };
  }

  public beginTacticalEncounter(
    explicitContext?: EncounterContext,
  ): GameFlowSnapshot {
    const resolvedContext =
      explicitContext ?? this.strategicEngine.createEncounterContext();
    if (resolvedContext === null) {
      throw new Error(
        'No se puede iniciar un encuentro táctico sin un contacto válido en rango de intercepción.',
      );
    }

    this.activeEncounter = resolvedContext;
    this.activeFiringSolution = null;

    if (this.tacticalStage !== undefined) {
      this.tacticalStage.startEncounter(resolvedContext);
    }

    return this.getSnapshot();
  }

  public enterArcadeTorpedoAttack(
    firingSolution: FiringSolutionContext,
  ): GameFlowSnapshot {
    if (this.activeEncounter === null) {
      throw new Error(
        'No se puede entrar al módulo Arcade de torpedos fuera de un encuentro táctico activo.',
      );
    }

    this.activeFiringSolution = firingSolution;
    return this.getSnapshot();
  }

  public completeEncounter(result: EncounterResult): GameFlowSnapshot {
    if (this.activeEncounter === null) {
      throw new Error('No existe un encuentro activo que finalizar.');
    }

    this.strategicEngine.applyEncounterResult(result);
    this.activeEncounter = null;
    this.activeFiringSolution = null;
    return this.getSnapshot();
  }
}
