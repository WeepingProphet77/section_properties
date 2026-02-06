import DxfParser from 'dxf-parser';
import type { Point, CrossSection } from '@/types/geometry';

export interface DxfImportResult {
  success: boolean;
  sections: CrossSection[];
  warnings: string[];
  error?: string;
}

interface DxfEntity {
  type: string;
  vertices?: Array<{ x: number; y: number; bulge?: number }>;
  shape?: boolean;
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

interface DxfData {
  entities: DxfEntity[];
}

/**
 * Parse a DXF file string and extract cross-section geometry.
 */
export function parseDxfFile(content: string): DxfImportResult {
  const warnings: string[] = [];

  try {
    const parser = new DxfParser();
    const dxf = parser.parseSync(content) as DxfData | null;

    if (!dxf || !dxf.entities) {
      return { success: false, sections: [], warnings: [], error: 'Failed to parse DXF file. The file may be corrupted or in an unsupported format.' };
    }

    const sections: CrossSection[] = [];
    const polylines: Point[][] = [];

    for (const entity of dxf.entities) {
      if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const vertices = extractPolylineVertices(entity, warnings);
        if (vertices.length >= 3) {
          polylines.push(vertices);
        }
      } else if (entity.type === 'LINE') {
        // Lines are collected but not very useful for cross-sections alone
        warnings.push('LINE entities found. For best results, use closed polylines (LWPOLYLINE) to define cross-section boundaries.');
      } else if (entity.type === 'CIRCLE') {
        if (entity.center && entity.radius) {
          const circleVerts = generateCircleVertices(entity.center.x, entity.center.y, entity.radius, 64);
          polylines.push(circleVerts);
        }
      } else if (entity.type === 'ARC') {
        warnings.push('ARC entity found. Arcs are partially supported — for best results, convert arcs to polylines in your CAD software.');
      }
    }

    if (polylines.length === 0) {
      return {
        success: false,
        sections: [],
        warnings,
        error: 'No closed polylines or circles found in the DXF file. Please ensure your cross-section is drawn using closed polylines.',
      };
    }

    // Sort polylines by area (largest first - assume largest is outer boundary)
    const polylineAreas = polylines.map((p, i) => ({ index: i, area: Math.abs(computeSignedArea(p)) }));
    polylineAreas.sort((a, b) => b.area - a.area);

    // First polyline (largest) is outer boundary, rest are holes
    const outerIdx = polylineAreas[0].index;
    const holeIndices = polylineAreas.slice(1).map(p => p.index);

    sections.push({
      outerBoundary: polylines[outerIdx],
      holes: holeIndices.map(i => polylines[i]),
    });

    if (polylines.length > 1) {
      warnings.push(`Found ${polylines.length} closed regions. The largest is used as the outer boundary; ${polylines.length - 1} smaller region(s) are treated as holes.`);
    }

    return { success: true, sections, warnings };
  } catch (e) {
    return {
      success: false,
      sections: [],
      warnings,
      error: `DXF parsing error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

function extractPolylineVertices(entity: DxfEntity, warnings: string[]): Point[] {
  const vertices: Point[] = [];
  const rawVerts = entity.vertices || [];

  for (let i = 0; i < rawVerts.length; i++) {
    const v = rawVerts[i];
    vertices.push({ x: v.x, y: v.y });

    // Handle bulge (arc segments in polylines)
    if (v.bulge && Math.abs(v.bulge) > 0.001) {
      const nextV = rawVerts[(i + 1) % rawVerts.length];
      if (nextV) {
        const arcPts = bulgeToArcPoints(v.x, v.y, nextV.x, nextV.y, v.bulge, 16);
        // Add intermediate points (skip first and last which are the endpoints)
        for (let j = 1; j < arcPts.length - 1; j++) {
          vertices.push(arcPts[j]);
        }
      }
    }
  }

  // Check if polyline is closed
  if (!entity.shape && vertices.length >= 3) {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
    if (dist > 0.01) {
      warnings.push('Open polyline detected. Automatically closing it by connecting the last vertex to the first.');
      // It's already implicitly closed as a polygon
    }
  }

  return vertices;
}

/**
 * Convert a bulge value between two points into intermediate arc points.
 */
function bulgeToArcPoints(
  x1: number, y1: number,
  x2: number, y2: number,
  bulge: number,
  numSegments: number
): Point[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1e-10) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];

  const sagitta = (dist / 2) * Math.abs(bulge);
  const radius = ((dist / 2) ** 2 + sagitta ** 2) / (2 * sagitta);

  // Midpoint
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Normal to chord
  const nx = -dy / dist;
  const ny = dx / dist;

  // Center of arc
  const sign = bulge > 0 ? 1 : -1;
  const d = radius - sagitta;
  const cx = mx + sign * d * nx;
  const cy = my + sign * d * ny;

  // Angles
  const startAngle = Math.atan2(y1 - cy, x1 - cx);
  const endAngle = Math.atan2(y2 - cy, x2 - cx);

  let sweep = endAngle - startAngle;
  if (bulge > 0 && sweep < 0) sweep += 2 * Math.PI;
  if (bulge < 0 && sweep > 0) sweep -= 2 * Math.PI;

  const points: Point[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const angle = startAngle + t * sweep;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  return points;
}

function generateCircleVertices(cx: number, cy: number, r: number, n: number): Point[] {
  const verts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return verts;
}

function computeSignedArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return area / 2;
}
