import { canStartTorpedoReloadInArmory } from '../../../core/armory/index.ts';
import type { CampaignState, TorpedoTubeState } from '../../../core/contracts/index.ts';
import {
  type HudBlockingRect,
  type HudInteractiveRegion,
  drawCartoucheButton,
  drawCartoucheFrame,
} from './StrategicHudPrimitives.ts';

export type { HudBlockingRect, HudInteractiveRegion } from './StrategicHudPrimitives.ts';

// Dibuja las dos cartelas flotantes inferiores (BdU/Hidrófono a babor; Tubos y Acción Contextual a estribor)

function renderIntelCartouche(
  ctx: CanvasRenderingContext2D,
  state: CampaignState,
  x: number,
  y: number,
  regions: HudInteractiveRegion[],
): HudBlockingRect {
  const width = 364;
  const height = 162;
  const rect = drawCartoucheFrame(ctx, x, y, width, height);

  ctx.fillStyle = '#c6a664';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  const order = state.activePatrolOrder;
  const orderText =
    order === null
      ? 'ORDEN BdU: Patrulla libre'
      : order.isFulfilled
        ? `ORDEN BdU: Sector ${order.targetSectorCode} [CUMPLIDA ✓]`
        : `ORDEN BdU: Patrullar ${order.targetSectorCode} (${order.completedWatchTurns}/${order.requiredWatchTurns})`;
  ctx.fillText(orderText, x + 12, y + 20);

  const isSub = state.submarine.stance === 'SUBMERGED';
  ctx.fillStyle = isSub ? '#4cc9f0' : '#9bb5b8';
  ctx.font = '10px monospace';
  const radioHeader = isSub
    ? state.queuedSubmergedRadiograms.length > 0
      ? `ANTENA EN INMERSIÓN: ${state.queuedSubmergedRadiograms.length} aviso(s) retenidos`
      : 'ANTENA EN INMERSIÓN · RONDA HIDROFÓNICA ACTIVA'
    : 'RADIOGRAMAS BdU (clic para centrar en carta):';
  ctx.fillText(radioHeader, x + 12, y + 38);

  const latestReports = state.deliveredRadiograms.slice(-2).reverse();
  let rowY = y + 46;
  for (const report of latestReports) {
    const ageHours = Math.max(0, (state.turnNumber - report.createdAtTurn) * 4);
    regions.push(
      drawCartoucheButton(
        ctx,
        { actionId: `FOCUS_REPORT:${report.reportId}`, x: x + 12, y: rowY, width: width - 24, height: 26, isEnabled: true },
        `⌖ ${report.reportedQuadratCode} · Rumbo ${report.estimatedHeading} · hace ${ageHours}h`,
        '#ffd166',
      ),
    );
    rowY += 30;
  }

  const hydroText = !isSub
    ? 'HIDRÓFONO: Inactivo en superficie (ruido diésel)'
    : state.hydrophoneContacts.length === 0
      ? 'HIDRÓFONO: Sin hélices en rango (3..5 hex)'
      : `HIDRÓFONO: ${state.hydrophoneContacts
          .slice(0, 2)
          .map((h) => `${h.estimatedBearingDeg}°±15°[${h.strength}]`)
          .join(' | ')}`;
  ctx.fillStyle = state.hydrophoneContacts.length > 0 ? '#4cc9f0' : '#7c989c';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(hydroText, x + 12, y + height - 12);
  return rect;
}

function renderTubeChip(
  ctx: CanvasRenderingContext2D,
  tube: TorpedoTubeState,
  canReload: boolean,
  x: number,
  y: number,
): HudInteractiveRegion {
  const shortId = tube.tubeId.replace('BOW-', 'B').replace('STERN-', 'S');
  const statusChar =
    tube.status === 'LOADED' ? '●' : tube.status === 'RELOADING' ? `${tube.remainingReloadTurns}t` : '○';
  const color =
    tube.status === 'LOADED'
      ? '#00ffaa'
      : tube.status === 'RELOADING'
        ? '#ffd166'
        : canReload
          ? '#ff9f1c'
          : '#5c7378';
  return drawCartoucheButton(
    ctx,
    { actionId: `RELOAD_TUBE:${tube.tubeId}`, x, y, width: 66, height: 28, isEnabled: canReload },
    `${shortId}:${statusChar}`,
    color,
  );
}

export function renderStrategicFloatingCartouches(
  context: CanvasRenderingContext2D,
  state: CampaignState,
  hasInterceptableContact: boolean,
  canDockAtBase: boolean,
  viewportWidth: number,
  viewportHeight: number,
): {
  readonly interactiveRegions: readonly HudInteractiveRegion[];
  readonly blockingRects: readonly HudBlockingRect[];
} {
  const regions: HudInteractiveRegion[] = [];
  const bottomY = Math.max(64, viewportHeight - 176);
  const leftRect = renderIntelCartouche(context, state, 16, bottomY, regions);

  const rightW = 372;
  const rightH = 162;
  const rightX = Math.max(392, viewportWidth - rightW - 16);
  const rightRect = drawCartoucheFrame(context, rightX, bottomY, rightW, rightH);

  const resLabel = state.difficulty.hasInfiniteReserveTorpedoes
    ? '∞'
    : String(state.submarine.armory.reserveTorpedoes);
  context.fillStyle = '#c6a664';
  context.font = 'bold 11px monospace';
  context.textAlign = 'left';
  context.fillText(`TUBOS (RESERVA: ${resLabel}) · CLIC EN VACÍO RECARGA`, rightX + 12, bottomY + 20);

  const tubes = [...state.submarine.armory.bowTubes, ...state.submarine.armory.sternTubes];
  for (let i = 0; i < tubes.length; i += 1) {
    const tube = tubes[i]!;
    const canReload = canStartTorpedoReloadInArmory(state.submarine.armory, tube.tubeId, state.difficulty);
    regions.push(renderTubeChip(context, tube, canReload, rightX + 12 + i * 70, bottomY + 28));
  }

  regions.push(
    drawCartoucheButton(
      context,
      { actionId: 'HOLD_POSITION', x: rightX + 12, y: bottomY + 66, width: rightW - 24, height: 32, isEnabled: true },
      state.timeScale === 'TRANSIT_24H' ? 'MANTENER POSICIÓN (24H)' : 'MANTENER POSICIÓN / ESCUCHA (4H)',
      '#a8dadc',
    ),
  );

  const primaryActionId = canDockAtBase ? 'DOCK_AT_BASE' : 'INTERCEPT_CONTACT';
  const primaryEnabled = canDockAtBase || hasInterceptableContact;
  const primaryLabel = canDockAtBase
    ? '⚓ ATRACAR EN BASE NAVAL (CERRAR PATRULLA)'
    : hasInterceptableContact
      ? '⚔ ¡INTERCEPTAR CONTACTO! (A TÁCTICO 15x15)'
      : 'EN PATRULLA (SIN CONTACTO A TIRO)';
  regions.push(
    drawCartoucheButton(
      context,
      { actionId: primaryActionId, x: rightX + 12, y: bottomY + 106, width: rightW - 24, height: 42, isEnabled: primaryEnabled },
      primaryLabel,
      canDockAtBase ? '#00ffaa' : '#ff9f1c',
    ),
  );

  return { interactiveRegions: regions, blockingRects: [leftRect, rightRect] };
}
