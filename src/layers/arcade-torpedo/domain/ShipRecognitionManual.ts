// Catálogo del Manual de Reconocimiento Naval con siluetas, esloras, calados y resistencia estructural de cada clase

export type RecognizedShipClass =
  | 'COASTAL_FREIGHTER'
  | 'LIBERTY_CARGO'
  | 'T2_TANKER';

export interface ShipRecognitionEntry {
  readonly shipClass: RecognizedShipClass;
  readonly displayName: string;
  readonly lengthMeters: number;
  readonly draftMeters: number;
  readonly tonnage: number;
  readonly maxHitPoints: number;
  readonly silhouetteDescription: string;
}

export const SHIP_RECOGNITION_CATALOG: readonly ShipRecognitionEntry[] = [
  {
    shipClass: 'COASTAL_FREIGHTER',
    displayName: 'Carguero Costero',
    lengthMeters: 85,
    draftMeters: 4.5,
    tonnage: 2500,
    maxHitPoints: 1,
    silhouetteDescription: '1 chimenea a popa, 1 mástil central',
  },
  {
    shipClass: 'LIBERTY_CARGO',
    displayName: 'Mercante Estándar Liberty',
    lengthMeters: 135,
    draftMeters: 7.5,
    tonnage: 7100,
    maxHitPoints: 2,
    silhouetteDescription: 'Superestructura central, 2 mástiles',
  },
  {
    shipClass: 'T2_TANKER',
    displayName: 'Petrolero Oceánico T2',
    lengthMeters: 160,
    draftMeters: 9.5,
    tonnage: 10500,
    maxHitPoints: 2,
    silhouetteDescription: 'Puente a proa, pasarela larga, chimenea a popa',
  },
];

export function getShipRecognitionEntry(
  shipClass: RecognizedShipClass,
): ShipRecognitionEntry {
  const entry = SHIP_RECOGNITION_CATALOG.find(
    (item) => item.shipClass === shipClass,
  );
  if (entry === undefined) {
    throw new Error(`Clase de buque no reconocida en el manual: "${shipClass}".`);
  }
  return entry;
}

export function resolveActualShipRecognitionEntry(
  specId: string,
  fallbackDraftMeters: number,
  fallbackTonnage: number,
): ShipRecognitionEntry {
  const matched = SHIP_RECOGNITION_CATALOG.find(
    (item) => item.shipClass === specId,
  );
  if (matched !== undefined) {
    return matched;
  }

  return {
    shipClass: 'LIBERTY_CARGO',
    displayName: 'Mercante Estándar Liberty',
    lengthMeters: 135,
    draftMeters: fallbackDraftMeters,
    tonnage: fallbackTonnage,
    maxHitPoints: 2,
    silhouetteDescription: 'Superestructura central, 2 mástiles',
  };
}
