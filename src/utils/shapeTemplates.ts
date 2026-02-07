import type { ShapeTemplate, CrossSection, Point } from '@/types/geometry';

function circleVertices(cx: number, cy: number, r: number, n = 64): Point[] {
  const verts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return verts;
}

export const shapeTemplates: ShapeTemplate[] = [
  // 1. Rectangle / Solid bar
  {
    type: 'rectangle',
    name: 'Rectangle',
    description: 'Solid rectangular bar',
    parameters: [
      { key: 'b', label: 'Width (b)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 6 },
      { key: 'h', label: 'Height (h)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 8 },
    ],
    generateGeometry: (params): CrossSection => {
      const { b, h } = params;
      return {
        outerBoundary: [
          { x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h },
        ],
        holes: [],
      };
    },
  },

  // 2. Hollow Rectangle / Box (Tube)
  {
    type: 'hollow-rectangle',
    name: 'Hollow Rectangle',
    description: 'Hollow rectangular tube (HSS)',
    parameters: [
      { key: 'B', label: 'Outer Width (B)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 8 },
      { key: 'H', label: 'Outer Height (H)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 10 },
      { key: 't', label: 'Wall Thickness (t)', unit: 'in', min: 0.0625, max: 10, step: 0.0625, defaultValue: 0.5 },
    ],
    generateGeometry: (params): CrossSection => {
      const { B, H, t } = params;
      const tClamped = Math.min(t, Math.min(B, H) / 2 - 0.01);
      return {
        outerBoundary: [
          { x: 0, y: 0 }, { x: B, y: 0 }, { x: B, y: H }, { x: 0, y: H },
        ],
        holes: [[
          { x: tClamped, y: tClamped },
          { x: B - tClamped, y: tClamped },
          { x: B - tClamped, y: H - tClamped },
          { x: tClamped, y: H - tClamped },
        ]],
      };
    },
  },

  // 3. Circle / Solid Round
  {
    type: 'circle',
    name: 'Circle',
    description: 'Solid circular section',
    parameters: [
      { key: 'd', label: 'Diameter (d)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 8 },
    ],
    generateGeometry: (params): CrossSection => {
      const r = params.d / 2;
      return {
        outerBoundary: circleVertices(r, r, r),
        holes: [],
      };
    },
  },

  // 4. Hollow Circle / Pipe
  {
    type: 'hollow-circle',
    name: 'Hollow Circle',
    description: 'Hollow circular pipe section',
    parameters: [
      { key: 'D', label: 'Outer Diameter (D)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 10 },
      { key: 't', label: 'Wall Thickness (t)', unit: 'in', min: 0.0625, max: 10, step: 0.0625, defaultValue: 0.5 },
    ],
    generateGeometry: (params): CrossSection => {
      const R = params.D / 2;
      const tClamped = Math.min(params.t, R - 0.01);
      const r = R - tClamped;
      return {
        outerBoundary: circleVertices(R, R, R),
        holes: [circleVertices(R, R, r)],
      };
    },
  },

  // 5. T-Shape
  {
    type: 't-shape',
    name: 'T-Shape',
    description: 'T-shaped cross section',
    parameters: [
      { key: 'bf', label: 'Flange Width (bf)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 8 },
      { key: 'tf', label: 'Flange Thickness (tf)', unit: 'in', min: 0.1, max: 20, step: 0.0625, defaultValue: 0.75 },
      { key: 'hw', label: 'Web Height (hw)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 8 },
      { key: 'tw', label: 'Web Thickness (tw)', unit: 'in', min: 0.1, max: 20, step: 0.0625, defaultValue: 0.5 },
    ],
    generateGeometry: (params): CrossSection => {
      const { bf, tf, hw, tw } = params;
      const totalH = hw + tf;
      const webLeft = (bf - tw) / 2;
      const webRight = webLeft + tw;
      // CCW outer boundary of T starting bottom-left of web
      return {
        outerBoundary: [
          { x: webLeft, y: 0 },
          { x: webRight, y: 0 },
          { x: webRight, y: hw },
          { x: bf, y: hw },
          { x: bf, y: totalH },
          { x: 0, y: totalH },
          { x: 0, y: hw },
          { x: webLeft, y: hw },
        ],
        holes: [],
      };
    },
  },

  // 6. L-Shape (Angle)
  {
    type: 'l-shape',
    name: 'L-Shape (Angle)',
    description: 'L-shaped angle section',
    parameters: [
      { key: 'b', label: 'Horizontal Leg (b)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 6 },
      { key: 'h', label: 'Vertical Leg (h)', unit: 'in', min: 0.5, max: 100, step: 0.125, defaultValue: 6 },
      { key: 't', label: 'Thickness (t)', unit: 'in', min: 0.1, max: 20, step: 0.0625, defaultValue: 0.5 },
    ],
    generateGeometry: (params): CrossSection => {
      const { b, h, t } = params;
      return {
        outerBoundary: [
          { x: 0, y: 0 },
          { x: b, y: 0 },
          { x: b, y: t },
          { x: t, y: t },
          { x: t, y: h },
          { x: 0, y: h },
        ],
        holes: [],
      };
    },
  },

  // 7. C-Shape (Channel)
  {
    type: 'c-shape',
    name: 'C-Shape (Channel)',
    description: 'Channel section',
    parameters: [
      { key: 'H', label: 'Height (H)', unit: 'in', min: 1, max: 100, step: 0.125, defaultValue: 10 },
      { key: 'bf', label: 'Flange Width (bf)', unit: 'in', min: 0.5, max: 50, step: 0.125, defaultValue: 3 },
      { key: 'tf', label: 'Flange Thickness (tf)', unit: 'in', min: 0.1, max: 10, step: 0.0625, defaultValue: 0.5 },
      { key: 'tw', label: 'Web Thickness (tw)', unit: 'in', min: 0.1, max: 10, step: 0.0625, defaultValue: 0.375 },
    ],
    generateGeometry: (params): CrossSection => {
      const { H, bf, tf, tw } = params;
      return {
        outerBoundary: [
          { x: 0, y: 0 },
          { x: bf, y: 0 },
          { x: bf, y: tf },
          { x: tw, y: tf },
          { x: tw, y: H - tf },
          { x: bf, y: H - tf },
          { x: bf, y: H },
          { x: 0, y: H },
        ],
        holes: [],
      };
    },
  },

  // 8. Wide-Flange / I-Shape
  {
    type: 'wide-flange',
    name: 'Wide Flange (I-Shape)',
    description: 'Wide-flange / I-beam section',
    parameters: [
      { key: 'd', label: 'Total Depth (d)', unit: 'in', min: 2, max: 100, step: 0.125, defaultValue: 12 },
      { key: 'bf', label: 'Flange Width (bf)', unit: 'in', min: 1, max: 50, step: 0.125, defaultValue: 8 },
      { key: 'tf', label: 'Flange Thickness (tf)', unit: 'in', min: 0.1, max: 10, step: 0.0625, defaultValue: 0.75 },
      { key: 'tw', label: 'Web Thickness (tw)', unit: 'in', min: 0.1, max: 10, step: 0.0625, defaultValue: 0.5 },
    ],
    generateGeometry: (params): CrossSection => {
      const { d, bf, tf, tw } = params;
      const webLeft = (bf - tw) / 2;
      const webRight = webLeft + tw;
      // CCW boundary starting from bottom-left
      return {
        outerBoundary: [
          { x: 0, y: 0 },
          { x: bf, y: 0 },
          { x: bf, y: tf },
          { x: webRight, y: tf },
          { x: webRight, y: d - tf },
          { x: bf, y: d - tf },
          { x: bf, y: d },
          { x: 0, y: d },
          { x: 0, y: d - tf },
          { x: webLeft, y: d - tf },
          { x: webLeft, y: tf },
          { x: 0, y: tf },
        ],
        holes: [],
      };
    },
  },

  // 9. Double Angle
  {
    type: 'double-angle',
    name: 'Double Angle',
    description: 'Two angles back-to-back with a gap',
    parameters: [
      { key: 'b', label: 'Horizontal Leg (b)', unit: 'in', min: 0.5, max: 50, step: 0.125, defaultValue: 4 },
      { key: 'h', label: 'Vertical Leg (h)', unit: 'in', min: 0.5, max: 50, step: 0.125, defaultValue: 4 },
      { key: 't', label: 'Thickness (t)', unit: 'in', min: 0.1, max: 10, step: 0.0625, defaultValue: 0.375 },
      { key: 'g', label: 'Gap (g)', unit: 'in', min: 0, max: 10, step: 0.0625, defaultValue: 0.75 },
    ],
    generateGeometry: (params): CrossSection => {
      const { b, h, t, g } = params;
      // Double angle: two L-shapes back-to-back with vertical legs adjacent.
      // Left angle: horizontal leg x=0..b, vertical leg x=b-t..b
      // Gap: x=b..b+g
      // Right angle (mirrored): vertical leg x=b+g..b+g+t, horizontal leg x=b+g..2b+g
      const totalW = 2 * b + g;

      if (g < 0.001) {
        // No gap: trace both angles as one polygon
        return {
          outerBoundary: [
            { x: 0, y: 0 },
            { x: totalW, y: 0 },
            { x: totalW, y: t },
            { x: b + t, y: t },
            { x: b + t, y: h },
            { x: b - t, y: h },
            { x: b - t, y: t },
            { x: 0, y: t },
          ],
          holes: [],
        };
      }

      // With gap: use bounding rectangle with three void holes
      const outerBoundary = [
        { x: 0, y: 0 },
        { x: totalW, y: 0 },
        { x: totalW, y: h },
        { x: 0, y: h },
      ];

      // Void above left horizontal leg, left of left vertical leg
      const hole1 = [
        { x: 0, y: t },
        { x: b - t, y: t },
        { x: b - t, y: h },
        { x: 0, y: h },
      ];

      // Center gap void
      const hole2 = [
        { x: b, y: 0 },
        { x: b + g, y: 0 },
        { x: b + g, y: h },
        { x: b, y: h },
      ];

      // Void above right horizontal leg, right of right vertical leg
      const hole3 = [
        { x: b + g + t, y: t },
        { x: totalW, y: t },
        { x: totalW, y: h },
        { x: b + g + t, y: h },
      ];

      return { outerBoundary, holes: [hole1, hole2, hole3] };
    },
  },

  // 10. Stacked Rectangles (one above the other)
  {
    type: 'stacked-rectangles',
    name: 'Stacked Rectangles',
    description: 'Two rectangles stacked vertically',
    parameters: [
      { key: 'b1', label: 'Bottom Width (b1)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 10 },
      { key: 'h1', label: 'Bottom Height (h1)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 2 },
      { key: 'b2', label: 'Top Width (b2)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 6 },
      { key: 'h2', label: 'Top Height (h2)', unit: 'in', min: 0.1, max: 100, step: 0.125, defaultValue: 8 },
    ],
    generateGeometry: (params): CrossSection => {
      const { b1, h1, b2, h2 } = params;
      // Center both rectangles on the same vertical centerline
      const maxW = Math.max(b1, b2);
      const x1L = (maxW - b1) / 2;
      const x1R = x1L + b1;
      const x2L = (maxW - b2) / 2;
      const x2R = x2L + b2;

      if (Math.abs(b1 - b2) < 0.001) {
        // Same width: just a tall rectangle
        return {
          outerBoundary: [
            { x: x1L, y: 0 },
            { x: x1R, y: 0 },
            { x: x1R, y: h1 + h2 },
            { x: x1L, y: h1 + h2 },
          ],
          holes: [],
        };
      }

      // Step inward or outward at the junction
      return {
        outerBoundary: [
          { x: x1L, y: 0 },
          { x: x1R, y: 0 },
          { x: x1R, y: h1 },
          { x: x2R, y: h1 },
          { x: x2R, y: h1 + h2 },
          { x: x2L, y: h1 + h2 },
          { x: x2L, y: h1 },
          { x: x1L, y: h1 },
        ],
        holes: [],
      };
    },
  },
];
