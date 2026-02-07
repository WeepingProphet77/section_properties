export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  vertices: Point[];
  isHole: boolean;
}

export interface CrossSection {
  outerBoundary: Point[];
  holes: Point[][];
}

export interface ElasticProperties {
  area: number;
  centroidX: number;
  centroidY: number;
  Ix: number;
  Iy: number;
  Ixy: number;
  Ix_principal: number;
  Iy_principal: number;
  theta_principal: number; // radians
  Sx_top: number;
  Sx_bot: number;
  Sy_left: number;
  Sy_right: number;
  rx: number;
  ry: number;
}

export interface PlasticProperties {
  pnaX: number; // Plastic neutral axis for bending about X (y-coordinate)
  pnaY: number; // Plastic neutral axis for bending about Y (x-coordinate)
  Zx: number;
  Zy: number;
}

export interface SectionProperties {
  elastic: ElasticProperties;
  plastic: PlasticProperties;
}

export type ShapeType =
  | 'rectangle'
  | 'hollow-rectangle'
  | 'circle'
  | 'hollow-circle'
  | 't-shape'
  | 'l-shape'
  | 'c-shape'
  | 'wide-flange'
  | 'double-angle'
  | 'stacked-rectangles'
  | 'sandwich-panel';

export interface ShapeParameter {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface ShapeTemplate {
  type: ShapeType;
  name: string;
  description: string;
  parameters: ShapeParameter[];
  generateGeometry: (params: Record<string, number>) => CrossSection;
}
