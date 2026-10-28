import type { RecognizedShipClass } from '../domain/ShipRecognitionManual.ts';
import type { TorpedoArcadeStateSnapshot, TorpedoShotResolution } from '../domain/TorpedoTypes.ts';

// Dibuja la lente circular del periscopio, la silueta vectorial sin spoilers, la guía fantasma de AOB y el informe posdisparo

const LENS_CENTER_X = 325;
const LENS_CENTER_Y = 245;
const LENS_RADIUS = 205;
const HORIZON_Y = 258;

function computeForeshorteningFactor(angleDeg: number): number {
  return 0.28 + 0.72 * Math.abs(Math.sin((angleDeg * Math.PI) / 180));
}

function drawSuperstructureByClass(
  context: CanvasRenderingContext2D,
  shipClass: RecognizedShipClass,
  halfWidth: number,
  deckY: number,
  bowSign: number,
): void {
  context.fillStyle = '#0b1920';
  context.strokeStyle = '#63f5c4';
  context.lineWidth = 1.4;

  if (shipClass === 'COASTAL_FREIGHTER') {
    // 1 chimenea a popa y 1 mástil central
    context.fillRect(-bowSign * halfWidth * 0.55 - 6, deckY - 18, 12, 18);
    context.beginPath();
    context.moveTo(0, deckY);
    context.lineTo(0, deckY - 28);
    context.stroke();
    return;
  }

  if (shipClass === 'LIBERTY_CARGO') {
    // Superestructura central y 2 mástiles simétricos
    context.fillRect(-16, deckY - 18, 32, 18);
    context.beginPath();
    context.moveTo(-halfWidth * 0.45, deckY);
    context.lineTo(-halfWidth * 0.45, deckY - 30);
    context.moveTo(halfWidth * 0.45, deckY);
    context.lineTo(halfWidth * 0.45, deckY - 30);
    context.stroke();
    return;
  }

  // T2_TANKER: puente a proa, pasarela larga y chimenea a popa
  context.fillRect(bowSign * halfWidth * 0.42 - 10, deckY - 20, 20, 20);
  context.fillRect(-bowSign * halfWidth * 0.58 - 8, deckY - 22, 16, 22);
  context.beginPath();
  context.moveTo(-halfWidth * 0.5, deckY - 8);
  context.lineTo(halfWidth * 0.4, deckY - 8);
  context.stroke();
}

function drawTargetSilhouetteAndWake(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
): void {
  const { firingContext, actualTargetEntry, currentInput, isTargetSunk } = snapshot;
  const distanceScale = Math.max(0.45, Math.min(1.25, 1100 / firingContext.distanceMeters));
  const baseHalfWidth = (actualTargetEntry.lengthMeters * 0.9 * distanceScale) / 2;
  const realHalfWidth = baseHalfWidth * computeForeshorteningFactor(firingContext.targetAngleOnBowDeg);
  const ghostHalfWidth = baseHalfWidth * computeForeshorteningFactor(currentInput.estimatedAobDeg);
  const bowSign = firingContext.targetBowSide === 'STARBOARD' ? 1 : -1;
  const deckY = isTargetSunk ? HORIZON_Y + 4 : HORIZON_Y - 12;

  context.save();
  context.translate(LENS_CENTER_X, 0);

  context.beginPath();
  context.moveTo(-realHalfWidth, HORIZON_Y);
  context.lineTo(-realHalfWidth * 0.92, deckY);
  context.lineTo(realHalfWidth * 0.95, deckY);
  context.lineTo(realHalfWidth + bowSign * 6, deckY - 3);
  context.lineTo(realHalfWidth, HORIZON_Y);
  context.closePath();
  context.fillStyle = '#09141a';
  context.fill();
  context.strokeStyle = isTargetSunk ? '#ef476f' : '#00ffaa';
  context.lineWidth = 1.6;
  context.stroke();

  drawSuperstructureByClass(context, actualTargetEntry.shipClass, realHalfWidth, deckY, bowSign);

  // Pista visual de velocidad: longitud de espuma en la proa proporcional a los nudos reales
  const wakeLength = firingContext.targetSpeedKnots * 3.2;
  context.beginPath();
  context.moveTo(bowSign * realHalfWidth, HORIZON_Y + 2);
  context.lineTo(bowSign * (realHalfWidth - wakeLength), HORIZON_Y + 6);
  context.strokeStyle = '#e0fbfc';
  context.lineWidth = 2;
  context.stroke();

  // Silueta guía fantasma controlada por el AOB estimado del jugador
  context.strokeStyle = '#4cc9f0';
  context.lineWidth = 1.3;
  context.setLineDash([4, 4]);
  context.strokeRect(-ghostHalfWidth, deckY - 26, ghostHalfWidth * 2, 28);
  context.setLineDash([]);
  context.restore();
}

function renderShotTelemetryBox(
  context: CanvasRenderingContext2D,
  shot: TorpedoShotResolution | null,
  damageTaken: number,
  maxHitPoints: number,
): void {
  context.strokeStyle = '#1f544c';
  context.fillStyle = '#061319';
  context.fillRect(20, 482, 610, 144);
  context.strokeRect(20, 482, 610, 144);

  context.textAlign = 'left';
  if (shot === null) {
    context.fillStyle = '#63f5c4';
    context.font = 'bold 12px monospace';
    context.fillText('GUÍA DE RECONOCIMIENTO VISUAL (SIN TELEMETRÍA PREVIA AL DISPARO)', 34, 506);
    context.font = '11px monospace';
    context.fillStyle = '#a8dadc';
    context.fillText('• Identifica la clase por su silueta: Costero (1 mástil) | Liberty (2 mástiles) | T2 (pasarela)', 34, 530);
    context.fillText('• Ajusta el AOB estimado hasta que el recuadro fantasma cian coincida con el ancho del casco.', 34, 552);
    context.fillText('• Estima la velocidad según la espuma de proa y elige espoleta IMPACT o MAGNETIC bajo quilla.', 34, 574);
    context.fillStyle = '#ffd166';
    context.fillText(`INTEGRIDAD ESTRUCTURAL DEL BLANCO: ${maxHitPoints - damageTaken}/${maxHitPoints}`, 34, 604);
    return;
  }

  context.fillStyle = shot.damageInflicted > 0 ? '#00ffaa' : '#ffd166';
  context.font = 'bold 12px monospace';
  context.fillText(`INFORME DE DISPARO [${shot.firedTubeId}] -> ${shot.outcome} (DAÑO ACUMULADO: ${damageTaken}/${maxHitPoints})`, 34, 506);
  context.font = '11px monospace';
  context.fillStyle = '#e0fbfc';
  context.fillText(`• Desvío longitudinal en cruce : ${shot.longitudinalMissMeters} m (Eslora real: ${shot.actualLengthMeters} m)`, 34, 532);
  context.fillText(`• Cota Torpedo vs Calado Real  : ${shot.inputUsed.torpedoDepthMeters} m vs Calado ${shot.actualDraftMeters} m (${shot.actualShipClass})`, 34, 554);
  context.fillText(`• Velocidad y AOB (Est vs Real): Vel ${shot.inputUsed.estimatedSpeedKnots} vs ${shot.actualSpeedKnots} kn | AOB ${shot.inputUsed.estimatedAobDeg}° vs ${shot.actualAobDeg}°`, 34, 576);
  context.fillStyle = '#8ecae6';
  context.fillText(`• Oblicuidad de impacto: ${shot.impactObliquityDeg}° respecto a la normal del casco`, 34, 598);
}

export function renderPeriscopeLensView(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
  torpedoRunProgress: number | null,
): void {
  context.fillStyle = '#030a0e';
  context.fillRect(0, 0, 645, 640);

  context.save();
  context.beginPath();
  context.arc(LENS_CENTER_X, LENS_CENTER_Y, LENS_RADIUS, 0, Math.PI * 2);
  context.clip();

  context.fillStyle = '#09222c';
  context.fillRect(LENS_CENTER_X - LENS_RADIUS, LENS_CENTER_Y - LENS_RADIUS, LENS_RADIUS * 2, LENS_RADIUS * 2);
  context.fillStyle = '#041218';
  context.fillRect(LENS_CENTER_X - LENS_RADIUS, HORIZON_Y, LENS_RADIUS * 2, LENS_RADIUS * 2);

  drawTargetSilhouetteAndWake(context, snapshot);

  if (torpedoRunProgress !== null) {
    const wakeY = LENS_CENTER_Y + LENS_RADIUS - torpedoRunProgress * (LENS_CENTER_Y + LENS_RADIUS - HORIZON_Y);
    context.beginPath();
    context.moveTo(LENS_CENTER_X, LENS_CENTER_Y + LENS_RADIUS);
    context.lineTo(LENS_CENTER_X, wakeY);
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2.2;
    context.setLineDash([5, 4]);
    context.stroke();
    context.setLineDash([]);
  }

  context.strokeStyle = 'rgba(0, 255, 170, 0.45)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(LENS_CENTER_X - LENS_RADIUS, HORIZON_Y);
  context.lineTo(LENS_CENTER_X + LENS_RADIUS, HORIZON_Y);
  context.moveTo(LENS_CENTER_X, LENS_CENTER_Y - LENS_RADIUS);
  context.lineTo(LENS_CENTER_X, LENS_CENTER_Y + LENS_RADIUS);
  context.stroke();
  context.restore();

  context.beginPath();
  context.arc(LENS_CENTER_X, LENS_CENTER_Y, LENS_RADIUS, 0, Math.PI * 2);
  context.strokeStyle = '#246a5e';
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = '#00ffaa';
  context.font = 'bold 13px monospace';
  context.textAlign = 'center';
  context.fillText(`TELÉMETRO ESTADIMÉTRICO: ${snapshot.firingContext.distanceMeters} METROS | BANDA: ${snapshot.firingContext.targetBowSide}`, LENS_CENTER_X, 26);

  renderShotTelemetryBox(context, snapshot.lastShotResolution, snapshot.targetDamageTaken, snapshot.targetMaxHitPoints);
}
