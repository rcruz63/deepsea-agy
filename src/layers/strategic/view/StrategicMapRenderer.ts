import {
  type AxialCoordinate,
  type HexGridMap,
  type Point2D,
  areAxialCoordinatesEqual,
  axialToCartesian,
  cartesianToAxial,
  toHexKey,
} from '../../../core/hex/index.ts';
import type { StrategicMapCell } from '../domain/AtlanticSectorScenario.ts';
import type { ReachableHexOption } from '../domain/StrategicMovementNavigator.ts';

// Renderiza la carta náutica hexagonal 12x8 y el abanico de alcance (1 hex vs 2 hex) iterando linealmente sin bucles anidados

export const STRATEGIC_HEX_SIZE = 26;
export const STRATEGIC_MAP_ORIGIN: Point2D = { x: 66, y: 118 };

const HEX_VERTEX_ANGLES_RADIANS: readonly number[] = [
  Math.PI / 6,
  Math.PI / 2,
  (5 * Math.PI) / 6,
  (7 * Math.PI) / 6,
  (3 * Math.PI) / 2,
  (11 * Math.PI) / 6,
];

export function projectStrategicHexCenter(coordinate: AxialCoordinate): Point2D {
  const localPoint = axialToCartesian(coordinate, STRATEGIC_HEX_SIZE, 'POINTY_TOP');
  return {
    x: STRATEGIC_MAP_ORIGIN.x + localPoint.x,
    y: STRATEGIC_MAP_ORIGIN.y + localPoint.y,
  };
}

export function unprojectStrategicCanvasPoint(canvasPoint: Point2D): AxialCoordinate {
  return cartesianToAxial(
    {
      x: canvasPoint.x - STRATEGIC_MAP_ORIGIN.x,
      y: canvasPoint.y - STRATEGIC_MAP_ORIGIN.y,
    },
    STRATEGIC_HEX_SIZE,
    'POINTY_TOP',
  );
}

function traceHexagonPath(
  context: CanvasRenderingContext2D,
  center: Point2D,
  radius: number,
): void {
  context.beginPath();
  for (let index = 0; index < HEX_VERTEX_ANGLES_RADIANS.length; index += 1) {
    const angle = HEX_VERTEX_ANGLES_RADIANS[index]!;
    const vertexX = center.x + radius * Math.cos(angle);
    const vertexY = center.y + radius * Math.sin(angle);
    if (index === 0) {
      context.moveTo(vertexX, vertexY);
    } else {
      context.lineTo(vertexX, vertexY);
    }
  }
  context.closePath();
}

function resolveTerrainFillStyle(cell: StrategicMapCell): string {
  switch (cell.terrain) {
    case 'LAND':
      return '#1d2b24';
    case 'NAVAL_BASE':
      return '#13382e';
    case 'COASTAL_WATER':
      return '#0b2228';
    case 'DEEP_WATER':
      return '#06151c';
  }
}

function renderSingleTerrainCell(
  context: CanvasRenderingContext2D,
  cell: StrategicMapCell,
): void {
  const center = projectStrategicHexCenter(cell.coordinate);
  traceHexagonPath(context, center, STRATEGIC_HEX_SIZE - 1);
  context.fillStyle = resolveTerrainFillStyle(cell);
  context.fill();
  context.strokeStyle = cell.terrain === 'LAND' ? '#4a6b53' : '#184d47';
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = cell.terrain === 'LAND' ? '#56755e' : '#28665e';
  context.font = '9px monospace';
  context.textAlign = 'center';
  context.fillText(toHexKey(cell.coordinate), center.x, center.y + 16);
}

// Distingue visualmente el crucero estándar (1 hex, trazo continuo cian/verde) de forzar máquinas (2 hex, trazo discontinuo ámbar)
function renderSingleReachableOverlay(
  context: CanvasRenderingContext2D,
  option: ReachableHexOption,
): void {
  if (option.stepDistance === 0) {
    return;
  }
  const center = projectStrategicHexCenter(option.coordinate);
  traceHexagonPath(context, center, STRATEGIC_HEX_SIZE - 3);

  if (option.stepDistance === 1) {
    context.fillStyle = 'rgba(0, 255, 170, 0.12)';
    context.strokeStyle = '#00ffaa';
    context.setLineDash([]);
  } else {
    context.fillStyle = 'rgba(255, 184, 0, 0.10)';
    context.strokeStyle = '#ffb800';
    context.setLineDash([4, 3]);
  }

  context.lineWidth = 1.6;
  context.fill();
  context.stroke();
  context.setLineDash([]);
}

export function renderStrategicMapChart(
  context: CanvasRenderingContext2D,
  grid: HexGridMap<StrategicMapCell>,
  reachableOptions: readonly ReachableHexOption[],
  hoveredCoordinate: AxialCoordinate | null,
  theaterName: string,
): void {
  context.fillStyle = '#040c10';
  context.fillRect(0, 0, 655, 640);

  context.fillStyle = '#63f5c4';
  context.font = 'bold 14px monospace';
  context.textAlign = 'left';
  context.fillText(`CARTA ESTRATÉGICA // ${theaterName.toUpperCase()}`, 22, 32);

  context.font = '11px monospace';
  context.fillStyle = '#8ab8a8';
  context.fillText(
    'CLIC EN HEXÁGONO ALCANZABLE PARA AVANZAR TURNO (4 HORAS)',
    22,
    52,
  );

  for (const cell of grid.values()) {
    renderSingleTerrainCell(context, cell);
  }

  for (const option of reachableOptions) {
    renderSingleReachableOverlay(context, option);
  }

  if (hoveredCoordinate !== null && grid.hasCell(hoveredCoordinate)) {
    const isReachable = reachableOptions.some((option) =>
      areAxialCoordinatesEqual(option.coordinate, hoveredCoordinate),
    );
    const center = projectStrategicHexCenter(hoveredCoordinate);
    traceHexagonPath(context, center, STRATEGIC_HEX_SIZE - 2);
    context.strokeStyle = isReachable ? '#ffffff' : '#ff5555';
    context.lineWidth = 2;
    context.stroke();
  }
}
