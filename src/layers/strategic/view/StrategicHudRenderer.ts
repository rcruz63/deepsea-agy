import { canStartTorpedoReloadInArmory } from '../../../core/armory/index.ts';
import type {
  CampaignState,
  TorpedoTubeState,
} from '../../../core/contracts/index.ts';

// Dibuja el panel instrumental derecho (HUD) con recursos 0..100, postura, estado individual de los 5 tubos y botón de intercepción

export interface HudInteractiveRegion {
  readonly actionId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isEnabled: boolean;
}

function drawResourceGauge(
  context: CanvasRenderingContext2D,
  label: string,
  percentage: number,
  x: number,
  y: number,
  barColor: string,
): void {
  context.fillStyle = '#a8dadc';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(`${label}: ${percentage}%`, x, y);

  context.strokeStyle = '#2a6f64';
  context.strokeRect(x, y + 6, 250, 14);
  const fillWidth = Math.round((Math.max(0, Math.min(100, percentage)) / 100) * 246);
  context.fillStyle = barColor;
  context.fillRect(x + 2, y + 8, fillWidth, 10);
}

function resolveTubeBadgeColor(status: TorpedoTubeState['status']): string {
  switch (status) {
    case 'LOADED':
      return '#00ffaa';
    case 'RELOADING':
      return '#ffd166';
    case 'EMPTY':
      return '#6c757d';
    case 'DAMAGED':
      return '#ef476f';
  }
}

function renderTubeStatusRow(
  context: CanvasRenderingContext2D,
  tube: TorpedoTubeState,
  canReload: boolean,
  y: number,
): HudInteractiveRegion {
  const x = 680;
  const width = 250;
  const height = 28;

  context.fillStyle = '#0a1e26';
  context.fillRect(x, y, width, height);
  context.strokeStyle = canReload ? '#ffd166' : '#1f544c';
  context.lineWidth = 1.2;
  context.strokeRect(x, y, width, height);

  context.fillStyle = '#e0fbfc';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(tube.tubeId, x + 10, y + 18);

  context.fillStyle = resolveTubeBadgeColor(tube.status);
  const statusLabel =
    tube.status === 'EMPTY' && canReload
      ? 'EMPTY [CLIC RECARGAR]'
      : tube.status === 'RELOADING'
        ? `RELOADING (${tube.remainingReloadTurns}t)`
        : tube.status;
  context.textAlign = 'right';
  context.fillText(statusLabel, x + width - 10, y + 18);

  return { actionId: `RELOAD_TUBE:${tube.tubeId}`, x, y, width, height, isEnabled: canReload };
}

function renderActionButton(
  context: CanvasRenderingContext2D,
  region: HudInteractiveRegion,
  label: string,
  highlightColor: string,
): HudInteractiveRegion {
  const { x, y, width, height, isEnabled } = region;
  context.fillStyle = isEnabled ? 'rgba(0, 255, 170, 0.14)' : '#09161c';
  context.fillRect(x, y, width, height);
  context.strokeStyle = isEnabled ? highlightColor : '#284b47';
  context.lineWidth = isEnabled ? 1.8 : 1;
  context.strokeRect(x, y, width, height);

  context.fillStyle = isEnabled ? highlightColor : '#4a6b65';
  context.font = 'bold 11px monospace';
  context.textAlign = 'center';
  context.fillText(label, x + width / 2, y + height / 2 + 4);
  return region;
}

export function renderStrategicHudPanel(
  context: CanvasRenderingContext2D,
  state: CampaignState,
  canSubmerge: boolean,
  hasInterceptableContact: boolean,
): readonly HudInteractiveRegion[] {
  const interactiveRegions: HudInteractiveRegion[] = [];
  const { submarine, difficulty } = state;

  context.fillStyle = '#07141a';
  context.fillRect(660, 0, 300, 640);
  context.strokeStyle = '#246a5e';
  context.lineWidth = 2;
  context.strokeRect(662, 12, 286, 616);

  context.fillStyle = '#63f5c4';
  context.font = 'bold 13px monospace';
  context.textAlign = 'left';
  context.fillText(`TURNO #${state.turnNumber} (${state.turnNumber * 4}H)`, 680, 38);
  context.fillStyle = '#ffd166';
  context.fillText(`TONELAJE: ${state.totalSunkTonnage} BRT`, 680, 58);

  const canSwitchStance = submarine.stance === 'SUBMERGED' || canSubmerge;
  const stanceLabel =
    submarine.stance === 'SURFACED'
      ? 'POSTURA: SUPERFICIE [SUMERGIR]'
      : 'POSTURA: SUMERGIDO [EMERGER]';
  interactiveRegions.push(
    renderActionButton(
      context,
      { actionId: 'TOGGLE_STANCE', x: 680, y: 72, width: 250, height: 34, isEnabled: canSwitchStance },
      stanceLabel,
      submarine.stance === 'SURFACED' ? '#00ffaa' : '#4cc9f0',
    ),
    renderActionButton(
      context,
      { actionId: 'HOLD_POSITION', x: 680, y: 114, width: 250, height: 32, isEnabled: true },
      'MANTENER POSICIÓN (0 HEX)',
      '#a8dadc',
    ),
  );

  drawResourceGauge(context, 'COMBUSTIBLE DIÉSEL', submarine.fuel, 680, 168, '#00ffaa');
  drawResourceGauge(context, 'BATERÍA ELÉCTRICA', submarine.battery, 680, 212, '#4cc9f0');

  const reserveLabel = difficulty.hasInfiniteReserveTorpedoes
    ? '∞ (EASY)'
    : String(submarine.armory.reserveTorpedoes);
  context.fillStyle = '#63f5c4';
  context.font = 'bold 12px monospace';
  context.textAlign = 'left';
  context.fillText(`TUBOS LANZATORPEDOS (RES: ${reserveLabel})`, 680, 264);

  const allTubes = [...submarine.armory.bowTubes, ...submarine.armory.sternTubes];
  let currentTubeY = 276;
  for (const tube of allTubes) {
    const canReload = canStartTorpedoReloadInArmory(submarine.armory, tube.tubeId, difficulty);
    interactiveRegions.push(renderTubeStatusRow(context, tube, canReload, currentTubeY));
    currentTubeY += 34;
  }

  interactiveRegions.push(
    renderActionButton(
      context,
      { actionId: 'INTERCEPT_CONTACT', x: 680, y: 560, width: 250, height: 46, isEnabled: hasInterceptableContact },
      hasInterceptableContact ? '¡INTERCEPTAR CONTACTO! (DIST <= 1)' : 'SIN CONTACTO EN RANGO (DIST > 1)',
      '#ff9f1c',
    ),
  );

  return interactiveRegions;
}
