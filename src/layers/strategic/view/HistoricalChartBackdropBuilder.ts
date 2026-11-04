import type {
  CommercialRouteCorridor,
  MarineQuadratGridSpec,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import type { HexGridMap } from '../../../core/hex/index.ts';
import type { StrategicMapCell } from '../domain/AtlanticSectorScenario.ts';
import {
  STRATEGIC_HEX_SIZE,
  STRATEGIC_MAP_ORIGIN,
  computeStrategicWorldBounds,
  projectStrategicHexCenter,
  traceStrategicHexagonPath,
} from './StrategicMapRenderer.ts';

// Construye y cachea en offscreen Canvas la lámina Marinequadratkarte Nr. 1546 calibrada 1:1 con la rejilla 45x27

function renderBackdropCellTerrain(
  ctx: CanvasRenderingContext2D,
  cell: StrategicMapCell,
): void {
  if (cell.terrain === 'DEEP_WATER') {
    return;
  }
  const center = projectStrategicHexCenter(cell.coordinate);
  traceStrategicHexagonPath(ctx, center, STRATEGIC_HEX_SIZE + 0.6);
  if (cell.terrain === 'COASTAL_WATER') {
    ctx.fillStyle = 'rgba(158, 190, 198, 0.34)';
    ctx.fill();
    return;
  }
  if (cell.terrain === 'LAND') {
    ctx.fillStyle = '#dfd1b2';
    ctx.fill();
    ctx.strokeStyle = '#6f5d44';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function renderMidSectorSubdivisions(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  topY: number,
  sectorW: number,
  sectorH: number,
): void {
  ctx.strokeStyle = 'rgba(138, 62, 52, 0.42)';
  ctx.lineWidth = 0.9;
  for (let subIndex = 0; subIndex < 9; subIndex += 1) {
    const subCol = subIndex % 3;
    const subRow = Math.floor(subIndex / 3);
    const sx = leftX + subCol * sectorW;
    const sy = topY + subRow * sectorH;
    ctx.strokeRect(sx, sy, sectorW, sectorH);

    ctx.fillStyle = 'rgba(126, 56, 46, 0.62)';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(subIndex + 1), sx + 6, sy + 15);
  }
}

function renderMarineQuadratGrid(
  ctx: CanvasRenderingContext2D,
  spec: MarineQuadratGridSpec,
): void {
  const hexWidth = Math.sqrt(3) * STRATEGIC_HEX_SIZE;
  const rowStepY = 1.5 * STRATEGIC_HEX_SIZE;
  const majorW = spec.majorSquareSize * hexWidth;
  const majorH = spec.majorSquareSize * rowStepY;
  const originLeft = STRATEGIC_MAP_ORIGIN.x - 0.5 * hexWidth;
  const originTop = STRATEGIC_MAP_ORIGIN.y - 0.5 * rowStepY;
  const totalMajors = spec.majorCols * spec.majorRows;

  for (let index = 0; index < totalMajors; index += 1) {
    const majorCol = index % spec.majorCols;
    const majorRow = Math.floor(index / spec.majorCols);
    const leftX = originLeft + majorCol * majorW;
    const topY = originTop + majorRow * majorH;
    const label = spec.majorLabelsRowMajor[index] ?? '';

    renderMidSectorSubdivisions(ctx, leftX, topY, majorW / 3, majorH / 3);

    ctx.strokeStyle = 'rgba(128, 42, 34, 0.78)';
    ctx.lineWidth = 2.1;
    ctx.strokeRect(leftX, topY, majorW, majorH);

    // Tipografía serif hueca idéntica a la carta oficial de la Kriegsmarine para no tapar símbolos debajo
    ctx.save();
    ctx.font = 'bold 54px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(132, 48, 38, 0.36)';
    ctx.lineWidth = 1.8;
    ctx.strokeText(label, leftX + majorW / 2, topY + majorH / 2);
    ctx.restore();
  }
}

function renderSingleTradeCorridor(
  ctx: CanvasRenderingContext2D,
  corridor: CommercialRouteCorridor,
): void {
  if (corridor.nominalWaypoints.length < 2) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < corridor.nominalWaypoints.length; i += 1) {
    const pt = projectStrategicHexCenter(corridor.nominalWaypoints[i]!);
    if (i === 0) {
      ctx.moveTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.strokeStyle = 'rgba(92, 72, 54, 0.32)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 6]);
  ctx.stroke();
  ctx.restore();
}

export function buildHistoricalChartBackdrop(
  grid: HexGridMap<StrategicMapCell>,
  theater: TheaterDefinition,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const bounds = computeStrategicWorldBounds(theater.gridWidth, theater.gridHeight);
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return null;
  }

  // Papel envejecido cálido con marco doble cartográfico estilo Oberkommando der Kriegsmarine
  ctx.fillStyle = '#efe7d3';
  ctx.fillRect(0, 0, bounds.width, bounds.height);
  ctx.strokeStyle = '#4a3d2e';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, bounds.width - 48, bounds.height - 48);
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, bounds.width - 64, bounds.height - 64);

  for (const cell of grid.values()) {
    renderBackdropCellTerrain(ctx, cell);
  }

  for (const corridor of theater.routeCorridors ?? []) {
    renderSingleTradeCorridor(ctx, corridor);
  }

  if (theater.marineQuadratSpec !== undefined) {
    renderMarineQuadratGrid(ctx, theater.marineQuadratSpec);
  }

  ctx.fillStyle = '#3b2f22';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('OBERKOMMANDO DER KRIEGSMARINE — NORDATLANTIK', 46, 56);
  ctx.textAlign = 'right';
  ctx.fillText('MARINEQUADRATKARTE Nr. 1546', bounds.width - 46, 56);

  return canvas;
}
