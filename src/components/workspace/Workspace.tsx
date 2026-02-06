import { useRef, useState, useCallback, useEffect } from 'react';
import type { CrossSection, SectionProperties } from '@/types/geometry';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, Crosshair, Grid3X3, Axis3D, LocateFixed, RotateCcw } from 'lucide-react';

interface WorkspaceProps {
  section: CrossSection | null;
  properties: SectionProperties | null;
}

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function Workspace({ section, properties }: WorkspaceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showPNA, setShowPNA] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-fit when section changes
  useEffect(() => {
    if (section) fitToSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, containerSize.width, containerSize.height]);

  const fitToSection = useCallback(() => {
    if (!section) return;
    const allPoints = [section.outerBoundary, ...section.holes].flat();
    if (allPoints.length < 3) return;

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of allPoints) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }

    const shapeW = xMax - xMin;
    const shapeH = yMax - yMin;
    if (shapeW < 1e-6 || shapeH < 1e-6) return;

    const padding = 80;
    const scaleX = (containerSize.width - padding * 2) / shapeW;
    const scaleY = (containerSize.height - padding * 2) / shapeH;
    const newScale = Math.min(scaleX, scaleY);

    const centerX = (xMin + xMax) / 2;
    const centerY = (yMin + yMax) / 2;

    setView({
      scale: newScale,
      offsetX: containerSize.width / 2 - centerX * newScale,
      offsetY: containerSize.height / 2 + centerY * newScale,
    });
  }, [section, containerSize]);

  const jumpToCentroid = useCallback(() => {
    if (!properties) return;
    const cx = properties.elastic.centroidX;
    const cy = properties.elastic.centroidY;
    setView(prev => ({
      ...prev,
      offsetX: containerSize.width / 2 - cx * prev.scale,
      offsetY: containerSize.height / 2 + cy * prev.scale,
    }));
  }, [properties, containerSize]);

  const zoom = useCallback((factor: number) => {
    setView(prev => {
      const cx = containerSize.width / 2;
      const cy = containerSize.height / 2;
      const newScale = prev.scale * factor;
      return {
        scale: newScale,
        offsetX: cx - (cx - prev.offsetX) * factor,
        offsetY: cy - (cy - prev.offsetY) * factor,
      };
    });
  }, [containerSize]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setView(prev => {
      const newScale = prev.scale * factor;
      return {
        scale: newScale,
        offsetX: mx - (mx - prev.offsetX) * factor,
        offsetY: my - (my - prev.offsetY) * factor,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - view.offsetX, y: e.clientY - view.offsetY });
    }
  }, [view]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setView(prev => ({
      ...prev,
      offsetX: e.clientX - panStart.x,
      offsetY: e.clientY - panStart.y,
    }));
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Transform a point from section coordinates to SVG coordinates
  const toSVG = (x: number, y: number) => ({
    x: view.offsetX + x * view.scale,
    y: view.offsetY - y * view.scale,
  });

  // Grid calculation
  const gridSpacing = getGridSpacing(view.scale);

  // Viewport bounds in section coordinates
  const sectionXMin = -view.offsetX / view.scale;
  const sectionXMax = (containerSize.width - view.offsetX) / view.scale;
  const sectionYMin = -(containerSize.height - view.offsetY) / view.scale;
  const sectionYMax = view.offsetY / view.scale;

  return (
    <div className="flex flex-col h-full bg-background" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-card">
        <Tooltip content="Zoom In">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoom(1.25)}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Zoom Out">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoom(0.8)}>
            <ZoomOut className="w-4 h-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Fit to View">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToSection}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Jump to Centroid">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={jumpToCentroid} disabled={!properties}>
            <Crosshair className="w-4 h-4" />
          </Button>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip content="Toggle Grid">
          <Toggle pressed={showGrid} onPressedChange={setShowGrid} className="h-8 w-8 p-0">
            <Grid3X3 className="w-4 h-4" />
          </Toggle>
        </Tooltip>
        <Tooltip content="Toggle Axes">
          <Toggle pressed={showAxes} onPressedChange={setShowAxes} className="h-8 w-8 p-0">
            <Axis3D className="w-4 h-4" />
          </Toggle>
        </Tooltip>
        <Tooltip content="Toggle PNA">
          <Toggle pressed={showPNA} onPressedChange={setShowPNA} className="h-8 w-8 p-0">
            <LocateFixed className="w-4 h-4" />
          </Toggle>
        </Tooltip>

        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-mono">
          {(view.scale).toFixed(1)}×
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          width={containerSize.width}
          height={containerSize.height - 40}
          className={`${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          {showGrid && gridSpacing > 0 && (
            <g opacity={0.3}>
              {generateGridLines(sectionXMin, sectionXMax, sectionYMin, sectionYMax, gridSpacing, toSVG, containerSize)}
            </g>
          )}

          {/* Centroidal Axes */}
          {showAxes && properties && (
            <g>
              {/* X-X axis (horizontal through centroid) */}
              <line
                x1={0}
                y1={toSVG(0, properties.elastic.centroidY).y}
                x2={containerSize.width}
                y2={toSVG(0, properties.elastic.centroidY).y}
                stroke="var(--color-eng-axis)"
                strokeWidth={1}
                strokeDasharray="8 4"
                opacity={0.7}
              />
              <text
                x={containerSize.width - 8}
                y={toSVG(0, properties.elastic.centroidY).y - 6}
                textAnchor="end"
                fill="var(--color-eng-axis)"
                fontSize={11}
                fontWeight={600}
              >
                X
              </text>
              {/* Y-Y axis (vertical through centroid) */}
              <line
                x1={toSVG(properties.elastic.centroidX, 0).x}
                y1={0}
                x2={toSVG(properties.elastic.centroidX, 0).x}
                y2={containerSize.height}
                stroke="var(--color-eng-axis)"
                strokeWidth={1}
                strokeDasharray="8 4"
                opacity={0.7}
              />
              <text
                x={toSVG(properties.elastic.centroidX, 0).x + 6}
                y={12}
                textAnchor="start"
                fill="var(--color-eng-axis)"
                fontSize={11}
                fontWeight={600}
              >
                Y
              </text>
              {/* Centroid marker */}
              {(() => {
                const cp = toSVG(properties.elastic.centroidX, properties.elastic.centroidY);
                return (
                  <g>
                    <circle cx={cp.x} cy={cp.y} r={4} fill="var(--color-eng-axis)" />
                    <circle cx={cp.x} cy={cp.y} r={7} fill="none" stroke="var(--color-eng-axis)" strokeWidth={1.5} />
                  </g>
                );
              })()}
            </g>
          )}

          {/* Plastic Neutral Axes */}
          {showPNA && properties && (
            <g>
              {/* PNA for X bending (horizontal line at pnaX y-coordinate) */}
              <line
                x1={0}
                y1={toSVG(0, properties.plastic.pnaX).y}
                x2={containerSize.width}
                y2={toSVG(0, properties.plastic.pnaX).y}
                stroke="var(--color-eng-pna)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <text
                x={8}
                y={toSVG(0, properties.plastic.pnaX).y - 6}
                textAnchor="start"
                fill="var(--color-eng-pna)"
                fontSize={10}
                fontWeight={500}
              >
                PNA-X
              </text>
              {/* PNA for Y bending (vertical line at pnaY x-coordinate) */}
              <line
                x1={toSVG(properties.plastic.pnaY, 0).x}
                y1={0}
                x2={toSVG(properties.plastic.pnaY, 0).x}
                y2={containerSize.height}
                stroke="var(--color-eng-pna)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <text
                x={toSVG(properties.plastic.pnaY, 0).x + 6}
                y={containerSize.height - 8}
                textAnchor="start"
                fill="var(--color-eng-pna)"
                fontSize={10}
                fontWeight={500}
              >
                PNA-Y
              </text>
            </g>
          )}

          {/* Cross Section */}
          {section && (() => {
            const outerPath = section.outerBoundary.map((p, i) => {
              const sp = toSVG(p.x, p.y);
              return `${i === 0 ? 'M' : 'L'}${sp.x},${sp.y}`;
            }).join(' ') + ' Z';

            const holePaths = section.holes.map(hole =>
              hole.map((p, i) => {
                const sp = toSVG(p.x, p.y);
                return `${i === 0 ? 'M' : 'L'}${sp.x},${sp.y}`;
              }).join(' ') + ' Z'
            );

            return (
              <g>
                <path
                  d={outerPath}
                  fill="var(--color-primary)"
                  fillOpacity={0.12}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {holePaths.map((hp, i) => (
                  <path
                    key={i}
                    d={hp}
                    fill="var(--color-background)"
                    stroke="var(--color-primary)"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            );
          })()}

          {/* Empty state */}
          {!section && (
            <text
              x={containerSize.width / 2}
              y={(containerSize.height - 40) / 2}
              textAnchor="middle"
              fill="var(--color-muted-foreground)"
              fontSize={14}
            >
              Select a shape template or import a DXF file
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

function getGridSpacing(scale: number): number {
  // Choose grid spacing so grid lines are ~40-100 px apart
  // Round to nice engineering values
  const niceValues = [0.0625, 0.125, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
  for (const v of niceValues) {
    if (v * scale >= 30) return v;
  }
  return 100;
}

function generateGridLines(
  xMin: number, xMax: number, yMin: number, yMax: number,
  spacing: number,
  toSVG: (x: number, y: number) => { x: number; y: number },
  containerSize: { width: number; height: number }
): React.ReactNode[] {
  const lines: React.ReactNode[] = [];
  const startX = Math.floor(xMin / spacing) * spacing;
  const startY = Math.floor(yMin / spacing) * spacing;

  // Vertical grid lines
  for (let x = startX; x <= xMax; x += spacing) {
    const sx = toSVG(x, 0).x;
    lines.push(
      <line
        key={`gv-${x}`}
        x1={sx} y1={0}
        x2={sx} y2={containerSize.height}
        stroke="var(--color-eng-grid)"
        strokeWidth={0.5}
      />
    );
  }

  // Horizontal grid lines
  for (let y = startY; y <= yMax; y += spacing) {
    const sy = toSVG(0, y).y;
    lines.push(
      <line
        key={`gh-${y}`}
        x1={0} y1={sy}
        x2={containerSize.width} y2={sy}
        stroke="var(--color-eng-grid)"
        strokeWidth={0.5}
      />
    );
  }

  return lines;
}
