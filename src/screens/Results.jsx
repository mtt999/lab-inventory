import * as XLSX from 'xlsx'
import { useAppStore } from '../store/useAppStore'
import { sb } from '../lib/supabase'

function safeSheetName(name) { return name.replace(/[:\\\/?*\[\]]/g, '-').substring(0, 31) }
function fmtLinks(links) { return (links || []).map(l => `${l.label || 'Link'}: ${l.url}`).join(' | ') }

export default function Results() {
  const { lastRecord, setScreen, toast } = useAppStore()
  if (!lastRecord) { setScreen('home'); return null }

  const results = lastRecord.results || []
  const low = results.filter(r => r.low)

  function exportExcel() {
    const dateStr = new Date(lastRecord.inspected_at).toLocaleString()
    const dateFile = new Date(lastRecord.inspected_at).toLocaleDateString('en-CA')
    const data = [
      ['LabStock — Inspection Report'],
      ['Date:', dateStr], ['Inspector:', lastRecord.inspector], ['Room:', lastRecord.room_name], []
    ]
    if (low.length) {
      data.push(['⚠ ITEMS NEEDING RESTOCK'])
      data.push(['Item','Unit','Current Count','Minimum','Shortage','Notes','Purchase Links'])
      low.forEach(r => data.push([r.name,r.unit,r.qty,r.min_qty,r.min_qty-r.qty,r.notes||'',fmtLinks(r.links)]))
      data.push([])
    }
    data.push(['FULL INVENTORY'])
    data.push(['Item','Unit','Count','Minimum','Status','Notes','Purchase Links'])
    results.forEach(r => data.push([r.name,r.unit,r.qty,r.min_qty,r.low?'NEEDS RESTOCK':'OK',r.notes||'',fmtLinks(r.links)]))
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{wch:36},{wch:8},{wch:10},{wch:10},{wch:14},{wch:30},{wch:50}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inspection')
    XLSX.writeFile(wb, `LabStock_${safeSheetName(lastRecord.room_name)}_${dateFile}.xlsx`)
  }

  async function exportAllRecords() {
    toast('Loading all records…')
    const { data: allRecs, error } = await sb.from('inspections').select('*').order('inspected_at', { ascending: true })
    if (error || !allRecs?.length) { toast('No records found.'); return }
    const wb = XLSX.utils.book_new()
    const summaryData = [
      ['LabStock — All Inspection Records'], ['Exported:', new Date().toLocaleString()], ['Total:', allRecs.length], [],
      ['Date','Room','Inspector','Total Items','Low Items','Status']
    ]
    allRecs.forEach(rec => {
      const d = new Date(rec.inspected_at)
      summaryData.push([d.toLocaleDateString('en-CA')+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), rec.room_name, rec.inspector, (rec.results||[]).length, rec.flag_count||0, rec.flag_count>0?'Has low items':'All OK'])
    })
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    summaryWs['!cols'] = [{wch:18},{wch:20},{wch:16},{wch:12},{wch:10},{wch:14}]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
    const sheetNames = new Set()
    allRecs.forEach(rec => {
      const d = new Date(rec.inspected_at)
      const dateStr = d.toLocaleDateString('en-CA')
      const timeStr = d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}).replace(':','')
      const recs = rec.results || []
      const rlow = recs.filter(r => r.low)
      let sn = safeSheetName(`${dateStr} ${rec.room_name}`)
      if (sheetNames.has(sn)) sn = safeSheetName(`${dateStr} ${timeStr} ${rec.room_name}`)
      let fn = sn, c = 2
      while (sheetNames.has(fn)) fn = safeSheetName(sn.substring(0,28)+c++)
      sheetNames.add(fn)
      const data = [['LabStock — Inspection Report'],['Date:',d.toLocaleString()],['Room:',rec.room_name],['Inspector:',rec.inspector],['Total items:',recs.length],['Low items:',rec.flag_count||0],[]]
      if (rlow.length) {
        data.push(['⚠ ITEMS NEEDING RESTOCK'])
        data.push(['Item','Unit','Count','Minimum','Shortage','Notes','Purchase Links'])
        rlow.forEach(r => data.push([r.name,r.unit,r.qty,r.min_qty,r.min_qty-r.qty,r.notes||'',fmtLinks(r.links)]))
        data.push([])
      }
      data.push(['ALL ITEMS'])
      data.push(['Item','Unit','Count','Minimum','Status','Notes','Purchase Links'])
      recs.forEach(r => data.push([r.name,r.unit,r.qty,r.min_qty,r.low?'LOW':'OK',r.notes||'',fmtLinks(r.links)]))
      const ws = XLSX.utils.aoa_to_sheet(data)
      ws['!cols'] = [{wch:36},{wch:8},{wch:10},{wch:10},{wch:10},{wch:30},{wch:50}]
      XLSX.utils.book_append_sheet(wb, ws, fn)
    })
    XLSX.writeFile(wb, `LabStock_AllRecords_${new Date().toLocaleDateString('en-CA')}.xlsx`)
    toast(`Exported ${allRecs.length} inspections!`)
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Inspection complete</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={exportExcel}>📄 This Inspection</button>
          <button className="btn btn-sm" onClick={exportAllRecords}>📚 All Records</button>
          <button className="btn btn-sm btn-primary" onClick={() => setScreen('home')}>Done</button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
          <div><div style={{ fontSize: 24, fontWeight: 600 }}>{results.length}</div><div className="text-muted">Total</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent)' }}>{results.length - low.length}</div><div className="text-muted">OK</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent2)' }}>{low.length}</div><div className="text-muted">Need restock</div></div>
        </div>
        <div className="divider" />
        <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {lastRecord.room_name} · {new Date(lastRecord.inspected_at).toLocaleString()} · {lastRecord.inspector}
        </div>
      </div>

      <div className="card">
        <div className="card-title">All items</div>
        <table>
          <thead><tr><th>Item</th><th>Count</th><th>Min</th><th>Status</th></tr></thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className={r.low ? 'flag-red' : ''}>
                <td><strong>{r.name}</strong></td>
                <td style={{ fontFamily: 'var(--mono)' }}>{r.qty} {r.unit}</td>
                <td style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{r.min_qty}</td>
                <td><span className={`badge badge-${r.low ? 'low' : 'ok'}`}>{r.low ? 'LOW' : 'OK'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
