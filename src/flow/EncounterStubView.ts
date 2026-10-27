import { fireTorpedoTubeInArmory } from '../core/armory/index.ts';
import type {
  EncounterContext,
  EncounterResult,
  TorpedoArmoryState,
} from '../core/contracts/index.ts';
import type { Point2D } from '../core/hex/index.ts';

// Pantalla vectorial temporal (Hito 1.2) que inspecciona el EncounterContext capturado y simula el retorno EncounterResult hacia StrategicEngine

interface StubButtonBounds {
  readonly id: 'SIMULATE_SINKING' | 'SIMULATE_DISENGAGE';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const STUB_BUTTONS: readonly StubButtonBounds[] = [
  { id: 'SIMULATE_SINKING', x: 150, y: 495, width: 315, height: 48 },
  { id: 'SIMULATE_DISENGAGE', x: 495, y: 495, width: 315, height: 48 },
];

function consumeFirstLoadedTubeIfAvailable(
  armory: TorpedoArmoryState,
): TorpedoArmoryState {
  const loadedTube =
    armory.bowTubes.find((tube) => tube.status === 'LOADED') ??
    armory.sternTubes.find((tube) => tube.status === 'LOADED');
  if (loadedTube === undefined) {
    return armory;
  }
  return fireTorpedoTubeInArmory(armory, loadedTube.tubeId);
}

export class EncounterStubView {
  private readonly onCompleteEncounter: (result: EncounterResult) => void;

  public constructor(onCompleteEncounter: (result: EncounterResult) => void) {
    this.onCompleteEncounter = onCompleteEncounter;
  }

  public handlePointerClick(
    canvasPoint: Point2D,
    activeEncounter: EncounterContext,
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
        contactId: activeEncounter.targetShip.contactId,
        outcome: 'TARGET_SUNK',
        updatedArmory: consumeFirstLoadedTubeIfAvailable(
          activeEncounter.submarine.armory,
        ),
        hullDamageTaken: 0,
        isTargetSunk: true,
        sunkTonnageAwarded: activeEncounter.targetShip.spec.tonnage,
        tacticalTurnsElapsed: 3,
      });
      return;
    }

    this.onCompleteEncounter({
      contactId: activeEncounter.targetShip.contactId,
      outcome: 'DISENGAGED',
      updatedArmory: activeEncounter.submarine.armory,
      hullDamageTaken: 0,
      isTargetSunk: false,
      sunkTonnageAwarded: 0,
      tacticalTurnsElapsed: 1,
    });
  }

  public render(
    context: CanvasRenderingContext2D,
    encounter: EncounterContext,
  ): void {
    context.fillStyle = '#040d12';
    context.fillRect(0, 0, 960, 640);
    context.strokeStyle = '#00ffaa';
    context.lineWidth = 2;
    context.strokeRect(90, 60, 780, 520);

    context.fillStyle = '#00ffaa';
    context.font = 'bold 18px monospace';
    context.textAlign = 'center';
    context.fillText(
      'TRANSICIÓN CAPA TÁCTICA // ENCOUNTER CONTEXT CAPTURADO (STUB HITO 1.2)',
      480,
      108,
    );

    const { submarine, targetShip, difficulty } = encounter;
    const loadedBowCount = submarine.armory.bowTubes.filter(
      (tube) => tube.status === 'LOADED',
    ).length;
    const loadedSternCount = submarine.armory.sternTubes.filter(
      (tube) => tube.status === 'LOADED',
    ).length;

    const telemetryLines: readonly string[] = [
      `CONTACTO OBJETIVO  : ${targetShip.spec.className} [${targetShip.contactId}]`,
      `TONELAJE Y CALADO  : ${targetShip.spec.tonnage} BRT | Calado: ${targetShip.spec.draftMeters} m`,
      `VELOCIDAD Y RUMBO  : ${targetShip.speedKnots} nudos | Rumbo axial: ${targetShip.heading}`,
      '------------------------------------------------------------------------',
      `ESTADO SUBMARINO   : Postura ${submarine.stance} (${submarine.depth}) en (${submarine.coordinate.q}, ${submarine.coordinate.r})`,
      `RECURSOS A BORDO   : Fuel ${submarine.fuel}% | Batería ${submarine.battery}% | Casco ${submarine.hullIntegrity}%`,
      `ARMERÍA LISTA      : Proa ${loadedBowCount}/4 LOADED | Popa ${loadedSternCount}/1 LOADED | Reserva: ${submarine.armory.reserveTorpedoes}`,
      `PERFIL DIFICULTAD  : ${difficulty.level} (Recarga: ${difficulty.reloadTurnsRequired} turnos tácticos)`,
    ];

    context.textAlign = 'left';
    context.font = '13px monospace';
    let lineY = 165;
    for (const line of telemetryLines) {
      context.fillStyle = line.startsWith('---') ? '#265c52' : '#c7f9cc';
      context.fillText(line, 145, lineY);
      lineY += 34;
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
          ? 'HUNDIR MERCANTE (GASTAR 1 TORPEDO)'
          : 'ROMPER CONTACTO (VOLVER AL MAPA)',
        button.x + button.width / 2,
        button.y + 28,
      );
    }
  }
}
