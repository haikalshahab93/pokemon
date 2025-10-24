import React from 'react'
import { useNavigate } from 'react-router-dom'
export default function CapturesModal({ open, onClose, capturedList, onRelease, pokemonMap, onEvolve, xpMap, xpToLevel, evoInfoMap, captureHistory, setToast, selectForBattleMode, onPickForBattle, xpByOidMap, xpProgress }) {
  if (!open) return null
  const history = Array.isArray(captureHistory) ? captureHistory : []
  const historyWithPokemon = history.map(rec => ({ rec, p: pokemonMap.get(rec.pokemonId) })).filter(x => !!x.p)
  // Toggle detail riwayat per kartu
  const [expandedId, setExpandedId] = React.useState(null)
  // Indikator penghapusan per OID
  const [deletingOid, setDeletingOid] = React.useState(null)
  const navigate = useNavigate()
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card captures-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Captures • Dimiliki (DB): {new Set(history.map(r => r.pokemonId)).size} • Riwayat: {history.length}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-content">
          {/* Riwayat tangkapan */}
          <div className="history-section" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Tangkapan Saya (Database)</h4>
            {historyWithPokemon.length === 0 ? (
              <div className="empty-state">Belum ada riwayat.</div>
            ) : (
              <div className="captures-grid">
                {historyWithPokemon.map(({ rec, p }) => {
                  const when = rec.createdAt ? new Date(rec.createdAt).toLocaleString() : '-'
                  const rateText = rec.rate != null ? `${rec.rate}%` : '-'
                  const oid = rec._id
                  const liveXP = (xpByOidMap && oid && xpByOidMap[oid] != null) ? xpByOidMap[oid] : (rec.xpAtCapture || 0)
                  const xpText = `${liveXP}`
                  const luckyBadge = rec.isLucky ? 'Lucky' : null
                  const varPct = rec.variationPct != null ? `+${Math.round(rec.variationPct * 100)}%` : null
                  const evoPct = rec.evolveBonusPct != null && rec.method === 'evolve' ? `+${Math.round(rec.evolveBonusPct * 100)}%` : null
                  const lvlBonusPct = rec.levelBonusPct != null ? `+${Math.round(rec.levelBonusPct * 100)}%` : null
                  // Level live: pakai xpByOid jika ada, fallback ke xpAtCapture
                  const lvl = typeof xpToLevel === 'function' ? xpToLevel(liveXP) : null
                  const progress = typeof xpProgress === 'function' ? xpProgress(liveXP) : null
                  // Damage status dari database (pakai finalStats di riwayat record)
                  const stats = Array.isArray(rec.finalStats) ? rec.finalStats : []
                  const findStat = (nm) => (stats.find(s => String(s.name).toLowerCase() === nm)?.value)
                  const dmgValue = findStat('attack') ?? findStat('special-attack') ?? null
                  const dmgText = dmgValue != null ? `${dmgValue}` : '-'
                  const expandKey = rec._id || `${rec.username}-${rec.pokemonId}-${rec.createdAt || '0'}`
                  const isExpanded = expandedId === expandKey
                  const isDeleting = deletingOid === oid
                  return (
                    <div key={expandKey} className="capture-card">
                      <div className="card-header" data-oid={rec._id || undefined}>
                        <div className="name-row">
                          <span className="pokemon-name">{p.name}</span>
                          {lvl != null ? (
                            <span className="level-badge">Lv {lvl}{progress != null && lvl < 100 ? ` • ${progress}%` : ''}</span>
                          ) : null}
                        </div>
                        <div className="header-badges">
                          <span className="gold-badge"># {p.id} • DMG: {dmgText}</span>
                          {lvlBonusPct ? (<span className="silver-badge" title="Bonus Level (akumulasi)">Level bonus {lvlBonusPct}</span>) : null}
                        </div>
                        <div className="type-row">
                          {(p.types || []).map(t => <span key={t} className={`type-chip type-${t}`}>{t}</span>)}
                        </div>
                      </div>
                      <div className="card-body">
                        <img className="pokemon-art" src={p.sprite} alt={p.name} onClick={() => setExpandedId(isExpanded ? null : expandKey)} title="Klik gambar untuk lihat detail riwayat" />
                        <div className="db-status" style={{ marginTop: 8, fontSize: '12px', opacity: 0.9 }}>
                          <div>Terakhir: {(rec.method || 'overlay')} • {when}</div>
                          <div>Rate: {rateText} • XP: {xpText}</div>
                          {(luckyBadge || varPct || evoPct || lvlBonusPct) ? (
                            <div>Status: {luckyBadge ? `${luckyBadge}` : ''}{varPct ? ` • ${varPct}` : ''}{evoPct ? ` • ${evoPct}` : ''}{lvlBonusPct ? ` • Level bonus ${lvlBonusPct}` : ''}</div>
                          ) : null}
                        </div>
                        {isExpanded && stats.length > 0 ? (
                          <div className="history-popover" style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--card)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>Final Stats</div>
                            <div className="stats">
                              {stats.map(s => (
                                <div className="stat" key={`${s.name}-${s.value}`}>
                                  <span className="stat-name">{s.name}</span>
                                  <div className="stat-bar">
                                    <div className="stat-fill" style={{ width: `${Math.min(100, s.value)}%` }} />
                                  </div>
                                  <span className="stat-value">{s.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="card-actions">
                          <button className="btn btn-secondary" disabled={isDeleting} onClick={async () => {
                            const ok = window.confirm(`Hapus tangkapan ${p.name} (#${p.id})?`)
                            if (!ok) return
                            try {
                              setDeletingOid(oid)
                              if (typeof onRelease === 'function') await onRelease(oid)
                            } finally {
                              setDeletingOid(null)
                            }
                          }}>{isDeleting ? 'Menghapus…' : 'Release'}</button>
                          <button className="btn btn-primary" onClick={() => {
                            const ok = window.confirm(`Evolve ${p.name} (#${p.id}) sekarang? Pastikan level memenuhi syarat evolusi.`)
                            if (ok && typeof onEvolve === 'function') onEvolve(rec.pokemonId)
                          }}>Evolve</button>
                          {selectForBattleMode ? (
                            <button className="btn btn-primary" onClick={() => {
                              if (typeof onPickForBattle === 'function') onPickForBattle({ ...p, captureOid: oid })
                            }}>Pilih untuk Battle</button>
                          ) : null}
                          <button className="btn" onClick={() => navigate(`/evo?q=${encodeURIComponent(p.name)}&full=1`)} title="Buka panduan evolusi untuk Pokémon ini">Lihat Evolusi</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {/* Grid Pokemon yang dimiliki - dihapus, hanya tampil dari database */}
          {null}
        </div>
      </div>
    </div>
  )
}