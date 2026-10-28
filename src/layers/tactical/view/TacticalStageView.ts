import type { TacticalStageResolution } from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type Point2D,
  areAxialCoordinatesEqual,
} from '../../../core/hex/index.ts';
import type { HudInteractiveRegion } from '../../strategic/view/StrategicHudRenderer.ts';
import type { HexTacticalEngine } from '../domain/HexTacticalEngine.ts';
import type { TacticalDepth } from '../domain/TacticalTypes.ts';
import {
  renderTacticalBoard,
  unprojectTacticalCanvasPoint,
} from './TacticalBoardRenderer.ts';
import { renderTacticalHudPanel } from './TacticalHudRenderer.ts';

// Coordina el dibujado del tablero táctico 15x15 y despacha comandos del jugador hacia HexTacticalEngine

const TACTICAL_MAP_MAX_X = 655;

function isInsideRegion(point: Point2D, region: HudInteractiveRegion): boolean {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.width &&
    point.y >= region.y &&
    point.y <= region.y + region.height
  );
}

export class TacticalStageView {
  private readonly engine: HexTacticalEngine;
  private readonly onResolutionChanged: (resolution: TacticalStageResolution) => void;
  private hoveredHex: AxialCoordinate | null = null;
  private lastHudRegions: readonly HudInteractiveRegion[] = [];

  public constructor(
    engine: HexTacticalEngine,
    onResolutionChanged: (resolution: TacticalStageResolution) => void,
  ) {
    this.engine = engine;
    this.onResolutionChanged = onResolutionChanged;
  }

  public handlePointerMove(canvasPoint: Point2D): void {
    this.hoveredHex =
      canvasPoint.x <= TACTICAL_MAP_MAX_X
        ? unprojectTacticalCanvasPoint(canvasPoint)
        : null;
  }

  public handlePointerClick(canvasPoint: Point2D): void {
    const clickedRegion = this.lastHudRegions.find(
      (region) => region.isEnabled && isInsideRegion(canvasPoint, region),
    );

    if (clickedRegion !== undefined) {
      const resolution = this.dispatchHudAction(clickedRegion.actionId);
      if (resolution !== null) {
        this.onResolutionChanged(resolution);
      }
      return;
    }

    if (canvasPoint.x <= TACTICAL_MAP_MAX_X) {
      const targetHex = unprojectTacticalCanvasPoint(canvasPoint);
      const snapshot = this.engine.getViewState();
      const isReachable = snapshot.reachableOptions.some((opt) =>
        areAxialCoordinatesEqual(opt.coordinate, targetHex),
      );
      if (isReachable) {
        const resolution = this.engine.executeCommand({
          type: 'MOVE_SUBMARINE',
          destination: targetHex,
        });
        this.onResolutionChanged(resolution);
      }
    }
  }

  private dispatchHudAction(actionId: string): TacticalStageResolution | null {
    if (actionId.startsWith('SET_DEPTH:')) {
      const depth = actionId.slice('SET_DEPTH:'.length) as TacticalDepth;
      return this.engine.executeCommand({ type: 'SET_DEPTH', depth });
    }
    if (actionId === 'HOLD_POSITION') {
      const currentCoordinate = this.engine.getViewState().submarine.coordinate;
      return this.engine.executeCommand({
        type: 'MOVE_SUBMARINE',
        destination: currentCoordinate,
      });
    }
    if (actionId.startsWith('RELOAD_TUBE:')) {
      const tubeId = actionId.slice('RELOAD_TUBE:'.length);
      return this.engine.executeCommand({ type: 'START_TUBE_RELOAD', tubeId });
    }
    if (actionId === 'RAISE_PERISCOPE') {
      return this.engine.executeCommand({ type: 'RAISE_PERISCOPE_AND_LOCK' });
    }
    if (actionId === 'DISENGAGE') {
      return this.engine.executeCommand({ type: 'DISENGAGE' });
    }
    return null;
  }

  public render(context: CanvasRenderingContext2D): void {
    const snapshot = this.engine.getViewState();
    renderTacticalBoard(
      context,
      this.engine.getGrid(),
      snapshot,
      this.hoveredHex,
    );
    this.lastHudRegions = renderTacticalHudPanel(context, snapshot);
  }
}
