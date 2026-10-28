import { canStartTorpedoReloadInArmory } from '../../../core/armory/index.ts';
import type { TorpedoTubeState } from '../../../core/contracts/index.ts';
import type { HudInteractiveRegion } from '../../strategic/view/StrategicHudRenderer.ts';
import type { TacticalDepth, TacticalStateSnapshot } from '../domain/TacticalTypes.ts';

// Renderiza el panel HUD táctico con selector de 3 cotas, telemetría AOB/banda en vivo y acciones de periscopio/ruptura

const DEPTH_BUTTON_SPECS: readonly { readonly depth: TacticalDepth; readonly label: string }[] = [
  { depth: 'SURFACED', label: 'SURFACED (MÁX 3 HEX)' },
  { depth: 'PERISCOPE_DEPTH', label: 'PERISCOPE (MÁX 2 HEX)' },
  { depth: 'DEEP', label: 'DEEP (MÁX 1 HEX)' },
];

function drawTacticalButton(
  context: CanvasRenderingContext2D,
  region: HudInteractiveRegion,
  label: string,
  color: string,
  isActiveSelection = false,
): HudInteractiveRegion {
  const { x, y, width, height, isEnabled } = region;
  context.fillStyle = isActiveSelection
    ? 'rgba(0, 255, 170, 0.26)'
    : isEnabled
      ? 'rgba(0, 255, 170, 0.10)'
      : '#081318';
  context.fillRect(x, y, width, height);
  context.strokeStyle = isEnabled ? color : '#24423e';
  context.lineWidth = isActiveSelection ? 2.2 : 1.2;
  context.strokeRect(x, y, width, height);

  context.fillStyle = isEnabled ? color : '#466963';
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillText(label, x + width / 2, y + height / 2 + 4);
  return region;
}

function renderTacticalTubeRow(
  context: CanvasRenderingContext2D,
  tube: TorpedoTubeState,
  canReload: boolean,
  y: number,
): HudInteractiveRegion {
  const region: HudInteractiveRegion = {
    actionId: `RELOAD_TUBE:${tube.tubeId}`,
    x: 680,
    y,
    width: 250,
    height: 24,
    isEnabled: canReload,
  };
  context.fillStyle = '#091b22';
  context.fillRect(region.x, region.y, region.width, region.height);
  context.strokeStyle = canReload ? '#ffd166' : '#1b4a43';
  context.strokeRect(region.x, region.y, region.width, region.height);

  context.fillStyle = '#e0fbfc';
  context.font = 'bold 10px monospace';
  context.textAlign = 'left';
  context.fillText(tube.tubeId, region.x + 8, y + 16);

  context.fillStyle =
    tube.status === 'LOADED' ? '#00ffaa' : tube.status === 'RELOADING' ? '#ffd166' : '#8ab8a8';
  const text =
    tube.status === 'EMPTY' && canReload
      ? 'EMPTY [RECARGAR]'
      : tube.status === 'RELOADING'
        ? `RELOADING (${tube.remainingReloadTurns}t)`
        : tube.status;
  context.textAlign = 'right';
  context.fillText(text, region.x + region.width - 8, y + 16);
  return region;
}

export function renderTacticalHudPanel(
  context: CanvasRenderingContext2D,
  snapshot: TacticalStateSnapshot,
): readonly HudInteractiveRegion[] {
  const regions: HudInteractiveRegion[] = [];
  const { submarine, telemetry, difficulty } = snapshot;

  context.fillStyle = '#061217';
  context.fillRect(660, 0, 300, 640);
  context.strokeStyle = '#246a5e';
  context.lineWidth = 2;
  context.strokeRect(662, 12, 286, 616);

  context.fillStyle = '#00ffaa';
  context.font = 'bold 13px monospace';
  context.textAlign = 'left';
  context.fillText(`TURNO TÁCTICO #${snapshot.turnNumber} (+${snapshot.turnNumber * 5} MIN)`, 680, 36);
  context.font = '11px monospace';
  context.fillStyle = '#a8dadc';
  context.fillText(`FUEL: ${submarine.fuel}% | BAT: ${submarine.battery}% | CASCO: ${submarine.hullIntegrity}%`, 680, 56);

  let depthY = 70;
  for (const spec of DEPTH_BUTTON_SPECS) {
    const canSelect = spec.depth === 'SURFACED' || submarine.battery > 0;
    regions.push(
      drawTacticalButton(
        context,
        { actionId: `SET_DEPTH:${spec.depth}`, x: 680, y: depthY, width: 250, height: 28, isEnabled: canSelect },
        spec.label,
        '#4cc9f0',
        submarine.depth === spec.depth,
      ),
    );
    depthY += 32;
  }

  regions.push(
    drawTacticalButton(
      context,
      { actionId: 'HOLD_POSITION', x: 680, y: 170, width: 250, height: 28, isEnabled: true },
      'MANTENER POSICIÓN (0 HEX / +1 TICK)',
      '#a8dadc',
    ),
  );

  context.strokeStyle = '#1f544c';
  context.strokeRect(680, 208, 250, 76);
  context.fillStyle = '#ffd166';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(`DISTANCIA : ${telemetry.distanceMeters} m (${telemetry.distanceHexes} hex)`, 690, 228);
  context.fillText(`AOB REAL  : ${telemetry.targetAngleOnBowDeg}° [${telemetry.targetBowSide}]`, 690, 248);
  context.fillText(`VELOCIDAD : ${snapshot.merchant.speedKnots} nudos (Rumbo ${snapshot.merchant.heading})`, 690, 268);

  context.fillStyle = '#63f5c4';
  context.fillText(
    `ARMERÍA (RES: ${difficulty.hasInfiniteReserveTorpedoes ? '∞' : submarine.armory.reserveTorpedoes})`,
    680,
    304,
  );

  const tubes = [...submarine.armory.bowTubes, ...submarine.armory.sternTubes];
  let tubeY = 312;
  for (const tube of tubes) {
    const canReload = canStartTorpedoReloadInArmory(submarine.armory, tube.tubeId, difficulty);
    regions.push(renderTacticalTubeRow(context, tube, canReload, tubeY));
    tubeY += 28;
  }

  regions.push(
    drawTacticalButton(
      context,
      { actionId: 'RAISE_PERISCOPE', x: 680, y: 495, width: 250, height: 48, isEnabled: telemetry.canRaisePeriscopeToFire },
      telemetry.canRaisePeriscopeToFire ? 'SUBIR PERISCOPIO / FIJAR BLANCO' : 'FUERA DE VENTANA (1..4 HEX / PERISC.)',
      '#00ffaa',
    ),
    drawTacticalButton(
      context,
      { actionId: 'DISENGAGE', x: 680, y: 555, width: 250, height: 42, isEnabled: true },
      'ROMPER CONTACTO (VOLVER AL MAPA)',
      '#ff9f1c',
    ),
  );

  return regions;
}
