import { create } from 'zustand'
import { commands } from '@/lib/tauri-bindings'

export interface TimeSeriesPoint {
  timestamp: string
  value: any // JSON value
}

interface TimeSeriesState {
  // Data storage
  data: Record<string, TimeSeriesPoint[]>

  // Loading states
  loading: Record<string, boolean>

  // Actions
  loadTimeSeries: (id: string) => Promise<void>
  saveTimeSeries: (id: string, points: TimeSeriesPoint[]) => Promise<void>
  addTimeSeriesPoint: (id: string, timestamp: string, value: any) => Promise<void>
  queryTimeSeriesRange: (
    id: string,
    startTime?: string,
    endTime?: string
  ) => Promise<TimeSeriesPoint[]>
  getTimeSeriesIds: () => Promise<string[]>
  clearTimeSeries: () => Promise<void>

  // Computed getters
  getTimeSeries: (id: string) => TimeSeriesPoint[]
  getLatestValue: (id: string) => any | null
  getValueAtTime: (id: string, timestamp: string) => any | null
  getTimeRange: (id: string) => { start: string; end: string } | null
}

export const useTimeSeriesStore = create<TimeSeriesState>((set, get) => ({
  data: {},
  loading: {},

  async loadTimeSeries(id: string) {
    set(state => ({ loading: { ...state.loading, [id]: true } }))

    try {
      const result = await commands.loadTimeseries(id)
      if (result.status === 'ok') {
        set(state => ({
          data: { ...state.data, [id]: result.data },
          loading: { ...state.loading, [id]: false }
        }))
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error(`Failed to load time series for ${id}:`, error)
      set(state => ({ loading: { ...state.loading, [id]: false } }))
      throw error
    }
  },

  async saveTimeSeries(id: string, points: TimeSeriesPoint[]) {
    set(state => ({ loading: { ...state.loading, [id]: true } }))

    try {
      await commands.saveTimeseries(id, points)
      set(state => ({
        data: { ...state.data, [id]: points },
        loading: { ...state.loading, [id]: false }
      }))
    } catch (error) {
      console.error(`Failed to save time series for ${id}:`, error)
      set(state => ({ loading: { ...state.loading, [id]: false } }))
      throw error
    }
  },

  async addTimeSeriesPoint(id: string, timestamp: string, value: any) {
    try {
      await commands.addTimeseriesPoint(id, timestamp, value)

      // Update local state
      set(state => {
        const currentPoints = state.data[id] || []
        const newPoint: TimeSeriesPoint = { timestamp, value }
        const updatedPoints = [...currentPoints, newPoint].sort(
          (a, b) => a.timestamp.localeCompare(b.timestamp)
        )

        return {
          data: { ...state.data, [id]: updatedPoints }
        }
      })
    } catch (error) {
      console.error(`Failed to add time series point for ${id}:`, error)
      throw error
    }
  },

  async queryTimeSeriesRange(id: string, startTime?: string, endTime?: string) {
    try {
      const result = await commands.queryTimeseriesRange(id, startTime || null, endTime || null)
      if (result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error(`Failed to query time series range for ${id}:`, error)
      throw error
    }
  },

  async getTimeSeriesIds() {
    try {
      const result = await commands.getTimeseriesIds()
      if (result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to get time series IDs:', error)
      throw error
    }
  },

  async clearTimeSeries() {
    try {
      await commands.clearTimeseries()
      set({ data: {}, loading: {} })
    } catch (error) {
      console.error('Failed to clear time series:', error)
      throw error
    }
  },

  // Computed getters
  getTimeSeries(id: string) {
    return get().data[id] || []
  },

  getLatestValue(id: string) {
    const points = get().getTimeSeries(id)
    if (points.length === 0) return null
    return points[points.length - 1]?.value ?? null
  },

  getValueAtTime(id: string, timestamp: string) {
    const points = get().getTimeSeries(id)
    const point = points.find(p => p.timestamp === timestamp)
    return point ? point.value : null
  },

  getTimeRange(id: string) {
    const points = get().getTimeSeries(id)
    if (points.length === 0) return null

    return {
      start: points[0]?.timestamp ?? '',
      end: points[points.length - 1]?.timestamp ?? ''
    }
  }
}))