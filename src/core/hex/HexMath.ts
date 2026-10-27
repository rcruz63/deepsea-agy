import {
  AxialCoordinate,
  HEX_DIRECTIONS,
  addAxialCoordinates,
  createAxialCoordinate,
  getDirectionVector,
  scaleAxialCoordinate,
} from './HexCoordinate.ts';
import { roundFractionalAxial } from './HexLayout.ts';

// Agrupa métricas espaciales, anillos y trazado de líneas descomponiendo cada iteración en funciones de un único bucle plano

// En el espacio cúbico (q + r + s = 0), cada paso hexagonal altera exactamente dos ejes en ±1, por lo que la distancia es la mitad de la norma L1
export function calculateHexDistance(
  origin: AxialCoordinate,
  destination: AxialCoordinate,
): number {
  const deltaQ = destination.q - origin.q;
  const deltaR = destination.r - origin.r;
  const deltaS = -deltaQ - deltaR;
  return (Math.abs(deltaQ) + Math.abs(deltaR) + Math.abs(deltaS)) / 2;
}

function assertNonNegativeIntegerRadius(radius: number): void {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new Error(`El radio hexagonal debe ser un entero no negativo; recibido ${radius}.`);
  }
}

interface HexSegmentTraversalResult {
  readonly visitedCoordinates: readonly AxialCoordinate[];
  readonly nextCorner: AxialCoordinate;
}

// Extrae el avance sobre una arista del anillo para evitar anidar el recorrido de pasos dentro del bucle de las 6 direcciones
function traverseHexRingSide(
  startCorner: AxialCoordinate,
  stepVector: AxialCoordinate,
  stepCount: number,
): HexSegmentTraversalResult {
  const visitedCoordinates: AxialCoordinate[] = [];
  let cursor = startCorner;

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    visitedCoordinates.push(cursor);
    cursor = addAxialCoordinates(cursor, stepVector);
  }

  return {
    visitedCoordinates,
    nextCorner: cursor,
  };
}

export function getHexRing(
  center: AxialCoordinate,
  radius: number,
): readonly AxialCoordinate[] {
  assertNonNegativeIntegerRadius(radius);

  if (radius === 0) {
    return [createAxialCoordinate(center.q, center.r)];
  }

  // Arrancar desplazado en dirección 4 (Noroeste) permite recorrer el perímetro cerrado girando 120° hacia la dirección 0 (Este)
  let currentCorner = addAxialCoordinates(
    center,
    scaleAxialCoordinate(getDirectionVector(4), radius),
  );
  const ringCoordinates: AxialCoordinate[] = [];

  for (const sideDirection of HEX_DIRECTIONS) {
    const sideResult = traverseHexRingSide(
      currentCorner,
      getDirectionVector(sideDirection),
      radius,
    );
    ringCoordinates.push(...sideResult.visitedCoordinates);
    currentCorner = sideResult.nextCorner;
  }

  return ringCoordinates;
}

export function getHexesWithinRadius(
  center: AxialCoordinate,
  radius: number,
): readonly AxialCoordinate[] {
  assertNonNegativeIntegerRadius(radius);

  const areaCoordinates: AxialCoordinate[] = [createAxialCoordinate(center.q, center.r)];

  for (let currentRadius = 1; currentRadius <= radius; currentRadius += 1) {
    areaCoordinates.push(...getHexRing(center, currentRadius));
  }

  return areaCoordinates;
}

// Aplica un desplazamiento infinitesimal constante para deshacer empates exactos sobre aristas compartidas de forma determinista
const TIE_BREAK_EPSILON_Q = 1e-6;
const TIE_BREAK_EPSILON_R = 2e-6;

export function interpolateHexLine(
  origin: AxialCoordinate,
  destination: AxialCoordinate,
): readonly AxialCoordinate[] {
  const stepCount = calculateHexDistance(origin, destination);
  if (stepCount === 0) {
    return [createAxialCoordinate(origin.q, origin.r)];
  }

  const lineCoordinates: AxialCoordinate[] = [];
  for (let stepIndex = 0; stepIndex <= stepCount; stepIndex += 1) {
    const interpolationFactor = stepIndex / stepCount;
    const interpolatedQ =
      origin.q + (destination.q - origin.q) * interpolationFactor + TIE_BREAK_EPSILON_Q;
    const interpolatedR =
      origin.r + (destination.r - origin.r) * interpolationFactor + TIE_BREAK_EPSILON_R;
    lineCoordinates.push(roundFractionalAxial({ q: interpolatedQ, r: interpolatedR }));
  }

  return lineCoordinates;
}
