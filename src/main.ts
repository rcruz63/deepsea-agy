import { GameFlowController } from './flow/index.ts';
import {
  TorpedoArcadeEngine,
  TorpedoArcadeStageView,
} from './layers/arcade-torpedo/index.ts';
import { StrategicStageView } from './layers/strategic/index.ts';
import { HexTacticalEngine, TacticalStageView } from './layers/tactical/index.ts';
import { ViewportFrameComposer } from './shell/ViewportFrameComposer.ts';

// Conecta el viewport HiDPI 100% x 100dvh con las 3 capas: carta completa con pan/zoom en Estratégico y consola centrada en combate

const DRAG_PAN_THRESHOLD_PX = 5;

export function bootstrapApplicationShell(): HTMLCanvasElement | null {
  const canvasElement = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (canvasElement === null) {
    return null;
  }
  const renderingContext = canvasElement.getContext('2d');
  if (renderingContext === null) {
    return canvasElement;
  }

  const tacticalEngine = new HexTacticalEngine();
  const arcadeEngine = new TorpedoArcadeEngine();
  const flowController = new GameFlowController({ tacticalStage: tacticalEngine });

  let isDraggingMap = false;
  let hasExceededDragThreshold = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  let composer: ViewportFrameComposer | null = null;

  const renderActiveFrame = (): void => {
    if (composer === null) {
      return;
    }
    const snapshot = flowController.getSnapshot();
    if (snapshot.phase === 'STRATEGIC_PATROL') {
      const size = composer.beginFullViewportFrame();
      strategicView.render(renderingContext, size.width, size.height);
      return;
    }
    if (snapshot.phase === 'TACTICAL_ENCOUNTER') {
      composer.renderConsoleOverChartBackdrop(
        strategicView.getBackdropCanvas(),
        (ctx) => tacticalView.render(ctx),
      );
      return;
    }
    composer.renderConsoleOverChartBackdrop(
      strategicView.getBackdropCanvas(),
      (ctx) => arcadeView.render(ctx),
    );
  };

  const strategicView = new StrategicStageView(
    flowController.getStrategicEngine(),
    (encounterContext) => {
      flowController.beginTacticalEncounter(encounterContext);
      renderActiveFrame();
    },
  );

  const tacticalView = new TacticalStageView(tacticalEngine, (resolution) => {
    if (resolution.status === 'ENTER_TORPEDO_ATTACK') {
      arcadeEngine.startAttack(resolution.firingContext);
    }
    flowController.applyTacticalResolution(resolution);
    renderActiveFrame();
  });

  const arcadeView = new TorpedoArcadeStageView(
    arcadeEngine,
    (encounterResult) => {
      flowController.completeEncounter(encounterResult);
      renderActiveFrame();
    },
    renderActiveFrame,
  );

  composer = new ViewportFrameComposer(canvasElement, renderingContext, renderActiveFrame);

  canvasElement.addEventListener('mousedown', (event: MouseEvent) => {
    if (event.button !== 0 || composer === null) {
      return;
    }
    if (flowController.getSnapshot().phase !== 'STRATEGIC_PATROL') {
      return;
    }
    const screenPt = composer.toLogicalViewportPoint(event.clientX, event.clientY);
    if (strategicView.canStartDragPanAt(screenPt)) {
      isDraggingMap = true;
      hasExceededDragThreshold = false;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    }
  });

  window.addEventListener('mouseup', () => {
    isDraggingMap = false;
  });

  canvasElement.addEventListener('mousemove', (event: MouseEvent) => {
    if (composer === null) {
      return;
    }
    const snapshot = flowController.getSnapshot();
    if (snapshot.phase === 'STRATEGIC_PATROL') {
      if (isDraggingMap) {
        const dx = event.clientX - lastPointerX;
        const dy = event.clientY - lastPointerY;
        if (Math.hypot(dx, dy) >= DRAG_PAN_THRESHOLD_PX || hasExceededDragThreshold) {
          hasExceededDragThreshold = true;
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;
          strategicView.handlePointerDragPan(dx, dy);
          renderActiveFrame();
          return;
        }
      }
      strategicView.handlePointerMove(
        composer.toLogicalViewportPoint(event.clientX, event.clientY),
      );
      renderActiveFrame();
    } else if (snapshot.phase === 'TACTICAL_ENCOUNTER') {
      const consolePt = composer.toConsoleStagePoint(event.clientX, event.clientY);
      if (consolePt !== null) {
        tacticalView.handlePointerMove(consolePt);
        renderActiveFrame();
      }
    }
  });

  canvasElement.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      if (composer === null || flowController.getSnapshot().phase !== 'STRATEGIC_PATROL') {
        return;
      }
      event.preventDefault();
      strategicView.handleWheelZoom(
        composer.toLogicalViewportPoint(event.clientX, event.clientY),
        event.deltaY,
      );
      renderActiveFrame();
    },
    { passive: false },
  );

  canvasElement.addEventListener('click', (event: MouseEvent) => {
    if (composer === null) {
      return;
    }
    if (hasExceededDragThreshold) {
      hasExceededDragThreshold = false;
      return;
    }
    const snapshot = flowController.getSnapshot();
    if (snapshot.phase === 'STRATEGIC_PATROL') {
      strategicView.handlePointerClick(
        composer.toLogicalViewportPoint(event.clientX, event.clientY),
      );
    } else {
      const consolePt = composer.toConsoleStagePoint(event.clientX, event.clientY);
      if (consolePt !== null) {
        if (snapshot.phase === 'TACTICAL_ENCOUNTER') {
          tacticalView.handlePointerClick(consolePt);
        } else {
          arcadeView.handlePointerClick(consolePt);
        }
      }
    }
    renderActiveFrame();
  });

  renderActiveFrame();
  return canvasElement;
}

if (typeof document !== 'undefined') {
  bootstrapApplicationShell();
}
