import type {
  HydrophoneBearingContact,
  HydrophoneSignalStrength,
  NavigationStance,
  StrategicContactState,
  SubmarineState,
  WeatherState,
} from '../../../core/contracts/index.ts';
import {
  calculateHexDistance,
  calculateNavalBearingDegrees,
} from '../../../core/hex/index.ts';

// Simula la ronda de escucha hidrofónica (Horchrunde) devolviendo conos de demora ±15° e intensidad sin filtrar coordenadas

export const HYDROPHONE_UNCERTAINTY_ARC_DEGREES = 15;
export const STATIONARY_HYDROPHONE_RANGE_HEXES = 5;
export const MOVING_HYDROPHONE_RANGE_HEXES = 3;

export function resolveHydrophoneMaxRangeHexes(
  stance: NavigationStance,
  stepDistance: number,
  weather: WeatherState,
): number {
  if (stance !== 'SUBMERGED') {
    return 0;
  }
  // Avanzar sumergido introduce ruido de flujo en el casco y motores eléctricos reduciendo el alcance de escucha
  const baseRange =
    stepDistance === 0
      ? STATIONARY_HYDROPHONE_RANGE_HEXES
      : MOVING_HYDROPHONE_RANGE_HEXES;
  const stormPenalty = weather === 'STORM' ? 1 : 0;
  return Math.max(1, baseRange - stormPenalty);
}

export function resolveHydrophoneSignalStrength(
  distanceHexes: number,
): HydrophoneSignalStrength {
  if (distanceHexes <= 2) {
    return 'STRONG';
  }
  return distanceHexes === 3 ? 'MEDIUM' : 'WEAK';
}

function computeDeterministicBearingJitterDeg(
  turnNumber: number,
  contactIndex: number,
): number {
  const hash = Math.abs((turnNumber * 37 + contactIndex * 19 + 11) % 31);
  return hash - HYDROPHONE_UNCERTAINTY_ARC_DEGREES;
}

export function evaluateHydrophoneContacts(
  submarine: SubmarineState,
  stepDistance: number,
  weather: WeatherState,
  contacts: readonly StrategicContactState[],
  turnNumber: number,
): readonly HydrophoneBearingContact[] {
  const maxRange = resolveHydrophoneMaxRangeHexes(
    submarine.stance,
    stepDistance,
    weather,
  );
  if (maxRange <= 0) {
    return [];
  }

  const detected: HydrophoneBearingContact[] = [];
  for (let index = 0; index < contacts.length; index += 1) {
    const contact = contacts[index]!;
    if (contact.isSunk || contact.hasReachedDestination) {
      continue;
    }
    const distance = calculateHexDistance(
      submarine.coordinate,
      contact.coordinate,
    );
    if (distance > maxRange) {
      continue;
    }
    const trueBearing = calculateNavalBearingDegrees(
      submarine.coordinate,
      contact.coordinate,
    );
    const jitter = computeDeterministicBearingJitterDeg(turnNumber, index);
    const estimatedBearingDeg =
      ((Math.round(trueBearing + jitter) % 360) + 360) % 360;

    detected.push({
      contactId: contact.contactId,
      estimatedBearingDeg,
      uncertaintyArcDeg: HYDROPHONE_UNCERTAINTY_ARC_DEGREES,
      strength: resolveHydrophoneSignalStrength(distance),
    });
  }

  return detected;
}
