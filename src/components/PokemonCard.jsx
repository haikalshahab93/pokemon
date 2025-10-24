export default function PokemonCard({ p, isFavorite, onToggleFavorite, onOpen, isCaptured, onCapture, onBattle }) {
  return (
    <div className="card" onClick={() => onOpen(p)} role="button" tabIndex={0}>
      <div className="card-top">
        <span className="id">#{String(p.id).padStart(3, '0')}</span>
        <div className="top-actions">
          {isCaptured && <span className="badge-captured">Captured</span>}
          <button
            className={`heart ${isFavorite ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.id); }}
            title={isFavorite ? 'Hapus favorit' : 'Tambah favorit'}
          >
            ❤
          </button>
        </div>
      </div>
      <img className="sprite" src={p.sprite} alt={p.name} loading="lazy" />
      <h3 className="name">{p.name}</h3>
      <div className="types">
        {p.types.map((t) => (
          <span className={`type ${t}`} key={t}>{t}</span>
        ))}
      </div>
      <div className="card-actions">
        <button className="capture-btn" onClick={(e) => { e.stopPropagation(); onCapture(p) }}>
          🎯 Capture
        </button>
        <button className="battle-btn" onClick={(e) => { e.stopPropagation(); onBattle(p) }}>
          ⚔️ Battle
        </button>
      </div>
    </div>
  );
}