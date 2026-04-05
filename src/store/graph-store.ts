import { create } from 'zustand'
import { commands } from '@/lib/tauri-bindings'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import type Cytoscape from 'cytoscape'

interface GraphState {
  centrality: Record<string, number>
  cyInstance: Cytoscape.Core | null
  loadGraph: () => Promise<void>
  computeCentrality: () => Promise<void>
  removeSelected: () => void
  setCentrality: (centrality: Record<string, number>) => void
  setCyInstance: (cy: Cytoscape.Core | null) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  centrality: {},
  cyInstance: null,

  async loadGraph() {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: 'GeoJSON', extensions: ['json', 'geojson'] }],
      })
      if (file) {
        const { cyInstance } = get()
        if (!cyInstance) return

        console.log('Loading file:', file)
        const content = await readTextFile(file)
        console.log('File content length:', content.length)
        const data = JSON.parse(content)
        console.log('Parsed data features:', data.features?.length)
        const elements: Cytoscape.ElementDefinition[] = []

        for (const feature of data.features) {
          if (feature.geometry.type === 'Point') {
            const [x, y] = feature.geometry.coordinates
            const id = feature.properties?.id?.toString() || `node_${elements.length}`
            elements.push({ data: { id }, position: { x, y } })
          } else if (feature.geometry.type === 'LineString') {
            const source = feature.properties?.source
            const target = feature.properties?.target
            if (source !== undefined && target !== undefined) {
              elements.push({
                data: { 
                  id: `${source}-${target}`, 
                  source: source.toString(), 
                  target: target.toString(),
                  weight: feature.properties?.weight,
                  width: feature.properties?.width
                },
              })
            }
          }
        }

        console.log('Created elements:', elements.length)
        cyInstance.elements().remove()
        cyInstance.add(elements)
        cyInstance.fit()
        console.log('Graph loaded successfully')
      }
    } catch (error) {
      console.error('Error loading graph:', error)
      alert(`Error loading graph: ${error}`)
    }
  },

  async computeCentrality() {
    const { cyInstance } = get()
    if (!cyInstance) return

    const elements = cyInstance.elements()
    const features = []
    for (const node of elements.nodes()) {
      const pos = node.position()
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pos.x, pos.y] },
        properties: { id: node.id() },
      })
    }
    for (const edge of elements.edges()) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: { 
          source: parseInt(edge.source().id()), 
          target: parseInt(edge.target().id()),
          weight: edge.data('weight'),
          width: edge.data('width')
        },
      })
    }
    const geojson = JSON.stringify({ type: 'FeatureCollection', features })

    try {
      const result = await commands.computeCentrality(geojson)
      if (result.status === 'ok') {
        set({ centrality: result.data as Record<string, number> })
      } else {
        console.error('Failed to compute centrality:', result.error)
      }
    } catch (error) {
      console.error('Error computing centrality:', error)
    }
  },

  removeSelected() {
    const { cyInstance } = get()
    if (cyInstance) {
      const selected = cyInstance.$(':selected')
      selected.remove()
    }
  },

  setCentrality(centrality: Record<string, number>) {
    set({ centrality })
  },

  setCyInstance(cy: Cytoscape.Core | null) {
    set({ cyInstance: cy })
  },
}))