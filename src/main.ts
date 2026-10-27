// Punto de entrada mínimo para validar el ciclo de compilación de Vite antes de conectar el GameFlowController en el Hito 1.2
export function bootstrapApplicationShell(): HTMLCanvasElement | null {
  const canvasElement = document.querySelector<HTMLCanvasElement>('#game-canvas');
  return canvasElement;
}

if (typeof document !== 'undefined') {
  bootstrapApplicationShell();
}
