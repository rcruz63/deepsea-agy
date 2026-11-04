import type { EncounterContext } from '../../../core/contracts/index.ts';
import type { AxialCoordinate, Point2D } from '../../../core/hex/index.ts';
import type { StrategicEngine } from '../domain/StrategicEngine.ts';
import { buildHistoricalChartBackdrop } from './HistoricalChartBackdropBuilder.ts';
import { StrategicCameraController } from './StrategicCameraController.ts';
import {
  type HudBlockingRect,
  type HudInteractiveRegion,
  renderStrategicFloatingCartouches,
} from './StrategicHudRenderer.ts';
import {
  dispatchStrategicInteraction,
  isScreenPointOverStrategicHud,
  resolveStrategicClickInteraction,
  resolveStrategicHoveredHex,
} from './StrategicInputHandler.ts';
import { renderStrategicIntelOverlay } from './StrategicIntelOverlayRenderer.ts';
import {
  computeStrategicWorldBounds,
  projectStrategicHexCenter,
  renderStrategicMapWorld,
} from './StrategicMapRenderer.ts';
import { renderStrategicTopCommandBar } from './StrategicTopBarRenderer.ts';
import { renderStrategicUnitsWorld } from './StrategicUnitRenderer.ts';

// Coordina cámara pan/zoom, lámina histórica cacheada, niebla de guerra y HUD flotante de la capa estratégica

export class StrategicStageView {
  private readonly engine: StrategicEngine;
  private readonly onEnterEncounter: (context: EncounterContext) => void;
  private readonly camera = new StrategicCameraController();
  private backdropCanvas: HTMLCanvasElement | null = null;
  private hoveredHex: AxialCoordinate | null = null;
  private lastHudRegions: readonly HudInteractiveRegion[] = [];
  private lastBlockingRects: readonly HudBlockingRect[] = [];
  private lastViewportWidth = 1280;
  private lastViewportHeight = 800;

  public constructor(
    engine: StrategicEngine,
    onEnterEncounter: (context: EncounterContext) => void,
  ) {
    this.engine = engine;
    this.onEnterEncounter = onEnterEncounter;
    const theater = engine.getTheater();
    this.camera.setWorldBounds(
      computeStrategicWorldBounds(theater.gridWidth, theater.gridHeight),
    );
    this.backdropCanvas = buildHistoricalChartBackdrop(engine.getGrid(), theater);
  }

  public getBackdropCanvas(): HTMLCanvasElement | null {
    return this.backdropCanvas;
  }

  public canStartDragPanAt(screenPoint: Point2D): boolean {
    return !isScreenPointOverStrategicHud(screenPoint, this.lastBlockingRects);
  }

  public handlePointerDragPan(deltaX: number, deltaY: number): void {
    this.camera.panByScreenDelta(
      deltaX,
      deltaY,
      this.lastViewportWidth,
      this.lastViewportHeight,
    );
  }

  public handleWheelZoom(screenPoint: Point2D, wheelDeltaY: number): void {
    this.camera.zoomAtScreenPoint(
      screenPoint,
      wheelDeltaY,
      this.lastViewportWidth,
      this.lastViewportHeight,
    );
  }

  public handlePointerMove(screenPoint: Point2D): void {
    this.hoveredHex = resolveStrategicHoveredHex(
      screenPoint,
      this.lastBlockingRects,
      this.camera,
    );
  }

  public handlePointerClick(screenPoint: Point2D): void {
    const interaction = resolveStrategicClickInteraction(
      screenPoint,
      this.lastHudRegions,
      this.lastBlockingRects,
      this.camera,
    );
    if (interaction !== null) {
      dispatchStrategicInteraction(
        this.engine,
        interaction,
        (coord, zoom) => this.centerCameraOnCoordinate(coord, zoom),
        this.onEnterEncounter,
      );
    }
  }

  public centerCameraOnCoordinate(coord: AxialCoordinate, zoom?: number): void {
    this.camera.focusOnWorldPoint(
      projectStrategicHexCenter(coord),
      this.lastViewportWidth,
      this.lastViewportHeight,
      zoom,
    );
  }

  public render(
    context: CanvasRenderingContext2D,
    viewportWidth = 1280,
    viewportHeight = 800,
  ): void {
    this.lastViewportWidth = viewportWidth;
    this.lastViewportHeight = viewportHeight;
    const state = this.engine.getState();
    const theater = this.engine.getTheater();
    const worldBounds = computeStrategicWorldBounds(theater.gridWidth, theater.gridHeight);

    if (!this.camera.isInitialized()) {
      this.centerCameraOnCoordinate(state.submarine.coordinate, 0.92);
    }

    context.fillStyle = '#050d12';
    context.fillRect(0, 0, viewportWidth, viewportHeight);

    context.save();
    this.camera.applyTransform(context);
    renderStrategicMapWorld(
      context,
      this.backdropCanvas,
      this.engine.getGrid(),
      state,
      theater.marineQuadratSpec,
      this.engine.getReachableHexes(),
      this.hoveredHex,
      this.camera,
      worldBounds,
    );
    renderStrategicIntelOverlay(context, state, theater.marineQuadratSpec);
    const interceptable = this.engine.getInterceptableContact();
    renderStrategicUnitsWorld(context, state, theater, interceptable?.contactId ?? null);
    context.restore();

    const topRegions = renderStrategicTopCommandBar(
      context,
      state,
      theater.marineQuadratSpec,
      this.engine.canSubmerge(),
      viewportWidth,
    );
    const cartouches = renderStrategicFloatingCartouches(
      context,
      state,
      interceptable !== undefined,
      false,
      viewportWidth,
      viewportHeight,
    );
    this.lastHudRegions = [...topRegions, ...cartouches.interactiveRegions];
    this.lastBlockingRects = cartouches.blockingRects;
  }
}
