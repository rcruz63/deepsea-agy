import type { RecognizedShipClass } from '../domain/ShipRecognitionManual.ts';
import type { TorpedoArcadeStateSnapshot } from '../domain/TorpedoTypes.ts';

// Dibuja el buque en movimiento por el horizonte, su indicador de rumbo, la columna de agua de impacto y el hundimiento en V

export const PERISCOPE_LENS_CENTER_X = 325;
export const PERISCOPE_HORIZON_Y = 258;
export const PIXELS_PER_BEARING_DEGREE = 7.5;

function computeForeshorteningFactor(angleDeg: number): number {
  return 0.45 + 0.55 * Math.abs(Math.sin((angleDeg * Math.PI) / 180));
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
    context.fillRect(-bowSign * halfWidth * 0.55 - 6, deckY - 18, 12, 18);
    context.beginPath();
    context.moveTo(0, deckY);
    context.lineTo(0, deckY - 28);
    context.stroke();
    return;
  }
  if (shipClass === 'LIBERTY_CARGO') {
    context.fillRect(-16, deckY - 18, 32, 18);
    context.beginPath();
    context.moveTo(-halfWidth * 0.45, deckY);
    context.lineTo(-halfWidth * 0.45, deckY - 30);
    context.moveTo(halfWidth * 0.45, deckY);
    context.lineTo(halfWidth * 0.45, deckY - 30);
    context.stroke();
    return;
  }
  context.fillRect(bowSign * halfWidth * 0.42 - 10, deckY - 20, 20, 20);
  context.fillRect(-bowSign * halfWidth * 0.58 - 8, deckY - 22, 16, 22);
  context.beginPath();
  context.moveTo(-halfWidth * 0.5, deckY - 8);
  context.lineTo(halfWidth * 0.4, deckY - 8);
  context.stroke();
}

function drawDamageFireAndGeyser(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
  realHalfWidth: number,
  deckY: number,
  bowSign: number,
): void {
  const lastShot = snapshot.lastShotResolution;
  const hitRatio =
    lastShot !== null
      ? Math.max(-0.85, Math.min(0.85, lastShot.longitudinalMissMeters / (snapshot.actualTargetEntry.lengthMeters / 2)))
      : 0;
  const hitX = bowSign * hitRatio * realHalfWidth;

  if (lastShot !== null && lastShot.damageInflicted > 0 && snapshot.activeTorpedoRun === null) {
    context.fillStyle = 'rgba(224, 251, 252, 0.88)';
    context.beginPath();
    context.moveTo(hitX - 15, PERISCOPE_HORIZON_Y + 2);
    context.lineTo(hitX - 6, deckY - 54);
    context.lineTo(hitX + 6, deckY - 54);
    context.lineTo(hitX + 15, PERISCOPE_HORIZON_Y + 2);
    context.closePath();
    context.fill();
    context.fillStyle = '#ff9f1c';
    context.beginPath();
    context.arc(hitX, deckY - 4, 11, 0, Math.PI * 2);
    context.fill();
  }

  if (snapshot.targetDamageTaken > 0) {
    context.fillStyle = 'rgba(20, 26, 30, 0.8)';
    context.beginPath();
    context.arc(hitX - bowSign * 8, deckY - 26, 12, 0, Math.PI * 2);
    context.arc(hitX - bowSign * 18, deckY - 44, 16, 0, Math.PI * 2);
    context.arc(hitX - bowSign * 28, deckY - 64, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ef476f';
    context.beginPath();
    context.moveTo(hitX - 9, deckY);
    context.lineTo(hitX, deckY - 19);
    context.lineTo(hitX + 9, deckY);
    context.closePath();
    context.fill();
  }
}

function drawSinkingBrokenHull(
  context: CanvasRenderingContext2D,
  realHalfWidth: number,
  bowSign: number,
  sinkingProgress: number,
): void {
  const sinkDrop = 6 + sinkingProgress * 18;
  const breakAngle = 0.24 + sinkingProgress * 0.22;

  context.save();
  context.translate(-bowSign * 6, PERISCOPE_HORIZON_Y + sinkDrop);
  context.rotate(-bowSign * breakAngle);
  context.fillStyle = '#09141a';
  context.strokeStyle = '#ff9f1c';
  context.lineWidth = 1.6;
  context.fillRect(-realHalfWidth, -14, realHalfWidth * 0.92, 16);
  context.strokeRect(-realHalfWidth, -14, realHalfWidth * 0.92, 16);
  context.restore();

  context.save();
  context.translate(bowSign * 6, PERISCOPE_HORIZON_Y + sinkDrop);
  context.rotate(bowSign * (breakAngle + 0.08));
  context.fillStyle = '#09141a';
  context.strokeStyle = '#ff9f1c';
  context.lineWidth = 1.6;
  context.fillRect(0, -14, realHalfWidth * 0.92, 16);
  context.strokeRect(0, -14, realHalfWidth * 0.92, 16);
  context.restore();

  context.strokeStyle = '#e0fbfc';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-realHalfWidth * 1.1, PERISCOPE_HORIZON_Y + 3);
  context.lineTo(realHalfWidth * 1.1, PERISCOPE_HORIZON_Y + 3);
  context.stroke();
}

export function renderTargetAndLeadMarker(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
): void {
  const { firingContext, actualTargetEntry, isTargetSunk } = snapshot;
  const distanceScale = Math.max(0.45, Math.min(1.25, 1100 / firingContext.distanceMeters));
  const baseHalfWidth = (actualTargetEntry.lengthMeters * 0.9 * distanceScale) / 2;
  const realHalfWidth = baseHalfWidth * computeForeshorteningFactor(firingContext.targetAngleOnBowDeg);
  const bowSign = firingContext.targetBowSide === 'STARBOARD' ? 1 : -1;
  const shipScreenX = PERISCOPE_LENS_CENTER_X + (snapshot.targetBearingDeg - snapshot.periscopeBearingDeg) * PIXELS_PER_BEARING_DEGREE;
  const deckY = snapshot.targetDamageTaken > 0 ? PERISCOPE_HORIZON_Y - 8 : PERISCOPE_HORIZON_Y - 13;

  context.save();
  context.translate(shipScreenX, 0);
  if (isTargetSunk) {
    drawSinkingBrokenHull(context, realHalfWidth, bowSign, snapshot.sinkingProgress);
    drawDamageFireAndGeyser(context, snapshot, realHalfWidth, PERISCOPE_HORIZON_Y - 4, bowSign);
    context.restore();
    return;
  }

  context.beginPath();
  context.moveTo(-realHalfWidth, PERISCOPE_HORIZON_Y);
  context.lineTo(-realHalfWidth * 0.92, deckY);
  context.lineTo(realHalfWidth * 0.95, deckY);
  context.lineTo(realHalfWidth + bowSign * 6, deckY - 3);
  context.lineTo(realHalfWidth, PERISCOPE_HORIZON_Y);
  context.closePath();
  context.fillStyle = '#09141a';
  context.fill();
  context.strokeStyle = snapshot.targetDamageTaken > 0 ? '#ffd166' : '#00ffaa';
  context.lineWidth = 1.6;
  context.stroke();

  drawSuperstructureByClass(context, actualTargetEntry.shipClass, realHalfWidth, deckY, bowSign);
  drawDamageFireAndGeyser(context, snapshot, realHalfWidth, deckY, bowSign);

  const wakeLength = firingContext.targetSpeedKnots * 3.2;
  context.beginPath();
  context.moveTo(bowSign * realHalfWidth, PERISCOPE_HORIZON_Y + 2);
  context.lineTo(bowSign * (realHalfWidth - wakeLength), PERISCOPE_HORIZON_Y + 6);
  context.strokeStyle = '#e0fbfc';
  context.lineWidth = 2;
  context.stroke();

  // Flecha indicadora de dirección de avance sobre la proa para saber hacia qué lado adelantar el tiro
  context.fillStyle = '#4cc9f0';
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillText(bowSign > 0 ? 'AVANCE ►' : '◄ AVANCE', bowSign * (realHalfWidth + 28), deckY - 6);
  context.restore();
}
