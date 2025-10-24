export default function CapturesModal({ open, onClose, capturedList, onRelease, pokemonMap, onEvolve, xpMap, xpToLevel }) {
  if (!open) return null
  const captured = (capturedList || []).map(id => pokemonMap.get(id)).filter(Boolean)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card captures-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Captures</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-content">
          {captured.length === 0 ? (
            <div className="empty-state">Belum ada Pokémon yang ditangkap.</div>
          ) : (
            <div className="captures-grid">
              {captured.map((p) => {
                const xp = (xpMap && xpMap[p.id]) || 0
                const lv = xpToLevel ? xpToLevel(xp) : 1
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
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-secondary" onClick={() => onRelease && onRelease(p.id)}>Release</button>
                      <button className="btn btn-primary" onClick={() => onEvolve && onEvolve(p.id)}>Evolve</button>
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