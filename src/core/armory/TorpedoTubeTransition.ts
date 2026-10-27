import type {
  TorpedoTubeMount,
  TorpedoTubeState,
} from '../contracts/TorpedoArmoryState.ts';

// Aísla las invariantes de un único tubo lanzatorpedos para impedir disparos inválidos o pérdida de progreso durante navegación silenciosa

export function createLoadedTorpedoTube(
  tubeId: string,
  mount: TorpedoTubeMount,
): TorpedoTubeState {
  return {
    tubeId,
    mount,
    status: 'LOADED',
    remainingReloadTurns: 0,
    isReloadPaused: false,
  };
}

export function createEmptyTorpedoTube(
  tubeId: string,
  mount: TorpedoTubeMount,
): TorpedoTubeState {
  return {
    tubeId,
    mount,
    status: 'EMPTY',
    remainingReloadTurns: 0,
    isReloadPaused: false,
  };
}

export function canFireTorpedoTube(tube: TorpedoTubeState): boolean {
  return tube.status === 'LOADED';
}

export function fireTorpedoFromTube(tube: TorpedoTubeState): TorpedoTubeState {
  if (!canFireTorpedoTube(tube)) {
    throw new Error(
      `No se puede disparar el tubo "${tube.tubeId}" porque su estado actual es ${tube.status}.`,
    );
  }
  return {
    ...tube,
    status: 'EMPTY',
    remainingReloadTurns: 0,
    isReloadPaused: false,
  };
}

export function beginTorpedoTubeReload(
  tube: TorpedoTubeState,
  reloadTurnsRequired: number,
): TorpedoTubeState {
  if (tube.status !== 'EMPTY') {
    throw new Error(
      `Solo un tubo EMPTY puede iniciar recarga; el tubo "${tube.tubeId}" está en ${tube.status}.`,
    );
  }
  if (!Number.isInteger(reloadTurnsRequired) || reloadTurnsRequired <= 0) {
    throw new Error(
      `Los turnos de recarga deben ser un entero positivo; recibido ${reloadTurnsRequired}.`,
    );
  }
  return {
    ...tube,
    status: 'RELOADING',
    remainingReloadTurns: reloadTurnsRequired,
    isReloadPaused: false,
  };
}

export function setTorpedoTubeReloadPaused(
  tube: TorpedoTubeState,
  isPaused: boolean,
): TorpedoTubeState {
  if (tube.status !== 'RELOADING') {
    return tube;
  }
  return {
    ...tube,
    isReloadPaused: isPaused,
  };
}

export function advanceTorpedoTubeReloadTurn(
  tube: TorpedoTubeState,
): TorpedoTubeState {
  // Si la tripulación detuvo las maniobras por silencio mecánico, el cronómetro permanece congelado sin reiniciar el trabajo previo
  if (tube.status !== 'RELOADING' || tube.isReloadPaused) {
    return tube;
  }

  const nextRemainingTurns = tube.remainingReloadTurns - 1;
  if (nextRemainingTurns <= 0) {
    return {
      ...tube,
      status: 'LOADED',
      remainingReloadTurns: 0,
      isReloadPaused: false,
    };
  }

  return {
    ...tube,
    remainingReloadTurns: nextRemainingTurns,
  };
}

export function damageTorpedoTube(tube: TorpedoTubeState): TorpedoTubeState {
  // Un impacto directo inutiliza las compuertas del tubo y cancela cualquier maniobra de carga en curso
  return {
    ...tube,
    status: 'DAMAGED',
    remainingReloadTurns: 0,
    isReloadPaused: false,
  };
}

export function repairTorpedoTubeToEmpty(tube: TorpedoTubeState): TorpedoTubeState {
  if (tube.status !== 'DAMAGED') {
    return tube;
  }
  return createEmptyTorpedoTube(tube.tubeId, tube.mount);
}
