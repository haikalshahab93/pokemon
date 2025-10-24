import { useEffect, useMemo, useState, useRef } from 'react'
import './App.css'

// Helper to fetch JSON safely
async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}

function Header({
  search, setSearch,
  types, selectedType, setSelectedType,
  favoritesOnly, setFavoritesOnly,
  capturedOnly, setCapturedOnly,
  totalCount,
  users, currentUser, onUserChange, onAddUser,
  onOpenCaptures,
}) {
  const [newUser, setNewUser] = useState('')
  return (
    <header className="header">
      <div className="brand">
        <img className="brand-logo" src="/vite.svg" alt="Pokédex" />
        <h1>Pokédex</h1>
        <span className="count">{totalCount} Pokémon</span>
      </div>
      <div className="controls">
        <div className="user-select">
          <label>User</label>
          <select value={currentUser} onChange={(e) => onUserChange(e.target.value)}>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="user-add">
          <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Tambah user" />
          <button onClick={() => { if (newUser.trim()) { onAddUser(newUser.trim()); setNewUser('') } }} title="Tambah user">＋</button>
        </div>
        <div className="field">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
            placeholder="Cari nama Pokémon…"
            className="input"
          />
          {search && (
            <button className="clear" onClick={() => setSearch('')} title="Clear">✖</button>
          )}
        </div>
        <select
          className="select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          title="Filter tipe"
        >
          <option value="">Semua Tipe</option>
          {types.map((t) => (
            <option value={t.name} key={t.name}>{t.name}</option>
          ))}
        </select>
        <label className="fav-toggle">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Favorit ❤️
        </label>
        <label className="cap-toggle">
          <input type="checkbox" checked={capturedOnly} onChange={(e) => setCapturedOnly(e.target.checked)} />
          Tangkapan 🎯
        </label>
        <button className="captures-menu" onClick={onOpenCaptures}>Tangkapan Saya</button>
      </div>
    </header>
  )
}

function PokemonCard({ p, isFavorite, onToggleFavorite, onOpen, isCaptured, onCapture, onBattle }) {
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
 
 function Modal({ open, onClose, pokemon, onCapture, onBattle }) {
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

function CapturesModal({ open, onClose, capturedList, onRelease, pokemonMap }) {
  if (!open) return null
  const ids = Array.from(new Set(capturedList))
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <h2>Tangkapan Saya</h2>
        {ids.length === 0 ? (
          <p>Belum ada tangkapan. Coba capture beberapa Pokémon!</p>
        ) : (
          <div className="grid">
            {ids.map(id => {
              const p = pokemonMap.get(id)
              return (
                <div className="card" key={id}>
                  {p ? (
                    <>
                      <img className="sprite" src={p.sprite} alt={p.name} />
                      <h3 className="name">{p.name}</h3>
                      <div className="types">
                        {p.types.map((t) => (
                          <span className={`type ${t}`} key={t}>{t}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <h3>#{id}</h3>
                  )}
                  <button className="release-btn" onClick={() => onRelease(id)}>Release</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CaptureOverlay({ open, pokemon, onClose, onFinalize }) {
  const [stage, setStage] = useState('idle') // idle | throw | shake1 | shake2 | shake3 | result
  const [result, setResult] = useState(null) // null | 'success' | 'fail'
  const [rate, setRate] = useState(() => Math.floor(30 + Math.random() * 50))

  useEffect(() => {
    if (!open || !pokemon) return
    setStage('throw')
    setResult(null)
    setRate(Math.floor(30 + Math.random() * 50))
    const timers = []
    timers.push(setTimeout(() => setStage('shake1'), 800))
    timers.push(setTimeout(() => setStage('shake2'), 1400))
    timers.push(setTimeout(() => setStage('shake3'), 2000))
    timers.push(setTimeout(() => {
      const roll = Math.floor(Math.random() * 100)
      const success = roll < rate
      setStage('result')
      setResult(success ? 'success' : 'fail')
      // finalize after short delay
      timers.push(setTimeout(() => {
        onFinalize(pokemon, success, rate)
        onClose()
      }, 1000))
    }, 2800))
    return () => { timers.forEach(t => clearTimeout(t)) }
  }, [open, pokemon])

  if (!open || !pokemon) return null
  return (
    <div className="capture-backdrop" onClick={onClose}>
      <div className="capture-arena" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <div className="arena-entities">
          <img className="arena-pokemon" src={pokemon.sprite} alt={pokemon.name} />
          <img
            className={`arena-ball ${stage}`}
            src="/pokeball.svg"
            alt="Poké Ball"
          />
        </div>
        <div className="capture-info">
          <h3>Menangkap {pokemon.name}</h3>
          <p>Rate: {rate}% • {stage === 'result' ? (result === 'success' ? 'Berhasil!' : 'Gagal') : 'Melempar bola…'}</p>
        </div>
        <div className="capture-actions">
          <button className="skip" onClick={() => { onFinalize(pokemon, false, rate); onClose() }}>Lewati</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [capturedOnly, setCapturedOnly] = useState(false)

  // Tambahan state untuk Modal & Captures
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPokemon, setModalPokemon] = useState(null)
  const [capturesOpen, setCapturesOpen] = useState(false)
  const [types, setTypes] = useState([])
  const [pokemon, setPokemon] = useState([])
  const pokemonMap = useMemo(() => new Map(pokemon.map(p => [p.id, p])), [pokemon])
  const [nextUrl, setNextUrl] = useState('https://pokeapi.co/api/v2/pokemon?limit=24')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null) // { type: 'success'|'error', message: string }

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorites')) || [] } catch { return [] }
  })

  // User management & captures per user
  const [users, setUsers] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('users') || '[]')
    return saved.length ? saved : ['trainer']
  })
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('user') || 'trainer')
  function capKey(user) { return `captures:${user}` }
  // Reward & progress storage keys (per user)
  const coinsKey = (user) => `coins:${user}`
  const invKey = (user) => `inventory:${user}`
  const xpKey = (user) => `xp:${user}`
  const streakKey = (user) => `streak:${user}`
  const achKey = (user) => `ach:${user}`
  const pityKey = (user) => `pity:${user}`
  const diffKey = (user) => `difficulty:${user}`
  const badgeKey = (user) => `badges:${user}`
  const [captures, setCaptures] = useState(() => {
     try {
       const arr = JSON.parse(localStorage.getItem(capKey(currentUser)) || '[]')
       return Array.from(new Set(arr))
     } catch {
       return []
     }
   })
  // Progress states
  const [coins, setCoins] = useState(0)
  const [inventory, setInventory] = useState([])
  const [streakWins, setStreakWins] = useState(0)
  const [pityBonus, setPityBonus] = useState(0)
  const [difficulty, setDifficulty] = useState('Normal')
  const [achievements, setAchievements] = useState([])
  const [badges, setBadges] = useState([])
  const [endOpen, setEndOpen] = useState(false)
  const [endData, setEndData] = useState(null)
  const [lastOpponent, setLastOpponent] = useState(null)
  // Load progress when user changes
  useEffect(() => {
    try {
      const c = parseInt(localStorage.getItem(coinsKey(currentUser)) || '0'); setCoins(isNaN(c)?0:c)
      const inv = JSON.parse(localStorage.getItem(invKey(currentUser)) || '[]'); setInventory(Array.isArray(inv)?inv:[])
      const st = parseInt(localStorage.getItem(streakKey(currentUser)) || '0'); setStreakWins(isNaN(st)?0:st)
      const pity = parseInt(localStorage.getItem(pityKey(currentUser)) || '0'); setPityBonus(isNaN(pity)?0:pity)
      const diff = localStorage.getItem(diffKey(currentUser)) || 'Normal'; setDifficulty(diff)
      const ach = JSON.parse(localStorage.getItem(achKey(currentUser)) || '[]'); setAchievements(Array.isArray(ach)?ach:[])
      const b = JSON.parse(localStorage.getItem(badgeKey(currentUser)) || '[]'); setBadges(Array.isArray(b)?b:[])
    } catch {}
  }, [currentUser])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    // Load types once
    fetchJSON('https://pokeapi.co/api/v2/type')
      .then((data) => {
        const list = data.results?.filter(t => !['shadow', 'unknown'].includes(t.name)) || []
        setTypes(list)
      })
      .catch(() => {})
  }, [])

  async function loadMore() {
    if (!nextUrl) return
    setLoading(true)
    setError('')
    try {
      const list = await fetchJSON(nextUrl)
      setNextUrl(list.next)
      // fetch details concurrently
      const details = await Promise.all(
        (list.results || []).map(async (it) => {
          const d = await fetchJSON(it.url)
          return {
            id: d.id,
            name: d.name,
            sprite: d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default || '',
            types: (d.types || []).map(t => t.type.name),
            abilities: (d.abilities || []).map(a => a.ability.name),
            stats: (d.stats || []).map(s => ({ name: s.stat.name, value: s.base_stat })),
          }
        })
      )
      setPokemon(prev => {
        const seen = new Set(prev.map(x => x.id))
        const merged = [...prev]
        for (const d of details) {
          if (!seen.has(d.id)) { merged.push(d); seen.add(d.id) }
        }
        return merged
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMore() }, [])

  function toggleFavorite(id) {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
  }

  async function handleSearchSubmit(e) {
    e.preventDefault()
    if (!search) return
    setLoading(true)
    setError('')
    try {
      const d = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${search}`)
      const item = {
        id: d.id,
        name: d.name,
        sprite: d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default || '',
        types: (d.types || []).map(t => t.type.name),
        abilities: (d.abilities || []).map(a => a.ability.name),
        stats: (d.stats || []).map(s => ({ name: s.stat.name, value: s.base_stat })),
      }
      setPokemon([item])
      setNextUrl('https://pokeapi.co/api/v2/pokemon?limit=24')
    } catch (e) {
      setError('Tidak ditemukan. Coba nama lain.')
    } finally {
      setLoading(false)
    }
  }

  // Capture system
  function attemptCapture(p) {
    // random capture rate between 30% and 80%
    const rate = Math.floor(30 + Math.random() * 50)
    const roll = Math.floor(Math.random() * 100)
    const success = roll < rate
    if (success) {
      setCaptures(prev => {
        if (prev.includes(p.id)) {
          setToast({ type: 'success', message: `${p.name} sudah ditangkap sebelumnya. Rate ${rate}%` })
          return prev
        }
        const next = [...prev, p.id]
        localStorage.setItem(capKey(currentUser), JSON.stringify(next))
        setToast({ type: 'success', message: `Berhasil menangkap ${p.name}! 🎉 Rate ${rate}%` })
        return next
      })
    } else {
      setToast({ type: 'error', message: `Gagal menangkap ${p.name}. Rate ${rate}%` })
    }
    // auto hide toast
    setTimeout(() => setToast(null), 2000)
  }

  function releaseCapture(id) {
    setCaptures(prev => {
      const next = prev.filter(x => x !== id)
      localStorage.setItem(capKey(currentUser), JSON.stringify(next))
      return next
    })
  }
  // tambahkan state untuk overlay tangkap
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureTarget, setCaptureTarget] = useState(null)

  // tambahkan fungsi untuk memulai dan menyelesaikan tangkapan dengan overlay
  function startCapture(p) {
    setCaptureTarget(p)
    setCaptureOpen(true)
  }
  function finalizeCapture(p, success, rate) {
    if (success) {
      setCaptures(prev => {
        if (prev.includes(p.id)) {
          setToast({ type: 'success', message: `${p.name} sudah ditangkap sebelumnya. Rate ${rate}%` })
          return prev
        }
        const next = [...prev, p.id]
        localStorage.setItem(capKey(currentUser), JSON.stringify(next))
        setToast({ type: 'success', message: `Berhasil menangkap ${p.name}! 🎉 Rate ${rate}%` })
        return next
      })
    } else {
      setToast({ type: 'error', message: `Gagal menangkap ${p.name}. Rate ${rate}%` })
    }
    setTimeout(() => setToast(null), 2000)
  }

  // Battle state & handlers
  const [battleOpen, setBattleOpen] = useState(false)
  const [battlePair, setBattlePair] = useState({ player: null, opponent: null })
  function startBattle(opponentPokemon) {
     // pilih pokemon pemain: prioritas dari tangkapan pertama, jika tidak ada pakai pokemon pertama di daftar
     const playerId = captures[0]
     const playerFromCapture = playerId ? pokemonMap.get(playerId) : null
     const fallbackPlayer = playerFromCapture || (pokemon.length ? pokemon[0] : opponentPokemon)
     setBattlePair({ player: fallbackPlayer, opponent: opponentPokemon })
     setLastOpponent(opponentPokemon)
     setBattleOpen(true)
   }
  // Reward calculation (depends on difficulty, streakWins, pityBonus)
  function calculateRewards(result, metrics) {
     const diffMul = { Easy: 1.0, Normal: 1.2, Hard: 1.5, Insane: 1.8 }[difficulty] || 1.2
     const streakMul = 1 + Math.min(0.5, streakWins * 0.1)
     const perfBonus = (metrics?.turns <= 4 ? 0.1 : 0) + ((metrics?.damageTaken ?? 0) <= 20 ? 0.15 : 0) + ((metrics?.superEffective ?? 0) >= 2 ? 0.1 : 0)
     let coinsGain, xpGain
     if (result === 'win') {
       coinsGain = Math.round((50 + 0.5*(metrics?.damageDealt||0) + 20) * diffMul * streakMul * (1+perfBonus))
       xpGain = Math.round((100 + 0.8*(metrics?.damageDealt||0) + ((metrics?.superEffective||0)>0?30:0)) * diffMul)
     } else {
       coinsGain = Math.round((15 + 0.4*(metrics?.damageDealt||0)) * diffMul)
       xpGain = Math.round((60 + 0.6*(metrics?.damageDealt||0)) * diffMul)
     }
     // Item drop (Potion)
     const basePotion = result==='win'?0.20:0.08
     const baseSuper = result==='win'?0.05:0.02
     const pityMul = 1 + Math.min(0.5, pityBonus/100)
     const roll = Math.random()
     let itemDrop = null
     if (roll < baseSuper*pityMul) itemDrop = 'Super Potion'; else if (roll < basePotion*pityMul) itemDrop = 'Potion'
     // Weapon drop (lebih mudah didapat ketika menang)
     let weaponDrop = null
     if (result === 'win') {
-      const baseWeapon = ({ Easy: 0.008, Normal: 0.010, Hard: 0.015, Insane: 0.020 }[difficulty] || 0.010)
+      const baseWeapon = ({ Easy: 0.25, Normal: 0.30, Hard: 0.35, Insane: 0.40 }[difficulty] || 0.30)
       const perfMulWeapon = 1 + perfBonus * 0.2 // pengaruh ringan dari performa
       const streakMulWeapon = 1 + Math.min(0.1, streakWins * 0.01) // bonus kecil dari streak
       const pityMulWeapon = 1 + Math.min(0.05, pityBonus / 1000) // pengaruh sangat kecil dari pity
       const weaponChance = baseWeapon * perfMulWeapon * streakMulWeapon * pityMulWeapon
       if (Math.random() < weaponChance) {
         const r = Math.random()
         weaponDrop = r < 0.05 ? 'Crystal Blade' : r < 0.30 ? 'Iron Sword' : 'Wooden Sword'
       }
     }
     // Achievements (simple)
     const newAch = []
     if (result==='win' && (metrics?.damageTaken ?? 999) <= 20) newAch.push('Perfect Guard')
     if (result==='win' && (metrics?.turns||0) <= 4) newAch.push('Swift Victory')
     if ((metrics?.superEffective||0) >= 3) newAch.push('Type Master')
     if (result==='lose') newAch.push('Keep Fighting')
-    return { coinsGain, xpGain, itemDrop, newAch }
+    return { coinsGain, xpGain, itemDrop, weaponDrop, newAch }
   }
  function handleBattleEnd(payload) {
    const result = typeof payload === 'string' ? payload : payload?.result
    const metrics = typeof payload === 'object' ? payload?.metrics : null
-   const { coinsGain, xpGain, itemDrop, newAch } = calculateRewards(result, metrics || { damageDealt: result==='win'?100:0, damageTaken: result==='lose'?100:0, turns: 0, superEffective: 0 })
+   const { coinsGain, xpGain, itemDrop, weaponDrop, newAch } = calculateRewards(result, metrics || { damageDealt: result==='win'?100:0, damageTaken: result==='lose'?100:0, turns: 0, superEffective: 0 })
     setCoins(prev => { const next = prev + coinsGain; localStorage.setItem(coinsKey(currentUser), String(next)); return next })
     // XP per Pokemon (store map by id)
     const pid = typeof payload === 'object' ? payload?.player?.id : battlePair.player?.id
    try {
      const map = JSON.parse(localStorage.getItem(xpKey(currentUser)) || '{}')
      const prevXP = parseInt(map[pid] || '0') || 0
      map[pid] = prevXP + xpGain
      localStorage.setItem(xpKey(currentUser), JSON.stringify(map))
    } catch {}
    // Inventory
    if (itemDrop) {
      setInventory(prev => { const next = [...prev, itemDrop]; localStorage.setItem(invKey(currentUser), JSON.stringify(next)); return next })
    }
+    if (weaponDrop) {
+      setInventory(prev => { const next = [...prev, weaponDrop]; localStorage.setItem(invKey(currentUser), JSON.stringify(next)); return next })
+    }
    // Streak & pity
    let newBadges = []
    if (result === 'win') {
      const nextStreak = streakWins + 1
      setStreakWins(nextStreak); localStorage.setItem(streakKey(currentUser), String(nextStreak))
      const nextPity = Math.max(0, pityBonus - 10); setPityBonus(nextPity); localStorage.setItem(pityKey(currentUser), String(nextPity))
      // Badges
      if (!badges.includes('First Win')) newBadges.push('First Win')
      if (nextStreak >= 5 && !badges.includes('Streak 5')) newBadges.push('Streak 5')
      if (nextStreak >= 10 && !badges.includes('Streak 10')) newBadges.push('Streak 10')
      if (difficulty === 'Insane' && !badges.includes('Insane Victor')) newBadges.push('Insane Victor')
    } else {
      setStreakWins(0); localStorage.setItem(streakKey(currentUser), '0')
      const nextPity = Math.min(100, pityBonus + 10); setPityBonus(nextPity); localStorage.setItem(pityKey(currentUser), String(nextPity))
    }
    // Achievements
    if (newAch.length) {
      setAchievements(prev => { const set = new Set(prev); newAch.forEach(a => set.add(a)); const arr = Array.from(set); localStorage.setItem(achKey(currentUser), JSON.stringify(arr)); return arr })
    }
    // Persist badges
    if (newBadges.length) {
      setBadges(prev => { const set = new Set(prev); newBadges.forEach(b => set.add(b)); const arr = Array.from(set); localStorage.setItem(badgeKey(currentUser), JSON.stringify(arr)); return arr })
    }
    setEndData({ result, metrics, rewards: { coinsGain, xpGain, itemDrop, weaponDrop, newAch, newBadges }, opponent: lastOpponent })
    setEndOpen(true)
    setToast({ type: result === 'win' ? 'success' : 'error', message: result === 'win' ? `Anda menang! +${coinsGain} coins` : `Anda kalah. +${coinsGain} coins` })
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div className="app">
      <Header
        search={search}
        setSearch={setSearch}
        types={types}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        favoritesOnly={favoritesOnly}
        setFavoritesOnly={setFavoritesOnly}
        capturedOnly={capturedOnly}
        setCapturedOnly={setCapturedOnly}
        totalCount={pokemon.length}
        users={users}
        currentUser={currentUser}
        onUserChange={(u) => { setCurrentUser(u); localStorage.setItem('user', u) }}
        onAddUser={(u) => { if (!u) return; setUsers(prev => { const set = new Set(prev); set.add(u); const arr = Array.from(set); localStorage.setItem('users', JSON.stringify(arr)); localStorage.setItem('user', u); setCurrentUser(u); return arr }) }}
        onOpenCaptures={() => setCapturesOpen(true)}
      />
       <main>
         {loading && (
           <div className="skeletons">
             {Array.from({ length: 6 }).map((_, i) => <div className="skeleton" key={i} />)}
           </div>
         )}
        {!loading && (
          <>
            {error && <div className="error">{error}</div>}
            <div className="grid">
              {pokemon
                .filter((p) => (
                  (!selectedType || p.types.includes(selectedType)) &&
                  (!favoritesOnly || favorites.includes(p.id)) &&
                  (!capturedOnly || captures.includes(p.id)) &&
                  (!search || p.name.toLowerCase().includes(search))
                ))
                .map((p) => (
                  <PokemonCard
                    key={p.id}
                    p={p}
                    isFavorite={favorites.includes(p.id)}
                    onToggleFavorite={toggleFavorite}
                    onOpen={(pp) => { setModalPokemon(pp); setModalOpen(true) }}
                    isCaptured={captures.includes(p.id)}
                    onCapture={startCapture}
                    onBattle={startBattle}
                  />
                ))}
            </div>
          </>
        )}
       </main>
 
       <div className="actions">
         <button className="load-more" disabled={!nextUrl || loading} onClick={loadMore}>
           {loading ? 'Memuat…' : nextUrl ? 'Muat Lebih Banyak' : 'Semua dimuat'}
         </button>
         <button className="reset" onClick={() => { setPokemon([]); setNextUrl('https://pokeapi.co/api/v2/pokemon?limit=24'); setSelectedType(''); setSearch(''); setFavoritesOnly(false); setCapturedOnly(false); loadMore() }}>Reset</button>
       </div>
 
       <Modal open={modalOpen} onClose={() => setModalOpen(false)} pokemon={modalPokemon} onCapture={startCapture} onBattle={startBattle} />
       <CapturesModal open={capturesOpen} onClose={() => setCapturesOpen(false)} capturedList={captures} onRelease={releaseCapture} pokemonMap={pokemonMap} />
 
        <CaptureOverlay
           open={captureOpen}
           pokemon={captureTarget}
           onClose={() => { setCaptureOpen(false); setCaptureTarget(null) }}
           onFinalize={(p, success, rate) => finalizeCapture(p, success, rate)}
         />
 
       <BattleOverlay
         open={battleOpen}
         player={battlePair.player}
         opponent={battlePair.opponent}
         onClose={() => setBattleOpen(false)}
         onEnd={handleBattleEnd}
       />
 
       <EndBattleOverlay
         open={endOpen}
         data={endData}
         onClose={() => setEndOpen(false)}
         onRematch={() => { setEndOpen(false); if (lastOpponent) startBattle(lastOpponent) }}
       ></EndBattleOverlay>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
    )
  }
 
 function BattleOverlay({ open, player, opponent, onClose, onEnd }) {
   const [playerHP, setPlayerHP] = useState(100)
   const [enemyHP, setEnemyHP] = useState(100)
   const [turn, setTurn] = useState('player')
   const [log, setLog] = useState([])
   const maxHP = 100
   const [playerAnim, setPlayerAnim] = useState('')
   const [enemyAnim, setEnemyAnim] = useState('')
   const [proj, setProj] = useState(null)
   const [audioEnabled, setAudioEnabled] = useState(() => {
     try { return localStorage.getItem('audio') !== 'off' } catch { return true }
   })
   const audioCtxRef = useRef(null)
   // metrics tracking
   const [turns, setTurns] = useState(0)
   const [damageDealt, setDamageDealt] = useState(0)
   const [damageTaken, setDamageTaken] = useState(0)
   const [superEffective, setSuperEffective] = useState(0)
   const [critical, setCritical] = useState(0)
   useEffect(() => {
     if (!open) return
     setPlayerHP(100)
     setEnemyHP(100)
     setTurn('player')
     setLog([])
     // reset metrics
     setTurns(0)
     setDamageDealt(0)
     setDamageTaken(0)
     setSuperEffective(0)
     setCritical(0)
   }, [open, player, opponent])

  // Tambahkan keyboard shortcuts: 1-4 untuk move, Esc untuk tutup
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (turn !== 'player') return;
      if (e.key === '1') playerMove('quick');
      else if (e.key === '2') playerMove('thunderbolt');
      else if (e.key === '3') playerMove('tackle');
      else if (e.key === '4') playerMove('heal');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, turn])

  // Damage & type system
  const MOVE_DATA = {
    quick: { power: 12, accuracy: 1.0, type: 'normal' },
    thunderbolt: { power: 20, accuracy: 0.9, type: 'electric' },
    tackle: { power: 10, accuracy: 0.95, type: 'normal' },
    // enemy moves
    hit: { power: 10, accuracy: 0.95, type: 'normal' },
    slam: { power: 12, accuracy: 0.9, type: 'normal' },
    bite: { power: 14, accuracy: 0.85, type: 'dark' },
  }
  function typeList(p) { return (p?.types || []).map(t => t.toLowerCase()) }
  function getTypeMultiplier(moveType, defenderTypes) {
    const chart = {
      electric: { super: ['water','flying'], not: ['electric','grass','dragon'], none: ['ground'] },
      normal:   { super: [], not: ['rock','steel'], none: ['ghost'] },
      dark:     { super: ['ghost','psychic'], not: ['dark','fighting','fairy'], none: [] },
    }
    const def = chart[moveType] || { super: [], not: [], none: [] }
    const types = defenderTypes || []
    if (types.some(t => def.none.includes(t))) return 0
    if (types.some(t => def.super.includes(t))) return 2
    if (types.some(t => def.not.includes(t))) return 0.5
    return 1
  }
  function calculateDamage(attacker, defender, moveKey) {
    const move = MOVE_DATA[moveKey]
    if (!move) return { dmg: 0, miss: true, crit: false, eff: 1, stab: 1 }
    // Accuracy check
    if (Math.random() > (move.accuracy ?? 1)) {
      return { dmg: 0, miss: true, crit: false, eff: 1, stab: 1 }
    }
    const attackerTypes = typeList(attacker)
    const defenderTypes = typeList(defender)
    const stab = attackerTypes.includes(move.type) ? 1.5 : 1
    const eff = getTypeMultiplier(move.type, defenderTypes)
    const crit = Math.random() < 0.1
    const variance = 0.85 + Math.random() * 0.15
    const base = move.power
    const dmgFloat = base * stab * eff * (crit ? 1.5 : 1) * variance
    const dmg = Math.max(1, Math.round(dmgFloat))
    return { dmg, miss: false, crit, eff, stab }
  }

  function addLog(msg) { setLog(prev => [...prev, msg].slice(-6)) }

  function ensureAudio() {
    if (!audioEnabled) return null
    let ctx = audioCtxRef.current
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx } catch { return null }
    }
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}) }
    return ctx
  }
  function playSfx(kind) {
    if (!audioEnabled) return
    const ctx = ensureAudio(); if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = kind === 'hit' ? 'square' : 'sine'
    const now = ctx.currentTime
    const freqMap = { attack: 440, hit: 220, heal: 660, ko: 180 }
    o.frequency.setValueAtTime(freqMap[kind] || 440, now)
    // simple envelope
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(kind === 'ko' ? 0.25 : 0.18, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'ko' ? 0.5 : 0.2))
    o.connect(g)
    g.connect(ctx.destination)
    o.start(now)
    o.stop(now + (kind === 'ko' ? 0.5 : 0.2))
  }

  function playerMove(move) {
    if (turn !== 'player') return
    if (move === 'heal') {
      playSfx('heal')
      const next = Math.min(maxHP, playerHP + 15)
      setPlayerHP(next)
      addLog(`${player.name} memulihkan HP +15`)
      setTurns(t => t + 1)
    } else {
      playSfx('attack')
      const result = calculateDamage(player, opponent, move)
      if (result.miss || result.eff === 0) {
        addLog(`${player.name} menyerang (${move}) ‒ Miss/Tidak berefek!`)
        setTurns(t => t + 1)
      } else {
        const next = Math.max(0, enemyHP - result.dmg)
        setEnemyHP(next)
        setPlayerAnim('attack'); setEnemyAnim('hit'); setProj({ from: 'player', move })
        setTimeout(() => { setPlayerAnim(''); setEnemyAnim(''); setProj(null) }, 500)
        playSfx('hit')
        let info = `${player.name} menyerang (${move}) ‒ ${result.dmg} DMG`
        if (result.crit) info += ` • Critical!`
        if (result.eff === 2) info += ` • Super efektif!`
        if (result.eff === 0.5) info += ` • Tidak terlalu efektif.`
        if (result.stab > 1) info += ` • STAB`
        addLog(info)
        // metrics
        setTurns(t => t + 1)
        setDamageDealt(d => d + result.dmg)
        if (result.eff === 2) setSuperEffective(s => s + 1)
        if (result.crit) setCritical(c => c + 1)
        if (next <= 0) {
          playSfx('ko')
          addLog(`${opponent.name} kalah!`)
          const metrics = { turns, damageDealt: damageDealt + result.dmg, damageTaken, superEffective: superEffective + (result.eff===2?1:0), critical: critical + (result.crit?1:0) }
          setTimeout(() => { onEnd({ result: 'win', metrics, player }); onClose() }, 800)
          return
        }
      }
    }
    setTurn('enemy')
    setTimeout(enemyTurn, 700)
  }

  function enemyTurn() {
    const moves = ['hit', 'slam', 'bite']
    const pick = moves[Math.floor(Math.random() * moves.length)]
    playSfx('attack')
    const result = calculateDamage(opponent, player, pick)
    if (result.miss || result.eff === 0) {
      addLog(`${opponent.name} menyerang (${pick}) ‒ Miss/Tidak berefek!`)
    } else {
      const next = Math.max(0, playerHP - result.dmg)
      setPlayerHP(next)
      setEnemyAnim('attack'); setPlayerAnim('hit'); setProj({ from: 'enemy', move: pick })
      setTimeout(() => { setEnemyAnim(''); setPlayerAnim(''); setProj(null) }, 500)
      playSfx('hit')
      let info = `${opponent.name} menyerang (${pick}) ‒ ${result.dmg} DMG`
      if (result.crit) info += ` • Critical!`
      if (result.eff === 2) info += ` • Super efektif!`
      if (result.eff === 0.5) info += ` • Tidak terlalu efektif.`
      if (result.stab > 1) info += ` • STAB`
      addLog(info)
      // metrics
      setDamageTaken(d => d + result.dmg)
      if (next <= 0) {
        playSfx('ko')
        addLog(`${player.name} kalah…`)
        const metrics = { turns, damageDealt, damageTaken: damageTaken + result.dmg, superEffective, critical }
        setTimeout(() => { onEnd({ result: 'lose', metrics, player }); onClose() }, 800)
        return
      }
    }
    setTurn('player')
  }

  // Jangan render jika belum siap
  if (!open || !player || !opponent) return null

  const playerHPpct = Math.round((playerHP / maxHP) * 100)
  const enemyHPpct = Math.round((enemyHP / maxHP) * 100)
  const playerHPColor = getHPColor(playerHPpct)
  const enemyHPColor = getHPColor(enemyHPpct)

  return (
    <div className="battle-backdrop" onClick={onClose}>
      <div className="battle-arena" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <button className="audio-toggle" onClick={() => setAudioEnabled(v => !v)} aria-label="Toggle audio">{audioEnabled ? '🔊' : '🔇'}</button>
        <div className="battle-entities">
          <div className="side player">
            <img className={`arena-pokemon ${playerAnim}`} src={player.sprite} alt={player.name} />
            <div className="hp-bar">
              <span>{player.name}</span>
              <div className="bar"><div className="fill" style={{ width: `${playerHPpct}%`, background: playerHPColor }} /></div>
              <span>{playerHP}/{maxHP}</span>
            </div>
          </div>
          <div className="side enemy">
            <img className={`arena-pokemon ${enemyAnim}`} src={opponent.sprite} alt={opponent.name} />
            <div className="hp-bar">
              <span>{opponent.name}</span>
              <div className="bar"><div className="fill enemy" style={{ width: `${enemyHPpct}%`, background: enemyHPColor }} /></div>
              <span>{enemyHP}/{maxHP}</span>
            </div>
          </div>
        </div>
        {proj && <div className={`projectile ${proj.from}`} />}
        <div className="battle-info">
          <div className={`turn-indicator ${turn === 'player' ? 'player' : 'enemy'}`}>{turn === 'player' ? 'Giliran Anda' : 'Giliran Lawan'}</div>
          <div className="hint">Shortcut: 1–4 untuk serangan, Esc untuk tutup</div>
        </div>
        <div className="battle-controls">
          <button className="move" disabled={turn !== 'player'} onClick={() => playerMove('quick')}>1. Quick Attack</button>
          <button className="move" disabled={turn !== 'player'} onClick={() => playerMove('thunderbolt')}>2. Thunderbolt</button>
          <button className="move" disabled={turn !== 'player'} onClick={() => playerMove('tackle')}>3. Tackle</button>
          <button className="move" disabled={turn !== 'player'} onClick={() => playerMove('heal')}>4. Heal</button>
        </div>
        {log.length > 0 && (
          <div className="battle-log">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}

function getHPColor(pct) { return pct >= 60 ? '#43a047' : pct >= 30 ? '#f1c40f' : '#e53935' }



function EndBattleOverlay({ open, data, onClose, onRematch }) {
  if (!open || !data) return null
  const { result, metrics, rewards } = data
  const isWin = result === 'win'
  const [confetti, setConfetti] = useState([])

  useEffect(() => {
    if (!open) return
    if (isWin) {
      const pieces = Array.from({ length: 40 }).map(() => ({
        left: Math.round(Math.random() * 100),
        size: Math.round(6 + Math.random() * 10),
        duration: (6 + Math.random() * 4).toFixed(2),
        delay: (Math.random() * 1.5).toFixed(2),
        color: ['#e74c3c','#f1c40f','#2ecc71','#3498db','#9b59b6'][Math.floor(Math.random() * 5)],
        rotateSpeed: (1 + Math.random() * 2).toFixed(2)
      }))
      setConfetti(pieces)
    } else {
      setConfetti([])
    }
  }, [open, isWin])

  return (
    <div className="end-backdrop" onClick={onClose}>
      <style>{`
        @keyframes confettiFall { from { transform: translateY(-120vh) rotate(0deg); opacity: 1; } to { transform: translateY(120vh) rotate(720deg); opacity: 0.6; } }
        @keyframes confettiSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hazePulse { 0% { opacity: 0.2; } 50% { opacity: 0.35; } 100% { opacity: 0.2; } }
        .confetti-container { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
        .confetti-piece { position: absolute; top: -10vh; border-radius: 2px; }
        .defeat-haze { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(closest-side, rgba(0,0,0,0.35), rgba(0,0,0,0)); animation: hazePulse 3s ease-in-out infinite; }
      `}</style>
      {isWin && (
        <div className="confetti-container" aria-hidden>
          {confetti.map((c, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${c.left}%`,
                width: `${c.size}px`,
                height: `${Math.round(c.size * 1.6)}px`,
                background: c.color,
                animation: `confettiFall ${c.duration}s linear ${c.delay}s`
              }}
            />
          ))}
        </div>
      )}
      {!isWin && <div className="defeat-haze" aria-hidden />}
      <div className={`end-arena ${isWin ? 'victory' : 'defeat'}`} onClick={e=>e.stopPropagation()}>
        <h2>{isWin ? 'Victory!' : 'Defeat'}</h2>
        <div className="end-summary">
          <div>Turns: {metrics?.turns ?? '-'}</div>
          <div>Damage dealt: {metrics?.damageDealt ?? '-'}</div>
          <div>Damage taken: {metrics?.damageTaken ?? '-'}</div>
          <div>Super effective: {metrics?.superEffective ?? 0}</div>
          <div>Critical hits: {metrics?.critical ?? 0}</div>
        </div>
        <div className="end-reward">
          <div className="reward-item coins"><span className="ri-icon" aria-hidden>🪙</span><span className="ri-label">Coins</span><span className="ri-value">+{rewards.coinsGain}</span></div>
          <div className="reward-item xp"><span className="ri-icon" aria-hidden>⭐</span><span className="ri-label">XP</span><span className="ri-value">+{rewards.xpGain}</span></div>
          {rewards.itemDrop ? (
            <div className="reward-item item"><span className="ri-icon" aria-hidden>🎁</span><span className="ri-label">Item</span><span className="ri-value">{rewards.itemDrop}</span></div>
          ) : (
            <div className="reward-item item none"><span className="ri-label">Item</span><span className="ri-value">Tidak ada</span></div>
          )}
          {rewards.weaponDrop ? (
            <div className="reward-item weapon"><span className="ri-icon" aria-hidden>🗡️</span><span className="ri-label">Weapon</span><span className="ri-value">{rewards.weaponDrop}</span></div>
          ) : null}
          {rewards.newAch?.length ? (
            <div className="reward-item ach"><span className="ri-icon" aria-hidden>🏆</span><span className="ri-label">Achievement</span><span className="ri-list">{rewards.newAch.join(', ')}</span></div>
          ) : null}
          {rewards.newBadges?.length ? (
            <div className="reward-item badge"><span className="ri-icon" aria-hidden>🎖️</span><span className="ri-label">Badge</span><span className="ri-list">{rewards.newBadges.join(', ')}</span></div>
          ) : null}
        </div>
        <div className="end-actions">
          <button className="battle-btn" onClick={onClose}>Lanjut</button>
          <button className="battle-btn" onClick={onRematch}>Ulang</button>
        </div>
      </div>
    </div>
  )
}
