import { fireTorpedoTubeInArmory } from '../core/armory/index.ts';
import type {
  EncounterResult,
  FiringSolutionContext,
  TorpedoArmoryState,
} from '../core/contracts/index.ts';
import type { Point2D } from '../core/hex/index.ts';

// Pantalla puente del Hito 1.4 (Ataque Arcade TDC) que muestra el FiringSolutionContext calculado al subir el periscopio

interface StubButtonBounds {
  readonly id: 'SIMULATE_SINKING' | 'SIMULATE_DISENGAGE';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const STUB_BUTTONS: readonly StubButtonBounds[] = [
  { id: 'SIMULATE_SINKING', x: 150, y: 500, width: 315, height: 48 },
  { id: 'SIMULATE_DISENGAGE', x: 495, y: 500, width: 315, height: 48 },
];

function consumeFirstLoadedTubeIfAvailable(
  armory: TorpedoArmoryState,
): TorpedoArmoryState {
  const loadedTube =
    armory.bowTubes.find((tube) => tube.status === 'LOADED') ??
    armory.sternTubes.find((tube) => tube.status === 'LOADED');
  return loadedTube === undefined
    ? armory
    : fireTorpedoTubeInArmory(armory, loadedTube.tubeId);
}

export class EncounterStubView {
  private readonly onCompleteEncounter: (result: EncounterResult) => void;

  public constructor(onCompleteEncounter: (result: EncounterResult) => void) {
    this.onCompleteEncounter = onCompleteEncounter;
  }

  public handlePointerClick(
    canvasPoint: Point2D,
    firingSolution: FiringSolutionContext,
  ): void {
    const clickedButton = STUB_BUTTONS.find(
      (btn) =>
        canvasPoint.x >= btn.x &&
        canvasPoint.x <= btn.x + btn.width &&
        canvasPoint.y >= btn.y &&
        canvasPoint.y <= btn.y + btn.height,
    );
    if (clickedButton === undefined) {
      return;
    }

    if (clickedButton.id === 'SIMULATE_SINKING') {
      this.onCompleteEncounter({
        contactId: firingSolution.contactId,
        outcome: 'TARGET_SUNK',
        updatedArmory: consumeFirstLoadedTubeIfAvailable(firingSolution.armory),
        hullDamageTaken: 0,
        isTargetSunk: true,
        sunkTonnageAwarded: firingSolution.targetShip.spec.tonnage,
        tacticalTurnsElapsed: 1,
      });
      return;
    }

    this.onCompleteEncounter({
      contactId: firingSolution.contactId,
      outcome: 'DISENGAGED',
      updatedArmory: firingSolution.armory,
      hullDamageTaken: 0,
      isTargetSunk: false,
      sunkTonnageAwarded: 0,
      tacticalTurnsElapsed: 1,
    });
  }

  public render(
    context: CanvasRenderingContext2D,
    firingSolution: FiringSolutionContext,
  ): void {
    context.fillStyle = '#040d12';
    context.fillRect(0, 0, 960, 640);
    context.strokeStyle = '#00ffaa';
    context.lineWidth = 2;
    context.strokeRect(90, 55, 780, 530);

    context.fillStyle = '#00ffaa';
    context.font = 'bold 17px monospace';
    context.textAlign = 'center';
    context.fillText(
      'VISOR DE PERISCOPIO // FIRING SOLUTION CONTEXT (STUB HITO 1.4)',
      480,
      102,
    );

    const { targetShip, armory, difficulty } = firingSolution;
    const loadedBowCount = armory.bowTubes.filter(
      (tube) => tube.status === 'LOADED',
    ).length;
    const loadedSternCount = armory.sternTubes.filter(
      (tube) => tube.status === 'LOADED',
    ).length;
    const sweepDirectionLabel =
      firingSolution.targetBowSide === 'STARBOARD'
        ? 'ESTRIBOR (Cruza de Izquierda -> Derecha)'
        : 'BABOR (Cruza de Derecha -> Izquierda)';

    const telemetryLines: readonly string[] = [
      `BLANCO FIJADO      : ${targetShip.spec.className} [${firingSolution.contactId}]`,
      `TONELAJE Y CALADO  : ${targetShip.spec.tonnage} BRT | Calado real: ${targetShip.spec.draftMeters} m`,
      '------------------------------------------------------------------------',
      `DISTANCIA REAL     : ${firingSolution.distanceMeters} metros (${firingSolution.relativeDistanceHexes} hexágonos tácticos)`,
      `ÁNGULO EN LA PROA  : AOB ${firingSolution.targetAngleOnBowDeg}° por ${sweepDirectionLabel}`,
      `VELOCIDAD BLANCO   : ${firingSolution.targetSpeedKnots} nudos (Rumbo axial: ${targetShip.heading})`,
      '------------------------------------------------------------------------',
      `TUBOS LISTOS       : Proa ${loadedBowCount}/4 LOADED | Popa ${loadedSternCount}/1 LOADED | Reserva: ${armory.reserveTorpedoes}`,
      `TOLERANCIA TDC     : ±${difficulty.impactAngleToleranceDegrees}° (${difficulty.level}) | Casco: ${firingSolution.hullIntegrityAtPeriscope}%`,
    ];

    context.textAlign = 'left';
    context.font = '13px monospace';
    let lineY = 154;
    for (const line of telemetryLines) {
      context.fillStyle = line.startsWith('---') ? '#265c52' : '#c7f9cc';
      context.fillText(line, 135, lineY);
      lineY += 32;
    }

    for (const button of STUB_BUTTONS) {
      const isSinkButton = button.id === 'SIMULATE_SINKING';
      context.fillStyle = isSinkButton
        ? 'rgba(0, 255, 170, 0.16)'
        : 'rgba(255, 159, 28, 0.14)';
      context.fillRect(button.x, button.y, button.width, button.height);
      context.strokeStyle = isSinkButton ? '#00ffaa' : '#ff9f1c';
      context.strokeRect(button.x, button.y, button.width, button.height);
      context.fillStyle = isSinkButton ? '#00ffaa' : '#ffbf69';
      context.font = 'bold 11px monospace';
      context.textAlign = 'center';
      context.fillText(
        isSinkButton
          ? 'SIMULAR IMPACTO TDC (HUNDIR BLANCO)'
          : 'ABORTAR ATAQUE (VOLVER AL MAPA)',
        button.x + button.width / 2,
        button.y + 28,
      );
    }
  }
}
