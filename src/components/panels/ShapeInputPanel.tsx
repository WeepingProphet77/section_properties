import { useState, useCallback, useRef } from 'react';
import type { ShapeType, CrossSection } from '@/types/geometry';
import { shapeTemplates } from '@/utils/shapeTemplates';
import { parseDxfFile } from '@/utils/dxfImport';
import { ShapeDiagram } from '@/components/shapes/ShapeDiagram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Square, Circle, BoxSelect, Minus, CornerDownRight,
  AlignVerticalJustifyStart, Columns2, Upload, AlertTriangle,
  Rows2, SlidersHorizontal, Shapes, GalleryVerticalEnd,
} from 'lucide-react';

interface ShapeInputPanelProps {
  onSectionChange: (section: CrossSection | null, shapeType: ShapeType | 'dxf') => void;
}

const shapeIcons: Record<ShapeType, React.ReactNode> = {
  'rectangle': <Square className="w-4 h-4" />,
  'hollow-rectangle': <BoxSelect className="w-4 h-4" />,
  'circle': <Circle className="w-4 h-4" />,
  'hollow-circle': <Circle className="w-4 h-4" />,
  't-shape': <AlignVerticalJustifyStart className="w-4 h-4" />,
  'l-shape': <CornerDownRight className="w-4 h-4" />,
  'c-shape': <Columns2 className="w-4 h-4" />,
  'wide-flange': <Minus className="w-4 h-4" />,
  'double-angle': <Columns2 className="w-4 h-4" />,
  'stacked-rectangles': <Rows2 className="w-4 h-4" />,
  'sandwich-panel': <GalleryVerticalEnd className="w-4 h-4" />,
};

export function ShapeInputPanel({ onSectionChange }: ShapeInputPanelProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('wide-flange');
  const [params, setParams] = useState<Record<string, number>>(() => {
    const template = shapeTemplates.find(t => t.type === 'wide-flange')!;
    const defaults: Record<string, number> = {};
    template.parameters.forEach(p => { defaults[p.key] = p.defaultValue; });
    return defaults;
  });
  const [dxfWarnings, setDxfWarnings] = useState<string[]>([]);
  const [dxfError, setDxfError] = useState<string>('');
  const [isDxfMode, setIsDxfMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTemplate = shapeTemplates.find(t => t.type === selectedShape)!;

  const handleShapeSelect = useCallback((type: ShapeType) => {
    setSelectedShape(type);
    setIsDxfMode(false);
    setDxfWarnings([]);
    setDxfError('');
    const template = shapeTemplates.find(t => t.type === type)!;
    const defaults: Record<string, number> = {};
    template.parameters.forEach(p => { defaults[p.key] = p.defaultValue; });
    setParams(defaults);

    const section = template.generateGeometry(defaults);
    onSectionChange(section, type);
  }, [onSectionChange]);

  const handleParamChange = useCallback((key: string, value: number) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      const section = currentTemplate.generateGeometry(next);
      onSectionChange(section, selectedShape);
      return next;
    });
  }, [currentTemplate, selectedShape, onSectionChange]);

  const handleDxfUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith('.dwg')) {
      setDxfError('DWG files are not yet supported. Please export your drawing to DXF format from your CAD software and try again.');
      setDxfWarnings([]);
      onSectionChange(null, 'dxf');
      return;
    }

    if (!name.endsWith('.dxf')) {
      setDxfError('Please select a .dxf file.');
      setDxfWarnings([]);
      onSectionChange(null, 'dxf');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const result = parseDxfFile(content);
      setDxfWarnings(result.warnings);

      if (result.success && result.sections.length > 0) {
        setDxfError('');
        setIsDxfMode(true);
        onSectionChange(result.sections[0], 'dxf');
      } else {
        setDxfError(result.error || 'Failed to extract geometry from DXF file.');
        onSectionChange(null, 'dxf');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onSectionChange]);

  const currentSection = isDxfMode ? null : currentTemplate.generateGeometry(params);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Shape Templates */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Shapes className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Shape Templates</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {shapeTemplates.map(template => {
            const isActive = selectedShape === template.type && !isDxfMode;
            return (
              <button
                key={template.type}
                onClick={() => handleShapeSelect(template.type)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md text-xs transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-transparent hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title={template.description}
              >
                {shapeIcons[template.type]}
                <span className="text-center leading-tight truncate w-full" style={{ fontSize: '8px' }}>{template.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border mx-4" />

      {/* DXF Import */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-eng-teal" />
          <span className="text-xs font-semibold uppercase tracking-wider text-eng-teal">Import DXF</span>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload .DXF File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dxf,.dwg"
            className="hidden"
            onChange={handleDxfUpload}
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            DWG files are not yet supported. Please export to DXF from your CAD software.
          </p>
          {dxfError && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md border border-destructive/20">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-[11px] text-destructive">{dxfError}</p>
            </div>
          )}
          {dxfWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-eng-orange/10 rounded-md border border-eng-orange/20">
              <AlertTriangle className="w-3.5 h-3.5 text-eng-orange shrink-0 mt-0.5" />
              <p className="text-[11px] text-eng-orange">{w}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Parameters */}
      {!isDxfMode && (
        <div className="p-4 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-4 h-4 text-eng-green" />
            <span className="text-xs font-semibold uppercase tracking-wider text-eng-green">Dimensions</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">{currentTemplate.name} — {currentTemplate.description}</p>

          <div className="space-y-2.5">
            {currentTemplate.parameters.map(param => (
              <div key={param.key} className="space-y-1">
                <Label className="text-xs flex items-baseline justify-between" htmlFor={`param-${param.key}`}>
                  <span>{param.label}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{param.unit}</span>
                </Label>
                <Input
                  id={`param-${param.key}`}
                  type="number"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={params[param.key] ?? param.defaultValue}
                  onChange={e => handleParamChange(param.key, parseFloat(e.target.value) || param.min)}
                  className="h-8 text-sm font-mono"
                />
              </div>
            ))}
          </div>

          {/* Live diagram */}
          {currentSection && (
            <div className="mt-4 pt-3 border-t border-dashed">
              <ShapeDiagram
                section={currentSection}
                shapeType={selectedShape}
                params={params}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
