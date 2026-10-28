import type {
  TorpedoArcadeStateSnapshot,
  TorpedoShotResolution,
} from '../domain/TorpedoTypes.ts';
import {
  PERISCOPE_HORIZON_Y,
  PERISCOPE_LENS_CENTER_X,
  PIXELS_PER_BEARING_DEGREE,
  renderTargetAndLeadMarker,
} from './PeriscopeTargetRenderer.ts';

// Dibuja la óptica del periscopio, la escala graduada giratoria, la carrera en vivo del torpedo y la telemetría posdisparo

export const PERISCOPE_LENS_CENTER_Y = 245;
export const PERISCOPE_LENS_RADIUS = 205;

function renderBearingScale(
  context: CanvasRenderingContext2D,
  periscopeBearingDeg: number,
): void {
  context.fillStyle = '#63f5c4';
  context.strokeStyle = 'rgba(99, 245, 196, 0.5)';
  context.font = '9px monospace';
  context.textAlign = 'center';

  for (let deg = -35; deg <= 35; deg += 5) {
    const screenX =
      PERISCOPE_LENS_CENTER_X + (deg - periscopeBearingDeg) * PIXELS_PER_BEARING_DEGREE;
    if (screenX < PERISCOPE_LENS_CENTER_X - 180 || screenX > PERISCOPE_LENS_CENTER_X + 180) {
      continue;
    }
    const tickHeight = deg % 10 === 0 ? 10 : 5;
    context.beginPath();
    context.moveTo(screenX, PERISCOPE_HORIZON_Y - tickHeight);
    context.lineTo(screenX, PERISCOPE_HORIZON_Y + tickHeight);
    context.stroke();
    if (deg % 10 === 0) {
      context.fillText(`${deg > 0 ? `+${deg}` : deg}°`, screenX, PERISCOPE_HORIZON_Y + 22);
    }
  }
}

function renderActiveTorpedoWake(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
): void {
  const run = snapshot.activeTorpedoRun;
  if (run === null) {
    return;
  }

  const torpedoScreenX =
    PERISCOPE_LENS_CENTER_X +
    (run.firedBearingDeg - snapshot.periscopeBearingDeg) * PIXELS_PER_BEARING_DEGREE;
  const startY = PERISCOPE_LENS_CENTER_Y + PERISCOPE_LENS_RADIUS;
  const wakeY = startY - run.progress * (startY - PERISCOPE_HORIZON_Y);

  context.beginPath();
  context.moveTo(torpedoScreenX, startY);
  context.lineTo(torpedoScreenX, wakeY);
  context.strokeStyle = '#e0fbfc';
  context.lineWidth = 2.6;
  context.setLineDash([6, 4]);
  context.stroke();
  context.setLineDash([]);

  // Cabeza de burbujas del torpedo acercándose al barco
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(torpedoScreenX, wakeY, 3.5, 0, Math.PI * 2);
  context.fill();

  const remainingNavalSeconds = Math.max(
    0,
    run.realNavalRunSeconds * (1 - run.progress),
  ).toFixed(1);
  context.fillStyle = '#ffd166';
  context.font = 'bold 12px monospace';
  context.textAlign = 'center';
  context.fillText(
    `TORPEDO [${run.tubeId}] EN CARRERA — IMPACTO EN ${remainingNavalSeconds}s`,
    PERISCOPE_LENS_CENTER_X,
    PERISCOPE_LENS_CENTER_Y + 150,
  );
}

function renderShotTelemetryBox(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
  shot: TorpedoShotResolution | null,
): void {
  const { targetDamageTaken, targetMaxHitPoints, firingContext } = snapshot;
  const obliquityDeg = Math.abs(90 - firingContext.targetAngleOnBowDeg);
  const isAngleSafe = obliquityDeg <= firingContext.difficulty.impactAngleToleranceDegrees;

  context.strokeStyle = '#1f544c';
  context.fillStyle = '#061319';
  context.fillRect(20, 482, 610, 144);
  context.strokeRect(20, 482, 610, 144);

  context.textAlign = 'left';
  if (shot === null) {
    context.fillStyle = '#63f5c4';
    context.font = 'bold 12px monospace';
    context.fillText('PUNTERÍA CON ADELANTO EN PERISCOPIO (CLIC EN LENTE, TECLAS A/D O ◄/►)', 34, 504);
    context.font = '11px monospace';
    context.fillStyle = '#a8dadc';
    context.fillText('• Gira el periscopio para situar el hilo central delante de la proa (o sobre ADELANTO TDC).', 34, 526);
    context.fillText('• Impacto directo en el centro del casco (sala de máquinas) o Magnético bajo quilla = 2 DAÑO.', 34, 546);
    context.fillStyle = isAngleSafe ? '#00ffaa' : '#ef476f';
    context.fillText(
      isAngleSafe
        ? `• Geometría de impacto: ÓPTIMA (Oblicuidad ${obliquityDeg}° <= ${firingContext.difficulty.impactAngleToleranceDegrees}° tolerados)`
        : `• ¡AVISO!: Ángulo muy oblicuo (${obliquityDeg}°). Usa espoleta MAGNÉTICA bajo quilla.`,
      34,
      568,
    );
    context.fillStyle = '#ffd166';
    context.fillText(`INTEGRIDAD DEL BLANCO: ${targetMaxHitPoints - targetDamageTaken}/${targetMaxHitPoints} HP`, 34, 602);
    return;
  }

  context.fillStyle = shot.damageInflicted > 0 ? '#00ffaa' : '#ffd166';
  context.font = 'bold 12px monospace';
  context.fillText(
    `INFORME [${shot.firedTubeId}] -> ${shot.outcome} (DAÑO: +${shot.damageInflicted} | TOTAL: ${targetDamageTaken}/${targetMaxHitPoints} | CARRERA: ${shot.torpedoRunSeconds}s)`,
    34,
    506,
  );
  context.font = '11px monospace';
  context.fillStyle = '#e0fbfc';
  context.fillText(`• Desvío longitudinal en cruce : ${shot.longitudinalMissMeters} m (Eslora real: ${shot.actualLengthMeters} m)`, 34, 532);
  context.fillText(`• Cota Torpedo vs Calado Real  : ${shot.inputUsed.torpedoDepthMeters} m vs Calado ${shot.actualDraftMeters} m (${shot.actualShipClass})`, 34, 554);
  context.fillText(`• Velocidad y AOB (Est vs Real): Vel ${shot.inputUsed.estimatedSpeedKnots} vs ${shot.actualSpeedKnots} kn | AOB ${shot.inputUsed.estimatedAobDeg}° vs ${shot.actualAobDeg}°`, 34, 576);
  context.fillStyle = '#8ecae6';
  context.fillText(`• Oblicuidad de impacto: ${shot.impactObliquityDeg}° (Tolerancia: ${firingContext.difficulty.impactAngleToleranceDegrees}°)`, 34, 598);
}

export function renderPeriscopeLensView(
  context: CanvasRenderingContext2D,
  snapshot: TorpedoArcadeStateSnapshot,
): void {
  context.fillStyle = '#030a0e';
  context.fillRect(0, 0, 645, 640);

  context.save();
  context.beginPath();
  context.arc(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y, PERISCOPE_LENS_RADIUS, 0, Math.PI * 2);
  context.clip();

  context.fillStyle = '#09222c';
  context.fillRect(PERISCOPE_LENS_CENTER_X - PERISCOPE_LENS_RADIUS, PERISCOPE_LENS_CENTER_Y - PERISCOPE_LENS_RADIUS, PERISCOPE_LENS_RADIUS * 2, PERISCOPE_LENS_RADIUS * 2);
  context.fillStyle = '#041218';
  context.fillRect(PERISCOPE_LENS_CENTER_X - PERISCOPE_LENS_RADIUS, PERISCOPE_HORIZON_Y, PERISCOPE_LENS_RADIUS * 2, PERISCOPE_LENS_RADIUS * 2);

  renderTargetAndLeadMarker(context, snapshot);
  renderBearingScale(context, snapshot.periscopeBearingDeg);
  renderActiveTorpedoWake(context, snapshot);

  // Hilo central de puntería del periscopio
  context.strokeStyle = 'rgba(0, 255, 170, 0.55)';
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(PERISCOPE_LENS_CENTER_X - PERISCOPE_LENS_RADIUS, PERISCOPE_HORIZON_Y);
  context.lineTo(PERISCOPE_LENS_CENTER_X + PERISCOPE_LENS_RADIUS, PERISCOPE_HORIZON_Y);
  context.moveTo(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y - PERISCOPE_LENS_RADIUS);
  context.lineTo(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y + PERISCOPE_LENS_RADIUS);
  context.stroke();
  context.restore();

  context.beginPath();
  context.arc(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y, PERISCOPE_LENS_RADIUS, 0, Math.PI * 2);
  context.strokeStyle = '#246a5e';
  context.lineWidth = 4;
  context.stroke();

  const bearingText = snapshot.periscopeBearingDeg > 0 ? `+${snapshot.periscopeBearingDeg.toFixed(1)}°` : `${snapshot.periscopeBearingDeg.toFixed(1)}°`;
  context.fillStyle = '#00ffaa';
  context.font = 'bold 12px monospace';
  context.textAlign = 'center';
  context.fillText(
    `DISTANCIA: ${snapshot.firingContext.distanceMeters}m | BANDA: ${snapshot.firingContext.targetBowSide} | GIRO PERISCOPIO: ${bearingText}`,
    PERISCOPE_LENS_CENTER_X,
    24,
  );

  renderShotTelemetryBox(context, snapshot, snapshot.lastShotResolution);
}
