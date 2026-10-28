import type { EncounterResult } from '../../../core/contracts/index.ts';
import type { Point2D } from '../../../core/hex/index.ts';
import type { RecognizedShipClass } from '../domain/ShipRecognitionManual.ts';
import type { TorpedoArcadeEngine } from '../domain/TorpedoArcadeEngine.ts';
import type { TorpedoPistolType } from '../domain/TorpedoTypes.ts';
import { renderPeriscopeLensView } from './PeriscopeLensRenderer.ts';
import {
  type TdcControlRegion,
  renderTdcControlPanel,
} from './TdcControlPanelRenderer.ts';

// Coordina la vista de periscopio y consola TDC, despachando ajustes de puntería, disparos y retorno a patrulla

function isPointInsideRegion(point: Point2D, region: TdcControlRegion): boolean {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.width &&
    point.y >= region.y &&
    point.y <= region.y + region.height
  );
}

export class TorpedoArcadeStageView {
  private readonly engine: TorpedoArcadeEngine;
  private readonly onCompleteEncounter: (result: EncounterResult) => void;
  private lastControlRegions: readonly TdcControlRegion[] = [];
  private torpedoRunProgress: number | null = null;

  public constructor(
    engine: TorpedoArcadeEngine,
    onCompleteEncounter: (result: EncounterResult) => void,
  ) {
    this.engine = engine;
    this.onCompleteEncounter = onCompleteEncounter;
  }

  public handlePointerClick(canvasPoint: Point2D): void {
    const clickedRegion = this.lastControlRegions.find(
      (region) => region.isEnabled && isPointInsideRegion(canvasPoint, region),
    );
    if (clickedRegion === undefined) {
      return;
    }
    this.executeControlAction(clickedRegion.actionId);
  }

  private executeControlAction(actionId: string): void {
    const currentInput = this.engine.getSnapshot().currentInput;

    if (actionId.startsWith('SET_CLASS:')) {
      const recognizedShipType = actionId.slice(
        'SET_CLASS:'.length,
      ) as RecognizedShipClass;
      this.engine.updateTdcInput({ recognizedShipType });
      return;
    }

    if (actionId.startsWith('SET_PISTOL:')) {
      const pistolType = actionId.slice('SET_PISTOL:'.length) as TorpedoPistolType;
      this.engine.updateTdcInput({ pistolType });
      return;
    }

    if (actionId.startsWith('STEP_DEPTH:')) {
      const delta = Number(actionId.slice('STEP_DEPTH:'.length));
      this.engine.updateTdcInput({
        torpedoDepthMeters: currentInput.torpedoDepthMeters + delta,
      });
      return;
    }

    if (actionId.startsWith('STEP_SPEED:')) {
      const delta = Number(actionId.slice('STEP_SPEED:'.length));
      this.engine.updateTdcInput({
        estimatedSpeedKnots: currentInput.estimatedSpeedKnots + delta,
      });
      return;
    }

    if (actionId.startsWith('STEP_AOB:')) {
      const delta = Number(actionId.slice('STEP_AOB:'.length));
      this.engine.updateTdcInput({
        estimatedAobDeg: currentInput.estimatedAobDeg + delta,
      });
      return;
    }

    if (actionId.startsWith('SELECT_TUBE:')) {
      const selectedTubeId = actionId.slice('SELECT_TUBE:'.length);
      this.engine.updateTdcInput({ selectedTubeId });
      return;
    }

    if (actionId === 'FIRE_TORPEDO') {
      this.torpedoRunProgress = 1;
      this.engine.fireSelectedTorpedo();
      return;
    }

    if (actionId === 'ADVANCE_RELOAD_TICK') {
      this.torpedoRunProgress = null;
      this.engine.advanceFiveMinuteReloadTick();
      return;
    }

    if (actionId === 'EXIT_PERISCOPE') {
      this.torpedoRunProgress = null;
      this.onCompleteEncounter(this.engine.buildEncounterResult());
    }
  }

  public render(context: CanvasRenderingContext2D): void {
    const snapshot = this.engine.getSnapshot();
    renderPeriscopeLensView(context, snapshot, this.torpedoRunProgress);
    this.lastControlRegions = renderTdcControlPanel(context, snapshot);
  }
}
