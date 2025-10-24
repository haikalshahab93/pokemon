export default function CapturesModal({ open, onClose, capturedList, onRelease, pokemonMap, onEvolve, xpMap, xpToLevel, evoInfoMap, captureHistory }) {
  if (!open) return null
  const captured = (capturedList || []).map(id => pokemonMap.get(id)).filter(Boolean)
  const history = Array.isArray(captureHistory) ? captureHistory : []
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card captures-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Captures</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-content">
          {/* Riwayat tangkapan */}
          <div className="history-section" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Riwayat Tangkapan</h4>
            {history.length === 0 ? (
              <div className="empty-state">Belum ada riwayat.</div>
            ) : (
              <ul className="history-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {history.map((rec) => {
                  const p = pokemonMap.get(rec.pokemonId)
                  const when = rec.createdAt ? new Date(rec.createdAt).toLocaleString() : '-'
                  const name = p?.name || `#${rec.pokemonId}`
                  const rateText = rec.rate != null ? `${rec.rate}%` : '-'
                  const xpText = rec.xpAtCapture != null ? `${rec.xpAtCapture}` : '0'
                  return (
                    <li key={`${rec._id || `${rec.username}-${rec.pokemonId}-${rec.createdAt || Math.random()}`}`}
                        className="history-item"
                        style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>
                          {name} <span style={{ opacity: 0.7, fontWeight: 500 }}>({rec.method || 'overlay'})</span>
                        </span>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>{when}</span>
                        {rec.notes ? <span style={{ fontSize: '12px', opacity: 0.85 }}>Catatan: {rec.notes}</span> : null}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', opacity: 0.85 }}>
                        <div>Rate: {rateText}</div>
                        <div>XP saat capture: {xpText}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {/* Grid Pokemon yang dimiliki */}
          {captured.length === 0 ? (
            <div className="empty-state">Belum ada Pokémon yang ditangkap.</div>
          ) : (
            <div className="captures-grid">
              {captured.map((p) => {
                const xp = (xpMap && xpMap[p.id]) || 0
                const lv = xpToLevel ? xpToLevel(xp) : 1
                const info = evoInfoMap ? evoInfoMap[p.id] : undefined
                const loadingInfo = info === undefined
                const hasError = info && info.error
                const noNext = info && info.error && (info.error === 'no_chain' || info.error === 'no_next')
                const minLevel = info && info.minLevel ? info.minLevel : null
                const canEvolve = !!info && !hasError && (!minLevel || lv >= minLevel)
                const disableEvolve = loadingInfo || !canEvolve
                // Status text & class
                const statusClass = (
                  loadingInfo ? 'evo-requirement loading' :
                  (hasError ? (info.error === 'network' ? 'evo-requirement error' : 'evo-requirement noevo') :
                    (minLevel && lv < minLevel ? 'evo-requirement needs' : 'evo-requirement ok'))
                )
                const statusText = (
                  loadingInfo ? 'Memuat syarat evolusi…' :
                  (hasError ? (info.error === 'network' ? 'Gagal memuat syarat (cek koneksi)' : 'Tidak ada evolusi') :
                    (minLevel && lv < minLevel ? `Butuh Lv ${minLevel} untuk evolve ke ${info?.targetName || ''}` :
                      `Siap evolve${info?.targetName ? ` ke ${info.targetName}` : ''}`))
                )
                const buttonTitle = (
                  loadingInfo ? 'Memuat syarat evolusi…' :
                  (hasError ? (info.error === 'network' ? 'Gagal memuat data evolusi dari PokeAPI' : 'Pokemon ini tidak memiliki evolusi') :
                    (minLevel && lv < minLevel ? `Butuh Lv ${minLevel}` : `Siap evolve ke ${info?.targetName || ''}`))
                )
                const evolveLabel = (!disableEvolve && info?.targetName) ? `Evolve → ${info.targetName}` : 'Evolve'
                return (
                  <div key={p.id} className="capture-card">
                    <div className="card-header">
                      <div className="name-row">
                        <span className="pokemon-name">{p.name}</span>
                        <span className="level-badge">Lv {lv}</span>
                      </div>
                      <div className="type-row">
                        {(p.types || []).map(t => <span key={t} className={`type-chip type-${t}`}>{t}</span>)}
                      </div>
                    </div>
                    <div className="card-body">
                      <img className="pokemon-art" src={p.sprite} alt={p.name} />
                      <div className={statusClass} style={{ marginTop: 8 }}>
                        {loadingInfo ? <span className="spinner" aria-label="Loading" /> : null}
                        <span style={{ fontSize: '0.9em', opacity: 0.9 }}>{statusText}</span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-secondary" onClick={() => onRelease && onRelease(p.id)}>Release</button>
                      <button className="btn btn-primary" disabled={disableEvolve} aria-disabled={disableEvolve} title={buttonTitle} onClick={() => onEvolve && onEvolve(p.id)}>{evolveLabel}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}