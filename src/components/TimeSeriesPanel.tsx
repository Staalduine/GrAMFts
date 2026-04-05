import { useState } from 'react'
import { useTimeSeries } from '@/hooks/useTimeSeries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, TrendingUp, Clock, Database } from 'lucide-react'
import { format } from 'date-fns'

interface TimeSeriesPanelProps {
  elementId: string
  elementType: 'node' | 'edge'
}

/**
 * Panel for viewing and editing time-series data for graph elements
 */
export function TimeSeriesPanel({ elementId, elementType }: TimeSeriesPanelProps) {
  const {
    points,
    latestValue,
    timeRange,
    isLoading,
    addPoint,
    hasData
  } = useTimeSeries(elementId)

  const [newTimestamp, setNewTimestamp] = useState('')
  const [newValue, setNewValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddPoint = async () => {
    if (!newTimestamp || !newValue) return

    setIsAdding(true)
    try {
      // Try to parse the value as JSON, fallback to string
      let parsedValue
      try {
        parsedValue = JSON.parse(newValue)
      } catch {
        parsedValue = newValue
      }

      await addPoint(newTimestamp, parsedValue)
      setNewTimestamp('')
      setNewValue('')
    } catch (error) {
      console.error('Failed to add time series point:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      // Try to parse as ISO date
      const date = new Date(timestamp)
      if (!isNaN(date.getTime())) {
        return format(date, 'PPpp')
      }
    } catch {}
    return timestamp
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Time Series Data
          <Badge variant={elementType === 'node' ? 'default' : 'secondary'}>
            {elementType === 'node' ? 'Node' : 'Edge'}: {elementId}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {hasData && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Data Points</p>
                    <p className="text-2xl font-bold">{points.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Latest Value</p>
                    <p className="text-sm font-mono truncate">
                      {latestValue ? formatValue(latestValue) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Time Range</p>
                    <p className="text-xs">
                      {timeRange
                        ? `${formatTimestamp(timeRange.start)} - ${formatTimestamp(timeRange.end)}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add New Point */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Data Point</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timestamp">Timestamp</Label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={newTimestamp}
                  onChange={(e) => setNewTimestamp(e.target.value)}
                  placeholder="Select timestamp"
                />
              </div>
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter value (JSON or text)"
                />
              </div>
            </div>
            <Button
              onClick={handleAddPoint}
              disabled={!newTimestamp || !newValue || isAdding}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? 'Adding...' : 'Add Data Point'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Points List */}
        {hasData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Points</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {points.map((point, index) => (
                    <div key={`${point.timestamp}-${index}`}>
                      <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {formatTimestamp(point.timestamp)}
                          </p>
                          <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {formatValue(point.value)}
                          </pre>
                        </div>
                      </div>
                      {index < points.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {!hasData && !isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No time-series data available for this {elementType}.</p>
                <p className="text-sm">Add your first data point above.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading time-series data...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}