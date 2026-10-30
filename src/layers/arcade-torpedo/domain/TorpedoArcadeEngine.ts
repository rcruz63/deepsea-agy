import { advanceArmoryReloadTurn, canStartTorpedoReloadInArmory, findTorpedoTubeById, fireTorpedoTubeInArmory, startTorpedoReloadInArmory } from '../../../core/armory/index.ts';
import type { EncounterResult, FiringSolutionContext, TorpedoArmoryState } from '../../../core/contracts/index.ts';
import { MAX_TORPEDO_DEPTH_METERS, MIN_TORPEDO_DEPTH_METERS, advanceTargetHorizonBearing, calculateLeadAngleOffsetDeg, calculateSignedAngularDeltaDeg, calculateTorpedoRunTimings, clampPeriscopeBearing, findPreferredLoadedTubeForArc, isTubeCompatibleWithArc, mergeAndClampTdcInput, normalizePeriscopeBroadsideAob, normalizeRelativeBearingDeg, resolveActiveFiringArc, stepActiveTorpedoRun } from './PeriscopeKinematics.ts';
import { type ShipRecognitionEntry, getShipRecognitionEntry, resolveActualShipRecognitionEntry } from './ShipRecognitionManual.ts';
import { resolveTorpedoShot } from './TorpedoResolutionEngine.ts';
import type { ActiveTorpedoRunState, TdcFiringInput, TorpedoArcadeStateSnapshot, TorpedoShotResolution } from './TorpedoTypes.ts';

// Coordina el ataque en periscopio de 360°: arcos de proa/popa, timón del submarino, carrera del torpedo y retorno
export { MIN_TORPEDO_DEPTH_METERS, MAX_TORPEDO_DEPTH_METERS };

export class TorpedoArcadeEngine {
  private firingContext: FiringSolutionContext | null = null;
  private currentInput: TdcFiringInput | null = null;
  private actualTargetEntry: ShipRecognitionEntry | null = null;
  private armory: TorpedoArmoryState | null = null;
  private periscopeBearingDeg = 0;
  private targetBearingDeg = 0;
  private submarineHeadingOffsetDeg = 0;
  private hasManualBearingOverride = false;
  private activeTorpedoRun: ActiveTorpedoRunState | null = null;
  private targetDamageTaken = 0;
  private sinkingProgress = 0;
  private shotHistory: TorpedoShotResolution[] = [];
  private extraReloadTurnsElapsed = 0;

  public startAttack(context: FiringSolutionContext): void {
    const normalizedAob = normalizePeriscopeBroadsideAob(context.targetAngleOnBowDeg);
    this.firingContext = { ...context, targetAngleOnBowDeg: normalizedAob, trueAngleOnBowDegrees: normalizedAob };
    this.actualTargetEntry = resolveActualShipRecognitionEntry(context.targetShip.spec.specId, context.targetShip.spec.draftMeters, context.targetShip.spec.tonnage);
    this.armory = context.armory;
    this.targetDamageTaken = 0;
    this.sinkingProgress = 0;
    this.shotHistory = [];
    this.extraReloadTurnsElapsed = 0;
    this.activeTorpedoRun = null;
    this.hasManualBearingOverride = false;
    this.submarineHeadingOffsetDeg = 0;

    // Si viene del mapa táctico con marcación relativa real, la usa para que el blanco no aparezca siempre centrado en 0°
    const defaultBearing = (context.targetBowSide === 'STARBOARD' ? -1 : 1) * 10;
    this.targetBearingDeg =
      context.submarineRelativeBearingDeg !== undefined && context.submarineRelativeBearingDeg !== 0
        ? normalizeRelativeBearingDeg(context.submarineRelativeBearingDeg)
        : defaultBearing;
    this.periscopeBearingDeg = 0;
    this.currentInput = {
      selectedTubeId: findPreferredLoadedTubeForArc(context.armory, resolveActiveFiringArc(0)),
      recognizedShipType: 'COASTAL_FREIGHTER',
      pistolType: 'IMPACT',
      torpedoDepthMeters: 3.5,
      estimatedSpeedKnots: context.targetSpeedKnots,
      estimatedAobDeg: normalizedAob,
    };
  }

  public getSnapshot(): TorpedoArcadeStateSnapshot {
    const { context, input, actualEntry, armory } = this.assertInitialized();
    const tdcLeadOffset = calculateLeadAngleOffsetDeg(context.targetSpeedKnots, context.targetAngleOnBowDeg, context.targetBowSide);
    return {
      firingContext: context, currentInput: input,
      recognizedManualEntry: getShipRecognitionEntry(input.recognizedShipType),
      actualTargetEntry: actualEntry, armory,
      periscopeBearingDeg: this.periscopeBearingDeg, targetBearingDeg: this.targetBearingDeg,
      tdcSuggestedBearingDeg: clampPeriscopeBearing(this.targetBearingDeg + tdcLeadOffset),
      activeFiringArc: resolveActiveFiringArc(this.periscopeBearingDeg),
      submarineHeadingOffsetDeg: this.submarineHeadingOffsetDeg,
      activeTorpedoRun: this.activeTorpedoRun,
      targetDamageTaken: this.targetDamageTaken, targetMaxHitPoints: actualEntry.maxHitPoints,
      isTargetSunk: this.targetDamageTaken >= actualEntry.maxHitPoints, sinkingProgress: this.sinkingProgress,
      lastShotResolution: this.shotHistory.length > 0 ? this.shotHistory[this.shotHistory.length - 1]! : null,
      shotHistory: this.shotHistory, extraReloadTurnsElapsed: this.extraReloadTurnsElapsed,
    };
  }

  public rotatePeriscope(deltaBearingDeg: number): TorpedoArcadeStateSnapshot {
    return this.setPeriscopeBearing(this.periscopeBearingDeg + deltaBearingDeg);
  }

  public setPeriscopeBearing(bearingDeg: number): TorpedoArcadeStateSnapshot {
    const { input, armory } = this.assertInitialized();
    this.hasManualBearingOverride = true;
    this.periscopeBearingDeg = clampPeriscopeBearing(bearingDeg);
    const nextArc = resolveActiveFiringArc(this.periscopeBearingDeg);
    this.currentInput = { ...input, selectedTubeId: findPreferredLoadedTubeForArc(armory, nextArc, input.selectedTubeId) };
    return this.getSnapshot();
  }

  // Virar el timón del submarino rota el casco respecto al mar, desplazando la marcación relativa del blanco
  public steerSubmarine(deltaHeadingDeg: number): TorpedoArcadeStateSnapshot {
    const { input, armory } = this.assertInitialized();
    this.submarineHeadingOffsetDeg = normalizeRelativeBearingDeg(this.submarineHeadingOffsetDeg + deltaHeadingDeg);
    this.targetBearingDeg = normalizeRelativeBearingDeg(this.targetBearingDeg - deltaHeadingDeg);
    if (this.activeTorpedoRun !== null) {
      this.activeTorpedoRun = {
        ...this.activeTorpedoRun,
        firedBearingDeg: normalizeRelativeBearingDeg(this.activeTorpedoRun.firedBearingDeg - deltaHeadingDeg),
        targetArrivalBearingDeg: normalizeRelativeBearingDeg(this.activeTorpedoRun.targetArrivalBearingDeg - deltaHeadingDeg),
      };
    }
    const currentArc = resolveActiveFiringArc(this.periscopeBearingDeg);
    this.currentInput = { ...input, selectedTubeId: findPreferredLoadedTubeForArc(armory, currentArc, input.selectedTubeId) };
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
    const activeArc = resolveActiveFiringArc(this.periscopeBearingDeg);
    const selectedTube = findTorpedoTubeById(armory, input.selectedTubeId);
    if (this.activeTorpedoRun !== null || this.targetDamageTaken >= actualEntry.maxHitPoints || selectedTube?.status !== 'LOADED' || !isTubeCompatibleWithArc(input.selectedTubeId, activeArc)) {
      return null;
    }
    const aimOffsetDeg = calculateSignedAngularDeltaDeg(this.targetBearingDeg, this.periscopeBearingDeg);
    const { realNavalRunSeconds, totalScreenSeconds } = calculateTorpedoRunTimings(context.distanceMeters, aimOffsetDeg);
    const requiredLeadDeg = calculateLeadAngleOffsetDeg(context.targetSpeedKnots, context.targetAngleOnBowDeg, context.targetBowSide);
    this.activeTorpedoRun = {
      tubeId: input.selectedTubeId, firedBearingDeg: this.periscopeBearingDeg,
      targetArrivalBearingDeg: normalizeRelativeBearingDeg(this.targetBearingDeg + requiredLeadDeg),
      elapsedScreenSeconds: 0, totalScreenSeconds, realNavalRunSeconds, progress: 0,
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
        this.commitTorpedoImpact(randomRoll, calculateSignedAngularDeltaDeg(stepped.startTargetBearingDeg, stepped.updatedRun.firedBearingDeg));
      }
      return this.getSnapshot();
    }
    this.targetBearingDeg = advanceTargetHorizonBearing(this.targetBearingDeg, context, this.targetDamageTaken, deltaSeconds);
    return this.getSnapshot();
  }

  public fireSelectedTorpedo(randomRoll = 0.5): TorpedoShotResolution {
    const manualOffset = this.hasManualBearingOverride ? calculateSignedAngularDeltaDeg(this.targetBearingDeg, this.periscopeBearingDeg) : undefined;
    return this.commitTorpedoImpact(randomRoll, manualOffset);
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
    this.currentInput = { ...input, selectedTubeId: findPreferredLoadedTubeForArc(nextArmory, resolveActiveFiringArc(this.periscopeBearingDeg)) };
    return resolution;
  }

  public advanceFiveMinuteReloadTick(): TorpedoArcadeStateSnapshot {
    const { input, armory } = this.assertInitialized();
    this.armory = advanceArmoryReloadTurn(armory);
    this.extraReloadTurnsElapsed += 1;
    this.currentInput = { ...input, selectedTubeId: findPreferredLoadedTubeForArc(this.armory, resolveActiveFiringArc(this.periscopeBearingDeg)) };
    return this.getSnapshot();
  }

  public buildEncounterResult(baseTacticalTurns = 1): EncounterResult {
    const s = this.getSnapshot();
    const outcome = s.isTargetSunk ? 'TARGET_SUNK' : 'DISENGAGED';
    return { contactId: s.firingContext.contactId, outcome, updatedArmory: s.armory, hullDamageTaken: 0, isTargetSunk: s.isTargetSunk, sunkTonnageAwarded: s.isTargetSunk ? s.actualTargetEntry.tonnage : 0, tacticalTurnsElapsed: baseTacticalTurns + this.extraReloadTurnsElapsed };
  }

  private assertInitialized() {
    if (!this.firingContext || !this.currentInput || !this.actualTargetEntry || !this.armory) {
      throw new Error('TorpedoArcadeEngine no ha sido inicializado con startAttack.');
    }
    return { context: this.firingContext, input: this.currentInput, actualEntry: this.actualTargetEntry, armory: this.armory };
  }
}
