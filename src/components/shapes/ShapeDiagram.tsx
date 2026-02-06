import type { CrossSection, ShapeType } from '@/types/geometry';

interface ShapeDiagramProps {
  section: CrossSection;
  shapeType: ShapeType;
  params: Record<string, number>;
  width?: number;
  height?: number;
}

/**
 * Renders a dimensioned SVG diagram of the cross section that updates live.
 */
export function ShapeDiagram({ section, params, width = 240, height = 200 }: ShapeDiagramProps) {
  const allPoints = [section.outerBoundary, ...section.holes].flat();
  if (allPoints.length < 3) return null;

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of allPoints) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }

  const shapeW = xMax - xMin;
  const shapeH = yMax - yMin;
  if (shapeW < 1e-6 || shapeH < 1e-6) return null;

  const margin = 40;
  const drawW = width - 2 * margin;
  const drawH = height - 2 * margin;
  const scale = Math.min(drawW / shapeW, drawH / shapeH);

  const transform = (x: number, y: number) => ({
    x: margin + (x - xMin) * scale + (drawW - shapeW * scale) / 2,
    y: height - margin - (y - yMin) * scale - (drawH - shapeH * scale) / 2,
  });

  const outerPath = section.outerBoundary.map((p, i) => {
    const tp = transform(p.x, p.y);
    return `${i === 0 ? 'M' : 'L'}${tp.x},${tp.y}`;
  }).join(' ') + ' Z';

  const holePaths = section.holes.map(hole =>
    hole.map((p, i) => {
      const tp = transform(p.x, p.y);
      return `${i === 0 ? 'M' : 'L'}${tp.x},${tp.y}`;
    }).join(' ') + ' Z'
  );

  // Get primary dimension labels
  const dimLabels = getDimensionLabels(params);

  // Bounding corners in SVG space
  const topRight = transform(xMax, yMax);
  const bottomLeft = transform(xMin, yMin);
  const bottomRight = transform(xMax, yMin);

  return (
    <svg width={width} height={height} className="mx-auto">
      {/* Cross section fill */}
      <path
        d={outerPath}
        fill="var(--color-section-fill)"
        fillOpacity={0.2}
        stroke="var(--color-section-stroke)"
        strokeWidth={1.5}
      />
      {holePaths.map((hp, i) => (
        <path
          key={i}
          d={hp}
          fill="var(--color-background)"
          stroke="var(--color-section-stroke)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      ))}

      {/* Width dimension (bottom) */}
      {dimLabels.width && (
        <>
          <line
            x1={bottomLeft.x} y1={bottomLeft.y + 8}
            x2={bottomRight.x} y2={bottomRight.y + 8}
            stroke="var(--color-muted-foreground)" strokeWidth={0.75}
            markerStart="url(#arrowLeft)" markerEnd="url(#arrowRight)"
          />
          <text
            x={(bottomLeft.x + bottomRight.x) / 2}
            y={bottomLeft.y + 22}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
            fontFamily="monospace"
          >
            {dimLabels.width}
          </text>
        </>
      )}

      {/* Height dimension (right) */}
      {dimLabels.height && (
        <>
          <line
            x1={bottomRight.x + 8} y1={bottomRight.y}
            x2={topRight.x + 8} y2={topRight.y}
            stroke="var(--color-muted-foreground)" strokeWidth={0.75}
            markerStart="url(#arrowDown)" markerEnd="url(#arrowUp)"
          />
          <text
            x={topRight.x + 14}
            y={(topRight.y + bottomRight.y) / 2}
            textAnchor="start"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            fontSize={10}
            fontFamily="monospace"
          >
            {dimLabels.height}
          </text>
        </>
      )}

      {/* Arrow markers */}
      <defs>
        <marker id="arrowRight" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="0.75" />
        </marker>
        <marker id="arrowLeft" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="0.75" />
        </marker>
        <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
          <path d="M0,6 L3,0 L6,6" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="0.75" />
        </marker>
        <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
          <path d="M0,0 L3,6 L6,0" fill="none" stroke="var(--color-muted-foreground)" strokeWidth="0.75" />
        </marker>
      </defs>
    </svg>
  );
}

function getDimensionLabels(params: Record<string, number>): { width?: string; height?: string } {
  // Try to find the primary width and height parameters
  const widthKeys = ['b', 'B', 'bf', 'd', 'D'];
  const heightKeys = ['h', 'H', 'd', 'D'];

  let widthKey: string | undefined;
  let heightKey: string | undefined;

  for (const k of widthKeys) {
    if (params[k] !== undefined) { widthKey = k; break; }
  }
  for (const k of heightKeys) {
    if (params[k] !== undefined) { heightKey = k; break; }
  }

  // Don't use the same key for both
  if (widthKey === heightKey) {
    return { width: widthKey ? `${widthKey}=${params[widthKey].toFixed(3).replace(/\.?0+$/, '')}″` : undefined };
  }

  return {
    width: widthKey ? `${widthKey}=${params[widthKey].toFixed(3).replace(/\.?0+$/, '')}″` : undefined,
    height: heightKey ? `${heightKey}=${params[heightKey].toFixed(3).replace(/\.?0+$/, '')}″` : undefined,
  };
}
