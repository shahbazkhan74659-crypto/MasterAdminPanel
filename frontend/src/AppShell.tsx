import { useEffect, useState } from 'react'
import './AppShell.css'

// Phase 23 scope boundary: this wiring targets exactly one hardcoded record --
// no picker, no sidebar-tree navigation into it yet (that's Phase 24's job).
// Kept as a single constant so Phase 24 can swap it for real routed params
// without touching the fetch/save/deploy logic below.
const DEMO = { engine: 'postgres', collection: 'posts', id: '1' } as const

type Values = Record<string, unknown>

interface DraftDiffResponse {
  ok: boolean
  live?: Values
  draft?: Values
  hasDraft?: boolean
  error?: string
}

const draftUrl = `/data-api/${DEMO.engine}/${DEMO.collection}/records/${DEMO.id}/draft`
const deployUrl = `/data-api/${DEMO.engine}/${DEMO.collection}/records/${DEMO.id}/deploy`

function AppShell() {
  const [live, setLive] = useState<Values | null>(null)
  const [staged, setStaged] = useState<Values | null>(null)
  const [baseline, setBaseline] = useState<Values | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(draftUrl)
      const body: DraftDiffResponse = await res.json()
      if (!res.ok || !body.ok) {
        setError(body.error ?? `Failed to load record (${res.status})`)
        setLive(null)
        setStaged(null)
        setBaseline(null)
        setHasDraft(false)
        return
      }
      setLive(body.live ?? null)
      setStaged(body.draft ?? null)
      setBaseline(body.draft ?? null)
      setHasDraft(Boolean(body.hasDraft))
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const dirty = staged !== null && baseline !== null && JSON.stringify(staged) !== JSON.stringify(baseline)

  function updateStaged(field: string, value: unknown) {
    setStaged((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  async function handleSave() {
    if (!staged || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(draftUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: staged }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) {
        setError(body.error ?? `Failed to save draft (${res.status})`)
        return
      }
      await refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeploy() {
    if (!hasDraft || deploying) return
    if (!window.confirm('Deploy staged changes to the live database?')) return
    setDeploying(true)
    setError(null)
    try {
      const res = await fetch(deployUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) {
        setError(body.error ?? `Failed to deploy (${res.status})`)
        return
      }
      await refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setDeploying(false)
    }
  }

  const saveEnabled = dirty && !saving
  const deployEnabled = hasDraft && !deploying

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
        <div className="titlebar-center">{/* Phase 24: real breadcrumb path */}</div>
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
            <div className="sidebar-header-actions">
              <button type="button" className="icon-btn" title="Open SQL Console">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button type="button" className="icon-btn" title="Open Split View">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="9" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
            </div>
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
            <div className="tab">
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
            <div className="tab active">
              <span className="doc-icon-sm">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </span>
              <span className="tab-label">Compare · Launching Our New Storefront</span>
              <button type="button" className="tab-close">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="editor-area">
            <div className="editor-toolbar">
              <span className="breadcrumb">Northwind Blog&nbsp;&nbsp;›&nbsp;&nbsp;Posts&nbsp;&nbsp;›&nbsp;&nbsp;Launching Our New Storefront</span>
              <div className="editor-toolbar-right">
                <button type="button" className={`btn-save${saveEnabled ? ' enabled' : ''}`} disabled={!saveEnabled} onClick={handleSave}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h9l3 3v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M4.5 2v4h5V2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className={`btn-deploy${deployEnabled ? ' enabled' : ''}`} disabled={!deployEnabled} onClick={handleDeploy}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5v9M4 6.5l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {deploying ? 'Deploying…' : 'Deploy'}
                </button>
              </div>
            </div>
            {error && <div className="console-error staging-error">{error}</div>}
            {loading ? (
              <div className="console-placeholder">Loading record…</div>
            ) : !live ? (
              <div className="console-placeholder">Record not found.</div>
            ) : (
              <div className="split-view">
                <div className="split-pane">
                  <div className="split-pane-header"><span className="status-env prod">Production</span></div>
                  <div className="editor-form">
                    <div className="field-row">
                      <label className="field-label">Title</label>
                      <input className="input" type="text" value={String(live.title ?? '')} readOnly />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Slug</label>
                      <input className="input" type="text" value={String(live.slug ?? '')} readOnly />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Status</label>
                      <select className="select" value={String(live.status ?? '')} disabled>
                        <option value="draft">draft</option>
                        <option value="scheduled">scheduled</option>
                        <option value="published">published</option>
                      </select>
                    </div>
                    <div className="field-row">
                      <label className="field-label">Excerpt</label>
                      <textarea className="textarea" value={String(live.excerpt ?? '')} readOnly />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Tags</label>
                      <input className="input" type="text" value={String(live.tags ?? '')} readOnly />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Featured</label>
                      <button type="button" className={`toggle${live.featured ? ' on' : ''}`} disabled>
                        <span className="toggle-knob"></span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="split-divider"></div>
                <div className="split-pane">
                  <div className="split-pane-header"><span className="status-env staging">Staging</span></div>
                  <div className="editor-form">
                    <div className="field-row">
                      <label className="field-label">Title</label>
                      <input
                        className="input"
                        type="text"
                        value={String(staged?.title ?? '')}
                        onChange={(e) => updateStaged('title', e.target.value)}
                      />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Slug</label>
                      <input
                        className="input"
                        type="text"
                        value={String(staged?.slug ?? '')}
                        onChange={(e) => updateStaged('slug', e.target.value)}
                      />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Status</label>
                      <select
                        className="select"
                        value={String(staged?.status ?? '')}
                        onChange={(e) => updateStaged('status', e.target.value)}
                      >
                        <option value="draft">draft</option>
                        <option value="scheduled">scheduled</option>
                        <option value="published">published</option>
                      </select>
                    </div>
                    <div className="field-row">
                      <label className="field-label">Excerpt</label>
                      <textarea
                        className="textarea"
                        value={String(staged?.excerpt ?? '')}
                        onChange={(e) => updateStaged('excerpt', e.target.value)}
                      />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Tags</label>
                      <input
                        className="input"
                        type="text"
                        value={String(staged?.tags ?? '')}
                        placeholder="comma,separated,tags"
                        onChange={(e) => updateStaged('tags', e.target.value)}
                      />
                    </div>
                    <div className="field-row">
                      <label className="field-label">Featured</label>
                      <button
                        type="button"
                        className={`toggle${staged?.featured ? ' on' : ''}`}
                        onClick={() => updateStaged('featured', !staged?.featured)}
                      >
                        <span className="toggle-knob"></span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="palette-backdrop">
        <div className="palette">
          <div className="palette-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.3 10.3L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input className="palette-input" type="text" placeholder="Type a command..." readOnly />
          </div>
          <div className="palette-list">
            <div className="palette-item">File: Save Record</div>
            <div className="palette-item">View: Close Editor</div>
            <div className="palette-item">View: Close All Editors</div>
            <div className="palette-item">Site: Connect New Site…</div>
            <div className="palette-item">Site: Toggle Environment (currently Production)</div>
            <div className="palette-item">Site: Switch to Northwind Blog</div>
            <div className="palette-item">Site: Switch to Acme Shop</div>
            <div className="palette-item">SQL: Open Query Console — Northwind Blog</div>
            <div className="palette-item">SQL: Open Query Console — Acme Shop</div>
          </div>
        </div>
      </div>

      <div className="statusbar">
        <div className="status-left">
          <span className="status-item">Northwind Blog</span>
          <button type="button" className="status-env prod">Production</button>
        </div>
        <div className="status-right">
          <span className="status-item">Content Admin API v1</span>
          <span className="status-item status-dot-wrap">
            <span className="status-dot"></span>
            Connected
          </span>
        </div>
      </div>
    </div>
  )
}

export default AppShell
