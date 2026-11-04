import type { Point2D } from '../core/hex/index.ts';

// Gestiona el lienzo HiDPI a ventana completa (100% x 100dvh) y enmarca las vistas de consola 960x640 sobre la carta atenuada

export const CONSOLE_VIRTUAL_WIDTH = 960;
export const CONSOLE_VIRTUAL_HEIGHT = 640;

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

interface ConsoleFrameRect {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
}

export class ViewportFrameComposer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private viewportWidth = 1280;
  private viewportHeight = 800;
  private pixelRatio = 1;
  private resizeObserver: ResizeObserver | null = null;

  public constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    onResize: () => void,
  ) {
    this.canvas = canvas;
    this.context = context;
    this.syncCanvasDimensions();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.syncCanvasDimensions();
        onResize();
      });
      this.resizeObserver.observe(canvas);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.syncCanvasDimensions();
        onResize();
      });
    }
  }

  public syncCanvasDimensions(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width > 0 ? rect.width : this.canvas.width || 1280;
    const cssHeight = rect.height > 0 ? rect.height : this.canvas.height || 800;
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio > 0
        ? Math.min(2.5, window.devicePixelRatio)
        : 1;

    this.viewportWidth = Math.max(320, Math.round(cssWidth));
    this.viewportHeight = Math.max(240, Math.round(cssHeight));
    this.pixelRatio = dpr;

    const targetBackingWidth = Math.round(this.viewportWidth * dpr);
    const targetBackingHeight = Math.round(this.viewportHeight * dpr);
    if (
      this.canvas.width !== targetBackingWidth ||
      this.canvas.height !== targetBackingHeight
    ) {
      this.canvas.width = targetBackingWidth;
      this.canvas.height = targetBackingHeight;
    }
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public getViewportSize(): ViewportSize {
    return { width: this.viewportWidth, height: this.viewportHeight };
  }

  public beginFullViewportFrame(): ViewportSize {
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    return this.getViewportSize();
  }

  public toLogicalViewportPoint(clientX: number, clientY: number): Point2D {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private computeConsoleFrame(): ConsoleFrameRect {
    const margin = 24;
    const availW = Math.max(320, this.viewportWidth - margin * 2);
    const availH = Math.max(240, this.viewportHeight - margin * 2);
    const scale = Math.min(
      1.35,
      availW / CONSOLE_VIRTUAL_WIDTH,
      availH / CONSOLE_VIRTUAL_HEIGHT,
    );
    const scaledW = CONSOLE_VIRTUAL_WIDTH * scale;
    const scaledH = CONSOLE_VIRTUAL_HEIGHT * scale;
    return {
      offsetX: Math.round((this.viewportWidth - scaledW) / 2),
      offsetY: Math.round((this.viewportHeight - scaledH) / 2),
      scale,
    };
  }

  public toConsoleStagePoint(clientX: number, clientY: number): Point2D | null {
    const logical = this.toLogicalViewportPoint(clientX, clientY);
    const frame = this.computeConsoleFrame();
    const localX = (logical.x - frame.offsetX) / frame.scale;
    const localY = (logical.y - frame.offsetY) / frame.scale;
    if (
      localX < 0 ||
      localX > CONSOLE_VIRTUAL_WIDTH ||
      localY < 0 ||
      localY > CONSOLE_VIRTUAL_HEIGHT
    ) {
      return null;
    }
    return { x: localX, y: localY };
  }

  public renderConsoleOverChartBackdrop(
    backdropCanvas: HTMLCanvasElement | null,
    renderConsoleStage: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    this.beginFullViewportFrame();
    const { width, height } = this.getViewportSize();

    this.context.fillStyle = '#040c10';
    this.context.fillRect(0, 0, width, height);
    if (backdropCanvas !== null) {
      const coverScale = Math.max(
        width / backdropCanvas.width,
        height / backdropCanvas.height,
      );
      const drawW = backdropCanvas.width * coverScale;
      const drawH = backdropCanvas.height * coverScale;
      this.context.drawImage(
        backdropCanvas,
        (width - drawW) / 2,
        (height - drawH) / 2,
        drawW,
        drawH,
      );
    }
    // Atenúa la carta histórica bajo el puesto de combate manteniendo contexto espacial
    this.context.fillStyle = 'rgba(3, 11, 15, 0.80)';
    this.context.fillRect(0, 0, width, height);

    const frame = this.computeConsoleFrame();
    const frameW = CONSOLE_VIRTUAL_WIDTH * frame.scale;
    const frameH = CONSOLE_VIRTUAL_HEIGHT * frame.scale;

    this.context.save();
    this.context.shadowColor = 'rgba(0, 0, 0, 0.72)';
    this.context.shadowBlur = 28;
    this.context.strokeStyle = '#3d6b63';
    this.context.lineWidth = 2;
    this.context.strokeRect(frame.offsetX - 2, frame.offsetY - 2, frameW + 4, frameH + 4);
    this.context.restore();

    this.context.save();
    this.context.beginPath();
    this.context.rect(frame.offsetX, frame.offsetY, frameW, frameH);
    this.context.clip();
    this.context.translate(frame.offsetX, frame.offsetY);
    this.context.scale(frame.scale, frame.scale);
    renderConsoleStage(this.context);
    this.context.restore();
  }
}
