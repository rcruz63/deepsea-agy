import type { EncounterContext } from '../../../core/contracts/index.ts';
import type { AxialCoordinate, Point2D } from '../../../core/hex/index.ts';
import type { StrategicEngine } from '../domain/StrategicEngine.ts';
import {
  type HudInteractiveRegion,
  renderStrategicHudPanel,
} from './StrategicHudRenderer.ts';
import {
  type StrategicUserInteraction,
  resolveStrategicClickInteraction,
  resolveStrategicHoveredHex,
} from './StrategicInputHandler.ts';
import { renderStrategicMapChart } from './StrategicMapRenderer.ts';
import { renderStrategicUnitsAndLegend } from './StrategicUnitRenderer.ts';

// Coordina los tres sub-renderizadores estratégicos y despacha las órdenes del jugador hacia StrategicEngine

export class StrategicStageView {
  private readonly engine: StrategicEngine;
  private readonly onEnterEncounter: (context: EncounterContext) => void;
  private hoveredHex: AxialCoordinate | null = null;
  private lastHudRegions: readonly HudInteractiveRegion[] = [];

  public constructor(
    engine: StrategicEngine,
    onEnterEncounter: (context: EncounterContext) => void,
  ) {
    this.engine = engine;
    this.onEnterEncounter = onEnterEncounter;
  }

  public handlePointerMove(canvasPoint: Point2D): void {
    this.hoveredHex = resolveStrategicHoveredHex(canvasPoint);
  }

  public handlePointerClick(canvasPoint: Point2D): void {
    const interaction = resolveStrategicClickInteraction(
      canvasPoint,
      this.lastHudRegions,
    );
    if (interaction === null) {
      return;
    }
    this.applyUserInteraction(interaction);
  }

  private applyUserInteraction(interaction: StrategicUserInteraction): void {
    const state = this.engine.getState();

    switch (interaction.type) {
      case 'TOGGLE_STANCE': {
        const nextStance =
          state.submarine.stance === 'SURFACED' ? 'SUBMERGED' : 'SURFACED';
        if (nextStance === 'SURFACED' || this.engine.canSubmerge()) {
          this.engine.setStance(nextStance);
        }
        return;
      }
      case 'HOLD_POSITION': {
        this.engine.executeTurnMove(state.submarine.coordinate);
        return;
      }
      case 'RELOAD_TUBE': {
        this.engine.startTubeReload(interaction.tubeId);
        return;
      }
      case 'INTERCEPT_CONTACT': {
        const encounterContext = this.engine.createEncounterContext();
        if (encounterContext !== null) {
          this.onEnterEncounter(encounterContext);
        }
        return;
      }
      case 'MOVE_TO_HEX': {
        const option = this.engine.getReachableOptionAt(interaction.coordinate);
        if (option !== undefined) {
          this.engine.executeTurnMove(option.coordinate);
        }
        return;
      }
    }
  }

  public render(context: CanvasRenderingContext2D): void {
    const state = this.engine.getState();
    const theater = this.engine.getTheater();
    const reachableOptions = this.engine.getReachableHexes();
    const interceptableContact = this.engine.getInterceptableContact();

    renderStrategicMapChart(
      context,
      this.engine.getGrid(),
      reachableOptions,
      this.hoveredHex,
      theater.name,
    );

    renderStrategicUnitsAndLegend(
      context,
      state,
      theater.bases,
      interceptableContact?.contactId ?? null,
      this.hoveredHex,
    );

    this.lastHudRegions = renderStrategicHudPanel(
      context,
      state,
      this.engine.canSubmerge(),
      interceptableContact !== undefined,
    );
  }
}
