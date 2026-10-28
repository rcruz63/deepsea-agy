import {
  advanceArmoryReloadTurn,
  canStartTorpedoReloadInArmory,
  findTorpedoTubeById,
  fireTorpedoTubeInArmory,
  startTorpedoReloadInArmory,
} from '../../../core/armory/index.ts';
import type {
  EncounterResult,
  FiringSolutionContext,
  TorpedoArmoryState,
} from '../../../core/contracts/index.ts';
import {
  type ShipRecognitionEntry,
  getShipRecognitionEntry,
  resolveActualShipRecognitionEntry,
} from './ShipRecognitionManual.ts';
import { resolveTorpedoShot } from './TorpedoResolutionEngine.ts';
import type {
  TdcFiringInput,
  TorpedoArcadeStateSnapshot,
  TorpedoShotResolution,
} from './TorpedoTypes.ts';

// Gestiona la sesión de ataque en periscopio: ajustes del TDC, disparos sucesivos, recarga de 5m y generación de EncounterResult

export const MIN_TORPEDO_DEPTH_METERS = 1.0;
export const MAX_TORPEDO_DEPTH_METERS = 12.0;

function findFirstLoadedTubeId(armory: TorpedoArmoryState): string {
  const loadedTube =
    armory.bowTubes.find((tube) => tube.status === 'LOADED') ??
    armory.sternTubes.find((tube) => tube.status === 'LOADED');
  return loadedTube?.tubeId ?? 'BOW-1';
}

function clampTorpedoDepth(depthMeters: number): number {
  const stepped = Math.round(depthMeters * 2) / 2;
  return Math.max(MIN_TORPEDO_DEPTH_METERS, Math.min(MAX_TORPEDO_DEPTH_METERS, stepped));
}

export class TorpedoArcadeEngine {
  private firingContext: FiringSolutionContext | null = null;
  private currentInput: TdcFiringInput | null = null;
  private actualTargetEntry: ShipRecognitionEntry | null = null;
  private armory: TorpedoArmoryState | null = null;
  private targetDamageTaken = 0;
  private shotHistory: TorpedoShotResolution[] = [];
  private extraReloadTurnsElapsed = 0;

  public startAttack(context: FiringSolutionContext): void {
    this.firingContext = context;
    this.actualTargetEntry = resolveActualShipRecognitionEntry(
      context.targetShip.spec.specId,
      context.targetShip.spec.draftMeters,
      context.targetShip.spec.tonnage,
    );
    this.armory = context.armory;
    this.targetDamageTaken = 0;
    this.shotHistory = [];
    this.extraReloadTurnsElapsed = 0;
    // Inicia con valores neutros para obligar al jugador a deducir clase, calado, velocidad y AOB sin pistas pre-rellenadas
    this.currentInput = {
      selectedTubeId: findFirstLoadedTubeId(context.armory),
      recognizedShipType: 'COASTAL_FREIGHTER',
      pistolType: 'IMPACT',
      torpedoDepthMeters: 3.0,
      estimatedSpeedKnots: 6,
      estimatedAobDeg: 45,
    };
  }

  public getSnapshot(): TorpedoArcadeStateSnapshot {
    const { context, input, actualEntry, armory } = this.assertInitialized();
    const isTargetSunk = this.targetDamageTaken >= actualEntry.maxHitPoints;
    const lastShotResolution =
      this.shotHistory.length > 0 ? this.shotHistory[this.shotHistory.length - 1]! : null;

    return {
      firingContext: context,
      currentInput: input,
      recognizedManualEntry: getShipRecognitionEntry(input.recognizedShipType),
      actualTargetEntry: actualEntry,
      armory,
      targetDamageTaken: this.targetDamageTaken,
      targetMaxHitPoints: actualEntry.maxHitPoints,
      isTargetSunk,
      lastShotResolution,
      shotHistory: this.shotHistory,
      extraReloadTurnsElapsed: this.extraReloadTurnsElapsed,
    };
  }

  public updateTdcInput(partial: Partial<TdcFiringInput>): TorpedoArcadeStateSnapshot {
    const { input } = this.assertInitialized();
    this.currentInput = {
      selectedTubeId: partial.selectedTubeId ?? input.selectedTubeId,
      recognizedShipType: partial.recognizedShipType ?? input.recognizedShipType,
      pistolType: partial.pistolType ?? input.pistolType,
      torpedoDepthMeters:
        partial.torpedoDepthMeters !== undefined
          ? clampTorpedoDepth(partial.torpedoDepthMeters)
          : input.torpedoDepthMeters,
      estimatedSpeedKnots:
        partial.estimatedSpeedKnots !== undefined
          ? Math.max(0, Math.min(20, Math.round(partial.estimatedSpeedKnots)))
          : input.estimatedSpeedKnots,
      estimatedAobDeg:
        partial.estimatedAobDeg !== undefined
          ? Math.max(0, Math.min(180, Math.round(partial.estimatedAobDeg)))
          : input.estimatedAobDeg,
    };
    return this.getSnapshot();
  }

  public fireSelectedTorpedo(randomRoll = 0.5): TorpedoShotResolution {
    const { context, input, actualEntry, armory } = this.assertInitialized();
    if (this.targetDamageTaken >= actualEntry.maxHitPoints) {
      throw new Error('El blanco ya ha sido hundido.');
    }

    const selectedTube = findTorpedoTubeById(armory, input.selectedTubeId);
    if (selectedTube === undefined || selectedTube.status !== 'LOADED') {
      throw new Error(`El tubo seleccionado "${input.selectedTubeId}" no está LOADED.`);
    }

    let nextArmory = fireTorpedoTubeInArmory(armory, input.selectedTubeId);
    if (canStartTorpedoReloadInArmory(nextArmory, input.selectedTubeId, context.difficulty)) {
      nextArmory = startTorpedoReloadInArmory(nextArmory, input.selectedTubeId, context.difficulty);
    }

    const resolution = resolveTorpedoShot(context, input, actualEntry, randomRoll);
    this.armory = nextArmory;
    this.targetDamageTaken = Math.min(
      actualEntry.maxHitPoints,
      this.targetDamageTaken + resolution.damageInflicted,
    );
    this.shotHistory = [...this.shotHistory, resolution];
    this.currentInput = { ...input, selectedTubeId: findFirstLoadedTubeId(nextArmory) };
    return resolution;
  }

  public advanceFiveMinuteReloadTick(): TorpedoArcadeStateSnapshot {
    const { input, armory } = this.assertInitialized();
    const advancedArmory = advanceArmoryReloadTurn(armory);
    this.armory = advancedArmory;
    this.extraReloadTurnsElapsed += 1;
    this.currentInput = { ...input, selectedTubeId: findFirstLoadedTubeId(advancedArmory) };
    return this.getSnapshot();
  }

  public buildEncounterResult(baseTacticalTurns = 1): EncounterResult {
    const snapshot = this.getSnapshot();
    return {
      contactId: snapshot.firingContext.contactId,
      outcome: snapshot.isTargetSunk ? 'TARGET_SUNK' : 'DISENGAGED',
      updatedArmory: snapshot.armory,
      hullDamageTaken: 0,
      isTargetSunk: snapshot.isTargetSunk,
      sunkTonnageAwarded: snapshot.isTargetSunk ? snapshot.actualTargetEntry.tonnage : 0,
      tacticalTurnsElapsed: baseTacticalTurns + this.extraReloadTurnsElapsed,
    };
  }

  private assertInitialized() {
    if (!this.firingContext || !this.currentInput || !this.actualTargetEntry || !this.armory) {
      throw new Error('TorpedoArcadeEngine no ha sido inicializado con startAttack.');
    }
    return {
      context: this.firingContext,
      input: this.currentInput,
      actualEntry: this.actualTargetEntry,
      armory: this.armory,
    };
  }
}
