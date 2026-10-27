import type { DifficultyConfig } from '../contracts/DifficultyConfig.ts';
import type {
  TorpedoArmoryState,
  TorpedoTubeMount,
  TorpedoTubeState,
} from '../contracts/TorpedoArmoryState.ts';
import {
  advanceTorpedoTubeReloadTurn,
  beginTorpedoTubeReload,
  createLoadedTorpedoTube,
  damageTorpedoTube,
  fireTorpedoFromTube,
  setTorpedoTubeReloadPaused,
} from './TorpedoTubeTransition.ts';

// Coordina baterías de proa/popa, consumo de torpedos de reserva y firma acústica de recarga según el perfil de dificultad

function createMountTubeBattery(
  mount: TorpedoTubeMount,
  count: number,
): readonly TorpedoTubeState[] {
  const tubes: TorpedoTubeState[] = [];
  for (let index = 1; index <= count; index += 1) {
    tubes.push(createLoadedTorpedoTube(`${mount}-${index}`, mount));
  }
  return tubes;
}

function replaceMatchingTube(
  tubes: readonly TorpedoTubeState[],
  targetTubeId: string,
  transform: (tube: TorpedoTubeState) => TorpedoTubeState,
): readonly TorpedoTubeState[] {
  return tubes.map((tube) => (tube.tubeId === targetTubeId ? transform(tube) : tube));
}

function isTubeActivelyReloading(tube: TorpedoTubeState): boolean {
  return tube.status === 'RELOADING' && !tube.isReloadPaused;
}

export function createInitialTorpedoArmory(
  bowTubeCount: number,
  sternTubeCount: number,
  reserveTorpedoes: number,
): TorpedoArmoryState {
  if (bowTubeCount < 0 || sternTubeCount < 0 || reserveTorpedoes < 0) {
    throw new Error('La configuración inicial de tubos y reservas no admite valores negativos.');
  }
  return {
    bowTubes: createMountTubeBattery('BOW', bowTubeCount),
    sternTubes: createMountTubeBattery('STERN', sternTubeCount),
    reserveTorpedoes,
  };
}

export function findTorpedoTubeById(
  armory: TorpedoArmoryState,
  tubeId: string,
): TorpedoTubeState | undefined {
  return (
    armory.bowTubes.find((tube) => tube.tubeId === tubeId) ??
    armory.sternTubes.find((tube) => tube.tubeId === tubeId)
  );
}

function updateTubeById(
  armory: TorpedoArmoryState,
  tubeId: string,
  transform: (tube: TorpedoTubeState) => TorpedoTubeState,
): TorpedoArmoryState {
  if (findTorpedoTubeById(armory, tubeId) === undefined) {
    throw new Error(`No existe ningún tubo lanzatorpedos con identificador "${tubeId}".`);
  }
  return {
    ...armory,
    bowTubes: replaceMatchingTube(armory.bowTubes, tubeId, transform),
    sternTubes: replaceMatchingTube(armory.sternTubes, tubeId, transform),
  };
}

export function fireTorpedoTubeInArmory(
  armory: TorpedoArmoryState,
  tubeId: string,
): TorpedoArmoryState {
  return updateTubeById(armory, tubeId, fireTorpedoFromTube);
}

export function canStartTorpedoReloadInArmory(
  armory: TorpedoArmoryState,
  tubeId: string,
  difficulty: DifficultyConfig,
): boolean {
  const targetTube = findTorpedoTubeById(armory, tubeId);
  if (targetTube === undefined || targetTube.status !== 'EMPTY') {
    return false;
  }
  return difficulty.hasInfiniteReserveTorpedoes || armory.reserveTorpedoes > 0;
}

export function startTorpedoReloadInArmory(
  armory: TorpedoArmoryState,
  tubeId: string,
  difficulty: DifficultyConfig,
): TorpedoArmoryState {
  if (!difficulty.hasInfiniteReserveTorpedoes && armory.reserveTorpedoes <= 0) {
    throw new Error('No quedan torpedos en la reserva interna para iniciar la recarga.');
  }

  const updatedArmory = updateTubeById(armory, tubeId, (tube) =>
    beginTorpedoTubeReload(tube, difficulty.reloadTurnsRequired),
  );

  // En dificultad EASY la reserva actúa como suministro inagotable para no penalizar el aprendizaje táctico
  const nextReserveCount = difficulty.hasInfiniteReserveTorpedoes
    ? armory.reserveTorpedoes
    : armory.reserveTorpedoes - 1;

  return {
    ...updatedArmory,
    reserveTorpedoes: nextReserveCount,
  };
}

export function setArmoryReloadPaused(
  armory: TorpedoArmoryState,
  isPaused: boolean,
): TorpedoArmoryState {
  const pauseMapper = (tube: TorpedoTubeState): TorpedoTubeState =>
    setTorpedoTubeReloadPaused(tube, isPaused);
  return {
    ...armory,
    bowTubes: armory.bowTubes.map(pauseMapper),
    sternTubes: armory.sternTubes.map(pauseMapper),
  };
}

export function advanceArmoryReloadTurn(
  armory: TorpedoArmoryState,
): TorpedoArmoryState {
  return {
    ...armory,
    bowTubes: armory.bowTubes.map(advanceTorpedoTubeReloadTurn),
    sternTubes: armory.sternTubes.map(advanceTorpedoTubeReloadTurn),
  };
}

export function damageTorpedoTubeInArmory(
  armory: TorpedoArmoryState,
  tubeId: string,
): TorpedoArmoryState {
  return updateTubeById(armory, tubeId, damageTorpedoTube);
}

export function hasActiveMechanicalReload(armory: TorpedoArmoryState): boolean {
  return (
    armory.bowTubes.some(isTubeActivelyReloading) ||
    armory.sternTubes.some(isTubeActivelyReloading)
  );
}

// El arrastre de torpedos con aparejos metálicos delata la posición ante el hidrófono enemigo salvo que se pause la maniobra
export function calculateArmoryReloadNoise(
  armory: TorpedoArmoryState,
  difficulty: DifficultyConfig,
): number {
  return hasActiveMechanicalReload(armory) ? difficulty.reloadAcousticPenalty : 0;
}
