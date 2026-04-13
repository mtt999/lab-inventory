import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'
import * as XLSX from 'xlsx'

// ── Export Data (formerly History) ───────────────────────────
function ExportData() {
  const { toast } = useAppStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await sb.from('inspections').select('*').order('inspected_at', { ascending: false }).limit(200)
    setData(data || [])
    setLoading(false)
  }

  async function viewRecord(id) {
    const { data } = await sb.from('inspections').select('*').eq('id', id).single()
    if (data) {
      useAppStore.getState().setLastRecord(data)
      useAppStore.getState().setScreen('results')
    }
  }

  function safeSheetName(name) { return name.replace(/[:\\\/?*\[\]]/g, '-').substring(0, 31) }
  function fmtLinks(links) { return (links || []).map(l => `${l.label || 'Link'}: ${l.url}`).join(' | ') }

  async function exportAllRecords() {
    toast('Loading all records…')
    const { data: allRecs } = await sb.from('inspections').select('*').order('inspected_at', { ascending: true })
    if (!allRecs?.length) { toast('No records found.'); return }
    const wb = XLSX.utils.book_new()
    const summaryData = [
      ['LabStock — All Inspection Records'], ['Exported:', new Date().toLocaleString()], ['Total:', allRecs.length], [],
      ['Date', 'Room', 'Inspector', 'Total Items', 'Low Items', 'Status']
    ]
    allRecs.forEach(rec => {
      const d = new Date(rec.inspected_at)
      summaryData.push([d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), rec.room_name, rec.inspector, (rec.results || []).length, rec.flag_count || 0, rec.flag_count > 0 ? 'Has low items' : 'All OK'])
    })
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    summaryWs['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
    const sheetNames = new Set()
    allRecs.forEach(rec => {
      const d = new Date(rec.inspected_at)
      const dateStr = d.toLocaleDateString('en-CA')
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '')
      const recs = rec.results || []
      const rlow = recs.filter(r => r.low)
      let sn = safeSheetName(`${dateStr} ${rec.room_name}`)
      if (sheetNames.has(sn)) sn = safeSheetName(`${dateStr} ${timeStr} ${rec.room_name}`)
      let fn = sn, c = 2
      while (sheetNames.has(fn)) fn = safeSheetName(sn.substring(0, 28) + c++)
      sheetNames.add(fn)
      const sheetData = [['LabStock — Inspection Report'], ['Date:', d.toLocaleString()], ['Room:', rec.room_name], ['Inspector:', rec.inspector], ['Total items:', recs.length], ['Low items:', rec.flag_count || 0], []]
      if (rlow.length) {
        sheetData.push(['⚠ ITEMS NEEDING RESTOCK'])
        sheetData.push(['Item', 'Unit', 'Count', 'Minimum', 'Shortage', 'Notes', 'Purchase Links'])
        rlow.forEach(r => sheetData.push([r.name, r.unit, r.qty, r.min_qty, r.min_qty - r.qty, r.notes || '', fmtLinks(r.links)]))
        sheetData.push([])
      }
      sheetData.push(['ALL ITEMS'])
      sheetData.push(['Item', 'Unit', 'Count', 'Minimum', 'Status', 'Notes', 'Purchase Links'])
      recs.forEach(r => sheetData.push([r.name, r.unit, r.qty, r.min_qty, r.low ? 'LOW' : 'OK', r.notes || '', fmtLinks(r.links)]))
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [{ wch: 36 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, ws, fn)
    })
    XLSX.writeFile(wb, `LabStock_AllRecords_${new Date().toLocaleDateString('en-CA')}.xlsx`)
    toast(`Exported ${allRecs.length} inspections!`)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  const months = {}
  data.forEach(rec => {
    const d = new Date(rec.inspected_at)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
    if (!months[key]) months[key] = { label, records: [] }
    months[key].records.push(rec)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>{data.length} inspection{data.length !== 1 ? 's' : ''} recorded</div>
        <button className="btn btn-sm btn-primary" onClick={exportAllRecords}>📊 Export all to Excel</button>
      </div>

      {data.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📋</div>No inspections yet.</div>
      ) : (
        Object.keys(months).sort((a, b) => b.localeCompare(a)).map(key => {
          const { label, records } = months[key]
          const open = !collapsed[key]
          return (
            <div key={key} style={{ marginBottom: 24 }}>
              <div onClick={() => setCollapsed(c => ({ ...c, [key]: !c[key] }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{records.length} inspection{records.length !== 1 ? 's' : ''}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text3)', transition: 'transform 0.2s', transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}>▼</span>
              </div>
              {open && (
                <div style={{ paddingLeft: 4 }}>
                  {records.map(rec => (
                    <div key={rec.id} onClick={() => viewRecord(rec.id)}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{rec.room_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                          {new Date(rec.inspected_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(rec.inspected_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {rec.inspector}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {rec.flag_count > 0
                          ? <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>{rec.flag_count} low item{rec.flag_count > 1 ? 's' : ''}</div>
                          : <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>All OK</div>
                        }
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>tap to view →</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN HOME / SUPPLY INVENTORY
// ══════════════════════════════════════════════════════════════
export default function Home() {
  const { rooms, supplies, setScreen, setInspection, settings, toast } = useAppStore()
  const [subTab, setSubTab] = useState('inspect')

  const today = new Date().getDay()
  const due = parseInt(settings['due_day'] || 5)
  const dayBefore = (due - 1 + 7) % 7
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const showReminder = today === dayBefore

  function startInspection(roomId) {
    const room = rooms.find(r => r.id === roomId)
    const items = supplies.filter(s => s.room_id === roomId)
    if (!items.length) { toast('No supplies in this room. Ask admin to add items.'); return }
    setInspection({ roomId, room, items, index: 0, results: [] })
    setScreen('inspection')
  }

  const subTabs = [
    { key: 'inspect', label: 'Inspection' },
    { key: 'export',  label: 'Export Data' },
  ]

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Supply Inventory</div>
      </div>

      {/* Reminder banner */}
      {showReminder && (
        <div style={{ background: 'var(--warn-light)', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#92400e' }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          Reminder: Supply inventory is due tomorrow ({days[due]}). Please complete your inspection today.
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: subTab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${subTab === t.key ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Inspection tab */}
      {subTab === 'inspect' && (
        <div>
          {rooms.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏠</div>No rooms yet. Ask admin to add rooms.</div>
          ) : (
            <div className="room-grid">
              {rooms.map(r => {
                const cnt = supplies.filter(s => s.room_id === r.id).length
                return (
                  <div key={r.id} className="room-card" onClick={() => startInspection(r.id)}
                    style={r.photo_url ? { paddingTop: 0, overflow: 'hidden' } : {}}>
                    {r.photo_url
                      ? <img src={r.photo_url} style={{ width: 'calc(100% + 32px)', height: 90, objectFit: 'cover', borderRadius: '10px 10px 0 0', margin: '-20px -16px 12px' }} />
                      : <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon || '🧪'}</div>
                    }
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{cnt} item{cnt !== 1 ? 's' : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Export Data tab */}
      {subTab === 'export' && <ExportData />}
    </div>
  )
}
