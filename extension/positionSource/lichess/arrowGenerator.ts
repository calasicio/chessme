import { getOrientation } from './playerColor';
import { squareToSvgCenter } from './squares';

const ARROW_MARGIN = 10 / 64;

const SVG_NS = 'http://www.w3.org/2000/svg';
const OVERLAY_CLASS = 'maia2-overlay';

function getOrCreateOverlay(board: Element): SVGSVGElement {
  const existing = board.querySelector<SVGSVGElement>(`svg.${OVERLAY_CLASS}`);
  if (existing) return existing;

  const doc = board.ownerDocument;
  const overlay = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  overlay.setAttribute('class', OVERLAY_CLASS);
  overlay.setAttribute('viewBox', '-4 -4 8 8');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '100';

  overlay.appendChild(doc.createElementNS(SVG_NS, 'defs'));
  overlay.appendChild(doc.createElementNS(SVG_NS, 'g'));

  board.appendChild(overlay);
  return overlay;
}

function markerId(colorHex: string): string {
  return `maia2-arrowhead-${colorHex.replace('#', '')}`;
}

function ensureMarker(overlay: SVGSVGElement, colorHex: string): string {
  const id = markerId(colorHex);
  const doc = overlay.ownerDocument;
  const defs = overlay.querySelector('defs')!;
  if (defs.querySelector(`#${id}`)) return id;

  const marker = doc.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', id);
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('overflow', 'visible');
  marker.setAttribute('markerWidth', '4');
  marker.setAttribute('markerHeight', '4');
  marker.setAttribute('refX', '2.05');
  marker.setAttribute('refY', '2');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M0,0 V4 L3,2 Z');
  path.setAttribute('fill', colorHex);
  marker.appendChild(path);
  defs.appendChild(marker);
  return id;
}

export function createArrowElement(
  board: Element,
  from: string,
  to: string,
  colorHex: string,
  opacity = 1,
): SVGLineElement {
  const orientation = getOrientation(board);
  const overlay = getOrCreateOverlay(board);
  const markerIdValue = ensureMarker(overlay, colorHex);

  const fromXy = squareToSvgCenter(from, orientation);
  const toXy = squareToSvgCenter(to, orientation);
  const dx = toXy.x - fromXy.x;
  const dy = toXy.y - fromXy.y;
  const angle = Math.atan2(dy, dx);
  const x2 = toXy.x - Math.cos(angle) * ARROW_MARGIN;
  const y2 = toXy.y - Math.sin(angle) * ARROW_MARGIN;

  const line = board.ownerDocument.createElementNS(SVG_NS, 'line') as SVGLineElement;
  line.id = `maia2-arrow-${from}${to}`;
  line.dataset.maiaArrow = from + to;
  line.setAttribute('class', 'maia2-arrow-line');
  line.setAttribute('x1', String(fromXy.x));
  line.setAttribute('y1', String(fromXy.y));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', colorHex);
  line.setAttribute('stroke-width', '0.15625');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('marker-end', `url(#${markerIdValue})`);
  line.setAttribute('opacity', String(opacity));
  return line;
}

export function addArrow(
  board: Element,
  from: string,
  to: string,
  colorHex: string,
  opacity = 1,
): SVGLineElement {
  const overlay = getOrCreateOverlay(board);
  const line = createArrowElement(board, from, to, colorHex, opacity);
  overlay.querySelector('g')!.appendChild(line);
  return line;
}

export function clearOverlay(board: Element): void {
  board.querySelector(`svg.${OVERLAY_CLASS} g`)?.replaceChildren();
}
