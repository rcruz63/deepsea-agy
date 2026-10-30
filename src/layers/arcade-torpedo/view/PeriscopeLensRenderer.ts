import { calculateSignedAngularDeltaDeg, resolveActiveFiringArc } from '../domain/PeriscopeKinematics.ts';
import type { TorpedoArcadeStateSnapshot, TorpedoShotResolution } from '../domain/TorpedoTypes.ts';
import {
  PERISCOPE_HORIZON_Y,
  PERISCOPE_LENS_CENTER_X,
  PIXELS_PER_BEARING_DEGREE,
  renderTargetAndLeadMarker,
} from './PeriscopeTargetRenderer.ts';

// Dibuja la óptica de 360°, los arcos de fuego de proa (verde) y popa (cian), la carrera del torpedo y la telemetría

export const PERISCOPE_LENS_CENTER_Y = 245;
export const PERISCOPE_LENS_RADIUS = 205;

function renderBearingScale(context: CanvasRenderingContext2D, periscopeBearingDeg: number): void {
  context.font = '9px monospace';
  context.textAlign = 'center';

  for (let deg = -180; deg < 180; deg += 5) {
    const deltaDeg = calculateSignedAngularDeltaDeg(periscopeBearingDeg, deg);
    const screenX = PERISCOPE_LENS_CENTER_X + deltaDeg * PIXELS_PER_BEARING_DEGREE;
    if (screenX < PERISCOPE_LENS_CENTER_X - 185 || screenX > PERISCOPE_LENS_CENTER_X + 185) {
      continue;
    }
    const arc = resolveActiveFiringArc(deg);
    const color = arc === 'BOW' ? '#00ffaa' : arc === 'STERN' ? '#4cc9f0' : '#ef476f';
    const tickHeight = deg % 10 === 0 ? 10 : 5;

    context.strokeStyle = color;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(screenX, PERISCOPE_HORIZON_Y - tickHeight);
    context.lineTo(screenX, PERISCOPE_HORIZON_Y + tickHeight);
    context.stroke();
    if (deg % 15 === 0) {
      const label = deg === 0 ? 'PROA 0°' : Math.abs(deg) === 180 ? 'POPA 180°' : `${deg > 0 ? `+${deg}` : deg}°`;
      context.fillText(label, screenX, PERISCOPE_HORIZON_Y + 22);
    }
  }
}

function renderActiveTorpedoWake(context: CanvasRenderingContext2D, snapshot: TorpedoArcadeStateSnapshot): void {
  const run = snapshot.activeTorpedoRun;
  if (run === null) {
    return;
  }

  const deltaDeg = calculateSignedAngularDeltaDeg(snapshot.periscopeBearingDeg, run.firedBearingDeg);
  const torpedoScreenX = PERISCOPE_LENS_CENTER_X + deltaDeg * PIXELS_PER_BEARING_DEGREE;
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

  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(torpedoScreenX, wakeY, 3.5, 0, Math.PI * 2);
  context.fill();

  const remainingNavalSeconds = Math.max(0, run.realNavalRunSeconds * (1 - run.progress)).toFixed(1);
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
  const { targetDamageTaken, targetMaxHitPoints, activeFiringArc } = snapshot;

  context.strokeStyle = '#1f544c';
  context.fillStyle = '#061319';
  context.fillRect(20, 482, 610, 144);
  context.strokeRect(20, 482, 610, 144);

  context.textAlign = 'left';
  if (shot === null) {
    context.fillStyle = '#63f5c4';
    context.font = 'bold 12px monospace';
    context.fillText('ARCOS DE FUEGO DE PROA (±45°) Y POPA (±135°..180°) + TIMÓN', 34, 504);
    context.font = '11px monospace';
    context.fillStyle = '#a8dadc';
    context.fillText('• Sector VERDE (-45°..+45°): Tubos de Proa (BOW-1..4) | Sector CIAN (±135°..180°): Popa (STERN-1).', 34, 526);
    context.fillText('• Si el barco está en zona lateral ROJA, usa TIMÓN BABOR [Q] / ESTRIBOR [E] para virar el submarino.', 34, 546);
    context.fillStyle = activeFiringArc === 'DEAD_ZONE' ? '#ef476f' : '#00ffaa';
    const arcStatusText =
      activeFiringArc === 'BOW'
        ? '• Sector actual: ARCO DE PROA HABILITADO (Tubos BOW-1 a BOW-4 listos)'
        : activeFiringArc === 'STERN'
          ? '• Sector actual: ARCO DE POPA HABILITADO (Tubo trasero STERN-1 listo)'
          : '• ¡FUERA DE ARCO!: Gira el periscopio a Proa/Popa o vira el submarino con Q / E.';
    context.fillText(arcStatusText, 34, 568);
    context.fillStyle = '#ffd166';
    context.fillText(`INTEGRIDAD DEL BLANCO: ${targetMaxHitPoints - targetDamageTaken}/${targetMaxHitPoints} HP`, 34, 602);
    return;
  }

  const shotImpactAngleDeg = 90 - shot.impactObliquityDeg;
  context.fillStyle = shot.damageInflicted > 0 ? '#00ffaa' : '#ffd166';
  context.font = 'bold 12px monospace';
  context.fillText(
    `INFORME [${shot.firedTubeId}] -> ${shot.outcome} (DAÑO: +${shot.damageInflicted} | TOTAL: ${targetDamageTaken}/${targetMaxHitPoints} | CARRERA: ${shot.torpedoRunSeconds}s)`,
    34,
    506,
  );
  context.font = '11px monospace';
  context.fillStyle = '#e0fbfc';
  context.fillText(`• Desvío en el cruce   : ${shot.longitudinalMissMeters} m respecto al centro (Eslora real: ${shot.actualLengthMeters} m)`, 34, 532);
  context.fillText(`• Cota vs Calado Real  : Torpedo a ${shot.inputUsed.torpedoDepthMeters} m | Calado real ${shot.actualDraftMeters} m (${shot.actualShipClass})`, 34, 554);
  context.fillText(`• Velocidad real blanco: ${shot.actualSpeedKnots} nudos | Ángulo de impacto en casco: ${shotImpactAngleDeg}° (90° = perpendicular)`, 34, 576);
  context.fillStyle = '#8ecae6';
  context.fillText(
    shot.longitudinalMissMeters > 0
      ? '• Pista: Si fallas por delante (MISSED_AHEAD), adelanta MENOS grados el periscopio.'
      : '• Pista: Si fallas por popa (MISSED_ASTERN), adelanta MÁS grados delante de la proa.',
    34,
    598,
  );
}

export function renderPeriscopeLensView(context: CanvasRenderingContext2D, snapshot: TorpedoArcadeStateSnapshot): void {
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

  const wireColor =
    snapshot.activeFiringArc === 'BOW' ? 'rgba(0, 255, 170, 0.65)' : snapshot.activeFiringArc === 'STERN' ? 'rgba(76, 201, 240, 0.7)' : 'rgba(239, 71, 111, 0.65)';
  context.strokeStyle = wireColor;
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(PERISCOPE_LENS_CENTER_X - PERISCOPE_LENS_RADIUS, PERISCOPE_HORIZON_Y);
  context.lineTo(PERISCOPE_LENS_CENTER_X + PERISCOPE_LENS_RADIUS, PERISCOPE_HORIZON_Y);
  context.moveTo(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y - PERISCOPE_LENS_RADIUS);
  context.lineTo(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y + PERISCOPE_LENS_RADIUS);
  context.stroke();
  context.restore();

  context.beginPath();
  context.arc(PERISCOPE_LENS_CENTER_X, PERISCOPE_LENS_CENTER_Y, PERISCOPE_LENS_RADIUS, 0, Math.PI * 2);
  context.strokeStyle = snapshot.activeFiringArc === 'DEAD_ZONE' ? '#ef476f' : '#246a5e';
  context.lineWidth = 4;
  context.stroke();

  const bearingText = snapshot.periscopeBearingDeg > 0 ? `+${snapshot.periscopeBearingDeg.toFixed(1)}°` : `${snapshot.periscopeBearingDeg.toFixed(1)}°`;
  const shipPosText = snapshot.targetBearingDeg > 0 ? `+${snapshot.targetBearingDeg.toFixed(1)}°` : `${snapshot.targetBearingDeg.toFixed(1)}°`;
  const arcBadge = snapshot.activeFiringArc === 'BOW' ? 'ARCO PROA' : snapshot.activeFiringArc === 'STERN' ? 'ARCO POPA' : 'ZONA MUERTA';
  context.fillStyle = snapshot.activeFiringArc === 'DEAD_ZONE' ? '#ef476f' : '#00ffaa';
  context.font = 'bold 12px monospace';
  context.textAlign = 'center';
  context.fillText(`DIST: ${snapshot.firingContext.distanceMeters}m | BARCO: ${shipPosText} | LENTE: ${bearingText} [${arcBadge}]`, PERISCOPE_LENS_CENTER_X, 24);

  renderShotTelemetryBox(context, snapshot, snapshot.lastShotResolution);
}
