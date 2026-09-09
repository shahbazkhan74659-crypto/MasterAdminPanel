import './AppShell.css'

function AppShell() {
  return (
    <div className="app">
      <div className="titlebar">
        <div className="titlebar-left">
          <span className="app-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="7" y="7" width="8" height="8" rx="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="app-name">Master Admin Panel</span>
        </div>
        <div className="titlebar-center">{/* Phase 23: real breadcrumb path */}</div>
        <div className="titlebar-right">
          <button type="button" className="btn-chip">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.3 10.3L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>Ctrl K</span>
          </button>
        </div>
      </div>

      <div className="main-row">
        <div className="activitybar">{/* Phase 15: activity bar items */}</div>
        <div className="sidebar">{/* Phase 16: sidebar header + tree */}</div>
        <div className="editor-col">{/* Phases 17/18/21/22: tabs / SQL console / editor pane / split panes */}</div>
      </div>

      <div className="statusbar">{/* Phase 20: status bar items */}</div>
    </div>
  )
}

export default AppShell
