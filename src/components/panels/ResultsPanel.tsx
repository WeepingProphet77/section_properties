import { useCallback } from 'react';
import type { SectionProperties } from '@/types/geometry';
import { Button } from '@/components/ui/button';
import { Copy, FileDown, BarChart3, Target, Maximize2, Move, Activity } from 'lucide-react';

interface ResultsPanelProps {
  properties: SectionProperties | null;
}

function fmt(value: number, decimals = 4): string {
  if (Math.abs(value) < 1e-10) return '0';
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function fmtAngle(radians: number): string {
  const degrees = (radians * 180) / Math.PI;
  return `${degrees.toFixed(2)}°`;
}

interface PropertyRowProps {
  label: string;
  value: string;
  unit: string;
}

function PropertyRow({ label, value, unit }: PropertyRowProps) {
  return (
    <div className="flex justify-between items-baseline py-[3px] group">
      <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      <span className="text-[12px] font-mono font-semibold tabular-nums">
        {value} <span className="text-[10px] text-muted-foreground font-normal">{unit}</span>
      </span>
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  color: string;
}

function SectionHeader({ icon, title, color }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className={`flex items-center justify-center w-5 h-5 rounded ${color}`}>
        {icon}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{title}</span>
    </div>
  );
}

export function ResultsPanel({ properties }: ResultsPanelProps) {
  const copyToClipboard = useCallback(() => {
    if (!properties) return;
    const { elastic: e, plastic: p } = properties;
    const lines = [
      'SECTION PROPERTIES',
      '==================',
      '',
      'ELASTIC PROPERTIES',
      '------------------',
      `Area                = ${fmt(e.area)} in²`,
      `Centroid X (x̄)      = ${fmt(e.centroidX)} in`,
      `Centroid Y (ȳ)      = ${fmt(e.centroidY)} in`,
      '',
      'Moments of Inertia',
      `  Iₓ                = ${fmt(e.Ix)} in⁴`,
      `  Iᵧ                = ${fmt(e.Iy)} in⁴`,
      `  Iₓᵧ               = ${fmt(e.Ixy)} in⁴`,
      '',
      'Principal Moments of Inertia',
      `  I₁ (max)          = ${fmt(e.Ix_principal)} in⁴`,
      `  I₂ (min)          = ${fmt(e.Iy_principal)} in⁴`,
      `  θ                 = ${fmtAngle(e.theta_principal)}`,
      '',
      'Section Moduli',
      `  Sₓ (top)          = ${fmt(e.Sx_top)} in³`,
      `  Sₓ (bot)          = ${fmt(e.Sx_bot)} in³`,
      `  Sᵧ (left)         = ${fmt(e.Sy_left)} in³`,
      `  Sᵧ (right)        = ${fmt(e.Sy_right)} in³`,
      '',
      'Radii of Gyration',
      `  rₓ                = ${fmt(e.rx)} in`,
      `  rᵧ                = ${fmt(e.ry)} in`,
      '',
      'PLASTIC PROPERTIES',
      '------------------',
      `PNA-X (y-coord)     = ${fmt(p.pnaX)} in`,
      `PNA-Y (x-coord)     = ${fmt(p.pnaY)} in`,
      `Zₓ                  = ${fmt(p.Zx)} in³`,
      `Zᵧ                  = ${fmt(p.Zy)} in³`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
  }, [properties]);

  const exportPDF = useCallback(() => {
    if (!properties) return;
    const { elastic: e, plastic: p } = properties;
    const html = `
      <!DOCTYPE html>
      <html><head><title>Section Properties Report</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 40px; font-size: 12px; color: #222; }
        h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 14px; margin-top: 24px; color: #444; }
        table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        td { padding: 3px 8px; }
        td:first-child { width: 200px; color: #666; }
        td:last-child { text-align: right; font-weight: 600; }
        .unit { font-weight: normal; color: #888; font-size: 11px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Section Properties Report</h1>
      <h2>Elastic Properties</h2>
      <table>
        <tr><td>Area</td><td>${fmt(e.area)} <span class="unit">in²</span></td></tr>
        <tr><td>Centroid X (x̄)</td><td>${fmt(e.centroidX)} <span class="unit">in</span></td></tr>
        <tr><td>Centroid Y (ȳ)</td><td>${fmt(e.centroidY)} <span class="unit">in</span></td></tr>
      </table>
      <h2>Moments of Inertia</h2>
      <table>
        <tr><td>Iₓ</td><td>${fmt(e.Ix)} <span class="unit">in⁴</span></td></tr>
        <tr><td>Iᵧ</td><td>${fmt(e.Iy)} <span class="unit">in⁴</span></td></tr>
        <tr><td>Iₓᵧ</td><td>${fmt(e.Ixy)} <span class="unit">in⁴</span></td></tr>
      </table>
      <h2>Principal Moments of Inertia</h2>
      <table>
        <tr><td>I₁ (max)</td><td>${fmt(e.Ix_principal)} <span class="unit">in⁴</span></td></tr>
        <tr><td>I₂ (min)</td><td>${fmt(e.Iy_principal)} <span class="unit">in⁴</span></td></tr>
        <tr><td>θ (principal angle)</td><td>${fmtAngle(e.theta_principal)}</td></tr>
      </table>
      <h2>Section Moduli</h2>
      <table>
        <tr><td>Sₓ (top)</td><td>${fmt(e.Sx_top)} <span class="unit">in³</span></td></tr>
        <tr><td>Sₓ (bot)</td><td>${fmt(e.Sx_bot)} <span class="unit">in³</span></td></tr>
        <tr><td>Sᵧ (left)</td><td>${fmt(e.Sy_left)} <span class="unit">in³</span></td></tr>
        <tr><td>Sᵧ (right)</td><td>${fmt(e.Sy_right)} <span class="unit">in³</span></td></tr>
      </table>
      <h2>Radii of Gyration</h2>
      <table>
        <tr><td>rₓ</td><td>${fmt(e.rx)} <span class="unit">in</span></td></tr>
        <tr><td>rᵧ</td><td>${fmt(e.ry)} <span class="unit">in</span></td></tr>
      </table>
      <h2>Plastic Properties</h2>
      <table>
        <tr><td>PNA-X (y-coordinate)</td><td>${fmt(p.pnaX)} <span class="unit">in</span></td></tr>
        <tr><td>PNA-Y (x-coordinate)</td><td>${fmt(p.pnaY)} <span class="unit">in</span></td></tr>
        <tr><td>Zₓ</td><td>${fmt(p.Zx)} <span class="unit">in³</span></td></tr>
        <tr><td>Zᵧ</td><td>${fmt(p.Zy)} <span class="unit">in³</span></td></tr>
      </table>
      </body></html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  }, [properties]);

  if (!properties) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-3">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground text-center">
          Select a shape or import a DXF file to see calculated properties.
        </p>
      </div>
    );
  }

  const { elastic: e, plastic: p } = properties;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-b">
        <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex-1">
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={exportPDF} className="flex-1">
          <FileDown className="w-3.5 h-3.5 mr-1.5" />
          Print/PDF
        </Button>
      </div>

      {/* Area & Centroid */}
      <SectionHeader
        icon={<Target className="w-3 h-3 text-white" />}
        title="Area & Centroid"
        color="bg-eng-blue"
      />
      <div className="px-4 pb-3">
        <PropertyRow label="Area (A)" value={fmt(e.area)} unit="in²" />
        <PropertyRow label="Centroid x̄" value={fmt(e.centroidX)} unit="in" />
        <PropertyRow label="Centroid ȳ" value={fmt(e.centroidY)} unit="in" />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Moments of Inertia */}
      <SectionHeader
        icon={<Activity className="w-3 h-3 text-white" />}
        title="Moments of Inertia"
        color="bg-eng-purple"
      />
      <div className="px-4 pb-3">
        <PropertyRow label="Iₓ" value={fmt(e.Ix)} unit="in⁴" />
        <PropertyRow label="Iᵧ" value={fmt(e.Iy)} unit="in⁴" />
        <PropertyRow label="Iₓᵧ" value={fmt(e.Ixy)} unit="in⁴" />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Principal Moments */}
      <SectionHeader
        icon={<Move className="w-3 h-3 text-white" />}
        title="Principal Moments"
        color="bg-eng-teal"
      />
      <div className="px-4 pb-3">
        <PropertyRow label="I₁ (max)" value={fmt(e.Ix_principal)} unit="in⁴" />
        <PropertyRow label="I₂ (min)" value={fmt(e.Iy_principal)} unit="in⁴" />
        <PropertyRow label="θ (angle)" value={fmtAngle(e.theta_principal)} unit="" />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Section Moduli */}
      <SectionHeader
        icon={<Maximize2 className="w-3 h-3 text-white" />}
        title="Section Moduli"
        color="bg-eng-green"
      />
      <div className="px-4 pb-3">
        <PropertyRow label="Sₓ (top)" value={fmt(e.Sx_top)} unit="in³" />
        <PropertyRow label="Sₓ (bot)" value={fmt(e.Sx_bot)} unit="in³" />
        <PropertyRow label="Sᵧ (left)" value={fmt(e.Sy_left)} unit="in³" />
        <PropertyRow label="Sᵧ (right)" value={fmt(e.Sy_right)} unit="in³" />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Radii of Gyration */}
      <SectionHeader
        icon={<Target className="w-3 h-3 text-white" />}
        title="Radii of Gyration"
        color="bg-eng-orange"
      />
      <div className="px-4 pb-3">
        <PropertyRow label="rₓ" value={fmt(e.rx)} unit="in" />
        <PropertyRow label="rᵧ" value={fmt(e.ry)} unit="in" />
      </div>

      <div className="h-px bg-border mx-4" />

      {/* Plastic Properties */}
      <SectionHeader
        icon={<BarChart3 className="w-3 h-3 text-white" />}
        title="Plastic Properties"
        color="bg-eng-red"
      />
      <div className="px-4 pb-3">
        <PropertyRow label="PNA-X (y)" value={fmt(p.pnaX)} unit="in" />
        <PropertyRow label="PNA-Y (x)" value={fmt(p.pnaY)} unit="in" />
        <PropertyRow label="Zₓ" value={fmt(p.Zx)} unit="in³" />
        <PropertyRow label="Zᵧ" value={fmt(p.Zy)} unit="in³" />
      </div>
    </div>
  );
}
