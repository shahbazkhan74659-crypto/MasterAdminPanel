import { useEffect, useRef, useState } from 'react'
import './AppShell.css'
import { renderFieldInput } from './editorFields'
import type { CollectionSchema, Values } from './schemaTypes'
import { labelFor } from './schemaTypes'

interface DraftDiffResponse {
  ok: boolean
  live?: Values
  draft?: Values
  hasDraft?: boolean
  error?: string
}

function draftUrl(engine: string, collection: string, id: string): string {
  return `/data-api/${engine}/${collection}/records/${id}/draft`
}

// Phase 24b: real explorer/tabs. Hardcoded to the postgres engine -- real
// multi-site/engine switching is Phase 24e's (activity bar) job.
const ENGINE = 'postgres'

interface DeployAllResponse {
  ok: boolean
  deployed?: { collection: string; recordId: string }[]
  skipped?: { collection: string; recordId: string; reason: string }[]
  failed?: { collection: string; recordId: string; error: string }[]
  error?: string
}

interface CollectionsResponse {
  ok: boolean
  collections?: string[]
  error?: string
}

interface RecordsResponse {
  ok: boolean
  schema?: CollectionSchema
  records?: Values[]
  error?: string
}

// Phase 24c: a real draft/live/baseline lifecycle per tab. Phase 24e:
// `viewMode` toggles a tab in place between the normal single-pane editable
// form and a live-vs-staged split/compare view of that SAME record -- no
// separate "Compare" tab exists anymore.
interface OpenTab {
  key: string
  collection: string
  id: string
  schema: CollectionSchema
  status: 'loading' | 'ready' | 'error'
  live: Values | null
  staged: Values | null
  baseline: Values | null
  hasDraft: boolean
  saving: boolean
  error: string | null
  viewMode: 'edit' | 'compare'
}

type CollectionEntry = { schema: CollectionSchema; records: Values[] } | 'loading' | 'error'

function AppShell() {
  // Phase 24b: real explorer/tabs state.
  const [collections, setCollections] = useState<string[] | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [collectionData, setCollectionData] = useState<Record<string, CollectionEntry>>({})
  const [tabs, setTabs] = useState<OpenTab[]>([])
  // Phase 24e: no tab is open by default -- the editor area starts empty
  // (previously defaulted to a permanently-open "compare" singleton).
  const [activeKey, setActiveKey] = useState('')

  // Phase 24e: the split button acts on whichever tab is currently active,
  // toggling its own viewMode -- there's no separate "Compare" tab anymore.
  // This only tracks the transient "no tab to split" warning shown above the
  // button; the actual split state lives on each OpenTab.
  const [splitWarning, setSplitWarning] = useState(false)
  useEffect(() => {
    if (!splitWarning) return
    const t = setTimeout(() => setSplitWarning(false), 1600)
    return () => clearTimeout(t)
  }, [splitWarning])

  // Phase 24e: the global, site-wide "deploy every pending draft" action --
  // replaces the old per-record Deploy button that used to live in each pane.
  const [deployingAll, setDeployingAll] = useState(false)

  // Command palette: was statically always-open (Phase 19's static piece) --
  // now real open/close state, toggled via Ctrl/Cmd+K. Real per-command
  // actions and search filtering stay Phase 24f's separate job; this only
  // fixes the palette being a permanently-visible, interaction-blocking
  // overlay.
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
        return
      }
      if (e.key === 'Escape') {
        setPaletteOpen((prev) => (prev ? false : prev))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (paletteOpen) paletteInputRef.current?.focus()
  }, [paletteOpen])

  useEffect(() => {
    fetch(`/data-api/${ENGINE}/collections`)
      .then((res) => res.json())
      .then((body: CollectionsResponse) => {
        if (body.ok && body.collections) setCollections(body.collections)
      })
      .catch(() => {})
  }, [])

  // Phase 24c: extracted out of toggleExpand so a record tab with relation
  // fields can also trigger it (to populate a relation dropdown), independent
  // of the explorer tree's own expand/collapse state.
  async function ensureCollectionLoaded(name: string) {
    if (collectionData[name] && collectionData[name] !== 'error') return
    setCollectionData((prev) => ({ ...prev, [name]: 'loading' }))
    try {
      const res = await fetch(`/data-api/${ENGINE}/${name}/records`)
      const body: RecordsResponse = await res.json()
      if (!res.ok || !body.ok || !body.schema || !body.records) {
        setCollectionData((prev) => ({ ...prev, [name]: 'error' }))
        return
      }
      setCollectionData((prev) => ({ ...prev, [name]: { schema: body.schema!, records: body.records! } }))
    } catch {
      setCollectionData((prev) => ({ ...prev, [name]: 'error' }))
    }
  }

  function toggleExpand(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }))
    ensureCollectionLoaded(name)
  }

  function patchTab(key: string, partial: Partial<OpenTab>) {
    setTabs((prev) => prev.map((t) => (t.key === key ? { ...t, ...partial } : t)))
  }

  async function loadTabDraft(collection: string, id: string, schema: CollectionSchema) {
    const key = `${collection}:${id}`
    try {
      const res = await fetch(draftUrl(ENGINE, collection, id))
      const body: DraftDiffResponse = await res.json()
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Failed to load ${collection}/${id} (${res.status})`)
      patchTab(key, {
        status: 'ready',
        live: body.live ?? null,
        staged: body.draft ?? null,
        baseline: body.draft ?? null,
        hasDraft: Boolean(body.hasDraft),
        error: null,
      })
    } catch (err) {
      patchTab(key, { status: 'error', error: err instanceof Error ? err.message : String(err) })
    }

    // Preload every relation field's target collection so the dropdown has
    // real options by the time the tab is visible -- a no-op fetch if that
    // collection was already expanded in the explorer tree.
    for (const field of schema.fields) {
      if (field.specialType === 'relation' && field.relationTarget) {
        ensureCollectionLoaded(field.relationTarget)
      }
    }
  }

  function openRecordTab(collection: string, id: string, schema: CollectionSchema) {
    const key = `${collection}:${id}`
    if (tabs.some((t) => t.key === key)) {
      setActiveKey(key)
      return
    }
    setTabs((prev) => [
      ...prev,
      {
        key, collection, id, schema, status: 'loading', live: null, staged: null, baseline: null,
        hasDraft: false, saving: false, error: null, viewMode: 'edit',
      },
    ])
    setActiveKey(key)
    loadTabDraft(collection, id, schema)
  }

  function closeTab(key: string) {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.key === key)
      const next = prev.filter((t) => t.key !== key)
      if (activeKey === key) {
        setActiveKey(next[index - 1]?.key ?? next[index]?.key ?? '')
      }
      return next
    })
  }

  const activeTab = tabs.find((t) => t.key === activeKey) ?? null

  // Phase 24e: the sidebar split button acts on the active tab in place --
  // toggles it between the normal single-pane form and a live-vs-staged
  // compare view of the SAME record. No new pane is ever created.
  function toggleSplitForActiveTab() {
    if (!activeTab) {
      setSplitWarning(true)
      return
    }
    patchTab(activeTab.key, { viewMode: activeTab.viewMode === 'compare' ? 'edit' : 'compare' })
  }

  // Phase 24e: replaces the old per-record Deploy button -- one global action
  // that ships every pending draft across the whole connected site at once.
  async function handleDeployAll() {
    if (!window.confirm('Deploy all pending drafts for Northwind Blog to the live database?')) return
    setDeployingAll(true)
    try {
      const res = await fetch(`/data-api/${ENGINE}/drafts/deploy-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const body: DeployAllResponse = await res.json()
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Deploy failed (${res.status})`)
      const deployed = body.deployed ?? []
      const skipped = body.skipped ?? []
      const failed = body.failed ?? []
      if (deployed.length === 0 && skipped.length === 0 && failed.length === 0) {
        window.alert('No pending drafts to deploy.')
      } else {
        window.alert(
          `Deployed ${deployed.length} record(s).` +
            (skipped.length ? ` ${skipped.length} skipped (policy).` : '') +
            (failed.length ? ` ${failed.length} failed.` : '')
        )
      }
      // Re-sync every open tab's hasDraft/dirty state now that some of their
      // drafts may have just been deployed (or discovered to have none).
      for (const t of tabs) loadTabDraft(t.collection, t.id, t.schema)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    } finally {
      setDeployingAll(false)
    }
  }

  function updateTabStaged(key: string, field: string, value: unknown) {
    setTabs((prev) => prev.map((t) => (t.key === key && t.staged ? { ...t, staged: { ...t.staged, [field]: value } } : t)))
  }

  function tabDirty(t: OpenTab): boolean {
    return t.staged !== null && t.baseline !== null && JSON.stringify(t.staged) !== JSON.stringify(t.baseline)
  }

  async function saveTabDraft(key: string) {
    const tab = tabs.find((t) => t.key === key)
    if (!tab || !tab.staged) return
    patchTab(key, { saving: true })
    try {
      // Strip the primary key before sending -- validateValues (backend)
      // throws a 400 if the PK column is present in the body at all.
      const payload = { ...tab.staged }
      if (tab.schema.primaryKey) delete payload[tab.schema.primaryKey]
      const res = await fetch(draftUrl(ENGINE, tab.collection, tab.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: payload }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Failed to save draft (${res.status})`)
      await loadTabDraft(tab.collection, tab.id, tab.schema)
    } catch (err) {
      patchTab(key, { error: err instanceof Error ? err.message : String(err) })
    } finally {
      patchTab(key, { saving: false })
    }
  }

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
          <button type="button" className="btn-chip" onClick={() => setPaletteOpen(true)}>
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
              <button type="button" className="icon-btn" title="Deploy all pending drafts" disabled={deployingAll} onClick={handleDeployAll}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5v9M4 6.5l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="icon-btn" title="Open SQL Console">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="3.2" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 3.2v9.6c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V3.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button type="button" className="icon-btn" title="Toggle split view" onClick={toggleSplitForActiveTab}>
                {activeTab?.viewMode === 'compare' ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="9" y="2.5" width="5.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                )}
                {splitWarning && <div className="icon-tooltip">No Tab Selected</div>}
              </button>
            </div>
          </div>
          <div className="sidebar-endpoint mono">https://northwind-blog.example.com/api/admin</div>
          <div className="tree">
            {(collections ?? []).map((name) => {
              const entry = collectionData[name]
              const isOpen = Boolean(expanded[name])
              const count = entry && entry !== 'loading' && entry !== 'error' ? entry.records.length : null
              return (
                <div className="tree-group" key={name}>
                  <div className="tree-row tree-collection" onClick={() => toggleExpand(name)}>
                    <span className={`chevron-wrap${isOpen ? ' open' : ''}`}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="folder-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M1.5 3.5a1 1 0 0 1 1-1h3.4l1.2 1.6h6.4a1 1 0 0 1 1 1v7.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="tree-label">{name}</span>
                    <span className="tree-count">{count ?? ''}</span>
                  </div>
                  {isOpen && (
                    <div className="tree-children">
                      {entry === 'loading' && <div className="tree-row">Loading…</div>}
                      {entry === 'error' && <div className="tree-row">Failed to load</div>}
                      {entry && entry !== 'loading' && entry !== 'error' &&
                        entry.records.map((record) => {
                          const id = entry.schema.primaryKey ? String(record[entry.schema.primaryKey] ?? '') : null
                          const key = id ? `${name}:${id}` : null
                          return (
                            <div
                              className={`tree-row tree-record${key && activeKey === key ? ' active' : ''}`}
                              key={id ?? JSON.stringify(record)}
                              onClick={key ? () => openRecordTab(name, id!, entry.schema) : undefined}
                            >
                              <span className="doc-icon">
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                  <path d="M4 1.5h6l2.5 2.5v10a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                                  <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                                </svg>
                              </span>
                              <span className="tree-label">{labelFor(name, record, entry.schema)}</span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="editor-col">
          <div className="tabbar">
            {/* Phase 24c bugfix: two purely-decorative Phase 17/18 mock tabs
                ("Launching Our New Storefront" doc tab, "SQL · Northwind Blog")
                used to sit here with no onClick and no backing content --
                Phase 21 already removed the SQL tab's own .console-view render
                output, leaving a look-alike-but-dead tab strip entry that never
                responded to clicks (reported by the owner as "can't change
                tabs"). Removed rather than wired: the doc tab is now fully
                superseded by real Phase 24b/24c tabs opened from the explorer,
                and the SQL tab has no real content to show until Phase 24d
                wires the SQL Console panel for real. Phase 24e: the separate
                "Compare" singleton tab (tied to one hardcoded demo record) is
                also gone -- split/compare is now a per-tab viewMode toggled
                from the sidebar, not a distinct tab. */}
            {tabs.map((t) => (
              <div className={`tab${activeKey === t.key ? ' active' : ''}`} key={t.key} onClick={() => setActiveKey(t.key)}>
                <span className="doc-icon-sm">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 1.5h6l2.5 2.5v10a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M9.5 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="tab-label">{t.live ? labelFor(t.collection, t.live, t.schema) : t.id}</span>
                {tabDirty(t) && <span className="dirty-dot" />}
                <button
                  type="button"
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(t.key)
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="editor-area">
            {activeTab && (() => {
              const tab = activeTab
              const label = tab.live ? labelFor(tab.collection, tab.live, tab.schema) : tab.id
              const tabSaveEnabled = tabDirty(tab) && !tab.saving
              const renderFields = (source: Values | null, editable: boolean) =>
                tab.schema.fields.map((field) => {
                  const target = field.relationTarget ? collectionData[field.relationTarget] : undefined
                  return (
                    <div className="field-row" key={field.name}>
                      <label className="field-label">{field.name}</label>
                      {renderFieldInput(
                        field,
                        source?.[field.name],
                        editable ? (v) => updateTabStaged(tab.key, field.name, v) : () => {},
                        {
                          relationRecords: target === 'loading' || target === 'error' ? target : target?.records,
                          relationSchema: target && target !== 'loading' && target !== 'error' ? target.schema : undefined,
                        },
                        !editable,
                      )}
                    </div>
                  )
                })
              return (
                <>
                  <div className="editor-toolbar">
                    <span className="breadcrumb">
                      Northwind Blog&nbsp;&nbsp;›&nbsp;&nbsp;{tab.collection}&nbsp;&nbsp;›&nbsp;&nbsp;{label}
                    </span>
                    <div className="editor-toolbar-right">
                      <button
                        type="button"
                        className={`btn-save${tabSaveEnabled ? ' enabled' : ''}`}
                        disabled={!tabSaveEnabled}
                        onClick={() => saveTabDraft(tab.key)}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M2 2h9l3 3v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                          <path d="M4.5 2v4h5V2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        </svg>
                        {tab.saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                  {tab.error && <div className="console-error staging-error">{tab.error}</div>}
                  {tab.status === 'loading' ? (
                    <div className="console-placeholder">Loading record…</div>
                  ) : tab.status === 'error' ? (
                    <div className="console-placeholder">Failed to load record.</div>
                  ) : tab.viewMode === 'compare' ? (
                    <div className="split-view">
                      <div className="split-pane">
                        <div className="split-pane-header"><span className="status-env prod">Production</span></div>
                        <div className="editor-form">{renderFields(tab.live, false)}</div>
                      </div>
                      <div className="split-divider"></div>
                      <div className="split-pane">
                        <div className="split-pane-header"><span className="status-env staging">Staging</span></div>
                        <div className="editor-form">{renderFields(tab.staged, true)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="editor-form">{renderFields(tab.staged, true)}</div>
                  )}
                </>
              )
            })()}
            {!activeTab && (
              <div className="console-placeholder">No editor open — pick a record from the explorer.</div>
            )}
          </div>
        </div>
      </div>

      {paletteOpen && (
        <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="palette" onClick={(e) => e.stopPropagation()}>
            <div className="palette-search">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10.3 10.3L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input ref={paletteInputRef} className="palette-input" type="text" placeholder="Type a command..." readOnly />
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
      )}

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
