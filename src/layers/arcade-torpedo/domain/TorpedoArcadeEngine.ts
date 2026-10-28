import { advanceArmoryReloadTurn, canStartTorpedoReloadInArmory, findTorpedoTubeById, fireTorpedoTubeInArmory, startTorpedoReloadInArmory } from '../../../core/armory/index.ts';
import type { EncounterResult, FiringSolutionContext, TorpedoArmoryState } from '../../../core/contracts/index.ts';
import { MAX_TORPEDO_DEPTH_METERS, MIN_TORPEDO_DEPTH_METERS, advanceTargetHorizonBearing, calculateLeadAngleOffsetDeg, calculateTorpedoRunTimings, clampPeriscopeBearing, mergeAndClampTdcInput, stepActiveTorpedoRun } from './PeriscopeKinematics.ts';
import { type ShipRecognitionEntry, getShipRecognitionEntry, resolveActualShipRecognitionEntry } from './ShipRecognitionManual.ts';
import { resolveTorpedoShot } from './TorpedoResolutionEngine.ts';
import type { ActiveTorpedoRunState, TdcFiringInput, TorpedoArcadeStateSnapshot, TorpedoShotResolution } from './TorpedoTypes.ts';

// Coordina la sesión de ataque en periscopio: giro de adelanto, carrera del torpedo, disparos múltiples y retorno a patrulla

export { MIN_TORPEDO_DEPTH_METERS, MAX_TORPEDO_DEPTH_METERS };

function findFirstLoadedTubeId(armory: TorpedoArmoryState): string {
  const loaded = armory.bowTubes.find((t) => t.status === 'LOADED') ?? armory.sternTubes.find((t) => t.status === 'LOADED');
  return loaded?.tubeId ?? 'BOW-1';
}

export class TorpedoArcadeEngine {
  private firingContext: FiringSolutionContext | null = null;
  private currentInput: TdcFiringInput | null = null;
  private actualTargetEntry: ShipRecognitionEntry | null = null;
  private armory: TorpedoArmoryState | null = null;
  private periscopeBearingDeg = 0;
  private targetBearingDeg = 0;
  private hasManualBearingOverride = false;
  private activeTorpedoRun: ActiveTorpedoRunState | null = null;
  private targetDamageTaken = 0;
  private sinkingProgress = 0;
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
    this.sinkingProgress = 0;
    this.shotHistory = [];
    this.extraReloadTurnsElapsed = 0;
    this.activeTorpedoRun = null;
    this.hasManualBearingOverride = false;
    this.targetBearingDeg = (context.targetBowSide === 'STARBOARD' ? -1 : 1) * 6;
    this.periscopeBearingDeg = 0;
    this.currentInput = {
      selectedTubeId: findFirstLoadedTubeId(context.armory),
      recognizedShipType: 'COASTAL_FREIGHTER',
      pistolType: 'IMPACT',
      torpedoDepthMeters: 3.5,
      estimatedSpeedKnots: 8,
      estimatedAobDeg: 60,
    };
  }

  public getSnapshot(): TorpedoArcadeStateSnapshot {
    const { context, input, actualEntry, armory } = this.assertInitialized();
    const tdcLeadOffset = calculateLeadAngleOffsetDeg(input.estimatedSpeedKnots, input.estimatedAobDeg, context.targetBowSide);
    return {
      firingContext: context,
      currentInput: input,
      recognizedManualEntry: getShipRecognitionEntry(input.recognizedShipType),
      actualTargetEntry: actualEntry,
      armory,
      periscopeBearingDeg: this.periscopeBearingDeg,
      targetBearingDeg: this.targetBearingDeg,
      tdcSuggestedBearingDeg: clampPeriscopeBearing(this.targetBearingDeg + tdcLeadOffset),
      activeTorpedoRun: this.activeTorpedoRun,
      targetDamageTaken: this.targetDamageTaken,
      targetMaxHitPoints: actualEntry.maxHitPoints,
      isTargetSunk: this.targetDamageTaken >= actualEntry.maxHitPoints,
      sinkingProgress: this.sinkingProgress,
      lastShotResolution: this.shotHistory.length > 0 ? this.shotHistory[this.shotHistory.length - 1]! : null,
      shotHistory: this.shotHistory,
      extraReloadTurnsElapsed: this.extraReloadTurnsElapsed,
    };
  }

  public rotatePeriscope(deltaBearingDeg: number): TorpedoArcadeStateSnapshot {
    return this.setPeriscopeBearing(this.periscopeBearingDeg + deltaBearingDeg);
  }

  public setPeriscopeBearing(bearingDeg: number): TorpedoArcadeStateSnapshot {
    this.assertInitialized();
    this.hasManualBearingOverride = true;
    this.periscopeBearingDeg = clampPeriscopeBearing(bearingDeg);
    return this.getSnapshot();
  }

  public updateTdcInput(partial: Partial<TdcFiringInput>): TorpedoArcadeStateSnapshot {
    const { context, input } = this.assertInitialized();
    this.currentInput = mergeAndClampTdcInput(input, partial);
    if (partial.estimatedSpeedKnots !== undefined || partial.estimatedAobDeg !== undefined) {
      const leadDeg = calculateLeadAngleOffsetDeg(this.currentInput.estimatedSpeedKnots, this.currentInput.estimatedAobDeg, context.targetBowSide);
      this.periscopeBearingDeg = clampPeriscopeBearing(this.targetBearingDeg + leadDeg);
      this.hasManualBearingOverride = false;
    }
    return this.getSnapshot();
  }

  public launchTorpedoRun(): ActiveTorpedoRunState | null {
    const { context, input, actualEntry, armory } = this.assertInitialized();
    if (this.activeTorpedoRun !== null || this.targetDamageTaken >= actualEntry.maxHitPoints || findTorpedoTubeById(armory, input.selectedTubeId)?.status !== 'LOADED') {
      return null;
    }
    const { realNavalRunSeconds, totalScreenSeconds } = calculateTorpedoRunTimings(context.distanceMeters, this.periscopeBearingDeg - this.targetBearingDeg);
    const requiredLeadDeg = calculateLeadAngleOffsetDeg(context.targetSpeedKnots, context.targetAngleOnBowDeg, context.targetBowSide);
    this.activeTorpedoRun = {
      tubeId: input.selectedTubeId,
      firedBearingDeg: this.periscopeBearingDeg,
      targetArrivalBearingDeg: this.targetBearingDeg + requiredLeadDeg,
      elapsedScreenSeconds: 0,
      totalScreenSeconds,
      realNavalRunSeconds,
      progress: 0,
    };
    return this.activeTorpedoRun;
  }

  public stepSimulation(deltaSeconds: number, randomRoll = 0.5): TorpedoArcadeStateSnapshot {
    const { context, actualEntry } = this.assertInitialized();
    if (this.targetDamageTaken >= actualEntry.maxHitPoints) {
      this.sinkingProgress = Math.min(1, this.sinkingProgress + deltaSeconds * 0.35);
      return this.getSnapshot();
    }
    if (this.activeTorpedoRun !== null) {
      const stepped = stepActiveTorpedoRun(this.activeTorpedoRun, context, deltaSeconds);
      this.targetBearingDeg = stepped.updatedTargetBearingDeg;
      this.activeTorpedoRun = stepped.updatedRun;
      if (stepped.updatedRun.progress >= 1) {
        this.activeTorpedoRun = null;
        this.commitTorpedoImpact(randomRoll, stepped.updatedRun.firedBearingDeg - stepped.startTargetBearingDeg);
      }
      return this.getSnapshot();
    }
    this.targetBearingDeg = advanceTargetHorizonBearing(this.targetBearingDeg, context, this.targetDamageTaken, deltaSeconds);
    return this.getSnapshot();
  }

  public fireSelectedTorpedo(randomRoll = 0.5): TorpedoShotResolution {
    return this.commitTorpedoImpact(randomRoll, this.hasManualBearingOverride ? this.periscopeBearingDeg - this.targetBearingDeg : undefined);
  }

  private commitTorpedoImpact(randomRoll: number, manualAimOffsetDeg?: number): TorpedoShotResolution {
    const { context, input, actualEntry, armory } = this.assertInitialized();
    if (findTorpedoTubeById(armory, input.selectedTubeId)?.status !== 'LOADED') {
      throw new Error(`El tubo seleccionado "${input.selectedTubeId}" no está LOADED.`);
    }
    let nextArmory = fireTorpedoTubeInArmory(armory, input.selectedTubeId);
    if (canStartTorpedoReloadInArmory(nextArmory, input.selectedTubeId, context.difficulty)) {
      nextArmory = startTorpedoReloadInArmory(nextArmory, input.selectedTubeId, context.difficulty);
    }
    const resolution = resolveTorpedoShot(context, input, actualEntry, randomRoll, manualAimOffsetDeg);
    this.armory = nextArmory;
    this.targetDamageTaken = Math.min(actualEntry.maxHitPoints, this.targetDamageTaken + resolution.damageInflicted);
    if (this.targetDamageTaken >= actualEntry.maxHitPoints) {
      this.sinkingProgress = 0.25;
    }
    this.shotHistory = [...this.shotHistory, resolution];
    this.currentInput = { ...input, selectedTubeId: findFirstLoadedTubeId(nextArmory) };
    return resolution;
  }

  public advanceFiveMinuteReloadTick(): TorpedoArcadeStateSnapshot {
    const { input, armory } = this.assertInitialized();
    this.armory = advanceArmoryReloadTurn(armory);
    this.extraReloadTurnsElapsed += 1;
    this.currentInput = { ...input, selectedTubeId: findFirstLoadedTubeId(this.armory) };
    return this.getSnapshot();
  }

  public buildEncounterResult(baseTacticalTurns = 1): EncounterResult {
    const s = this.getSnapshot();
    return {
      contactId: s.firingContext.contactId,
      outcome: s.isTargetSunk ? 'TARGET_SUNK' : 'DISENGAGED',
      updatedArmory: s.armory,
      hullDamageTaken: 0,
      isTargetSunk: s.isTargetSunk,
      sunkTonnageAwarded: s.isTargetSunk ? s.actualTargetEntry.tonnage : 0,
      tacticalTurnsElapsed: baseTacticalTurns + this.extraReloadTurnsElapsed,
    };
  }

  private assertInitialized() {
    if (!this.firingContext || !this.currentInput || !this.actualTargetEntry || !this.armory) {
      throw new Error('TorpedoArcadeEngine no ha sido inicializado con startAttack.');
    }
    return { context: this.firingContext, input: this.currentInput, actualEntry: this.actualTargetEntry, armory: this.armory };
  }
}
