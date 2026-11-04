import type {
  CampaignState,
  MarineQuadratGridSpec,
} from '../../../core/contracts/index.ts';
import { resolveMarineQuadrat } from '../../../core/hex/index.ts';
import type { HudInteractiveRegion } from './StrategicHudRenderer.ts';

// Dibuja la barra superior de mando a ancho completo con reloj de guardia, clima, cuadrante, selector 24H/4H y recursos decimales

export const STRATEGIC_TOP_BAR_HEIGHT = 52;

function renderTopBarButton(
  context: CanvasRenderingContext2D,
  region: HudInteractiveRegion,
  label: string,
  accentColor: string,
  isActive = false,
): HudInteractiveRegion {
  const { x, y, width, height, isEnabled } = region;
  context.fillStyle = isActive
    ? 'rgba(198, 166, 100, 0.24)'
    : isEnabled
      ? 'rgba(20, 44, 52, 0.92)'
      : 'rgba(14, 24, 28, 0.75)';
  context.fillRect(x, y, width, height);
  context.strokeStyle = isEnabled ? accentColor : '#33484e';
  context.lineWidth = isActive ? 2 : 1.2;
  context.strokeRect(x, y, width, height);

  context.fillStyle = isEnabled ? accentColor : '#5e7378';
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillText(label, x + width / 2, y + height / 2 + 4);
  return region;
}

export function renderStrategicTopCommandBar(
  context: CanvasRenderingContext2D,
  state: CampaignState,
  quadratSpec: MarineQuadratGridSpec | undefined,
  canSubmerge: boolean,
  viewportWidth: number,
): readonly HudInteractiveRegion[] {
  const regions: HudInteractiveRegion[] = [];
  const { submarine, clock, weather } = state;

  context.fillStyle = 'rgba(10, 22, 28, 0.94)';
  context.fillRect(0, 0, viewportWidth, STRATEGIC_TOP_BAR_HEIGHT);
  context.strokeStyle = '#8f7a54';
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(0, STRATEGIC_TOP_BAR_HEIGHT);
  context.lineTo(viewportWidth, STRATEGIC_TOP_BAR_HEIGHT);
  context.stroke();

  const hourText = `${String(clock.hourOfDay).padStart(2, '0')}:00`;
  const quadrat =
    quadratSpec !== undefined
      ? (resolveMarineQuadrat(submarine.coordinate, quadratSpec)?.fullCode ?? '---')
      : `${submarine.coordinate.q},${submarine.coordinate.r}`;

  context.fillStyle = '#e8dec8';
  context.font = 'bold 12px monospace';
  context.textAlign = 'left';
  context.fillText(
    `PATRULLA #${clock.patrolNumber} · DÍA ${clock.campaignDay} · ${hourText} [${clock.timeOfDay}]`,
    16,
    21,
  );
  context.fillStyle = '#c6a664';
  context.font = '11px monospace';
  context.fillText(`MAR: ${weather} · CUADRANTE: ${quadrat}`, 16, 40);

  const centerStart = Math.max(330, Math.round(viewportWidth / 2 - 235));
  const isTransit = state.timeScale === 'TRANSIT_24H';
  const canUseTransit = submarine.stance === 'SURFACED';

  regions.push(
    renderTopBarButton(
      context,
      { actionId: 'SET_SCALE:PATROL_4H', x: centerStart, y: 10, width: 112, height: 32, isEnabled: true },
      'ESCALA 4H',
      '#63f5c4',
      !isTransit,
    ),
    renderTopBarButton(
      context,
      { actionId: 'SET_SCALE:TRANSIT_24H', x: centerStart + 118, y: 10, width: 122, height: 32, isEnabled: canUseTransit },
      'TRÁNSITO 24H',
      '#ffd166',
      isTransit,
    ),
    renderTopBarButton(
      context,
      {
        actionId: 'TOGGLE_STANCE',
        x: centerStart + 248,
        y: 10,
        width: 152,
        height: 32,
        isEnabled: submarine.stance === 'SUBMERGED' || canSubmerge,
      },
      submarine.stance === 'SURFACED' ? 'SUPERFICIE [SUMERGIR]' : 'SUMERGIDO [EMERGER]',
      submarine.stance === 'SURFACED' ? '#00ffaa' : '#4cc9f0',
    ),
    renderTopBarButton(
      context,
      { actionId: 'CENTER_UBOAT', x: centerStart + 406, y: 10, width: 84, height: 32, isEnabled: true },
      '⌖ U-BOOT',
      '#e8dec8',
    ),
  );

  context.textAlign = 'right';
  context.font = 'bold 11px monospace';
  context.fillStyle = '#63f5c4';
  context.fillText(
    `DIÉSEL: ${submarine.fuel.toFixed(1)}% · BAT: ${submarine.battery.toFixed(0)}%`,
    viewportWidth - 16,
    21,
  );
  context.fillStyle = '#ffd166';
  context.fillText(
    `CASCO: ${submarine.hullIntegrity}% · ${state.totalSunkTonnage} BRT`,
    viewportWidth - 16,
    40,
  );

  return regions;
}
