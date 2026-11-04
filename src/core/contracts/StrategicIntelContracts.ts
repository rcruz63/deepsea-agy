import type { AxialCoordinate, HexDirection } from '../hex/HexCoordinate.ts';
import type { HydrophoneSignalStrength } from './EnvironmentContracts.ts';

// Separa la inteligencia filtrada por sensores (demoras de hidrófono y radiogramas con error) de las coordenadas reales ocultas de los contactos

export type PatrolStatus = 'ACTIVE' | 'DOCKED_AT_BASE' | 'ABORTED_AT_SEA';

export interface HydrophoneBearingContact {
  readonly contactId: string;
  readonly estimatedBearingDeg: number;
  readonly uncertaintyArcDeg: number;
  readonly strength: HydrophoneSignalStrength;
}

export interface BduPatrolOrder {
  readonly orderId: string;
  // Subsector Marinequadrat de 3x3 hexágonos asignado por el mando (ej. "AK 5")
  readonly targetSectorCode: string;
  readonly requiredWatchTurns: number;
  readonly completedWatchTurns: number;
  readonly isFulfilled: boolean;
}

export interface BduRadiogramReport {
  readonly reportId: string;
  readonly reportedQuadratCode: string;
  // Centro ya desplazado dentro del radio de incertidumbre de la dificultad para no filtrar la posición exacta a la vista
  readonly centerCoordinate: AxialCoordinate;
  readonly uncertaintyRadiusHexes: number;
  readonly estimatedHeading: HexDirection;
  readonly createdAtTurn: number;
  readonly expiresAtTurn: number;
}

export interface KriegstagebuchPatrolSummary {
  readonly patrolNumber: number;
  readonly baseName: string;
  readonly daysAtSea: number;
  readonly refitDaysAdded: number;
  readonly patrolOrderFulfilled: boolean;
  readonly shipsSunkCount: number;
  readonly patrolSunkTonnage: number;
  readonly careerSunkTonnage: number;
  readonly torpedoesFired: number;
  readonly torpedoHits: number;
  readonly endReason: 'RETURNED_TO_BASE' | 'ABORTED_AT_SEA';
}
