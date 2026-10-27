import type {
  EncounterContext,
  EncounterResult,
  FiringSolutionContext,
} from './EncounterContracts.ts';

// Abstrae la etapa táctica tras una interfaz polimórfica para permitir sustituir el tablero 15x15 por un futuro ploteo polar sin alterar GameFlowController

export type TacticalStageResolution =
  | { readonly status: 'IN_PROGRESS' }
  | {
      readonly status: 'ENTER_TORPEDO_ATTACK';
      readonly firingContext: FiringSolutionContext;
      readonly tacticalTurnsElapsed: number;
    }
  | {
      readonly status: 'END_ENCOUNTER';
      readonly encounterResult: EncounterResult;
    };

export interface ITacticalStage<TCommand = unknown, TViewState = unknown> {
  startEncounter(context: EncounterContext): void;
  executeCommand(command: TCommand): TacticalStageResolution;
  getViewState(): TViewState;
  getResolution(): TacticalStageResolution;
}
