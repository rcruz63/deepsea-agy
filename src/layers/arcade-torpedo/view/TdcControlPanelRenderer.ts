import { findTorpedoTubeById } from '../../../core/armory/index.ts';
import { type RecognizedShipClass, SHIP_RECOGNITION_CATALOG } from '../domain/ShipRecognitionManual.ts';
import type { TorpedoArcadeStateSnapshot } from '../domain/TorpedoTypes.ts';

// Dibuja la consola derecha del TDC: giro de periscopio, manual naval, espoleta, cota, velocidad, AOB, tubos y disparo

export interface TdcControlRegion {
  readonly actionId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isEnabled: boolean;
}

function drawTdcButton(
  context: CanvasRenderingContext2D,
  region: TdcControlRegion,
  label: string,
  color: string,
  isSelected = false,
): TdcControlRegion {
  const { x, y, width, height, isEnabled } = region;
  context.fillStyle = isSelected ? 'rgba(0, 255, 170, 0.28)' : isEnabled ? 'rgba(0, 255, 170, 0.10)' : '#081318';
  context.fillRect(x, y, width, height);
  context.strokeStyle = isEnabled ? color : '#23403c';
  context.lineWidth = isSelected ? 2 : 1;
  context.strokeRect(x, y, width, height);

  context.fillStyle = isEnabled ? color : '#466963';
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillText(label, x + width / 2, y + height / 2 + 3.5);
  return region;
}

function renderManualClassButtons(
  context: CanvasRenderingContext2D,
  selectedClass: RecognizedShipClass,
  regions: TdcControlRegion[],
): void {
  const labels: Readonly<Record<RecognizedShipClass, string>> = {
    COASTAL_FREIGHTER: 'COSTERO',
    LIBERTY_CARGO: 'LIBERTY',
    T2_TANKER: 'T2 TANKER',
  };
  let buttonX = 664;
  for (const entry of SHIP_RECOGNITION_CATALOG) {
    regions.push(
      drawTdcButton(
        context,
        { actionId: `SET_CLASS:${entry.shipClass}`, x: buttonX, y: 46, width: 88, height: 24, isEnabled: true },
        labels[entry.shipClass],
        '#4cc9f0',
        entry.shipClass === selectedClass,
      ),
    );
    buttonX += 92;
  }
}

function renderStepperRow(
  context: CanvasRenderingContext2D,
  title: string,
  valueText: string,
  y: number,
  minusAction: string,
  plusAction: string,
  regions: TdcControlRegion[],
): void {
  context.fillStyle = '#a8dadc';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(title, 664, y + 16);

  regions.push(
    drawTdcButton(context, { actionId: minusAction, x: 816, y, width: 34, height: 22, isEnabled: true }, '-', '#ffd166'),
    drawTdcButton(context, { actionId: plusAction, x: 902, y, width: 34, height: 22, isEnabled: true }, '+', '#ffd166'),
  );

  context.fillStyle = '#00ffaa';
  context.textAlign = 'center';
  context.fillText(valueText, 876, y + 15);
}

export function renderTdcControlPanel(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
): readonly TdcControlRegion[] {
  const regions: TdcControlRegion[] = [];
  const { currentInput, recognizedManualEntry, armory, isTargetSunk, activeTorpedoRun } = snapshot;

  context.fillStyle = '#061217';
  context.fillRect(646, 0, 314, 640);
  context.strokeStyle = '#246a5e';
  context.lineWidth = 2;
  context.strokeRect(650, 12, 298, 616);

  context.fillStyle = '#00ffaa';
  context.font = 'bold 12px monospace';
  context.textAlign = 'left';
  context.fillText('MANUAL DE RECONOCIMIENTO NAVAL', 664, 34);

  renderManualClassButtons(context, currentInput.recognizedShipType, regions);

  context.fillStyle = '#ffd166';
  context.font = '10px monospace';
  context.textAlign = 'left';
  context.fillText(
    `Teórico: Eslora ${recognizedManualEntry.lengthMeters}m | Calado ${recognizedManualEntry.draftMeters}m | ${recognizedManualEntry.tonnage} BRT`,
    664,
    84,
  );
  context.fillStyle = '#8ab8a8';
  context.fillText(`Rasgo: ${recognizedManualEntry.silhouetteDescription}`, 664, 98);

  // Controles de giro directo del periscopio para adelantar el disparo
  regions.push(
    drawTdcButton(context, { actionId: 'ROTATE_PERISCOPE:-2', x: 664, y: 108, width: 88, height: 24, isEnabled: true }, '◄ GIRAR -2°', '#00ffaa'),
    drawTdcButton(context, { actionId: 'SYNC_TDC_LEAD', x: 756, y: 108, width: 88, height: 24, isEnabled: true }, 'ALINEAR TDC', '#4cc9f0'),
    drawTdcButton(context, { actionId: 'ROTATE_PERISCOPE:2', x: 848, y: 108, width: 88, height: 24, isEnabled: true }, 'GIRAR +2° ►', '#00ffaa'),
  );

  regions.push(
    drawTdcButton(context, { actionId: 'SET_PISTOL:IMPACT', x: 664, y: 138, width: 132, height: 24, isEnabled: true }, 'ESPOLETA IMPACTO', '#00ffaa', currentInput.pistolType === 'IMPACT'),
    drawTdcButton(context, { actionId: 'SET_PISTOL:MAGNETIC', x: 804, y: 138, width: 132, height: 24, isEnabled: true }, 'ESPOLETA MAGNÉTICA', '#4cc9f0', currentInput.pistolType === 'MAGNETIC'),
  );

  renderStepperRow(context, 'PROF. TORPEDO', `${currentInput.torpedoDepthMeters.toFixed(1)}m`, 170, 'STEP_DEPTH:-0.5', 'STEP_DEPTH:0.5', regions);
  renderStepperRow(context, 'VEL. BLANCO', `${currentInput.estimatedSpeedKnots} kn`, 198, 'STEP_SPEED:-1', 'STEP_SPEED:1', regions);
  renderStepperRow(context, 'AOB ESTIMADO', `${currentInput.estimatedAobDeg}°`, 226, 'STEP_AOB:-5', 'STEP_AOB:5', regions);

  context.fillStyle = '#63f5c4';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(`SELECCIÓN DE TUBO (RESERVA: ${armory.reserveTorpedoes})`, 664, 268);

  const allTubes = [...armory.bowTubes, ...armory.sternTubes];
  let tubeY = 276;
  for (const tube of allTubes) {
    const isLoaded = tube.status === 'LOADED';
    const label = tube.status === 'RELOADING' ? `${tube.tubeId}: RELOADING (${tube.remainingReloadTurns}t)` : `${tube.tubeId}: ${tube.status}`;
    regions.push(
      drawTdcButton(
        context,
        { actionId: `SELECT_TUBE:${tube.tubeId}`, x: 664, y: tubeY, width: 272, height: 24, isEnabled: isLoaded },
        label,
        isLoaded ? '#00ffaa' : '#ffd166',
        currentInput.selectedTubeId === tube.tubeId && isLoaded,
      ),
    );
    tubeY += 28;
  }

  const selectedTube = findTorpedoTubeById(armory, currentInput.selectedTubeId);
  const canFire = !isTargetSunk && activeTorpedoRun === null && selectedTube?.status === 'LOADED';
  const fireLabel = isTargetSunk
    ? '¡BLANCO HUNDIDO!'
    : activeTorpedoRun !== null
      ? 'TORPEDO EN AGUA...'
      : '¡FUEGO! (ESPACIO / CLIC)';

  regions.push(
    drawTdcButton(context, { actionId: 'FIRE_TORPEDO', x: 664, y: 432, width: 272, height: 48, isEnabled: canFire }, fireLabel, '#ef476f'),
    drawTdcButton(context, { actionId: 'ADVANCE_RELOAD_TICK', x: 664, y: 492, width: 272, height: 34, isEnabled: !isTargetSunk && activeTorpedoRun === null }, 'AVANZAR 5 MIN (RECARGAR TUBOS +1 TICK)', '#ffd166'),
    drawTdcButton(context, { actionId: 'EXIT_PERISCOPE', x: 664, y: 538, width: 272, height: 46, isEnabled: activeTorpedoRun === null }, 'BAJAR PERISCOPIO / VOLVER A PATRULLA', '#00ffaa'),
  );

  return regions;
}
