import type {
  CampaignState,
  EncounterContext,
  FiringSolutionContext,
} from '../core/contracts/index.ts';

// Modela la máquina de estados finita del coordinador central para garantizar transiciones unidireccionales y tipadas entre las 3 capas

export type GameFlowPhase =
  | 'STRATEGIC_PATROL'
  | 'TACTICAL_ENCOUNTER'
  | 'ARCADE_TORPEDO';

export type GameFlowSnapshot =
  | {
      readonly phase: 'STRATEGIC_PATROL';
      readonly campaignState: CampaignState;
    }
  | {
      readonly phase: 'TACTICAL_ENCOUNTER';
      readonly campaignState: CampaignState;
      readonly activeEncounter: EncounterContext;
    }
  | {
      readonly phase: 'ARCADE_TORPEDO';
      readonly campaignState: CampaignState;
      readonly activeEncounter: EncounterContext;
      readonly activeFiringSolution: FiringSolutionContext;
    };
