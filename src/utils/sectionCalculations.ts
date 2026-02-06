import type { Point, CrossSection, ElasticProperties, PlasticProperties, SectionProperties } from '@/types/geometry';

/**
 * Computes the signed area of a simple polygon using the Shoelace formula.
 * Returns positive area for CCW winding, negative for CW.
 */
export function signedPolygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return area / 2;
}

/**
 * Computes the absolute area of a polygon.
 */
export function polygonArea(vertices: Point[]): number {
  return Math.abs(signedPolygonArea(vertices));
}

/**
 * Computes the centroid of a simple polygon.
 */
export function polygonCentroid(vertices: Point[]): Point {
  const n = vertices.length;
  if (n < 3) return { x: 0, y: 0 };
  const A = signedPolygonArea(vertices);
  if (Math.abs(A) < 1e-12) return { x: 0, y: 0 };
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    cx += (vertices[i].x + vertices[j].x) * cross;
    cy += (vertices[i].y + vertices[j].y) * cross;
  }
  cx /= (6 * A);
  cy /= (6 * A);
  return { x: cx, y: cy };
}

/**
 * Computes the second moment of area (moment of inertia) about the x-axis
 * through the origin for a simple polygon.
 * Ix = (1/12) * sum[(y_i^2 + y_i*y_{i+1} + y_{i+1}^2) * (x_i*y_{i+1} - x_{i+1}*y_i)]
 */
export function polygonIxOrigin(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let Ix = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    Ix += (vertices[i].y ** 2 + vertices[i].y * vertices[j].y + vertices[j].y ** 2) * cross;
  }
  return Ix / 12;
}

/**
 * Computes the second moment of area about the y-axis through the origin.
 */
export function polygonIyOrigin(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let Iy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    Iy += (vertices[i].x ** 2 + vertices[i].x * vertices[j].x + vertices[j].x ** 2) * cross;
  }
  return Iy / 12;
}

/**
 * Computes the product of inertia about the origin.
 */
export function polygonIxyOrigin(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  let Ixy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    Ixy += (vertices[i].x * vertices[j].y + 2 * vertices[i].x * vertices[i].y + 2 * vertices[j].x * vertices[j].y + vertices[j].x * vertices[i].y) * cross;
  }
  return Ixy / 24;
}

/**
 * Computes composite elastic properties for a cross section with possible holes.
 */
export function computeElasticProperties(section: CrossSection): ElasticProperties {
  // Ensure CCW winding for outer boundary
  const outer = ensureCCW(section.outerBoundary);
  const holes = section.holes.map(h => ensureCW(h));

  // Compute net area
  const outerArea = polygonArea(outer);
  const holeAreas = holes.map(h => polygonArea(h));
  const area = outerArea - holeAreas.reduce((sum, a) => sum + a, 0);

  if (area < 1e-12) {
    return zeroElasticProps();
  }

  // Compute centroid using first moments
  const outerCentroid = polygonCentroid(outer);
  let Qx = outerArea * outerCentroid.y;
  let Qy = outerArea * outerCentroid.x;

  for (let i = 0; i < holes.length; i++) {
    const hc = polygonCentroid(holes[i]);
    Qx -= holeAreas[i] * hc.y;
    Qy -= holeAreas[i] * hc.x;
  }

  const centroidX = Qy / area;
  const centroidY = Qx / area;

  // Compute moments of inertia about origin using signed formulas
  let IxOrigin = Math.abs(polygonIxOrigin(outer));
  let IyOrigin = Math.abs(polygonIyOrigin(outer));
  let IxyOrigin = polygonIxyOrigin(outer);
  // Take absolute value for outer - the sign depends on winding direction
  // For the signed Ixy, we use the CCW outer value as-is since it accounts for sign

  for (const hole of holes) {
    IxOrigin -= Math.abs(polygonIxOrigin(hole));
    IyOrigin -= Math.abs(polygonIyOrigin(hole));
    IxyOrigin -= polygonIxyOrigin(hole);
  }

  // Parallel axis theorem: I_centroidal = I_origin - A * d^2
  const Ix = IxOrigin - area * centroidY ** 2;
  const Iy = IyOrigin - area * centroidX ** 2;
  const Ixy = IxyOrigin - area * centroidX * centroidY;

  // Principal moments of inertia
  const Iavg = (Ix + Iy) / 2;
  const Idiff = (Ix - Iy) / 2;
  const R = Math.sqrt(Idiff ** 2 + Ixy ** 2);
  const Ix_principal = Iavg + R;
  const Iy_principal = Iavg - R;

  // Principal axis angle (angle from x-axis to major principal axis)
  let theta_principal = 0;
  if (Math.abs(Ixy) > 1e-12) {
    theta_principal = Math.atan2(-Ixy, Idiff) / 2;
  }

  // Extreme fiber distances from centroid
  const allVertices = [outer, ...holes].flat();
  let yMax = -Infinity, yMin = Infinity, xMax = -Infinity, xMin = Infinity;
  for (const v of allVertices) {
    const dy = v.y - centroidY;
    const dx = v.x - centroidX;
    if (dy > yMax) yMax = dy;
    if (dy < yMin) yMin = dy;
    if (dx > xMax) xMax = dx;
    if (dx < xMin) xMin = dx;
  }

  // Section moduli
  const Sx_top = Math.abs(yMax) > 1e-12 ? Ix / Math.abs(yMax) : 0;
  const Sx_bot = Math.abs(yMin) > 1e-12 ? Ix / Math.abs(yMin) : 0;
  const Sy_right = Math.abs(xMax) > 1e-12 ? Iy / Math.abs(xMax) : 0;
  const Sy_left = Math.abs(xMin) > 1e-12 ? Iy / Math.abs(xMin) : 0;

  // Radii of gyration
  const rx = Math.sqrt(Ix / area);
  const ry = Math.sqrt(Iy / area);

  return {
    area,
    centroidX,
    centroidY,
    Ix,
    Iy,
    Ixy,
    Ix_principal,
    Iy_principal,
    theta_principal,
    Sx_top,
    Sx_bot,
    Sy_left,
    Sy_right,
    rx,
    ry,
  };
}

/**
 * Computes plastic section properties using numerical integration.
 * The plastic neutral axis (PNA) divides the section into two equal areas.
 * The plastic section modulus Z = A_top * y_top + A_bot * y_bot
 * where y_top, y_bot are distances from PNA to centroids of each half.
 */
export function computePlasticProperties(section: CrossSection): PlasticProperties {
  const outer = ensureCCW(section.outerBoundary);
  const holes = section.holes.map(h => ensureCW(h));
  const totalArea = computeNetArea(outer, holes);

  if (totalArea < 1e-12) {
    return { pnaX: 0, pnaY: 0, Zx: 0, Zy: 0 };
  }

  // Find bounding box
  const allVerts = [outer, ...holes].flat();
  let yMin = Infinity, yMax = -Infinity, xMin = Infinity, xMax = -Infinity;
  for (const v of allVerts) {
    if (v.y < yMin) yMin = v.y;
    if (v.y > yMax) yMax = v.y;
    if (v.x < xMin) xMin = v.x;
    if (v.x > xMax) xMax = v.x;
  }

  // Find PNA for X-axis bending (horizontal cut)
  const pnaX = findPNA(outer, holes, totalArea, yMin, yMax, 'horizontal');
  const Zx = computePlasticModulus(outer, holes, pnaX, 'horizontal');

  // Find PNA for Y-axis bending (vertical cut)
  const pnaY = findPNA(outer, holes, totalArea, xMin, xMax, 'vertical');
  const Zy = computePlasticModulus(outer, holes, pnaY, 'vertical');

  return { pnaX, pnaY, Zx, Zy };
}

/**
 * Finds the plastic neutral axis using bisection.
 * For horizontal: finds y-coordinate where area above = area below
 * For vertical: finds x-coordinate where area left = area right
 */
function findPNA(
  outer: Point[],
  holes: Point[][],
  totalArea: number,
  minVal: number,
  maxVal: number,
  direction: 'horizontal' | 'vertical'
): number {
  const halfArea = totalArea / 2;
  let lo = minVal;
  let hi = maxVal;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const areaBelow = computeAreaOneSide(outer, holes, mid, direction, 'below');
    if (Math.abs(areaBelow - halfArea) < totalArea * 1e-10) {
      return mid;
    }
    if (areaBelow < halfArea) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Clips a polygon by a horizontal or vertical line and returns the area on one side.
 */
function computeAreaOneSide(
  outer: Point[],
  holes: Point[][],
  cutValue: number,
  direction: 'horizontal' | 'vertical',
  side: 'below' | 'above'
): number {
  const outerClipped = clipPolygon(outer, cutValue, direction, side);
  let area = polygonArea(outerClipped);

  for (const hole of holes) {
    const holeClipped = clipPolygon(hole, cutValue, direction, side);
    area -= polygonArea(holeClipped);
  }

  return area;
}

/**
 * Computes plastic section modulus about a given PNA.
 * Z = |first moment of area above PNA| + |first moment of area below PNA|
 * where first moments are taken about the PNA itself.
 */
function computePlasticModulus(
  outer: Point[],
  holes: Point[][],
  pna: number,
  direction: 'horizontal' | 'vertical'
): number {
  // Get the clipped polygons for each side
  const outerAbove = clipPolygon(outer, pna, direction, 'above');
  const outerBelow = clipPolygon(outer, pna, direction, 'below');

  let momentAbove = firstMomentAboutAxis(outerAbove, pna, direction);
  let momentBelow = firstMomentAboutAxis(outerBelow, pna, direction);

  for (const hole of holes) {
    const holeAbove = clipPolygon(hole, pna, direction, 'above');
    const holeBelow = clipPolygon(hole, pna, direction, 'below');
    momentAbove -= firstMomentAboutAxis(holeAbove, pna, direction);
    momentBelow -= firstMomentAboutAxis(holeBelow, pna, direction);
  }

  return Math.abs(momentAbove) + Math.abs(momentBelow);
}

/**
 * First moment of area of a polygon about a given axis position.
 * For horizontal: Q = A * (centroid_y - axisValue)
 * For vertical: Q = A * (centroid_x - axisValue)
 */
function firstMomentAboutAxis(
  vertices: Point[],
  axisValue: number,
  direction: 'horizontal' | 'vertical'
): number {
  if (vertices.length < 3) return 0;
  const A = polygonArea(vertices);
  const c = polygonCentroid(vertices);
  if (direction === 'horizontal') {
    return A * (c.y - axisValue);
  } else {
    return A * (c.x - axisValue);
  }
}

/**
 * Sutherland-Hodgman polygon clipping against a single edge (horizontal or vertical line).
 */
export function clipPolygon(
  vertices: Point[],
  cutValue: number,
  direction: 'horizontal' | 'vertical',
  keepSide: 'below' | 'above'
): Point[] {
  if (vertices.length < 3) return [];

  const output: Point[] = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % n];

    const currentInside = isInside(current, cutValue, direction, keepSide);
    const nextInside = isInside(next, cutValue, direction, keepSide);

    if (currentInside) {
      output.push(current);
      if (!nextInside) {
        output.push(intersect(current, next, cutValue, direction));
      }
    } else if (nextInside) {
      output.push(intersect(current, next, cutValue, direction));
    }
  }

  return output;
}

function isInside(
  point: Point,
  cutValue: number,
  direction: 'horizontal' | 'vertical',
  keepSide: 'below' | 'above'
): boolean {
  const val = direction === 'horizontal' ? point.y : point.x;
  if (keepSide === 'below') return val <= cutValue;
  return val >= cutValue;
}

function intersect(
  p1: Point,
  p2: Point,
  cutValue: number,
  direction: 'horizontal' | 'vertical'
): Point {
  if (direction === 'horizontal') {
    if (Math.abs(p2.y - p1.y) < 1e-12) return { ...p1 };
    const t = (cutValue - p1.y) / (p2.y - p1.y);
    return { x: p1.x + t * (p2.x - p1.x), y: cutValue };
  } else {
    if (Math.abs(p2.x - p1.x) < 1e-12) return { ...p1 };
    const t = (cutValue - p1.x) / (p2.x - p1.x);
    return { x: cutValue, y: p1.y + t * (p2.y - p1.y) };
  }
}

function computeNetArea(outer: Point[], holes: Point[][]): number {
  let area = polygonArea(outer);
  for (const hole of holes) {
    area -= polygonArea(hole);
  }
  return area;
}

/**
 * Ensures polygon vertices are in counter-clockwise order.
 */
export function ensureCCW(vertices: Point[]): Point[] {
  const area = signedPolygonArea(vertices);
  if (area < 0) return [...vertices].reverse();
  return vertices;
}

/**
 * Ensures polygon vertices are in clockwise order.
 */
export function ensureCW(vertices: Point[]): Point[] {
  const area = signedPolygonArea(vertices);
  if (area > 0) return [...vertices].reverse();
  return vertices;
}

function zeroElasticProps(): ElasticProperties {
  return {
    area: 0, centroidX: 0, centroidY: 0,
    Ix: 0, Iy: 0, Ixy: 0,
    Ix_principal: 0, Iy_principal: 0, theta_principal: 0,
    Sx_top: 0, Sx_bot: 0, Sy_left: 0, Sy_right: 0,
    rx: 0, ry: 0,
  };
}

/**
 * Main entry point: compute all section properties for a given cross section.
 */
export function computeSectionProperties(section: CrossSection): SectionProperties {
  const elastic = computeElasticProperties(section);
  const plastic = computePlasticProperties(section);
  return { elastic, plastic };
}
