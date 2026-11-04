import type {
  NavigationStance,
  PatrolClockState,
  StrategicContactState,
  SubmarineState,
  TimeOfDay,
  WatchHour,
  WeatherState,
} from '../../../core/contracts/index.ts';
import { calculateHexDistance } from '../../../core/hex/index.ts';

// Gobierna el reloj canónico de 4h, la máquina de estados meteorológica y el radio visual en superficie (0..2 hex)

export function resolveTimeOfDayForWatchHour(hourOfDay: WatchHour): TimeOfDay {
  if (hourOfDay === 0 || hourOfDay === 4) {
    return 'NIGHT';
  }
  if (hourOfDay === 8) {
    return 'DAWN';
  }
  if (hourOfDay === 12 || hourOfDay === 16) {
    return 'DAY';
  }
  return 'DUSK';
}

export function advancePatrolClockFourHours(
  clock: PatrolClockState,
): PatrolClockState {
  const nextHour = ((clock.hourOfDay + 4) % 24) as WatchHour;
  const nextCampaignDay =
    nextHour === 0 ? clock.campaignDay + 1 : clock.campaignDay;
  return {
    patrolNumber: clock.patrolNumber,
    campaignDay: nextCampaignDay,
    hourOfDay: nextHour,
    timeOfDay: resolveTimeOfDayForWatchHour(nextHour),
  };
}

function pickNextWeatherTransition(
  current: WeatherState,
  rollZeroToOne: number,
): WeatherState {
  if (current === 'CLEAR') {
    return rollZeroToOne < 0.55 ? 'CLEAR' : 'OVERCAST';
  }
  if (current === 'OVERCAST') {
    if (rollZeroToOne < 0.35) {
      return 'CLEAR';
    }
    return rollZeroToOne < 0.75 ? 'OVERCAST' : 'STORM';
  }
  return rollZeroToOne < 0.6 ? 'OVERCAST' : 'STORM';
}

export function advanceWeatherState(
  currentWeather: WeatherState,
  turnsRemaining: number,
  rollZeroToOne: number,
): { readonly weather: WeatherState; readonly weatherTurnsRemaining: number } {
  const clampedRoll = Math.max(0, Math.min(0.9999, rollZeroToOne));
  if (turnsRemaining > 1) {
    return {
      weather: currentWeather,
      weatherTurnsRemaining: turnsRemaining - 1,
    };
  }
  const nextWeather = pickNextWeatherTransition(currentWeather, clampedRoll);
  const nextDuration = 3 + Math.floor(clampedRoll * 4);
  return {
    weather: nextWeather,
    weatherTurnsRemaining: nextDuration,
  };
}

// Modela la visibilidad óptica desde el puente del U-Boot según iluminación solar y estado de la mar
export function resolveStrategicVisualRangeHexes(
  stance: NavigationStance,
  timeOfDay: TimeOfDay,
  weather: WeatherState,
): 0 | 1 | 2 {
  if (stance === 'SUBMERGED' || weather === 'STORM') {
    return 0;
  }
  if (timeOfDay === 'DAY' && weather === 'CLEAR') {
    return 2;
  }
  if (timeOfDay === 'DAY' && weather === 'OVERCAST') {
    return 1;
  }
  return weather === 'CLEAR' ? 1 : 0;
}

export function evaluateVisibleContactIds(
  submarine: SubmarineState,
  timeOfDay: TimeOfDay,
  weather: WeatherState,
  contacts: readonly StrategicContactState[],
): readonly string[] {
  const maxVisualRange = resolveStrategicVisualRangeHexes(
    submarine.stance,
    timeOfDay,
    weather,
  );
  return contacts
    .filter(
      (contact) =>
        !contact.isSunk &&
        !contact.hasReachedDestination &&
        calculateHexDistance(submarine.coordinate, contact.coordinate) <=
          maxVisualRange,
    )
    .map((contact) => contact.contactId);
}
