import { useState, useCallback, useEffect } from 'react'
import type { CrossSection, ShapeType, SectionProperties } from '@/types/geometry'
import { computeSectionProperties } from '@/utils/sectionCalculations'
import { shapeTemplates } from '@/utils/shapeTemplates'
import { ShapeInputPanel } from '@/components/panels/ShapeInputPanel'
import { Workspace } from '@/components/workspace/Workspace'
import { ResultsPanel } from '@/components/panels/ResultsPanel'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

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
      <header className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight">Section Properties Calculator</h1>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">US Customary Units</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleDark}>
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
