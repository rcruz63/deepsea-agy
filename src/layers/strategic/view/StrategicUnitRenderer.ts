import type {
  AlliedPortDefinition,
  CampaignState,
  NavalBaseDefinition,
  StrategicContactState,
  SubmarineState,
  TheaterDefinition,
} from '../../../core/contracts/index.ts';
import { resolveStrategicVisualRangeHexes } from '../domain/StrategicEnvironmentRules.ts';
import { STRATEGIC_HEX_SIZE, projectStrategicHexCenter } from './StrategicMapRenderer.ts';

// Dibuja bases propias, puertos aliados bloqueados, U-Boot y únicamente los contactos dentro de visibleContactIds

function renderFriendlyBaseMarker(
  context: CanvasRenderingContext2D,
  base: NavalBaseDefinition,
): void {
  const center = projectStrategicHexCenter(base.coordinate);
  context.save();
  context.fillStyle = '#183a37';
  context.strokeStyle = '#0b5345';
  context.lineWidth = 2;
  context.fillRect(center.x - 8, center.y - 8, 16, 16);
  context.strokeRect(center.x - 8, center.y - 8, 16, 16);

  context.fillStyle = '#e8dec8';
  context.font = 'bold 9px monospace';
  context.textAlign = 'center';
  context.fillText('⚓', center.x, center.y + 3);

  context.fillStyle = '#14362b';
  context.font = 'bold 10px Georgia, serif';
  context.fillText(base.name.toUpperCase(), center.x, center.y - 12);
  context.restore();
}

function renderAlliedPortMarker(
  context: CanvasRenderingContext2D,
  port: AlliedPortDefinition,
): void {
  const center = projectStrategicHexCenter(port.coordinate);
  context.save();
  context.beginPath();
  context.arc(center.x, center.y, 8, 0, Math.PI * 2);
  context.fillStyle = 'rgba(155, 34, 38, 0.25)';
  context.fill();
  context.strokeStyle = '#9b2226';
  context.lineWidth = 1.8;
  context.stroke();

  context.fillStyle = '#7f1d1d';
  context.font = 'bold 10px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(`✕ ${port.name.toUpperCase()}`, center.x, center.y - 12);
  context.restore();
}

function renderVisibleMerchantMarker(
  context: CanvasRenderingContext2D,
  contact: StrategicContactState,
  isInterceptable: boolean,
): void {
  if (contact.isSunk || contact.hasReachedDestination) {
    return;
  }
  const center = projectStrategicHexCenter(contact.coordinate);
  context.save();

  if (isInterceptable) {
    context.beginPath();
    context.arc(center.x, center.y, 18, 0, Math.PI * 2);
    context.strokeStyle = '#ae2012';
    context.lineWidth = 2;
    context.setLineDash([3, 3]);
    context.stroke();
    context.setLineDash([]);
  }

  context.beginPath();
  context.moveTo(center.x - 10, center.y);
  context.lineTo(center.x - 3, center.y - 5);
  context.lineTo(center.x + 11, center.y);
  context.lineTo(center.x - 3, center.y + 5);
  context.closePath();
  context.fillStyle = '#b54708';
  context.fill();
  context.strokeStyle = '#3b1d06';
  context.lineWidth = 1.2;
  context.stroke();

  context.fillStyle = '#692306';
  context.font = 'bold 9px monospace';
  context.textAlign = 'center';
  context.fillText('AVISTADO', center.x, center.y - 9);
  context.restore();
}

function renderSubmarineAndVisualHorizon(
  context: CanvasRenderingContext2D,
  submarine: SubmarineState,
  visualRangeHexes: number,
): void {
  const center = projectStrategicHexCenter(submarine.coordinate);
  const hexWidth = Math.sqrt(3) * STRATEGIC_HEX_SIZE;
  context.save();

  if (visualRangeHexes > 0) {
    context.beginPath();
    context.arc(center.x, center.y, visualRangeHexes * hexWidth, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(12, 124, 89, 0.35)';
    context.lineWidth = 1.2;
    context.setLineDash([4, 4]);
    context.stroke();
    context.setLineDash([]);
  }

  const isSubmerged = submarine.stance === 'SUBMERGED';
  context.fillStyle = isSubmerged ? 'rgba(10, 108, 138, 0.35)' : '#12262e';
  context.strokeStyle = isSubmerged ? '#0a6c8a' : '#0c7c59';
  if (isSubmerged) {
    context.setLineDash([3, 2]);
  }

  context.beginPath();
  context.ellipse(center.x, center.y, 13, 5, 0, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 2;
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = '#102a36';
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillText(isSubmerged ? 'U-BOOT (INM.)' : 'U-BOOT', center.x, center.y - 11);
  context.restore();
}

export function renderStrategicUnitsWorld(
  context: CanvasRenderingContext2D,
  campaignState: CampaignState,
  theater: TheaterDefinition,
  interceptableContactId: string | null,
): void {
  for (const base of theater.bases) {
    renderFriendlyBaseMarker(context, base);
  }
  for (const alliedPort of theater.alliedPorts ?? []) {
    renderAlliedPortMarker(context, alliedPort);
  }

  const enforceFog = theater.marineQuadratSpec !== undefined;
  for (const contact of campaignState.contacts) {
    // Impide revelar contactos fuera del horizonte óptico salvo en modo legacy 12x8 sin cuadrícula
    const isVisible =
      !enforceFog || campaignState.visibleContactIds.includes(contact.contactId);
    if (isVisible) {
      renderVisibleMerchantMarker(
        context,
        contact,
        contact.contactId === interceptableContactId,
      );
    }
  }

  const visualRange = resolveStrategicVisualRangeHexes(
    campaignState.submarine.stance,
    campaignState.clock.timeOfDay,
    campaignState.weather,
  );
  renderSubmarineAndVisualHorizon(context, campaignState.submarine, visualRange);
}
