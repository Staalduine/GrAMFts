import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import Cytoscape from 'cytoscape'
import './App.css'

function App() {
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')
  const [centrality, setCentrality] = useState<Record<string, number>>({})
  const cyRef = useRef<HTMLDivElement>(null)
  const cyInstance = useRef<Cytoscape.Core | null>(null)

  useEffect(() => {
    if (cyRef.current && !cyInstance.current) {
      cyInstance.current = Cytoscape({
        container: cyRef.current,
        elements: [],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#666',
              'label': 'data(id)'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle'
            }
          }
        ],
        layout: {
          name: 'preset'
        }
      })
    }
  }, [])

  async function greet() {
    setGreetMsg(await invoke('greet', { name }))
  }

  async function loadGraph() {
    const file = await open({
      multiple: false,
      filters: [{ name: 'GeoJSON', extensions: ['json', 'geojson'] }]
    })
    if (file && cyInstance.current) {
      const content = await readTextFile(file)
      const data = JSON.parse(content)
      const elements: Cytoscape.ElementDefinition[] = []
      const nodeMap: Record<string, { x: number, y: number }> = {}

      for (const feature of data.features) {
        if (feature.geometry.type === 'Point') {
          const [x, y] = feature.geometry.coordinates
          const id = feature.properties?.id || `node_${elements.length}`
          elements.push({ data: { id }, position: { x, y } })
          nodeMap[id] = { x, y }
        } else if (feature.geometry.type === 'LineString') {
          const from = feature.properties?.from
          const to = feature.properties?.to
          if (from && to) {
            elements.push({ data: { id: `${from}-${to}`, source: from, target: to } })
          }
        }
      }

      cyInstance.current.elements().remove()
      cyInstance.current.add(elements)
      cyInstance.current.fit()
    }
  }

  async function computeCentrality() {
    if (cyInstance.current) {
      const elements = cyInstance.current.elements()
      // Create a simple GeoJSON-like string for backend
      const features = []
      for (const node of elements.nodes()) {
        const pos = node.position()
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pos.x, pos.y] },
          properties: { id: node.id() }
        })
      }
      for (const edge of elements.edges()) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: { from: edge.source().id(), to: edge.target().id() }
        })
      }
      const geojson = JSON.stringify({ type: 'FeatureCollection', features })
      const result = await invoke('compute_centrality', { geojson })
      setCentrality(result as Record<string, number>)
    }
  }

  return (
    <div className="container">
      <h1>Welcome to GrAMFts!</h1>
      <div ref={cyRef} style={{ width: '800px', height: '600px', border: '1px solid black' }}></div>
      <div className="row">
        <button onClick={loadGraph}>Load Graph</button>
        <button onClick={computeCentrality}>Compute Centrality</button>
        <div>
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <button type="button" onClick={() => greet()}>
            Greet
          </button>
        </div>
      </div>
      <p>{greetMsg}</p>
      <pre>{JSON.stringify(centrality, null, 2)}</pre>
    </div>
  )
}

export default App