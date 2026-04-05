import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUIStore } from '@/store/ui-store'
import { TimeSeriesPanel } from './TimeSeriesPanel'

/**
 * Dialog wrapper for the TimeSeriesPanel
 */
export function TimeSeriesDialog() {
  const timeSeriesOpen = useUIStore(state => state.timeSeriesOpen)
  const selectedElement = useUIStore(state => state.selectedTimeSeriesElement)
  const setTimeSeriesOpen = useUIStore(state => state.setTimeSeriesOpen)

  return (
    <Dialog open={timeSeriesOpen} onOpenChange={setTimeSeriesOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Time Series Data</DialogTitle>
        </DialogHeader>
        {selectedElement && (
          <TimeSeriesPanel
            elementId={selectedElement.id}
            elementType={selectedElement.type}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}