// Primitivas gráficas e interfaces de regiones clicables compartidas por las cartelas y modales estratégicos

export interface HudInteractiveRegion {
  readonly actionId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isEnabled: boolean;
}

export interface HudBlockingRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function drawCartoucheFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): HudBlockingRect {
  ctx.fillStyle = 'rgba(10, 22, 28, 0.92)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#8f7a54';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  return { x, y, width, height };
}

export function drawCartoucheButton(
  ctx: CanvasRenderingContext2D,
  region: HudInteractiveRegion,
  label: string,
  color: string,
): HudInteractiveRegion {
  const { x, y, width, height, isEnabled } = region;
  ctx.fillStyle = isEnabled ? 'rgba(18, 44, 52, 0.94)' : 'rgba(12, 22, 26, 0.85)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = isEnabled ? color : '#2b4348';
  ctx.lineWidth = isEnabled ? 1.5 : 1;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = isEnabled ? color : '#597075';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + width / 2, y + height / 2 + 3.5);
  return region;
}
