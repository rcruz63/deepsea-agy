import { EncounterStubView, GameFlowController } from './flow/index.ts';
import { StrategicStageView } from './layers/strategic/index.ts';
import { toCanvasNormalizedPoint } from './layers/strategic/view/StrategicInputHandler.ts';
import { HexTacticalEngine, TacticalStageView } from './layers/tactical/index.ts';

// Conecta el controlador de flujo de las 3 capas con el lienzo Canvas 2D manteniendo la lógica de negocio desacoplada

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
  const flowController = new GameFlowController({
    tacticalStage: tacticalEngine,
  });

  const renderActiveFrame = (): void => {
    const snapshot = flowController.getSnapshot();
    if (snapshot.phase === 'STRATEGIC_PATROL') {
      strategicView.render(renderingContext);
      return;
    }
    if (snapshot.phase === 'TACTICAL_ENCOUNTER') {
      tacticalView.render(renderingContext);
      return;
    }
    encounterStubView.render(renderingContext, snapshot.activeFiringSolution);
  };

  const strategicView = new StrategicStageView(
    flowController.getStrategicEngine(),
    (encounterContext) => {
      flowController.beginTacticalEncounter(encounterContext);
      renderActiveFrame();
    },
  );

  const tacticalView = new TacticalStageView(tacticalEngine, (resolution) => {
    flowController.applyTacticalResolution(resolution);
    renderActiveFrame();
  });

  const encounterStubView = new EncounterStubView((encounterResult) => {
    flowController.completeEncounter(encounterResult);
    renderActiveFrame();
  });

  canvasElement.addEventListener('mousemove', (event: MouseEvent) => {
    const point = toCanvasNormalizedPoint(
      canvasElement,
      event.clientX,
      event.clientY,
    );
    const snapshot = flowController.getSnapshot();
    if (snapshot.phase === 'STRATEGIC_PATROL') {
      strategicView.handlePointerMove(point);
      renderActiveFrame();
    } else if (snapshot.phase === 'TACTICAL_ENCOUNTER') {
      tacticalView.handlePointerMove(point);
      renderActiveFrame();
    }
  });

  canvasElement.addEventListener('click', (event: MouseEvent) => {
    const point = toCanvasNormalizedPoint(
      canvasElement,
      event.clientX,
      event.clientY,
    );
    const snapshot = flowController.getSnapshot();
    if (snapshot.phase === 'STRATEGIC_PATROL') {
      strategicView.handlePointerClick(point);
    } else if (snapshot.phase === 'TACTICAL_ENCOUNTER') {
      tacticalView.handlePointerClick(point);
    } else {
      encounterStubView.handlePointerClick(point, snapshot.activeFiringSolution);
    }
    renderActiveFrame();
  });

  renderActiveFrame();
  return canvasElement;
}

if (typeof document !== 'undefined') {
  bootstrapApplicationShell();
}
