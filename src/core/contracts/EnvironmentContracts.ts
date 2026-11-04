// Centraliza escalas temporales, reloj de guardia de 4h y estados ambientales para que StrategicLayer y TacticalLayer compartan vocabulario sin importarse entre sí

export type StrategicTimeScale = 'TRANSIT_24H' | 'PATROL_4H';

export type TimeOfDay = 'NIGHT' | 'DAWN' | 'DAY' | 'DUSK';

export type WeatherState = 'CLEAR' | 'OVERCAST' | 'STORM';

export type HydrophoneSignalStrength = 'WEAK' | 'MEDIUM' | 'STRONG';

export type WatchHour = 0 | 4 | 8 | 12 | 16 | 20;

export interface PatrolClockState {
  readonly patrolNumber: number;
  readonly campaignDay: number;
  readonly hourOfDay: WatchHour;
  readonly timeOfDay: TimeOfDay;
}
