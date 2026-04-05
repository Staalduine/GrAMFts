import { cn } from '@/lib/utils'
import { GraphEditor } from '@/components/GraphEditor'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {children || <GraphEditor />}
    </div>
  )
}
