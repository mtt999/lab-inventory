import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'
import * as XLSX from 'xlsx'

// ── Export Data ───────────────────────────────────────────────
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
    if (data) { useAppStore.getState().setLastRecord(data); useAppStore.getState().setScreen('results') }
  }

  function safeSheetName(name) { return name.replace(/[:\\\/?*\[\]]/g, '-').substring(0, 31) }
  function fmtLinks(links) { return (links || []).map(l => `${l.label || 'Link'}: ${l.url}`).join(' | ') }

  async function exportAllRecords() {
    toast('Loading all records…')
    const { data: allRecs } = await sb.from('inspections').select('*').order('inspected_at', { ascending: true })
    if (!allRecs?.length) { toast('No records found.'); return }
    const wb = XLSX.utils.book_new()
    const summaryData = [['ICT-Lab — All Inspection Records'], ['Exported:', new Date().toLocaleString()], ['Total:', allRecs.length], [], ['Date', 'Room', 'Inspector', 'Total Items', 'Low Items', 'Status']]
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
      const sheetData = [['ICT-Lab — Inspection Report'], ['Date:', d.toLocaleString()], ['Room:', rec.room_name], ['Inspector:', rec.inspector], ['Total items:', recs.length], ['Low items:', rec.flag_count || 0], []]
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
    XLSX.writeFile(wb, `ICT-Lab_AllRecords_${new Date().toLocaleDateString('en-CA')}.xlsx`)
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
              {open && records.map(rec => (
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
                      : <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>All OK</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>tap to view →</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Import ────────────────────────────────────────────────────
const ROOM_KEYWORDS = ['room', 'lab', 'highbay', 'high bay', 'bay', 'shed', 'office', 'tool', 'storage', 'corridor', 'hall', 'area']
const DEFAULT_ROOM_NAME = 'Janitor Room'
const ICONS = ['🧪','🔬','📦','🏥','🧬','💊','🩺','🧫','⚗️','🔭','🩻','🧰']

function isRoomHeader(numVal, nameVal) {
  if (numVal !== null && numVal !== undefined && numVal !== '') return false
  if (!nameVal || typeof nameVal !== 'string') return false
  const n = nameVal.trim().toLowerCase()
  if (!n) return false
  const skip = ['item', 'no.', 'item name', 'min qty', 'safety box', 'safety items', 'front cabinet', 'air tanks', 'mixing station', 'autoextractor', 'auto extractor', 'storage area']
  if (skip.some(w => n === w || n.startsWith(w))) return false
  return ROOM_KEYWORDS.some(k => n.includes(k)) || (nameVal.trim() === nameVal.trim().toUpperCase() && nameVal.trim().split(/\s+/).length >= 2)
}

function ImportTab() {
  const { rooms, supplies, refreshCache, toast } = useAppStore()
  const [importData, setImportData] = useState(null)
  const [importing, setImporting] = useState(false)

  function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
          const roomsData = {}; let currentRoom = null
          for (const row of rows) {
            const [numVal, nameVal, minVal, qtyVal] = row
            if (!nameVal || String(nameVal).trim() === '') continue
            const nameStr = String(nameVal).trim().toLowerCase()
            if (nameStr === 'item name' || nameStr === 'item') continue
            const numStr = String(numVal || '').trim().toLowerCase()
            if (numStr === 'no.' || numStr === 'no' || numStr === '#') continue
            if (isRoomHeader(numVal, nameVal)) { currentRoom = String(nameVal).trim(); if (!roomsData[currentRoom]) roomsData[currentRoom] = []; continue }
            const num = parseInt(numVal)
            if (!isNaN(num) && nameVal) {
              if (!currentRoom) { currentRoom = DEFAULT_ROOM_NAME; if (!roomsData[currentRoom]) roomsData[currentRoom] = [] }
              roomsData[currentRoom].push({ name: String(nameVal).trim(), unit: 'pcs', min_qty: parseInt(minVal) || 1, qty: (qtyVal !== null && !isNaN(parseInt(qtyVal))) ? parseInt(qtyVal) : (parseInt(minVal) || 1) })
            }
          }
          resolve(roomsData)
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  async function confirmImport() {
    if (!importData) return
    setImporting(true)
    try {
      const { data: existingRooms } = await sb.from('rooms').select('*')
      const { data: existingSupplies } = await sb.from('supplies').select('*')
      const roomByName = {}
      ;(existingRooms || []).forEach(r => roomByName[r.name.toLowerCase()] = r)
      const supplyKey = (roomId, name) => `${roomId}::${name.toLowerCase()}`
      const supplyByKey = {}
      ;(existingSupplies || []).forEach(s => supplyByKey[supplyKey(s.room_id, s.name)] = s)
      const roomNames = Object.keys(importData)
      let added = 0, updated = 0
      for (let i = 0; i < roomNames.length; i++) {
        const name = roomNames[i]
        let roomId
        const existing = roomByName[name.toLowerCase()]
        if (existing) { roomId = existing.id }
        else {
          const { data: newRoom } = await sb.from('rooms').insert({ name, icon: ICONS[i % ICONS.length] }).select().single()
          if (!newRoom) continue
          roomId = newRoom.id
        }
        for (const s of importData[name]) {
          const key = supplyKey(roomId, s.name)
          if (supplyByKey[key]) { await sb.from('supplies').update({ min_qty: s.min_qty, qty: s.qty }).eq('id', supplyByKey[key].id); updated++ }
          else { await sb.from('supplies').insert({ room_id: roomId, name: s.name, unit: s.unit, min_qty: s.min_qty, qty: s.qty }); added++ }
        }
      }
      setImportData(null)
      await refreshCache()
      toast(`Import done: ${added} added, ${updated} updated.`)
    } catch (e) { toast('Import failed. Check connection.') }
    setImporting(false)
  }

  function downloadTemplate() {
    const data = [['Item No.', 'Item Name', 'Min Qty', 'Unit']]
    rooms.forEach(r => {
      data.push(['', r.name, '', ''])
      supplies.filter(s => s.room_id === r.id).forEach((s, i) => data.push([i + 1, s.name, s.min_qty, s.unit]))
      data.push(['', '', '', ''])
    })
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 10 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    XLSX.writeFile(wb, 'ICT-Lab_template.xlsx')
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Import from Excel</div>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
          Upload an Excel file to add rooms and supplies. Existing rooms and supplies are <strong>kept</strong> — new items are added, existing items have their minimum quantity updated.
        </p>
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
          <strong>Expected format:</strong> Column A = item number, Column B = item name. Room names appear as header rows. A third column (Min Qty) is optional.
        </div>
        <div className="field">
          <label>Select Excel file (.xlsx)</label>
          <input type="file" accept=".xlsx" onChange={async e => {
            if (!e.target.files[0]) return
            try { setImportData(await parseExcelFile(e.target.files[0])) }
            catch { toast('Error reading file.') }
          }} style={{ padding: 8 }} />
        </div>
        {importData && (
          <>
            <div className="divider" />
            <div className="card-title" style={{ marginTop: 8 }}>Preview</div>
            <div style={{ marginBottom: 12, fontSize: 14 }}>
              Found <strong>{Object.keys(importData).length} rooms</strong> and <strong>{Object.values(importData).reduce((a, b) => a + b.length, 0)} items</strong>. Existing data will be preserved.
            </div>
            {Object.entries(importData).map(([room, items]) => (
              <div key={room} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>{room} <span style={{ fontWeight: 400 }}>({items.length} items)</span></div>
                {items.slice(0, 3).map((s, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text2)' }}>· {s.name} <span style={{ color: 'var(--text3)' }}>min: {s.min_qty}</span></div>)}
                {items.length > 3 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>…and {items.length - 3} more</div>}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>{importing ? 'Importing…' : 'Import now'}</button>
              <button className="btn" onClick={() => setImportData(null)}>Cancel</button>
            </div>
          </>
        )}
      </div>
      <div className="card">
        <div className="card-title">Download template</div>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>Download a template with your current items.</p>
        <button className="btn btn-sm" onClick={downloadTemplate}>Download template</button>
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────
function SettingsTab() {
  const { settings, refreshCache, toast } = useAppStore()

  async function saveDueDay(val) {
    await sb.from('settings').upsert({ key: 'due_day', value: val })
    await refreshCache()
    toast('Reminder day saved.')
  }

  async function saveAdminPin() {
    const val = document.getElementById('settings-admin-pin').value
    if (!/^\d{4}$/.test(val)) { toast('PIN must be exactly 4 digits.'); return }
    await sb.from('settings').upsert({ key: 'admin_pin', value: val })
    await refreshCache()
    document.getElementById('settings-admin-pin').value = ''
    toast('Admin PIN updated.')
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Weekly reminder</div>
        <div className="field">
          <label>Inspection due day</label>
          <select defaultValue={settings['due_day'] || '5'} onChange={e => saveDueDay(e.target.value)}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) => (
              <option key={d} value={(i + 1) % 7}>{d}</option>
            ))}
          </select>
        </div>
        <div className="text-muted">Users see a reminder banner the day before this day.</div>
      </div>
      <div className="card">
        <div className="card-title">Change admin PIN</div>
        <div className="field">
          <label>New admin PIN (4 digits)</label>
          <input type="password" id="settings-admin-pin" maxLength={4} placeholder="····" style={{ width: 120 }} />
        </div>
        <button className="btn btn-sm btn-primary" onClick={saveAdminPin}>Update PIN</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN HOME / SUPPLY INVENTORY
// ══════════════════════════════════════════════════════════════
export default function Home() {
  const { rooms, supplies, setScreen, setInspection, settings, toast, session } = useAppStore()
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

  const isAdmin = session?.role === 'admin'

  const subTabs = [
    { key: 'inspect', label: 'Inspection' },
    { key: 'export',  label: 'Export Data' },
    ...(isAdmin ? [
      { key: 'import',   label: 'Import' },
      { key: 'settings', label: 'Settings' },
    ] : []),
  ]

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Supply Inventory</div>
      </div>

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

      {subTab === 'inspect'  && (
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
      {subTab === 'export'   && <ExportData />}
      {subTab === 'import'   && <ImportTab />}
      {subTab === 'settings' && <SettingsTab />}
    </div>
  )
}
