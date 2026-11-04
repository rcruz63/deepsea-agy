import type {
  CampaignState,
  MarineQuadratGridSpec,
} from '../../../core/contracts/index.ts';
import {
  type AxialCoordinate,
  type HexGridMap,
  type Point2D,
  areAxialCoordinatesEqual,
  axialToCartesian,
  cartesianToAxial,
  resolveMarineQuadrat,
} from '../../../core/hex/index.ts';
import type { StrategicMapCell } from '../domain/AtlanticSectorScenario.ts';
import type { ReachableHexOption } from '../domain/StrategicMovementNavigator.ts';
import type { StrategicCameraController, WorldBounds } from './StrategicCameraController.ts';

// Proyecta la rejilla sutil 45x27 sobre la lámina histórica, aplica nivel de detalle (LOD 11..99) y dibuja derrotas alcanzables

export const STRATEGIC_HEX_SIZE = 24;
export const STRATEGIC_MAP_ORIGIN: Point2D = { x: 112, y: 112 };

const HEX_VERTEX_ANGLES_RADIANS: readonly number[] = [
  Math.PI / 6,
  Math.PI / 2,
  (5 * Math.PI) / 6,
  (7 * Math.PI) / 6,
  (3 * Math.PI) / 2,
  (11 * Math.PI) / 6,
];

export function computeStrategicWorldBounds(gridWidth: number, gridHeight: number): WorldBounds {
  const hexWidth = Math.sqrt(3) * STRATEGIC_HEX_SIZE;
  const rowStepY = 1.5 * STRATEGIC_HEX_SIZE;
  return {
    width: Math.ceil(STRATEGIC_MAP_ORIGIN.x * 2 + gridWidth * hexWidth),
    height: Math.ceil(STRATEGIC_MAP_ORIGIN.y * 2 + gridHeight * rowStepY),
  };
}

export function projectStrategicHexCenter(coordinate: AxialCoordinate): Point2D {
  const localPoint = axialToCartesian(coordinate, STRATEGIC_HEX_SIZE, 'POINTY_TOP');
  return {
    x: STRATEGIC_MAP_ORIGIN.x + localPoint.x,
    y: STRATEGIC_MAP_ORIGIN.y + localPoint.y,
  };
}

export function unprojectStrategicWorldPoint(worldPoint: Point2D): AxialCoordinate {
  return cartesianToAxial(
    {
      x: worldPoint.x - STRATEGIC_MAP_ORIGIN.x,
      y: worldPoint.y - STRATEGIC_MAP_ORIGIN.y,
    },
    STRATEGIC_HEX_SIZE,
    'POINTY_TOP',
  );
}

export function traceStrategicHexagonPath(
  context: CanvasRenderingContext2D,
  center: Point2D,
  radius: number,
): void {
  context.beginPath();
  for (let index = 0; index < HEX_VERTEX_ANGLES_RADIANS.length; index += 1) {
    const angle = HEX_VERTEX_ANGLES_RADIANS[index]!;
    const vx = center.x + radius * Math.cos(angle);
    const vy = center.y + radius * Math.sin(angle);
    if (index === 0) {
      context.moveTo(vx, vy);
    } else {
      context.lineTo(vx, vy);
    }
  }
  context.closePath();
}

function renderSubtleHexOverlayCell(
  context: CanvasRenderingContext2D,
  cell: StrategicMapCell,
  quadratSpec: MarineQuadratGridSpec | undefined,
  showFineLodLabels: boolean,
): void {
  const center = projectStrategicHexCenter(cell.coordinate);
  traceStrategicHexagonPath(context, center, STRATEGIC_HEX_SIZE - 0.5);
  context.strokeStyle =
    cell.terrain === 'LAND' ? 'rgba(92, 74, 50, 0.16)' : 'rgba(54, 68, 72, 0.22)';
  context.lineWidth = 0.75;
  context.stroke();

  if (showFineLodLabels && cell.terrain !== 'LAND' && quadratSpec !== undefined) {
    const designation = resolveMarineQuadrat(cell.coordinate, quadratSpec);
    if (designation !== null) {
      context.fillStyle = 'rgba(84, 58, 44, 0.55)';
      context.font = '8px serif';
      context.textAlign = 'center';
      context.fillText(String(designation.twoDigitCode), center.x, center.y + 15);
    }
  }
}

function renderSingleReachableOverlay(
  context: CanvasRenderingContext2D,
  option: ReachableHexOption,
  isTransitMode: boolean,
): void {
  if (option.stepDistance === 0) {
    return;
  }
  const center = projectStrategicHexCenter(option.coordinate);
  traceStrategicHexagonPath(context, center, STRATEGIC_HEX_SIZE - 2.5);

  const isForced = isTransitMode ? option.stepDistance > 6 : option.stepDistance > 1;
  context.fillStyle = isForced ? 'rgba(186, 98, 24, 0.18)' : 'rgba(12, 124, 89, 0.16)';
  context.strokeStyle = isForced ? '#b85d14' : '#0c7c59';
  context.setLineDash(isForced ? [4, 3] : []);
  context.lineWidth = 1.5;
  context.fill();
  context.stroke();
  context.setLineDash([]);
}

function renderHoveredTransitPath(
  context: CanvasRenderingContext2D,
  origin: AxialCoordinate,
  hoveredOption: ReachableHexOption | undefined,
): void {
  const steps = hoveredOption?.pathSteps;
  if (steps === undefined || steps.length === 0) {
    return;
  }
  context.save();
  context.beginPath();
  const startCenter = projectStrategicHexCenter(origin);
  context.moveTo(startCenter.x, startCenter.y);
  for (const stepCoord of steps) {
    const pt = projectStrategicHexCenter(stepCoord);
    context.lineTo(pt.x, pt.y);
  }
  context.strokeStyle = '#144552';
  context.lineWidth = 2.4;
  context.setLineDash([6, 4]);
  context.stroke();
  context.restore();
}

export function renderStrategicMapWorld(
  context: CanvasRenderingContext2D,
  backdropCanvas: HTMLCanvasElement | null,
  grid: HexGridMap<StrategicMapCell>,
  state: CampaignState,
  quadratSpec: MarineQuadratGridSpec | undefined,
  reachableOptions: readonly ReachableHexOption[],
  hoveredCoordinate: AxialCoordinate | null,
  camera: StrategicCameraController,
  worldBounds: WorldBounds,
): void {
  if (backdropCanvas !== null) {
    context.drawImage(backdropCanvas, 0, 0);
  } else {
    context.fillStyle = '#efe7d3';
    context.fillRect(0, 0, worldBounds.width, worldBounds.height);
  }

  // Baño atmosférico sutil para reflejar guardia nocturna o temporal sin ocultar la rotulación cartográfica
  if (state.clock.timeOfDay === 'NIGHT') {
    context.fillStyle = 'rgba(12, 24, 42, 0.18)';
    context.fillRect(0, 0, worldBounds.width, worldBounds.height);
  } else if (state.weather === 'STORM') {
    context.fillStyle = 'rgba(38, 52, 62, 0.16)';
    context.fillRect(0, 0, worldBounds.width, worldBounds.height);
  }

  const showFineLod = camera.getZoom() >= 1.15;
  for (const cell of grid.values()) {
    renderSubtleHexOverlayCell(context, cell, quadratSpec, showFineLod);
  }

  const isTransit = state.timeScale === 'TRANSIT_24H';
  for (const option of reachableOptions) {
    renderSingleReachableOverlay(context, option, isTransit);
  }

  if (hoveredCoordinate !== null && grid.hasCell(hoveredCoordinate)) {
    const hoveredOption = reachableOptions.find((opt) =>
      areAxialCoordinatesEqual(opt.coordinate, hoveredCoordinate),
    );
    renderHoveredTransitPath(context, state.submarine.coordinate, hoveredOption);
    const center = projectStrategicHexCenter(hoveredCoordinate);
    traceStrategicHexagonPath(context, center, STRATEGIC_HEX_SIZE - 1.5);
    context.strokeStyle = hoveredOption !== undefined ? '#0b5345' : '#9b2226';
    context.lineWidth = 2.2;
    context.stroke();
  }
}
