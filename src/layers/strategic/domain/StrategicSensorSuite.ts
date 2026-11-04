import type {
  BduRadiogramReport,
  CampaignState,
  NavigationStance,
  StrategicTimeScale,
} from '../../../core/contracts/index.ts';
import { routeAndExpireBduRadiograms } from './BduRadiogramController.ts';
import { evaluateVisibleContactIds } from './StrategicEnvironmentRules.ts';
import { evaluateHydrophoneContacts } from './StrategicHydrophoneRules.ts';
import { switchStrategicSubmarineStance } from './StrategicResourceRules.ts';

// Sincroniza de forma atómica vigía visual, escucha hidrofónica y antena de radio al mover, cambiar cota o volver de combate

export function refreshCampaignSensorSuite(
  state: CampaignState,
  stepDistance: number,
  incomingReport: BduRadiogramReport | null = null,
): CampaignState {
  const visibleContactIds = evaluateVisibleContactIds(
    state.submarine,
    state.clock.timeOfDay,
    state.weather,
    state.contacts,
  );
  const hydrophoneContacts = evaluateHydrophoneContacts(
    state.submarine,
    stepDistance,
    state.weather,
    state.contacts,
    state.turnNumber,
  );
  const routedRadio = routeAndExpireBduRadiograms(
    state.deliveredRadiograms,
    state.queuedSubmergedRadiograms,
    incomingReport,
    state.submarine.stance,
    state.turnNumber,
  );

  return {
    ...state,
    visibleContactIds,
    hydrophoneContacts,
    deliveredRadiograms: routedRadio.deliveredRadiograms,
    queuedSubmergedRadiograms: routedRadio.queuedSubmergedRadiograms,
  };
}

export function applyCampaignStanceChange(
  state: CampaignState,
  targetStance: NavigationStance,
): CampaignState {
  const nextSubmarine = switchStrategicSubmarineStance(state.submarine, targetStance);
  const nextScale: StrategicTimeScale =
    targetStance === 'SUBMERGED' ? 'PATROL_4H' : state.timeScale;

  return refreshCampaignSensorSuite(
    {
      ...state,
      timeScale: nextScale,
      submarine: nextSubmarine,
    },
    0,
    null,
  );
}
