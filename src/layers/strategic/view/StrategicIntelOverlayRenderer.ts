import type {
  BduPatrolOrder,
  BduRadiogramReport,
  CampaignState,
  HydrophoneBearingContact,
  MarineQuadratGridSpec,
} from '../../../core/contracts/index.ts';
import { getHexNeighbor, resolveSectorCenterCoordinate } from '../../../core/hex/index.ts';
import { STRATEGIC_HEX_SIZE, projectStrategicHexCenter } from './StrategicMapRenderer.ts';

// Traza sobre la carta la inteligencia bajo niebla de guerra: sector BdU, círculos a lápiz de radiogramas y conos hidrofónicos ±15°

function renderPatrolOrderBox(
  context: CanvasRenderingContext2D,
  order: BduPatrolOrder,
  spec: MarineQuadratGridSpec,
): void {
  const centerCoord = resolveSectorCenterCoordinate(order.targetSectorCode, spec);
  if (centerCoord === null) {
    return;
  }
  const center = projectStrategicHexCenter(centerCoord);
  const boxW = 3 * Math.sqrt(3) * STRATEGIC_HEX_SIZE;
  const boxH = 3 * 1.5 * STRATEGIC_HEX_SIZE;

  context.save();
  context.strokeStyle = order.isFulfilled ? '#1b7a58' : '#a4243b';
  context.fillStyle = order.isFulfilled
    ? 'rgba(27, 122, 88, 0.08)'
    : 'rgba(164, 36, 59, 0.08)';
  context.lineWidth = 2.2;
  context.setLineDash([7, 4]);
  context.fillRect(center.x - boxW / 2, center.y - boxH / 2, boxW, boxH);
  context.strokeRect(center.x - boxW / 2, center.y - boxH / 2, boxW, boxH);

  context.setLineDash([]);
  context.fillStyle = order.isFulfilled ? '#145a41' : '#8b1e32';
  context.font = 'bold 11px monospace';
  context.textAlign = 'center';
  const statusTag = order.isFulfilled
    ? `SECTOR BdU ${order.targetSectorCode} [CUMPLIDO]`
    : `SECTOR BdU ${order.targetSectorCode} [${order.completedWatchTurns}/${order.requiredWatchTurns}]`;
  context.fillText(statusTag, center.x, center.y - boxH / 2 - 6);
  context.restore();
}

function renderSingleBduRadiogramCircle(
  context: CanvasRenderingContext2D,
  report: BduRadiogramReport,
  currentTurn: number,
): void {
  const center = projectStrategicHexCenter(report.centerCoordinate);
  const hexWidth = Math.sqrt(3) * STRATEGIC_HEX_SIZE;
  const radiusPx = Math.max(hexWidth * 0.7, report.uncertaintyRadiusHexes * hexWidth);
  const ageHours = Math.max(0, (currentTurn - report.createdAtTurn) * 4);

  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
  context.fillStyle = 'rgba(155, 34, 38, 0.09)';
  context.fill();
  context.strokeStyle = 'rgba(138, 32, 36, 0.78)';
  context.lineWidth = 1.6;
  context.setLineDash([5, 4]);
  context.stroke();
  context.setLineDash([]);

  // Flecha de rumbo estimado trazada a lápiz sobre el centro reportado
  const bowCoord = getHexNeighbor(report.centerCoordinate, report.estimatedHeading);
  const bowPt = projectStrategicHexCenter(bowCoord);
  const dx = bowPt.x - center.x;
  const dy = bowPt.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  const arrowEndX = center.x + (dx / len) * 22;
  const arrowEndY = center.y + (dy / len) * 22;

  context.beginPath();
  context.moveTo(center.x, center.y);
  context.lineTo(arrowEndX, arrowEndY);
  context.strokeStyle = '#7f1d1d';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#6b1818';
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillText(
    `BdU ${report.reportedQuadratCode} (-${ageHours}h)`,
    center.x,
    center.y - radiusPx - 5,
  );
  context.restore();
}

function renderSingleHydrophoneCone(
  context: CanvasRenderingContext2D,
  submarineCenter: { readonly x: number; readonly y: number },
  bearingContact: HydrophoneBearingContact,
): void {
  const hexWidth = Math.sqrt(3) * STRATEGIC_HEX_SIZE;
  const coneRadius =
    bearingContact.strength === 'STRONG'
      ? hexWidth * 2.5
      : bearingContact.strength === 'MEDIUM'
        ? hexWidth * 3.7
        : hexWidth * 5.0;

  const centerRad = ((bearingContact.estimatedBearingDeg - 90) * Math.PI) / 180;
  const halfArcRad = (bearingContact.uncertaintyArcDeg * Math.PI) / 180;

  context.save();
  context.beginPath();
  context.moveTo(submarineCenter.x, submarineCenter.y);
  context.arc(
    submarineCenter.x,
    submarineCenter.y,
    coneRadius,
    centerRad - halfArcRad,
    centerRad + halfArcRad,
  );
  context.closePath();

  context.fillStyle =
    bearingContact.strength === 'STRONG'
      ? 'rgba(0, 140, 180, 0.24)'
      : 'rgba(0, 120, 160, 0.14)';
  context.fill();
  context.strokeStyle = '#0a6c8a';
  context.lineWidth = 1.4;
  context.setLineDash([4, 3]);
  context.stroke();
  context.restore();
}

export function renderStrategicIntelOverlay(
  context: CanvasRenderingContext2D,
  state: CampaignState,
  quadratSpec: MarineQuadratGridSpec | undefined,
): void {
  if (state.activePatrolOrder !== null && quadratSpec !== undefined) {
    renderPatrolOrderBox(context, state.activePatrolOrder, quadratSpec);
  }

  for (const report of state.deliveredRadiograms) {
    renderSingleBduRadiogramCircle(context, report, state.turnNumber);
  }

  if (state.submarine.stance === 'SUBMERGED' && state.hydrophoneContacts.length > 0) {
    const subCenter = projectStrategicHexCenter(state.submarine.coordinate);
    for (const contact of state.hydrophoneContacts) {
      renderSingleHydrophoneCone(context, subCenter, contact);
    }
  }
}
