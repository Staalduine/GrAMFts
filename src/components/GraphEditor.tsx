import { useEffect, useRef } from 'react'
import Cytoscape, { type EventObject, type NodeSingular } from 'cytoscape'
import { useGraphStore } from '@/store/graph-store'

export function GraphEditor() {
  const cyRef = useRef<HTMLDivElement>(null)
  const cyInstance = useRef<Cytoscape.Core | null>(null)
  const centrality = useGraphStore(state => state.centrality)
  const setCyInstance = useGraphStore(state => state.setCyInstance)

  const zoomIn = () => {
    if (cyInstance.current) {
      cyInstance.current.zoom(cyInstance.current.zoom() * 1.2)
    }
  }

  const zoomOut = () => {
    if (cyInstance.current) {
      cyInstance.current.zoom(cyInstance.current.zoom() / 1.2)
    }
  }

  const resetCamera = () => {
    if (cyInstance.current) {
      cyInstance.current.fit()
      cyInstance.current.center()
    }
  }

  useEffect(() => {
    if (cyRef.current && !cyInstance.current) {
      // Get computed colors based on current theme
      const root = document.documentElement
      const nodeColor = getComputedStyle(root).getPropertyValue('--foreground').trim() || '#666'
      const edgeColor = getComputedStyle(root).getPropertyValue('--muted-foreground').trim() || '#ccc'
      const backgroundColor = getComputedStyle(root).getPropertyValue('--background').trim() || '#fff'

      cyInstance.current = Cytoscape({
        container: cyRef.current,
        elements: [],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': nodeColor,
              label: 'data(id)',
              'color': '#fff', // White text
              'text-outline-color': '#000', // Black outline
              'text-outline-width': '2px',
              'width': 30,
              'height': 30,
              'font-size': 12,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 3,
              'line-color': edgeColor,
              'target-arrow-color': edgeColor,
              'target-arrow-shape': 'triangle',
            },
          },
          {
            selector: 'core',
            style: {
              'background-color': backgroundColor,
            },
          },
        ],
        layout: {
          name: 'preset',
        },
        // Enable camera controls with increased zoom out
        wheelSensitivity: 0.2,
        minZoom: 0.01, // Allow much more zoom out
        maxZoom: 10,
        // Enable panning
        panningEnabled: true,
        userPanningEnabled: true,
        // Enable box selection
        boxSelectionEnabled: true,
        selectionType: 'single',
      })

      // Set the instance in the store
      setCyInstance(cyInstance.current)

      // Add keyboard shortcuts for camera controls
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!cyInstance.current) return

        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault()
            zoomIn()
            break
          case '-':
            e.preventDefault()
            zoomOut()
            break
          case '0':
            e.preventDefault()
            resetCamera()
            break
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      // Add event listeners for Cytoscape
      // Enable node dragging
      cyInstance.current.on('tap', 'node', function (evt: EventObject) {
        const node = evt.target as NodeSingular
        console.log('tapped node', node.id())
      })

      // Add node on canvas tap
      cyInstance.current.on('tap', function (evt: EventObject) {
        if (evt.target === cyInstance.current) {
          const pos = evt.position
          const id = `node_${Date.now()}`
          cyInstance.current?.add({ data: { id }, position: pos })
        }
      })

      // Cleanup function
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [setCyInstance])

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="flex gap-1 p-4 justify-end">
        <button
          onClick={zoomIn}
          className="px-3 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="px-3 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={resetCamera}
          className="px-3 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
          title="Reset Camera"
        >
          ⟲
        </button>
      </div>
      <div ref={cyRef} className="flex-1 border border-border"></div>
      <pre className="p-4 bg-muted text-muted-foreground text-sm overflow-auto max-h-40 border-t border-border">
        {JSON.stringify(centrality, null, 2)}
      </pre>
    </div>
  )
}
