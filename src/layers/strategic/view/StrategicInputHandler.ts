import type { AxialCoordinate, Point2D } from '../../../core/hex/index.ts';
import type { HudInteractiveRegion } from './StrategicHudRenderer.ts';
import { unprojectStrategicCanvasPoint } from './StrategicMapRenderer.ts';

// Traduce coordenadas de puntero sobre el Canvas a acciones semánticas del dominio estratégico sin mezclar dibujado con eventos

export type StrategicUserInteraction =
  | { readonly type: 'TOGGLE_STANCE' }
  | { readonly type: 'HOLD_POSITION' }
  | { readonly type: 'RELOAD_TUBE'; readonly tubeId: string }
  | { readonly type: 'INTERCEPT_CONTACT' }
  | { readonly type: 'MOVE_TO_HEX'; readonly coordinate: AxialCoordinate };

const MAP_PANEL_RIGHT_BOUNDARY_X = 655;

export function toCanvasNormalizedPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point2D {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function isPointInsideRegion(point: Point2D, region: HudInteractiveRegion): boolean {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.width &&
    point.y >= region.y &&
    point.y <= region.y + region.height
  );
}

function parseHudRegionAction(actionId: string): StrategicUserInteraction | null {
  if (actionId === 'TOGGLE_STANCE') {
    return { type: 'TOGGLE_STANCE' };
  }
  if (actionId === 'HOLD_POSITION') {
    return { type: 'HOLD_POSITION' };
  }
  if (actionId === 'INTERCEPT_CONTACT') {
    return { type: 'INTERCEPT_CONTACT' };
  }
  if (actionId.startsWith('RELOAD_TUBE:')) {
    const tubeId = actionId.slice('RELOAD_TUBE:'.length);
    return { type: 'RELOAD_TUBE', tubeId };
  }
  return null;
}

export function resolveStrategicClickInteraction(
  canvasPoint: Point2D,
  hudRegions: readonly HudInteractiveRegion[],
): StrategicUserInteraction | null {
  for (const region of hudRegions) {
    if (region.isEnabled && isPointInsideRegion(canvasPoint, region)) {
      return parseHudRegionAction(region.actionId);
    }
  }

  if (canvasPoint.x <= MAP_PANEL_RIGHT_BOUNDARY_X) {
    return {
      type: 'MOVE_TO_HEX',
      coordinate: unprojectStrategicCanvasPoint(canvasPoint),
    };
  }

  return null;
}

export function resolveStrategicHoveredHex(
  canvasPoint: Point2D,
): AxialCoordinate | null {
  if (canvasPoint.x > MAP_PANEL_RIGHT_BOUNDARY_X) {
    return null;
  }
  return unprojectStrategicCanvasPoint(canvasPoint);
}
