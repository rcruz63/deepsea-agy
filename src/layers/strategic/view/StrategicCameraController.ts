import type { Point2D } from '../../../core/hex/index.ts';

// Controla desplazamiento (pan) y escala (zoom centrado en puntero) sobre la carta estratégica de 45x27 celdas

export const MIN_STRATEGIC_CAMERA_ZOOM = 0.48;
export const MAX_STRATEGIC_CAMERA_ZOOM = 1.85;
export const DEFAULT_STRATEGIC_CAMERA_ZOOM = 0.92;

export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

export class StrategicCameraController {
  private offsetX = 0;
  private offsetY = 0;
  private zoom = DEFAULT_STRATEGIC_CAMERA_ZOOM;
  private hasInitialFocus = false;
  private worldBounds: WorldBounds = { width: 2200, height: 1300 };

  public setWorldBounds(bounds: WorldBounds): void {
    this.worldBounds = bounds;
  }

  public getZoom(): number {
    return this.zoom;
  }

  public isInitialized(): boolean {
    return this.hasInitialFocus;
  }

  public applyTransform(context: CanvasRenderingContext2D): void {
    context.translate(this.offsetX, this.offsetY);
    context.scale(this.zoom, this.zoom);
  }

  public worldToScreen(worldPoint: Point2D): Point2D {
    return {
      x: worldPoint.x * this.zoom + this.offsetX,
      y: worldPoint.y * this.zoom + this.offsetY,
    };
  }

  public screenToWorld(screenPoint: Point2D): Point2D {
    return {
      x: (screenPoint.x - this.offsetX) / this.zoom,
      y: (screenPoint.y - this.offsetY) / this.zoom,
    };
  }

  private clampOffsets(viewportWidth: number, viewportHeight: number): void {
    const scaledWorldW = this.worldBounds.width * this.zoom;
    const scaledWorldH = this.worldBounds.height * this.zoom;
    const marginX = Math.min(260, viewportWidth * 0.35);
    const marginY = Math.min(220, viewportHeight * 0.35);

    const minX = Math.min(marginX, viewportWidth - scaledWorldW - marginX);
    const maxX = Math.max(marginX, viewportWidth - scaledWorldW - marginX);
    const minY = Math.min(marginY, viewportHeight - scaledWorldH - marginY);
    const maxY = Math.max(marginY, viewportHeight - scaledWorldH - marginY);

    this.offsetX = Math.max(minX, Math.min(maxX, this.offsetX));
    this.offsetY = Math.max(minY, Math.min(maxY, this.offsetY));
  }

  public focusOnWorldPoint(
    worldPoint: Point2D,
    viewportWidth: number,
    viewportHeight: number,
    targetZoom?: number,
  ): void {
    if (targetZoom !== undefined) {
      this.zoom = Math.max(
        MIN_STRATEGIC_CAMERA_ZOOM,
        Math.min(MAX_STRATEGIC_CAMERA_ZOOM, targetZoom),
      );
    }
    this.offsetX = viewportWidth / 2 - worldPoint.x * this.zoom;
    this.offsetY = viewportHeight / 2 - worldPoint.y * this.zoom;
    this.clampOffsets(viewportWidth, viewportHeight);
    this.hasInitialFocus = true;
  }

  public panByScreenDelta(
    deltaX: number,
    deltaY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    this.clampOffsets(viewportWidth, viewportHeight);
    this.hasInitialFocus = true;
  }

  // Conserva la coordenada mundial exacta bajo el cursor durante el cambio de escala con rueda o trackpad
  public zoomAtScreenPoint(
    screenPoint: Point2D,
    wheelDeltaY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const worldUnderCursor = this.screenToWorld(screenPoint);
    const zoomFactor = wheelDeltaY < 0 ? 1.12 : 1 / 1.12;
    const nextZoom = Math.max(
      MIN_STRATEGIC_CAMERA_ZOOM,
      Math.min(MAX_STRATEGIC_CAMERA_ZOOM, this.zoom * zoomFactor),
    );

    this.zoom = nextZoom;
    this.offsetX = screenPoint.x - worldUnderCursor.x * nextZoom;
    this.offsetY = screenPoint.y - worldUnderCursor.y * nextZoom;
    this.clampOffsets(viewportWidth, viewportHeight);
    this.hasInitialFocus = true;
  }
}
