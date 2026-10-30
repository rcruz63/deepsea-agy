import { findTorpedoTubeById } from '../../../core/armory/index.ts';
import { type RecognizedShipClass, SHIP_RECOGNITION_CATALOG } from '../domain/ShipRecognitionManual.ts';
import type { TorpedoArcadeStateSnapshot } from '../domain/TorpedoTypes.ts';

// Dibuja la consola simplificada de ataque: manual naval, giro del periscopio, espoleta, profundidad y tubos

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
        { actionId: `SET_CLASS:${entry.shipClass}`, x: buttonX, y: 48, width: 88, height: 26, isEnabled: true },
        labels[entry.shipClass],
        '#4cc9f0',
        entry.shipClass === selectedClass,
      ),
    );
    buttonX += 92;
  }
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
  context.fillText('1. MANUAL DE RECONOCIMIENTO', 664, 36);

  renderManualClassButtons(context, currentInput.recognizedShipType, regions);

  context.fillStyle = '#ffd166';
  context.font = '10px monospace';
  context.textAlign = 'left';
  context.fillText(
    `Eslora: ${recognizedManualEntry.lengthMeters}m | Calado: ${recognizedManualEntry.draftMeters}m | ${recognizedManualEntry.tonnage} BRT`,
    664,
    90,
  );
  context.fillStyle = '#8ab8a8';
  context.fillText(`Silueta: ${recognizedManualEntry.silhouetteDescription}`, 664, 106);

  // Sección 2: Giro del Periscopio para adelantar el tiro
  context.fillStyle = '#00ffaa';
  context.font = 'bold 11px monospace';
  context.fillText('2. GIRO DEL PERISCOPIO (ADELANTO)', 664, 132);
  regions.push(
    drawTdcButton(context, { actionId: 'ROTATE_PERISCOPE:-5', x: 664, y: 140, width: 64, height: 26, isEnabled: true }, '◄◄ -5°', '#00ffaa'),
    drawTdcButton(context, { actionId: 'ROTATE_PERISCOPE:-1', x: 733, y: 140, width: 64, height: 26, isEnabled: true }, '◄ -1°', '#63f5c4'),
    drawTdcButton(context, { actionId: 'ROTATE_PERISCOPE:1', x: 803, y: 140, width: 64, height: 26, isEnabled: true }, '+1° ►', '#63f5c4'),
    drawTdcButton(context, { actionId: 'ROTATE_PERISCOPE:5', x: 872, y: 140, width: 64, height: 26, isEnabled: true }, '+5° ►►', '#00ffaa'),
  );

  // Sección 3: Espoleta y Profundidad
  context.fillStyle = '#00ffaa';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText('3. ESPOLETA Y PROFUNDIDAD', 664, 188);
  regions.push(
    drawTdcButton(context, { actionId: 'SET_PISTOL:IMPACT', x: 664, y: 196, width: 132, height: 26, isEnabled: true }, 'IMPACTO (<= CALADO)', '#00ffaa', currentInput.pistolType === 'IMPACT'),
    drawTdcButton(context, { actionId: 'SET_PISTOL:MAGNETIC', x: 804, y: 196, width: 132, height: 26, isEnabled: true }, 'MAGNÉTICA (+1m)', '#4cc9f0', currentInput.pistolType === 'MAGNETIC'),
  );

  context.fillStyle = '#a8dadc';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText('PROF. TORPEDO', 664, 248);
  regions.push(
    drawTdcButton(context, { actionId: 'STEP_DEPTH:-0.5', x: 804, y: 231, width: 38, height: 26, isEnabled: true }, '-0.5', '#ffd166'),
    drawTdcButton(context, { actionId: 'STEP_DEPTH:0.5', x: 898, y: 231, width: 38, height: 26, isEnabled: true }, '+0.5', '#ffd166'),
  );
  context.fillStyle = '#00ffaa';
  context.textAlign = 'center';
  context.fillText(`${currentInput.torpedoDepthMeters.toFixed(1)}m`, 870, 248);

  // Sección 4: Selección de Tubos
  context.fillStyle = '#63f5c4';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(`4. TUBO LANZATORPEDOS (RESERVA: ${armory.reserveTorpedoes})`, 664, 280);

  const allTubes = [...armory.bowTubes, ...armory.sternTubes];
  let tubeY = 288;
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
    drawTdcButton(context, { actionId: 'FIRE_TORPEDO', x: 664, y: 436, width: 272, height: 48, isEnabled: canFire }, fireLabel, '#ef476f'),
    drawTdcButton(context, { actionId: 'ADVANCE_RELOAD_TICK', x: 664, y: 496, width: 272, height: 34, isEnabled: !isTargetSunk && activeTorpedoRun === null }, 'AVANZAR 5 MIN (RECARGAR TUBOS +1 TICK)', '#ffd166'),
    drawTdcButton(context, { actionId: 'EXIT_PERISCOPE', x: 664, y: 542, width: 272, height: 46, isEnabled: activeTorpedoRun === null }, 'BAJAR PERISCOPIO / VOLVER A PATRULLA', '#00ffaa'),
  );

  return regions;
}
