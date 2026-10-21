import { parseSquareName, squareClassName } from './squares';

const SQ = 12.5;
const TAIL = 4.5;
const HEAD_LEN = 4.5;
const SHAFT_HW = 1.375;
const HEAD_HW = 3.25;

export type Point = readonly [number, number];

export interface ArrowGeometry {
  points: Point[];

  rotationDeg: number;
  mirrored: boolean;
  isKnight: boolean;
  pivot: Point;
}

export function squareCenter(square: string): Point {
  const { file, rank } = parseSquareName(square);
  return [(file - 1) * SQ + SQ / 2, (8 - rank) * SQ + SQ / 2];
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function computeArrowGeometry(from: string, to: string): ArrowGeometry {
  const [cx, cy] = squareCenter(from);
  const [tx, ty] = squareCenter(to);
  const dx = tx - cx;
  const dy = ty - cy;
  const a = Math.abs(dx);
  const b = Math.abs(dy);
  const isKnight = (a === 2 * SQ && b === SQ) || (a === SQ && b === 2 * SQ);

  if (!isKnight) {
    const length = Math.hypot(dx, dy);
    const rotationDeg = round2(normalizeDeg((Math.atan2(-dx, dy) * 180) / Math.PI));
    const points: Point[] = [
      [cx - SHAFT_HW, cy + TAIL],
      [cx - SHAFT_HW, cy + length - HEAD_LEN],
      [cx - HEAD_HW, cy + length - HEAD_LEN],
      [cx, cy + length],
      [cx + HEAD_HW, cy + length - HEAD_LEN],
      [cx + SHAFT_HW, cy + length - HEAD_LEN],
      [cx + SHAFT_HW, cy + TAIL],
    ];
    return { points, rotationDeg, mirrored: false, isKnight: false, pivot: [cx, cy] };
  }

  const longV: Point = a > b ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
  const shortV: Point = a > b ? [0, Math.sign(dy)] : [Math.sign(dx), 0];
  const thetaRad = Math.atan2(-longV[0], longV[1]);
  const localX: Point = [Math.cos(thetaRad), Math.sin(thetaRad)];

  const mirrored = localX[0] * shortV[0] + localX[1] * shortV[1] < 0;

  const Ll = 2 * SQ;
  const Ls = SQ;
  const points: Point[] = [
    [cx - SHAFT_HW, cy + TAIL],
    [cx - SHAFT_HW, cy + Ll + SHAFT_HW],
    [cx + Ls - HEAD_LEN, cy + Ll + SHAFT_HW],
    [cx + Ls - HEAD_LEN, cy + Ll + HEAD_HW],
    [cx + Ls, cy + Ll],
    [cx + Ls - HEAD_LEN, cy + Ll - HEAD_HW],
    [cx + Ls - HEAD_LEN, cy + Ll - SHAFT_HW],
    [cx + SHAFT_HW, cy + Ll - SHAFT_HW],
    [cx + SHAFT_HW, cy + TAIL],
  ];
  const rotationDeg = round2(normalizeDeg((thetaRad * 180) / Math.PI));
  return { points, rotationDeg, mirrored, isKnight: true, pivot: [cx, cy] };
}

export function pointsAttr(points: Point[]): string {
  return points.map(([x, y]) => `${x} ${y}`).join(', ');
}

export function transformAttr(geometry: ArrowGeometry): string {
  const [px, py] = geometry.pivot;
  const base = `rotate(${geometry.rotationDeg} ${px} ${py})`;
  if (!geometry.mirrored) return base;
  return `${base} scale(-1, 1) translate(${-2 * px}, 0)`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createArrowElement(
  doc: Document,
  from: string,
  to: string,
  color = 'rgba(255, 170, 0, 0.8)',
): SVGPolygonElement {
  const geometry = computeArrowGeometry(from, to);
  const poly = doc.createElementNS(SVG_NS, 'polygon') as SVGPolygonElement;
  poly.id = `arrow-${from}${to}`;
  poly.dataset.arrow = from + to;
  poly.setAttribute('class', 'arrow');
  poly.style.fill = color;
  poly.style.opacity = '0.8';
  poly.setAttribute('points', pointsAttr(geometry.points));
  poly.setAttribute('transform', transformAttr(geometry));
  return poly;
}

export function addArrow(
  board: Element,
  from: string,
  to: string,
  color = 'rgba(255, 170, 0, 0.8)',
): SVGPolygonElement {
  const doc = board.ownerDocument;
  let svg = board.querySelector<SVGSVGElement>('svg.arrows');
  if (!svg) {
    svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'arrows');
    board.appendChild(svg);
  }
  const poly = createArrowElement(doc, from, to, color);
  svg.appendChild(poly);
  return poly;
}

export function addHighlight(
  board: Element,
  square: string,
  color = 'rgb(235, 97, 80)',
  opacity = 0.8,
): HTMLDivElement {
  const doc = board.ownerDocument;
  const { file, rank } = parseSquareName(square);
  const el = doc.createElement('div');
  el.className = `highlight ${squareClassName(file, rank)}`;
  el.style.backgroundColor = color;
  el.style.opacity = String(opacity);

  const firstPiece = board.querySelector('.piece');
  board.insertBefore(el, firstPiece);
  return el;
}
