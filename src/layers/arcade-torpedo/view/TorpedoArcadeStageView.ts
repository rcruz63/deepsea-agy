import type { EncounterResult } from '../../../core/contracts/index.ts';
import type { Point2D } from '../../../core/hex/index.ts';
import type { RecognizedShipClass } from '../domain/ShipRecognitionManual.ts';
import type { TorpedoArcadeEngine } from '../domain/TorpedoArcadeEngine.ts';
import type { TorpedoPistolType } from '../domain/TorpedoTypes.ts';
import {
  PERISCOPE_LENS_CENTER_Y,
  PERISCOPE_LENS_RADIUS,
  renderPeriscopeLensView,
} from './PeriscopeLensRenderer.ts';
import {
  PERISCOPE_LENS_CENTER_X,
  PIXELS_PER_BEARING_DEGREE,
} from './PeriscopeTargetRenderer.ts';
import {
  type TdcControlRegion,
  renderTdcControlPanel,
} from './TdcControlPanelRenderer.ts';

// Coordina la vista del periscopio de 360°: bucle de animación, giro de lente (A/D), timón del submarino (Q/E) y disparo

function isPointInsideRegion(point: Point2D, region: TdcControlRegion): boolean {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.width &&
    point.y >= region.y &&
    point.y <= region.y + region.height
  );
}

function isPointInsidePeriscopeLens(point: Point2D): boolean {
  const dx = point.x - PERISCOPE_LENS_CENTER_X;
  const dy = point.y - PERISCOPE_LENS_CENTER_Y;
  return dx * dx + dy * dy <= PERISCOPE_LENS_RADIUS * PERISCOPE_LENS_RADIUS;
}

export class TorpedoArcadeStageView {
  private readonly engine: TorpedoArcadeEngine;
  private readonly onCompleteEncounter: (result: EncounterResult) => void;
  private readonly onRequestRedraw: (() => void) | undefined;
  private lastControlRegions: readonly TdcControlRegion[] = [];
  private animationFrameId: number | null = null;
  private lastTimestampMs: number | null = null;

  public constructor(
    engine: TorpedoArcadeEngine,
    onCompleteEncounter: (result: EncounterResult) => void,
    onRequestRedraw?: () => void,
  ) {
    this.engine = engine;
    this.onCompleteEncounter = onCompleteEncounter;
    this.onRequestRedraw = onRequestRedraw;
    this.bindKeyboardShortcuts();
  }

  private bindKeyboardShortcuts(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (this.animationFrameId === null) {
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        this.engine.rotatePeriscope(-2.5);
        this.onRequestRedraw?.();
      } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        this.engine.rotatePeriscope(2.5);
        this.onRequestRedraw?.();
      } else if (event.key === 'q' || event.key === 'Q') {
        this.engine.steerSubmarine(-8);
        this.onRequestRedraw?.();
      } else if (event.key === 'e' || event.key === 'E') {
        this.engine.steerSubmarine(8);
        this.onRequestRedraw?.();
      } else if (event.key === ' ') {
        event.preventDefault();
        this.engine.launchTorpedoRun();
        this.onRequestRedraw?.();
      }
    });
  }

  private ensureSimulationLoopRunning(): void {
    if (this.animationFrameId !== null || typeof window === 'undefined') {
      return;
    }
    this.lastTimestampMs = performance.now();
    const tick = (nowMs: number): void => {
      const previousMs = this.lastTimestampMs ?? nowMs;
      const deltaSeconds = Math.min(0.1, Math.max(0, (nowMs - previousMs) / 1000));
      this.lastTimestampMs = nowMs;
      this.engine.stepSimulation(deltaSeconds);
      this.onRequestRedraw?.();
      if (this.animationFrameId !== null) {
        this.animationFrameId = window.requestAnimationFrame(tick);
      }
    };
    this.animationFrameId = window.requestAnimationFrame(tick);
  }

  private stopSimulationLoop(): void {
    if (this.animationFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = null;
    this.lastTimestampMs = null;
  }

  public handlePointerClick(canvasPoint: Point2D): void {
    if (isPointInsidePeriscopeLens(canvasPoint)) {
      const currentBearing = this.engine.getSnapshot().periscopeBearingDeg;
      const deltaDeg = (canvasPoint.x - PERISCOPE_LENS_CENTER_X) / PIXELS_PER_BEARING_DEGREE;
      this.engine.setPeriscopeBearing(currentBearing + deltaDeg);
      return;
    }

    const clickedRegion = this.lastControlRegions.find(
      (region) => region.isEnabled && isPointInsideRegion(canvasPoint, region),
    );
    if (clickedRegion !== undefined) {
      this.executeControlAction(clickedRegion.actionId);
    }
  }

  private executeControlAction(actionId: string): void {
    const snapshot = this.engine.getSnapshot();
    const currentInput = snapshot.currentInput;

    if (actionId.startsWith('ROTATE_PERISCOPE:')) {
      this.engine.rotatePeriscope(Number(actionId.slice('ROTATE_PERISCOPE:'.length)));
      return;
    }
    if (actionId.startsWith('STEER_SUBMARINE:')) {
      this.engine.steerSubmarine(Number(actionId.slice('STEER_SUBMARINE:'.length)));
      return;
    }
    if (actionId.startsWith('SET_CLASS:')) {
      const recognizedShipType = actionId.slice('SET_CLASS:'.length) as RecognizedShipClass;
      const entry = this.engine.updateTdcInput({ recognizedShipType }).recognizedManualEntry;
      const suggestedDepth = currentInput.pistolType === 'MAGNETIC' ? entry.draftMeters + 1.0 : Math.max(2.0, entry.draftMeters - 1.5);
      this.engine.updateTdcInput({ torpedoDepthMeters: suggestedDepth });
      return;
    }
    if (actionId.startsWith('SET_PISTOL:')) {
      const pistolType = actionId.slice('SET_PISTOL:'.length) as TorpedoPistolType;
      const draft = snapshot.recognizedManualEntry.draftMeters;
      const suggestedDepth = pistolType === 'MAGNETIC' ? draft + 1.0 : Math.max(2.0, draft - 1.5);
      this.engine.updateTdcInput({ pistolType, torpedoDepthMeters: suggestedDepth });
      return;
    }
    if (actionId.startsWith('STEP_DEPTH:')) {
      this.engine.updateTdcInput({ torpedoDepthMeters: currentInput.torpedoDepthMeters + Number(actionId.slice('STEP_DEPTH:'.length)) });
      return;
    }
    if (actionId.startsWith('SELECT_TUBE:')) {
      this.engine.updateTdcInput({ selectedTubeId: actionId.slice('SELECT_TUBE:'.length) });
      return;
    }
    if (actionId === 'FIRE_TORPEDO') {
      this.engine.launchTorpedoRun();
      return;
    }
    if (actionId === 'ADVANCE_RELOAD_TICK') {
      this.engine.advanceFiveMinuteReloadTick();
      return;
    }
    if (actionId === 'EXIT_PERISCOPE') {
      this.stopSimulationLoop();
      this.onCompleteEncounter(this.engine.buildEncounterResult());
    }
  }

  public render(context: CanvasRenderingContext2D): void {
    this.ensureSimulationLoopRunning();
    const snapshot = this.engine.getSnapshot();
    renderPeriscopeLensView(context, snapshot);
    this.lastControlRegions = renderTdcControlPanel(context, snapshot);
  }
}
