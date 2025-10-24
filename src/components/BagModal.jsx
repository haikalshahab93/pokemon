import { useState } from 'react'
export default function BagModal({ open, onClose, coins = 0, inventory = [], weapons = [], badges = [], achievements = [] }) {
  if (!open) return null
  // Sorting & filtering state
  const [itemQuery, setItemQuery] = useState('')
  const [weaponQuery, setWeaponQuery] = useState('')
  const [weaponSort, setWeaponSort] = useState('power-desc') // power-asc|power-desc|rarity|name
  const filteredItems = inventory.filter(it => it.toLowerCase().includes(itemQuery.toLowerCase()))
  const filteredWeapons = weapons.filter(w => {
    const q = weaponQuery.toLowerCase()
    return (w.name||'').toLowerCase().includes(q) || (w.rarity||'').toLowerCase().includes(q)
  }).sort((a,b) => {
    switch (weaponSort) {
      case 'power-asc': return (a.power||0) - (b.power||0)
      case 'power-desc': return (b.power||0) - (a.power||0)
      case 'rarity': return (a.rarity||'').localeCompare(b.rarity||'')
      case 'name': return (a.name||'').localeCompare(b.name||'')
      default: return 0
    }
  })
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bag-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <div className="modal-header bag-header">
          <div>
            <h2>Bag / Inventori</h2>
            <div className="bag-metrics">
              <span className="coin">💰 <b>{coins}</b></span>
            </div>
          </div>
        </div>
        <div className="modal-content bag-content">
          <section className="bag-section">
            <h3>Item</h3>
            <div className="bag-controls">
              <input className="input" placeholder="Filter item" value={itemQuery} onChange={(e)=>setItemQuery(e.target.value)} />
            </div>
            <ul className="chips bag-chips">
              {filteredItems.length ? filteredItems.map((it, idx) => <li key={idx}>{it}</li>) : <li className="empty"><i>Kosong</i></li>}
            </ul>
          </section>
          <section className="bag-section">
            <h3>Weapons</h3>
            <div className="bag-controls">
              <input className="input" placeholder="Cari senjata" value={weaponQuery} onChange={(e)=>setWeaponQuery(e.target.value)} />
              <select className="select" value={weaponSort} onChange={(e)=>setWeaponSort(e.target.value)}>
                <option value="power-desc">Terkuat</option>
                <option value="power-asc">Terlemah</option>
                <option value="rarity">Rarity</option>
                <option value="name">Nama</option>
              </select>
            </div>
            <div className="stats weapon-stats">
              {filteredWeapons.length ? filteredWeapons.map((w, idx) => (
                <div className="stat" key={idx}>
                  <span className="stat-name">
                    <strong>{w.name}</strong>
                    <span className={`rarity-badge ${String(w.rarity||'').toLowerCase()}`}>{w.rarity}</span>
                  </span>
                  <div className="stat-bar">
                    <div className="stat-fill" style={{ width: `${Math.min(100, (w.power||0))}%` }} />
                  </div>
                  <span className="stat-value">Power {w.power||0}</span>
                </div>
              )) : <div className="empty"><i>Belum punya senjata</i></div>}
            </div>
          </section>
          <section className="bag-section">
            <h3>Badges</h3>
            <ul className="chips bag-chips">
              {badges.length ? badges.map((b, i) => <li key={i}>{b}</li>) : <li className="empty"><i>Belum ada</i></li>}
            </ul>
          </section>
          <section className="bag-section">
            <h3>Achievements</h3>
            <ul className="chips bag-chips">
              {achievements.length ? achievements.map((a, i) => <li key={i}>{a}</li>) : <li className="empty"><i>Belum ada</i></li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}