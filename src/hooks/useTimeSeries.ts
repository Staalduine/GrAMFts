import { useTimeSeriesStore } from '@/store/timeseries-store'
import { useEffect } from 'react'

/**
 * Hook for managing time-series data for a specific ID
 */
export function useTimeSeries(id: string) {
  const {
    data,
    loading,
    loadTimeSeries,
    saveTimeSeries,
    addTimeSeriesPoint,
    queryTimeSeriesRange,
    getTimeSeries,
    getLatestValue,
    getValueAtTime,
    getTimeRange
  } = useTimeSeriesStore()

  const points = getTimeSeries(id)
  const isLoading = loading[id] || false
  const latestValue = getLatestValue(id)
  const timeRange = getTimeRange(id)

  // Auto-load data when ID changes
  useEffect(() => {
    if (id && !data[id] && !isLoading) {
      loadTimeSeries(id).catch(console.error)
    }
  }, [id])

  return {
    // Data
    points,
    latestValue,
    timeRange,

    // State
    isLoading,

    // Actions
    load: () => loadTimeSeries(id),
    save: (points: any[]) => saveTimeSeries(id, points),
    addPoint: (timestamp: string, value: any) => addTimeSeriesPoint(id, timestamp, value),
    queryRange: (startTime?: string, endTime?: string) => queryTimeSeriesRange(id, startTime, endTime),

    // Computed
    getValueAtTime: (timestamp: string) => getValueAtTime(id, timestamp),
    hasData: points.length > 0
  }
}

/**
 * Hook for managing all time-series data
 */
export function useTimeSeriesManager() {
  const {
    data,
    loading,
    getTimeSeriesIds,
    clearTimeSeries,
    getTimeSeries
  } = useTimeSeriesStore()

  return {
    // All data
    allData: data,

    // State
    loadingStates: loading,

    // Actions
    getIds: getTimeSeriesIds,
    clearAll: clearTimeSeries,

    // Computed
    totalSeries: Object.keys(data).length,
    getSeries: getTimeSeries
  }
}