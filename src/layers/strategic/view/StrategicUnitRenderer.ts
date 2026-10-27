import type {
  CampaignState,
  NavalBaseDefinition,
  StrategicContactState,
  SubmarineState,
} from '../../../core/contracts/index.ts';
import type { AxialCoordinate } from '../../../core/hex/index.ts';
import { projectStrategicHexCenter } from './StrategicMapRenderer.ts';

// Dibuja siluetas vectoriales de alto contraste para bases, mercantes, ruta prevista y submarino sobre la carta náutica

function renderNavalBaseMarker(
  context: CanvasRenderingContext2D,
  base: NavalBaseDefinition,
): void {
  const center = projectStrategicHexCenter(base.coordinate);
  context.save();
  context.strokeStyle = '#63f5c4';
  context.lineWidth = 1.8;
  context.strokeRect(center.x - 7, center.y - 9, 14, 14);

  context.fillStyle = '#63f5c4';
  context.font = 'bold 8px monospace';
  context.textAlign = 'center';
  context.fillText('BASE', center.x, center.y - 13);
  context.restore();
}

function renderMerchantContactMarker(
  context: CanvasRenderingContext2D,
  contact: StrategicContactState,
  isInterceptable: boolean,
): void {
  if (contact.isSunk) {
    return;
  }

  const center = projectStrategicHexCenter(contact.coordinate);
  context.save();

  if (isInterceptable) {
    context.beginPath();
    context.arc(center.x, center.y, 19, 0, Math.PI * 2);
    context.strokeStyle = '#ff4d4d';
    context.lineWidth = 2;
    context.setLineDash([3, 3]);
    context.stroke();
    context.setLineDash([]);
  }

  // Silueta romboidal/casco mercante estilo plotter naval
  context.beginPath();
  context.moveTo(center.x - 10, center.y);
  context.lineTo(center.x - 4, center.y - 5);
  context.lineTo(center.x + 10, center.y);
  context.lineTo(center.x - 4, center.y + 5);
  context.closePath();
  context.fillStyle = '#ff9f1c';
  context.fill();
  context.strokeStyle = '#ffe6a7';
  context.lineWidth = 1.2;
  context.stroke();

  context.fillStyle = '#ffbf69';
  context.font = 'bold 9px monospace';
  context.textAlign = 'center';
  context.fillText('MERCANTE', center.x, center.y - 10);
  context.restore();
}

function renderSubmarineMarker(
  context: CanvasRenderingContext2D,
  submarine: SubmarineState,
): void {
  const center = projectStrategicHexCenter(submarine.coordinate);
  context.save();

  // En inmersión se dibuja silueta punteada cian; en superficie casco sólido verde fósforo brillante
  const isSubmerged = submarine.stance === 'SUBMERGED';
  context.strokeStyle = isSubmerged ? '#4cc9f0' : '#00ffaa';
  context.fillStyle = isSubmerged ? 'rgba(76, 201, 240, 0.25)' : '#00ffaa';
  if (isSubmerged) {
    context.setLineDash([3, 2]);
  }

  context.beginPath();
  context.ellipse(center.x, center.y - 1, 12, 4.5, 0, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 1.8;
  context.stroke();

  // Vela (conning tower) y periscopio
  context.beginPath();
  context.moveTo(center.x - 2, center.y - 5);
  context.lineTo(center.x + 3, center.y - 5);
  context.lineTo(center.x + 1, center.y - 10);
  context.stroke();

  context.setLineDash([]);
  context.fillStyle = '#e0fbfc';
  context.font = 'bold 9px monospace';
  context.textAlign = 'center';
  context.fillText('U-BOAT', center.x, center.y - 12);
  context.restore();
}

export function renderStrategicUnitsAndLegend(
  context: CanvasRenderingContext2D,
  campaignState: CampaignState,
  bases: readonly NavalBaseDefinition[],
  interceptableContactId: string | null,
  selectedDestination: AxialCoordinate | null,
): void {
  for (const base of bases) {
    renderNavalBaseMarker(context, base);
  }

  for (const contact of campaignState.contacts) {
    renderMerchantContactMarker(
      context,
      contact,
      contact.contactId === interceptableContactId,
    );
  }

  renderSubmarineMarker(context, campaignState.submarine);

  // Panel inferior de telemetría y leyenda de carta náutica
  context.strokeStyle = '#1b4d44';
  context.strokeRect(20, 465, 615, 155);
  context.fillStyle = '#07171e';
  context.fillRect(21, 466, 613, 153);

  context.fillStyle = '#63f5c4';
  context.font = 'bold 12px monospace';
  context.textAlign = 'left';
  context.fillText('LEYENDA TÁCTICA Y REGLAS DE NAVEGACIÓN (TURNO = 4 HORAS)', 34, 490);

  context.font = '11px monospace';
  context.fillStyle = '#a8dadc';
  context.fillText(
    '• Trazo Continuo Verde (1 Hex): Crucero normal (SURFACED: -2 Fuel, +20 Bat | SUBMERGED: -15 Bat)',
    34,
    514,
  );
  context.fillStyle = '#ffd166';
  context.fillText(
    '• Trazo Discontinuo Ámbar (2 Hex): Forzar máquina sólo en SUPERFICIE (-5 Fuel, +10 Bat)',
    34,
    536,
  );
  context.fillStyle = '#8ecae6';
  context.fillText(
    '• Mantener Posición (0 Hex): SURFACED (-1 Fuel, +30 Bat) | SUBMERGED acecho (-5 Bat)',
    34,
    558,
  );

  const cursorSummary =
    selectedDestination !== null
      ? `Rumbo marcado hacia hexágono (${selectedDestination.q}, ${selectedDestination.r})`
      : 'Posición actual submarino: (' +
        `${campaignState.submarine.coordinate.q}, ${campaignState.submarine.coordinate.r})`;
  context.fillStyle = '#63f5c4';
  context.fillText(`ESTADO: ${cursorSummary}`, 34, 592);
}
