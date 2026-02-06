import { useState, useCallback, useEffect } from 'react'
import type { CrossSection, ShapeType, SectionProperties } from '@/types/geometry'
import { computeSectionProperties } from '@/utils/sectionCalculations'
import { shapeTemplates } from '@/utils/shapeTemplates'
import { ShapeInputPanel } from '@/components/panels/ShapeInputPanel'
import { Workspace } from '@/components/workspace/Workspace'
import { ResultsPanel } from '@/components/panels/ResultsPanel'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Ruler } from 'lucide-react'

function App() {
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [section, setSection] = useState<CrossSection | null>(null)
  const [properties, setProperties] = useState<SectionProperties | null>(null)

  // Initialize with default shape
  useEffect(() => {
    const defaultTemplate = shapeTemplates.find(t => t.type === 'wide-flange')!
    const defaults: Record<string, number> = {}
    defaultTemplate.parameters.forEach(p => { defaults[p.key] = p.defaultValue })
    const defaultSection = defaultTemplate.generateGeometry(defaults)
    setSection(defaultSection)
    setProperties(computeSectionProperties(defaultSection))
  }, [])

  const handleSectionChange = useCallback((newSection: CrossSection | null, _shapeType: ShapeType | 'dxf') => {
    setSection(newSection)
    if (newSection && newSection.outerBoundary.length >= 3) {
      const props = computeSectionProperties(newSection)
      setProperties(props)
    } else {
      setProperties(null)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0 text-white"
        style={{
          background: 'linear-gradient(135deg, var(--color-header-from), var(--color-header-to))',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
            <Ruler className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-tight">Section Properties Calculator</h1>
            <p className="text-[10px] text-white/60 leading-tight">Elastic & Plastic Analysis</p>
          </div>
          <span className="text-[10px] text-white/50 px-2 py-0.5 rounded-full bg-white/10 ml-1">v1.0</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 hidden sm:block">US Customary Units (in, in², in³, in⁴)</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={toggleDark}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: Shape input */}
        <aside className="w-72 border-r bg-card shrink-0 overflow-hidden flex flex-col">
          <ShapeInputPanel onSectionChange={handleSectionChange} />
        </aside>

        {/* Center: Workspace */}
        <main className="flex-1 min-w-0">
          <Workspace section={section} properties={properties} />
        </main>

        {/* Right panel: Results */}
        <aside className="w-72 border-l bg-card shrink-0 overflow-hidden flex flex-col">
          <ResultsPanel properties={properties} />
        </aside>
      </div>
    </div>
  )
}

export default App
