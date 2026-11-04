import type { KriegstagebuchPatrolSummary } from '../../../core/contracts/index.ts';
import type { HudBlockingRect, HudInteractiveRegion } from './StrategicHudPrimitives.ts';

// Renderiza la hoja mecanografiada del Kriegstagebuch (KTB) al finalizar una patrulla en puerto o por remolque en alta mar

function drawDiaryStatLine(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  leftX: number,
  rightX: number,
  y: number,
): void {
  ctx.fillStyle = '#3c3022';
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, leftX, y);
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(value, rightX, y);
}

export function renderKriegstagebuchModal(
  context: CanvasRenderingContext2D,
  summary: KriegstagebuchPatrolSummary,
  viewportWidth: number,
  viewportHeight: number,
): {
  readonly interactiveRegions: readonly HudInteractiveRegion[];
  readonly blockingRects: readonly HudBlockingRect[];
} {
  context.fillStyle = 'rgba(4, 11, 15, 0.80)';
  context.fillRect(0, 0, viewportWidth, viewportHeight);

  const modalW = Math.min(540, viewportWidth - 32);
  const modalH = 388;
  const x = Math.round((viewportWidth - modalW) / 2);
  const y = Math.round((viewportHeight - modalH) / 2);

  // Hoja de diario de guerra alemán en papel crema envejecido con sello oficial
  context.fillStyle = '#f1e9d6';
  context.fillRect(x, y, modalW, modalH);
  context.strokeStyle = '#5c4934';
  context.lineWidth = 3;
  context.strokeRect(x + 6, y + 6, modalW - 12, modalH - 12);
  context.lineWidth = 1;
  context.strokeRect(x + 11, y + 11, modalW - 22, modalH - 22);

  context.fillStyle = '#8b1e24';
  context.font = 'bold 11px "Courier New", monospace';
  context.textAlign = 'right';
  context.fillText('GEHEIM — KRIEGSTAGEBUCH (KTB)', x + modalW - 26, y + 34);

  context.fillStyle = '#241c14';
  context.font = 'bold 16px Georgia, serif';
  context.textAlign = 'left';
  const title =
    summary.endReason === 'ABORTED_AT_SEA'
      ? `PATRULLA #${summary.patrolNumber} — REMOLQUE DE EMERGENCIA`
      : `PATRULLA #${summary.patrolNumber} — ATRAQUE EN ${summary.baseName.toUpperCase()}`;
  context.fillText(title, x + 26, y + 60);

  context.strokeStyle = '#8c775c';
  context.beginPath();
  context.moveTo(x + 26, y + 72);
  context.lineTo(x + modalW - 26, y + 72);
  context.stroke();

  const leftCol = x + 28;
  const rightCol = x + modalW - 28;
  const hitRate =
    summary.torpedoesFired > 0
      ? `${Math.round((summary.torpedoHits / summary.torpedoesFired) * 100)}%`
      : '---';

  drawDiaryStatLine(context, 'Base de Flotilla:', summary.baseName, leftCol, rightCol, y + 100);
  drawDiaryStatLine(context, 'Jornadas en la mar:', `${summary.daysAtSea} días`, leftCol, rightCol, y + 126);
  drawDiaryStatLine(
    context,
    'Orden operativa del BdU:',
    summary.patrolOrderFulfilled ? 'CUMPLIDA ✓' : 'INCOMPLETA',
    leftCol,
    rightCol,
    y + 152,
  );
  drawDiaryStatLine(
    context,
    'Buques hundidos en patrulla:',
    `${summary.shipsSunkCount} (${summary.patrolSunkTonnage} BRT)`,
    leftCol,
    rightCol,
    y + 178,
  );
  drawDiaryStatLine(
    context,
    'Tonelaje acumulado carrera:',
    `${summary.careerSunkTonnage} BRT`,
    leftCol,
    rightCol,
    y + 204,
  );
  drawDiaryStatLine(
    context,
    'Torpedos lanzados / impactos:',
    `${summary.torpedoesFired} / ${summary.torpedoHits} (${hitRate})`,
    leftCol,
    rightCol,
    y + 230,
  );
  drawDiaryStatLine(
    context,
    'Estancia en búnker (rearme/carena):',
    `+${summary.refitDaysAdded} días`,
    leftCol,
    rightCol,
    y + 256,
  );

  const btn: HudInteractiveRegion = {
    actionId: 'START_NEXT_PATROL',
    x: x + 28,
    y: y + 306,
    width: modalW - 56,
    height: 48,
    isEnabled: true,
  };
  context.fillStyle = '#14362b';
  context.fillRect(btn.x, btn.y, btn.width, btn.height);
  context.strokeStyle = '#0c7c59';
  context.lineWidth = 2;
  context.strokeRect(btn.x, btn.y, btn.width, btn.height);

  context.fillStyle = '#e8dec8';
  context.font = 'bold 12px monospace';
  context.textAlign = 'center';
  context.fillText(
    `⚓ REAPROVISIONAR AL 100% Y ZARPAR A PATRULLA #${summary.patrolNumber + 1}`,
    btn.x + btn.width / 2,
    btn.y + 29,
  );

  return {
    interactiveRegions: [btn],
    blockingRects: [{ x: 0, y: 0, width: viewportWidth, height: viewportHeight }],
  };
}
