import { useState, useCallback, useRef } from 'react';
import type { ShapeType, CrossSection } from '@/types/geometry';
import { shapeTemplates } from '@/utils/shapeTemplates';
import { parseDxfFile } from '@/utils/dxfImport';
import { ShapeDiagram } from '@/components/shapes/ShapeDiagram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Square, Circle, BoxSelect, Minus, CornerDownRight,
  AlignVerticalJustifyStart, Columns2, Upload, AlertTriangle,
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

    // Reset file input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onSectionChange]);

  // Generate current section for the diagram
  const currentSection = isDxfMode ? null : currentTemplate.generateGeometry(params);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shape Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-1.5">
            {shapeTemplates.map(template => (
              <button
                key={template.type}
                onClick={() => handleShapeSelect(template.type)}
                className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors cursor-pointer border ${
                  selectedShape === template.type && !isDxfMode
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-transparent hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title={template.description}
              >
                {shapeIcons[template.type]}
                <span className="text-center leading-tight" style={{ fontSize: '10px' }}>{template.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* DXF Import */}
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import DXF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload .DXF File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf,.dwg"
              className="hidden"
              onChange={handleDxfUpload}
            />
            <p className="text-xs text-muted-foreground">
              DWG files are not yet supported. Please export to DXF from your CAD software.
            </p>
            {dxfError && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{dxfError}</p>
              </div>
            )}
            {dxfWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-eng-orange/10 rounded-md">
                <AlertTriangle className="w-4 h-4 text-eng-orange shrink-0 mt-0.5" />
                <p className="text-xs text-eng-orange">{w}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Parameters (only for template shapes, not DXF) */}
      {!isDxfMode && (
        <Card className="border-0 shadow-none rounded-none flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {currentTemplate.name} Parameters
            </CardTitle>
            <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentTemplate.parameters.map(param => (
                <div key={param.key} className="space-y-1">
                  <Label className="text-xs" htmlFor={`param-${param.key}`}>
                    {param.label} <span className="text-muted-foreground">({param.unit})</span>
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
              <div className="mt-4 pt-3 border-t">
                <ShapeDiagram
                  section={currentSection}
                  shapeType={selectedShape}
                  params={params}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
