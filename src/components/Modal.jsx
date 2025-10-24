export default function Modal({ open, onClose, pokemon, onCapture, onBattle }) {
  if (!open || !pokemon) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <div className="modal-header">
          <img className="modal-sprite" src={pokemon.sprite} alt={pokemon.name} />
          <div>
            <h2>{pokemon.name} <span className="modal-id">#{pokemon.id}</span></h2>
            <div className="types">
              {pokemon.types.map((t) => <span className={`type ${t}`} key={t}>{t}</span>)}
            </div>
            <div className="modal-actions">
              <button className="capture-btn" onClick={() => onCapture(pokemon)}>🎯 Capture</button>
              <button className="battle-btn" onClick={() => onBattle(pokemon)}>⚔️ Battle</button>
            </div>
          </div>
        </div>
        <div className="modal-content">
          <section>
            <h3>Abilities</h3>
            <ul className="chips">
              {pokemon.abilities.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </section>
          <section>
            <h3>Stats</h3>
            <div className="stats">
              {pokemon.stats.map((s) => (
                <div className="stat" key={s.name}>
                  <span className="stat-name">{s.name}</span>
                  <div className="stat-bar">
                    <div className="stat-fill" style={{ width: `${Math.min(100, s.value)}%` }} />
                  </div>
                  <span className="stat-value">{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}