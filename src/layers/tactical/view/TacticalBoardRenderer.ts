import {
  type AxialCoordinate,
  type HexGridMap,
  type Point2D,
  areAxialCoordinatesEqual,
  axialToCartesian,
  calculateHexDistance,
  cartesianToAxial,
  getHexNeighbor,
} from '../../../core/hex/index.ts';
import {
  MAX_TORPEDO_FIRING_RANGE_HEXES,
  MIN_TORPEDO_FIRING_RANGE_HEXES,
} from '../domain/TacticalFiringGeometry.ts';
import type {
  TacticalHexCell,
  TacticalReachableOption,
  TacticalStateSnapshot,
} from '../domain/TacticalTypes.ts';

// Renderiza el plotter táctico 15x15, el anillo de tiro (1..4 hex), el abanico de maniobra y vectores sin bucles anidados

export const TACTICAL_HEX_SIZE = 19;
export const TACTICAL_BOARD_ORIGIN: Point2D = { x: 52, y: 80 };

const HEX_ANGLES_RAD: readonly number[] = [
  Math.PI / 6,
  Math.PI / 2,
  (5 * Math.PI) / 6,
  (7 * Math.PI) / 6,
  (3 * Math.PI) / 2,
  (11 * Math.PI) / 6,
];

export function projectTacticalHexCenter(coordinate: AxialCoordinate): Point2D {
  const local = axialToCartesian(coordinate, TACTICAL_HEX_SIZE, 'POINTY_TOP');
  return { x: TACTICAL_BOARD_ORIGIN.x + local.x, y: TACTICAL_BOARD_ORIGIN.y + local.y };
}

export function unprojectTacticalCanvasPoint(canvasPoint: Point2D): AxialCoordinate {
  return cartesianToAxial(
    { x: canvasPoint.x - TACTICAL_BOARD_ORIGIN.x, y: canvasPoint.y - TACTICAL_BOARD_ORIGIN.y },
    TACTICAL_HEX_SIZE,
    'POINTY_TOP',
  );
}

function traceHexPath(context: CanvasRenderingContext2D, center: Point2D, radius: number): void {
  context.beginPath();
  for (let i = 0; i < HEX_ANGLES_RAD.length; i += 1) {
    const angle = HEX_ANGLES_RAD[i]!;
    const vx = center.x + radius * Math.cos(angle);
    const vy = center.y + radius * Math.sin(angle);
    if (i === 0) context.moveTo(vx, vy);
    else context.lineTo(vx, vy);
  }
  context.closePath();
}

function renderFiringZoneOverlays(
  context: CanvasRenderingContext2D,
  grid: HexGridMap<TacticalHexCell>,
  merchantCoordinate: AxialCoordinate,
): void {
  const zoneCells = grid.getCellsWithinRadius(merchantCoordinate, MAX_TORPEDO_FIRING_RANGE_HEXES);
  for (const cell of zoneCells) {
    const dist = calculateHexDistance(merchantCoordinate, cell.coordinate);
    if (dist >= MIN_TORPEDO_FIRING_RANGE_HEXES) {
      traceHexPath(context, projectTacticalHexCenter(cell.coordinate), TACTICAL_HEX_SIZE - 2);
      context.fillStyle = 'rgba(255, 159, 28, 0.08)';
      context.strokeStyle = 'rgba(255, 159, 28, 0.35)';
      context.lineWidth = 1;
      context.fill();
      context.stroke();
    }
  }
}

function renderReachableMoveOverlays(
  context: CanvasRenderingContext2D,
  options: readonly TacticalReachableOption[],
): void {
  for (const option of options) {
    if (option.stepDistance === 0) continue;
    traceHexPath(context, projectTacticalHexCenter(option.coordinate), TACTICAL_HEX_SIZE - 3);
    context.fillStyle = 'rgba(0, 255, 170, 0.14)';
    context.strokeStyle = option.stepDistance === 3 ? '#ffd166' : '#00ffaa';
    context.lineWidth = 1.4;
    context.fill();
    context.stroke();
  }
}

function renderMerchantAndSubmarineVectors(
  context: CanvasRenderingContext2D,
  snapshot: TacticalStateSnapshot,
): void {
  const merchantCenter = projectTacticalHexCenter(snapshot.merchant.coordinate);
  const nextMerchantHex = getHexNeighbor(snapshot.merchant.coordinate, snapshot.merchant.heading);
  const nextMerchantCenter = projectTacticalHexCenter(nextMerchantHex);

  context.beginPath();
  context.moveTo(merchantCenter.x, merchantCenter.y);
  context.lineTo(nextMerchantCenter.x, nextMerchantCenter.y);
  context.strokeStyle = '#ff9f1c';
  context.lineWidth = 2;
  context.setLineDash([4, 3]);
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  context.rect(merchantCenter.x - 8, merchantCenter.y - 4, 16, 8);
  context.fillStyle = '#ff9f1c';
  context.fill();
  context.strokeStyle = '#ffffff';
  context.stroke();

  const subCenter = projectTacticalHexCenter(snapshot.submarine.coordinate);
  context.beginPath();
  context.ellipse(subCenter.x, subCenter.y, 10, 4, 0, 0, Math.PI * 2);
  context.fillStyle = snapshot.submarine.depth === 'SURFACED' ? '#00ffaa' : '#4cc9f0';
  context.fill();
  context.strokeStyle = '#e0fbfc';
  context.lineWidth = 1.5;
  context.stroke();
}

export function renderTacticalBoard(
  context: CanvasRenderingContext2D,
  grid: HexGridMap<TacticalHexCell>,
  snapshot: TacticalStateSnapshot,
  hoveredHex: AxialCoordinate | null,
): void {
  context.fillStyle = '#030b0f';
  context.fillRect(0, 0, 655, 640);

  context.fillStyle = '#00ffaa';
  context.font = 'bold 14px monospace';
  context.textAlign = 'left';
  context.fillText(`PLOTTER TÁCTICO 15x15 // BLANCO: ${snapshot.merchant.spec.className.toUpperCase()}`, 22, 30);
  context.font = '11px monospace';
  context.fillStyle = '#8ab8a8';
  context.fillText('1 HEX = 500M | TURNO = 5 MIN | ZONA ÁMBAR = VENTANA DE TIRO (1 A 4 HEX)', 22, 48);

  for (const cell of grid.values()) {
    traceHexPath(context, projectTacticalHexCenter(cell.coordinate), TACTICAL_HEX_SIZE - 1);
    context.fillStyle = '#06161d';
    context.fill();
    context.strokeStyle = '#123836';
    context.lineWidth = 1;
    context.stroke();
  }

  renderFiringZoneOverlays(context, grid, snapshot.merchant.coordinate);
  renderReachableMoveOverlays(context, snapshot.reachableOptions);
  renderMerchantAndSubmarineVectors(context, snapshot);

  if (hoveredHex !== null && grid.hasCell(hoveredHex)) {
    const isReachable = snapshot.reachableOptions.some((opt) =>
      areAxialCoordinatesEqual(opt.coordinate, hoveredHex),
    );
    traceHexPath(context, projectTacticalHexCenter(hoveredHex), TACTICAL_HEX_SIZE - 2);
    context.strokeStyle = isReachable ? '#ffffff' : '#ef476f';
    context.lineWidth = 2;
    context.stroke();
  }
}
