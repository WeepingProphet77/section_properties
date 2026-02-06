import { describe, it, expect } from 'vitest';
import {
  polygonArea,
  polygonCentroid,
  computeElasticProperties,
  computePlasticProperties,
  computeSectionProperties,
  clipPolygon,
} from './sectionCalculations';
import type { CrossSection } from '@/types/geometry';

// Helper: create a rectangle as CCW polygon from (x0,y0) to (x1,y1)
function makeRect(x0: number, y0: number, x1: number, y1: number) {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

describe('polygonArea', () => {
  it('computes area of a unit square', () => {
    const sq = makeRect(0, 0, 1, 1);
    expect(polygonArea(sq)).toBeCloseTo(1, 10);
  });

  it('computes area of a 6x4 rectangle', () => {
    const rect = makeRect(0, 0, 6, 4);
    expect(polygonArea(rect)).toBeCloseTo(24, 10);
  });

  it('computes area of a triangle', () => {
    const tri = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }];
    expect(polygonArea(tri)).toBeCloseTo(6, 10);
  });
});

describe('polygonCentroid', () => {
  it('centroid of a rectangle at origin', () => {
    const rect = makeRect(0, 0, 6, 4);
    const c = polygonCentroid(rect);
    expect(c.x).toBeCloseTo(3, 10);
    expect(c.y).toBeCloseTo(2, 10);
  });

  it('centroid of a symmetric square', () => {
    const sq = makeRect(-1, -1, 1, 1);
    const c = polygonCentroid(sq);
    expect(c.x).toBeCloseTo(0, 10);
    expect(c.y).toBeCloseTo(0, 10);
  });
});

describe('computeElasticProperties', () => {
  it('computes correct properties for a 10x8 rectangle', () => {
    // 10 wide (x), 8 tall (y), origin at lower-left
    const section: CrossSection = {
      outerBoundary: makeRect(0, 0, 10, 8),
      holes: [],
    };
    const props = computeElasticProperties(section);

    expect(props.area).toBeCloseTo(80, 6);
    expect(props.centroidX).toBeCloseTo(5, 6);
    expect(props.centroidY).toBeCloseTo(4, 6);
    // Ix = bh^3/12 = 10*8^3/12 = 426.667
    expect(props.Ix).toBeCloseTo(426.6667, 2);
    // Iy = hb^3/12 = 8*10^3/12 = 666.667
    expect(props.Iy).toBeCloseTo(666.6667, 2);
    // Ixy = 0 for symmetric section about centroid
    expect(props.Ixy).toBeCloseTo(0, 4);
    // Sx_top = Ix / (h/2) = 426.667 / 4 = 106.667
    expect(props.Sx_top).toBeCloseTo(106.6667, 2);
    expect(props.Sx_bot).toBeCloseTo(106.6667, 2);
    // Sy_left = Iy / (b/2) = 666.667 / 5 = 133.333
    expect(props.Sy_left).toBeCloseTo(133.3333, 2);
    expect(props.Sy_right).toBeCloseTo(133.3333, 2);
    // rx = sqrt(Ix/A) = sqrt(426.667/80) = sqrt(5.333) = 2.309
    expect(props.rx).toBeCloseTo(Math.sqrt(426.6667 / 80), 4);
    expect(props.ry).toBeCloseTo(Math.sqrt(666.6667 / 80), 4);
  });

  it('computes correct properties for a hollow rectangle (HSS)', () => {
    // Outer: 10x8, Inner: 9x7 (0.5 in walls), centered
    const section: CrossSection = {
      outerBoundary: makeRect(0, 0, 10, 8),
      holes: [makeRect(0.5, 0.5, 9.5, 7.5)],
    };
    const props = computeElasticProperties(section);

    // Area = 10*8 - 9*7 = 80 - 63 = 17
    expect(props.area).toBeCloseTo(17, 6);
    expect(props.centroidX).toBeCloseTo(5, 4);
    expect(props.centroidY).toBeCloseTo(4, 4);
    // Ix = 10*8^3/12 - 9*7^3/12 = 426.667 - 257.25 = 169.417
    expect(props.Ix).toBeCloseTo(426.6667 - 257.25, 1);
    // Iy = 8*10^3/12 - 7*9^3/12 = 666.667 - 425.25 = 241.417
    expect(props.Iy).toBeCloseTo(666.6667 - 425.25, 1);
  });

  it('computes correct properties for a circle approximation', () => {
    // Approximate circle with 360 segments, radius 5, centered at (5,5)
    const r = 5;
    const cx = 5, cy = 5;
    const n = 360;
    const verts = [];
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    const section: CrossSection = { outerBoundary: verts, holes: [] };
    const props = computeElasticProperties(section);

    const expectedArea = Math.PI * r ** 2;
    expect(props.area).toBeCloseTo(expectedArea, 1);
    expect(props.centroidX).toBeCloseTo(5, 2);
    expect(props.centroidY).toBeCloseTo(5, 2);
    // Ix = pi*r^4/4 = pi*625/4
    expect(props.Ix).toBeCloseTo(Math.PI * r ** 4 / 4, 0);
  });

  it('handles principal axes for symmetric sections', () => {
    const section: CrossSection = {
      outerBoundary: makeRect(0, 0, 6, 4),
      holes: [],
    };
    const props = computeElasticProperties(section);
    // For a rectangle, principal axes align with x,y, so theta ≈ 0
    expect(Math.abs(props.theta_principal)).toBeLessThan(0.01);
    // Principal moments should equal Ix and Iy (already principal)
    expect(props.Ix_principal).toBeCloseTo(Math.max(props.Ix, props.Iy), 4);
    expect(props.Iy_principal).toBeCloseTo(Math.min(props.Ix, props.Iy), 4);
  });
});

describe('computePlasticProperties', () => {
  it('computes correct Zx and Zy for a rectangle', () => {
    // For a rectangle: Zx = bh^2/4, Zy = hb^2/4
    const b = 10, h = 8;
    const section: CrossSection = {
      outerBoundary: makeRect(0, 0, b, h),
      holes: [],
    };
    const props = computePlasticProperties(section);

    // PNA for x-axis bending should be at y = h/2 = 4
    expect(props.pnaX).toBeCloseTo(h / 2, 4);
    // PNA for y-axis bending should be at x = b/2 = 5
    expect(props.pnaY).toBeCloseTo(b / 2, 4);
    // Zx = bh^2/4 = 10*64/4 = 160
    expect(props.Zx).toBeCloseTo(b * h ** 2 / 4, 2);
    // Zy = hb^2/4 = 8*100/4 = 200
    expect(props.Zy).toBeCloseTo(h * b ** 2 / 4, 2);
  });

  it('PNA splits area equally for a symmetric hollow rectangle', () => {
    const section: CrossSection = {
      outerBoundary: makeRect(0, 0, 10, 8),
      holes: [makeRect(0.5, 0.5, 9.5, 7.5)],
    };
    const props = computePlasticProperties(section);
    // PNA should be at midheight for symmetric section
    expect(props.pnaX).toBeCloseTo(4, 3);
    expect(props.pnaY).toBeCloseTo(5, 3);
  });
});

describe('computeSectionProperties', () => {
  it('returns both elastic and plastic properties', () => {
    const section: CrossSection = {
      outerBoundary: makeRect(0, 0, 6, 4),
      holes: [],
    };
    const result = computeSectionProperties(section);
    expect(result.elastic).toBeDefined();
    expect(result.plastic).toBeDefined();
    expect(result.elastic.area).toBeCloseTo(24, 6);
    expect(result.plastic.Zx).toBeCloseTo(6 * 16 / 4, 2); // bh^2/4
  });
});

describe('clipPolygon', () => {
  it('clips a rectangle horizontally', () => {
    const rect = makeRect(0, 0, 10, 8);
    const below = clipPolygon(rect, 4, 'horizontal', 'below');
    expect(polygonArea(below)).toBeCloseTo(40, 6); // 10 * 4
    const above = clipPolygon(rect, 4, 'horizontal', 'above');
    expect(polygonArea(above)).toBeCloseTo(40, 6);
  });

  it('clips a rectangle vertically', () => {
    const rect = makeRect(0, 0, 10, 8);
    const left = clipPolygon(rect, 5, 'vertical', 'below');
    expect(polygonArea(left)).toBeCloseTo(40, 6); // 5 * 8
    const right = clipPolygon(rect, 5, 'vertical', 'above');
    expect(polygonArea(right)).toBeCloseTo(40, 6);
  });
});
