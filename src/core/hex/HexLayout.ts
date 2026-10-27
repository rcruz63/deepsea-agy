import { AxialCoordinate, createAxialCoordinate } from './HexCoordinate.ts';

// Separa la geometría continua 2D de la topología discreta para calcular marcaciones náuticas y proyectar en Canvas sin acoplar al DOM

export type HexOrientation = 'POINTY_TOP' | 'FLAT_TOP';

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface FractionalAxialCoordinate {
  readonly q: number;
  readonly r: number;
}

const SQRT_3 = Math.sqrt(3);

// Reconstruye y corrige la componente cúbica con mayor error de redondeo para preservar la restricción topológica q + r + s = 0
export function roundFractionalAxial(
  fractional: FractionalAxialCoordinate,
): AxialCoordinate {
  const fractionalS = -fractional.q - fractional.r;

  let roundedQ = Math.round(fractional.q);
  let roundedR = Math.round(fractional.r);
  const roundedS = Math.round(fractionalS);

  const deltaQ = Math.abs(roundedQ - fractional.q);
  const deltaR = Math.abs(roundedR - fractional.r);
  const deltaS = Math.abs(roundedS - fractionalS);

  if (deltaQ > deltaR && deltaQ > deltaS) {
    roundedQ = -roundedR - roundedS;
  } else if (deltaR > deltaS) {
    roundedR = -roundedQ - roundedS;
  }

  return createAxialCoordinate(roundedQ, roundedR);
}

export function axialToCartesian(
  coordinate: AxialCoordinate,
  hexSize: number,
  orientation: HexOrientation = 'POINTY_TOP',
): Point2D {
  if (hexSize <= 0) {
    throw new Error(`El radio geométrico del hexágono debe ser positivo; recibido ${hexSize}.`);
  }

  if (orientation === 'POINTY_TOP') {
    return {
      x: hexSize * SQRT_3 * (coordinate.q + coordinate.r / 2),
      y: hexSize * (3 / 2) * coordinate.r,
    };
  }

  return {
    x: hexSize * (3 / 2) * coordinate.q,
    y: hexSize * SQRT_3 * (coordinate.r + coordinate.q / 2),
  };
}

export function cartesianToAxial(
  point: Point2D,
  hexSize: number,
  orientation: HexOrientation = 'POINTY_TOP',
): AxialCoordinate {
  if (hexSize <= 0) {
    throw new Error(`El radio geométrico del hexágono debe ser positivo; recibido ${hexSize}.`);
  }

  if (orientation === 'POINTY_TOP') {
    const fractionalQ = ((SQRT_3 / 3) * point.x - (1 / 3) * point.y) / hexSize;
    const fractionalR = ((2 / 3) * point.y) / hexSize;
    return roundFractionalAxial({ q: fractionalQ, r: fractionalR });
  }

  const fractionalQ = ((2 / 3) * point.x) / hexSize;
  const fractionalR = ((-1 / 3) * point.x + (SQRT_3 / 3) * point.y) / hexSize;
  return roundFractionalAxial({ q: fractionalQ, r: fractionalR });
}

// Expresa la demora en rosa náutica (0° Norte = eje -Y, sentido horario: 90° Este, 180° Sur, 270° Oeste) para cálculos de hidrófono y TDC
export function calculateNavalBearingDegrees(
  observer: AxialCoordinate,
  target: AxialCoordinate,
  orientation: HexOrientation = 'POINTY_TOP',
): number {
  const observerPoint = axialToCartesian(observer, 1, orientation);
  const targetPoint = axialToCartesian(target, 1, orientation);
  const deltaX = targetPoint.x - observerPoint.x;
  const deltaY = targetPoint.y - observerPoint.y;

  if (deltaX === 0 && deltaY === 0) {
    return 0;
  }

  const radiansClockwiseFromNorth = Math.atan2(deltaX, -deltaY);
  const degrees = (radiansClockwiseFromNorth * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}
