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
        <div className="activitybar">
          <div className="activity-item active" title="Northwind Blog">
            <span className="avatar" style={{ background: '#3fa7ff' }}>NB</span>
          </div>
          <div className="activity-item" title="Acme Shop">
            <span className="avatar" style={{ background: '#c77dff' }}>AS</span>
          </div>
          <div className="activity-spacer" />
          <div className="activity-item" title="Connect new site">
            <span className="avatar avatar-add">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </div>
        <div className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-header-title">Northwind Blog</span>
            <button type="button" className="icon-btn" title="Open SQL Console">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
          <div className="sidebar-endpoint mono">https://northwind-blog.example.com/api/admin</div>
          <div className="tree">
            <div className="tree-group">
              <div className="tree-row tree-collection">
                <span className="chevron-wrap open">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="folder-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M1.5 3.5a1 1 0 0 1 1-1h3.4l1.2 1.6h6.4a1 1 0 0 1 1 1v7.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="tree-label">Posts</span>
                <span className="tree-count">3</span>
              </div>
              <div className="tree-children">
                <div className="tree-row tree-record active">
                  <span className="doc-icon">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M4 1.5h6l2.5 2.5v10a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="tree-label">Launching Our New Storefront</span>
                </div>
                <div className="tree-row tree-record">
                  <span className="doc-icon">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M4 1.5h6l2.5 2.5v10a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="tree-label">Five Tips for Faster Onboarding</span>
                </div>
                <div className="tree-row tree-record">
                  <span className="doc-icon">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M4 1.5h6l2.5 2.5v10a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="tree-label">Q3 Roadmap Recap</span>
                </div>
              </div>
            </div>
            <div className="tree-group">
              <div className="tree-row tree-collection">
                <span className="chevron-wrap">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="folder-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M1.5 3.5a1 1 0 0 1 1-1h3.4l1.2 1.6h6.4a1 1 0 0 1 1 1v7.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="tree-label">Pages</span>
                <span className="tree-count">2</span>
              </div>
            </div>
            <div className="tree-group">
              <div className="tree-row tree-collection">
                <span className="chevron-wrap">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="folder-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M1.5 3.5a1 1 0 0 1 1-1h3.4l1.2 1.6h6.4a1 1 0 0 1 1 1v7.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="tree-label">Authors</span>
                <span className="tree-count">2</span>
              </div>
            </div>
          </div>
        </div>
        <div className="editor-col">
          <div className="tabbar">
            <div className="tab">
              <span className="doc-icon-sm">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 1.5h6l2.5 2.5v10a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="tab-label">Launching Our New Storefront</span>
              <button type="button" className="tab-close">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="tab active">
              <span className="doc-icon-sm">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </span>
              <span className="tab-label">SQL · Northwind Blog</span>
              <button type="button" className="tab-close">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="console-view">
            <div className="console-toolbar">
              <span className="breadcrumb">Northwind Blog&nbsp;&nbsp;›&nbsp;&nbsp;SQL Console</span>
              <div className="console-toolbar-right">
                <span className="console-hint">Ctrl Enter to run</span>
                <button type="button" className="btn-save enabled">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2.5v11l10-5.5-10-5.5z" fill="currentColor" />
                  </svg>
                  Run
                </button>
              </div>
            </div>
            <div className="console-tables">
              <button type="button" className="table-chip">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                posts
                <span className="table-chip-count">3</span>
              </button>
              <button type="button" className="table-chip">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                pages
                <span className="table-chip-count">2</span>
              </button>
              <button type="button" className="table-chip">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                authors
                <span className="table-chip-count">2</span>
              </button>
            </div>
            <textarea
              className="console-input mono"
              spellCheck={false}
              readOnly
              defaultValue="SELECT * FROM posts LIMIT 50;"
            />
            <div className="console-results">
              <div className="console-placeholder">Run a query to see results here. Click a table above, or try SHOW TABLES;</div>
            </div>
          </div>
          {/* Phase 21/22: editor pane / split panes */}
        </div>
      </div>

      <div className="statusbar">{/* Phase 20: status bar items */}</div>
    </div>
  )
}

export default AppShell
