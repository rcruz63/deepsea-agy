import type { EncounterContext, StrategicTimeScale } from '../../../core/contracts/index.ts';
import type { AxialCoordinate, Point2D } from '../../../core/hex/index.ts';
import type { StrategicEngine } from '../domain/StrategicEngine.ts';
import type { StrategicCameraController } from './StrategicCameraController.ts';
import type { HudBlockingRect, HudInteractiveRegion } from './StrategicHudPrimitives.ts';
import { unprojectStrategicWorldPoint } from './StrategicMapRenderer.ts';
import { STRATEGIC_TOP_BAR_HEIGHT } from './StrategicTopBarRenderer.ts';

// Traduce coordenadas de pantalla y despacha órdenes semánticas estratégicas manteniendo la vista limpia

export type StrategicUserInteraction =
  | { readonly type: 'SET_SCALE'; readonly scale: StrategicTimeScale }
  | { readonly type: 'TOGGLE_STANCE' }
  | { readonly type: 'CENTER_UBOAT' }
  | { readonly type: 'FOCUS_REPORT'; readonly reportId: string }
  | { readonly type: 'HOLD_POSITION' }
  | { readonly type: 'RELOAD_TUBE'; readonly tubeId: string }
  | { readonly type: 'INTERCEPT_CONTACT' }
  | { readonly type: 'DOCK_AT_BASE' }
  | { readonly type: 'START_NEXT_PATROL' }
  | { readonly type: 'MOVE_TO_HEX'; readonly coordinate: AxialCoordinate };

export function toCanvasNormalizedPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point2D {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function isInsideRect(
  point: Point2D,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function isScreenPointOverStrategicHud(
  screenPoint: Point2D,
  blockingRects: readonly HudBlockingRect[],
): boolean {
  if (screenPoint.y <= STRATEGIC_TOP_BAR_HEIGHT) {
    return true;
  }
  return blockingRects.some((rect) => isInsideRect(screenPoint, rect));
}

function parseHudRegionAction(actionId: string): StrategicUserInteraction | null {
  if (actionId === 'SET_SCALE:PATROL_4H') return { type: 'SET_SCALE', scale: 'PATROL_4H' };
  if (actionId === 'SET_SCALE:TRANSIT_24H') return { type: 'SET_SCALE', scale: 'TRANSIT_24H' };
  if (actionId === 'TOGGLE_STANCE') return { type: 'TOGGLE_STANCE' };
  if (actionId === 'CENTER_UBOAT') return { type: 'CENTER_UBOAT' };
  if (actionId.startsWith('FOCUS_REPORT:')) {
    return { type: 'FOCUS_REPORT', reportId: actionId.slice('FOCUS_REPORT:'.length) };
  }
  if (actionId === 'HOLD_POSITION') return { type: 'HOLD_POSITION' };
  if (actionId.startsWith('RELOAD_TUBE:')) {
    return { type: 'RELOAD_TUBE', tubeId: actionId.slice('RELOAD_TUBE:'.length) };
  }
  if (actionId === 'INTERCEPT_CONTACT') return { type: 'INTERCEPT_CONTACT' };
  if (actionId === 'DOCK_AT_BASE') return { type: 'DOCK_AT_BASE' };
  if (actionId === 'START_NEXT_PATROL') return { type: 'START_NEXT_PATROL' };
  return null;
}

export function resolveStrategicClickInteraction(
  screenPoint: Point2D,
  hudRegions: readonly HudInteractiveRegion[],
  blockingRects: readonly HudBlockingRect[],
  camera: StrategicCameraController,
): StrategicUserInteraction | null {
  for (const region of hudRegions) {
    if (region.isEnabled && isInsideRect(screenPoint, region)) {
      return parseHudRegionAction(region.actionId);
    }
  }
  if (isScreenPointOverStrategicHud(screenPoint, blockingRects)) {
    return null;
  }
  return {
    type: 'MOVE_TO_HEX',
    coordinate: unprojectStrategicWorldPoint(camera.screenToWorld(screenPoint)),
  };
}

export function resolveStrategicHoveredHex(
  screenPoint: Point2D,
  blockingRects: readonly HudBlockingRect[],
  camera: StrategicCameraController,
): AxialCoordinate | null {
  if (isScreenPointOverStrategicHud(screenPoint, blockingRects)) {
    return null;
  }
  return unprojectStrategicWorldPoint(camera.screenToWorld(screenPoint));
}

export function dispatchStrategicInteraction(
  engine: StrategicEngine,
  interaction: StrategicUserInteraction,
  onCenterCoordinate: (coord: AxialCoordinate, zoom?: number) => void,
  onEnterEncounter: (context: EncounterContext) => void,
): void {
  const state = engine.getState();
  switch (interaction.type) {
    case 'SET_SCALE':
      if (interaction.scale === 'PATROL_4H' || state.submarine.stance === 'SURFACED') {
        engine.setTimeScale(interaction.scale);
      }
      return;
    case 'TOGGLE_STANCE': {
      const next = state.submarine.stance === 'SURFACED' ? 'SUBMERGED' : 'SURFACED';
      if (next === 'SURFACED' || engine.canSubmerge()) {
        engine.setStance(next);
      }
      return;
    }
    case 'CENTER_UBOAT':
      onCenterCoordinate(state.submarine.coordinate);
      return;
    case 'FOCUS_REPORT': {
      const report = state.deliveredRadiograms.find((r) => r.reportId === interaction.reportId);
      if (report !== undefined) {
        onCenterCoordinate(report.centerCoordinate, 1.15);
      }
      return;
    }
    case 'HOLD_POSITION':
      engine.executeTurnMove(state.submarine.coordinate);
      return;
    case 'RELOAD_TUBE':
      engine.startTubeReload(interaction.tubeId);
      return;
    case 'INTERCEPT_CONTACT': {
      const ctx = engine.createEncounterContext();
      if (ctx !== null) {
        onEnterEncounter(ctx);
      }
      return;
    }
    case 'DOCK_AT_BASE':
      if (engine.canDockAtBase()) {
        engine.dockAtNavalBase();
      }
      return;
    case 'START_NEXT_PATROL': {
      const restarted = engine.startNextPatrol();
      onCenterCoordinate(restarted.submarine.coordinate, 0.92);
      return;
    }
    case 'MOVE_TO_HEX': {
      const opt = engine.getReachableOptionAt(interaction.coordinate);
      if (opt !== undefined) {
        engine.executeTurnMove(opt.coordinate);
      }
      return;
    }
  }
}
