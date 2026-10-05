interface StatusBarProps {
  videoPath: string | null
  duration: number
}

export function StatusBar({ videoPath, duration }: StatusBarProps) {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
  }

  return (
    <footer className="h-8 bg-dark-900/80 backdrop-blur-sm border-t border-dark-700 flex items-center justify-between px-4 text-xs text-dark-500">
      <div className="flex items-center gap-4">
        {videoPath ? (
          <>
            <span className="truncate max-w-[200px]" title={videoPath}>
              {videoPath.split('/').pop() || videoPath}
            </span>
            <span className="w-px h-4 bg-dark-700" />
            <span>{formatTime(duration)}</span>
          </>
        ) : (
          <span>Ready</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>PureCat v1.0.0</span>
      </div>
    </footer>
  )
}