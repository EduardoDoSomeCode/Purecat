import { useEffect, useRef, useState } from 'react'

export function Header() {
  const titleBarRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === titleBarRef.current || (e.target as HTMLElement).closest('.title-bar')) {
      window.api?.dialog?.openFile?.([])
    }
  }

  return (
    <header className="h-12 bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 flex items-center justify-between px-4 z-10">
      <div
        ref={titleBarRef}
        className="title-bar flex items-center gap-3 -ml-4 cursor-default select-none"
        style={{ width: '100%', height: '36px' }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 ml-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">PureCat</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleFullscreen}
          className="btn-ghost h-9 px-3 text-xs flex items-center gap-1.5"
          title={fullscreen ? 'Exit full window (F11)' : 'Full window (F11)'}
        >
          {fullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
          {fullscreen ? 'Exit Full' : 'Full Window'}
        </button>
      </div>
    </header>
  )
}
