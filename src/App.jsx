import { useEffect, useMemo, useState, useRef } from 'react'
import './App.css'
import BattleOverlay from './components/BattleOverlay'
import EndBattleOverlay from './components/EndBattleOverlay'
import { api } from './services/api'
import Header from './components/Header'
import PokemonCard from './components/PokemonCard'
import Modal from './components/Modal'
import CapturesModal from './components/CapturesModal'
import CaptureOverlay from './components/CaptureOverlay'
import LoginModal from './components/LoginModal'
import BagModal from './components/BagModal'

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'))
  const [loginOpen, setLoginOpen] = useState(() => !localStorage.getItem('token'))
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
  // Tambah state untuk Login & Bag
  const [bagOpen, setBagOpen] = useState(false)
  // Senjata dari server
  const [weapons, setWeapons] = useState([])
  const [battleOpen, setBattleOpen] = useState(false)
  const [battlePair, setBattlePair] = useState({ player: null, opponent: null })
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureTarget, setCaptureTarget] = useState(null)
  // State XP per Pokemon (per user)
  const [xpMap, setXpMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem(xpKey(currentUser)) || '{}') } catch { return {} }
  })
  // duplicate captureTarget state removed

  // Favorites toggle
  function toggleFavorite(id) {
    setFavorites(prev => {
      const set = new Set(prev)
      if (set.has(id)) set.delete(id); else set.add(id)
      const arr = Array.from(set)
      try { localStorage.setItem('favorites', JSON.stringify(arr)) } catch {}
      return arr
    })
  }

  // Capture flow
  function startCapture(p) {
    setCaptureTarget(p)
    setCaptureOpen(true)
  }
  function finalizeCapture(pokemon, success, rate) {
    if (success) {
      setCaptures(prev => {
        const set = new Set(prev); set.add(pokemon.id)
        const arr = Array.from(set)
        try { localStorage.setItem(capKey(currentUser), JSON.stringify(arr)) } catch {}
        return arr
      })
      setToast({ type: 'success', message: `Berhasil menangkap ${pokemon.name}!` })
    } else {
      setToast({ type: 'error', message: `Gagal menangkap ${pokemon.name}.` })
    }
    setTimeout(() => setToast(null), 2000)
  }
  function releaseCapture(id) {
    setCaptures(prev => {
      const arr = prev.filter(x => x !== id)
      try { localStorage.setItem(capKey(currentUser), JSON.stringify(arr)) } catch {}
      return arr
    })
  }

  // Pokemon list loader
  async function loadMore() {
    if (!nextUrl) return
    setLoading(true)
    setError('')
    try {
      const list = await fetchJSON(nextUrl)
      const details = await Promise.all((list?.results || []).map(r => fetchJSON(r.url)))
      const mapped = details.map(d => ({
        id: d.id,
        name: d.name,
        sprite: d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default,
        types: (d.types || []).map(t => t.type?.name).filter(Boolean),
        abilities: (d.abilities || []).map(a => a.ability?.name).filter(Boolean),
        stats: (d.stats || []).map(s => ({ name: s.stat?.name, value: s.base_stat }))
      }))
      setPokemon(prev => {
        const map = new Map(prev.map(x => [x.id, x]))
        for (const m of mapped) {
          if (!map.has(m.id)) map.set(m.id, m)
        }
        return Array.from(map.values())
      })
      setNextUrl(list?.next || '')
    } catch (e) {
      setError(e?.message || 'Gagal memuat Pokemon')
    } finally {
      setLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    let ignore = false
    fetchJSON('https://pokeapi.co/api/v2/type')
      .then((d) => { if (!ignore) setTypes((d?.results || []).map(x => x.name)) })
      .catch(() => { if (!ignore) setTypes([]) })
    return () => { ignore = true }
  }, [])
  useEffect(() => { void loadMore() }, [])
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(capKey(currentUser)) || '[]')
      setCaptures(Array.from(new Set(arr)))
    } catch {
      setCaptures([])
    }
    // sinkronkan xpMap saat user berganti
    try { setXpMap(JSON.parse(localStorage.getItem(xpKey(currentUser)) || '{}')) } catch { setXpMap({}) }
  }, [currentUser])

  // Auto-logout settings and handler
  const INACTIVITY_LIMIT_MS = 10 * 60 * 1000 // 10 menit
  const autoLogoutTimerRef = useRef(null)
  useEffect(() => {
    if (!isAuthenticated) return
    function reset() {
      if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current)
      autoLogoutTimerRef.current = setTimeout(() => handleLogout('timeout'), INACTIVITY_LIMIT_MS)
    }
    const events = ['mousemove','keydown','click','touchstart','scroll']
    events.forEach(ev => document.addEventListener(ev, reset))
    reset()
    return () => {
      events.forEach(ev => document.removeEventListener(ev, reset))
      if (autoLogoutTimerRef.current) clearTimeout(autoLogoutTimerRef.current)
    }
  }, [isAuthenticated])

  function handleLogout(reason) {
    try { localStorage.removeItem('token') } catch {}
    setIsAuthenticated(false)
    setLoginOpen(true)
    setToast({ type: reason === 'timeout' ? 'error' : 'success', message: reason === 'timeout' ? 'Sesi berakhir, silakan login lagi' : 'Berhasil logout' })
    setTimeout(() => setToast(null), 2000)
  }

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
       const baseWeapon = ({ Easy: 0.25, Normal: 0.30, Hard: 0.35, Insane: 0.40 }[difficulty] || 0.30)
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
     return { coinsGain, xpGain, itemDrop, weaponDrop, newAch }
   }
  function handleBattleEnd(payload) {
    const result = typeof payload === 'string' ? payload : payload?.result
    const metrics = typeof payload === 'object' ? payload?.metrics : null
    const { coinsGain, xpGain, itemDrop, weaponDrop, newAch } = calculateRewards(result, metrics || { damageDealt: result==='win'?100:0, damageTaken: result==='lose'?100:0, turns: 0, superEffective: 0 })
    setCoins(prev => { const next = prev + coinsGain; localStorage.setItem(coinsKey(currentUser), String(next)); return next })
    // XP per Pokemon (store map by id)
    const pid = typeof payload === 'object' ? payload?.player?.id : battlePair.player?.id
   try {
     const map = JSON.parse(localStorage.getItem(xpKey(currentUser)) || '{}')
     const prevXP = parseInt(map[pid] || '0') || 0
     map[pid] = prevXP + xpGain
     localStorage.setItem(xpKey(currentUser), JSON.stringify(map))
     // sinkronkan state xpMap
     setXpMap(map)
   } catch {}
   // Inventory
   if (itemDrop) {
     setInventory(prev => { const next = [...prev, itemDrop]; localStorage.setItem(invKey(currentUser), JSON.stringify(next)); return next })
   }
   if (weaponDrop) {
     setInventory(prev => { const next = [...prev, weaponDrop]; localStorage.setItem(invKey(currentUser), JSON.stringify(next)); return next })
   }
   // Streak & pity
   let newBadges = []
   let streakToSync = streakWins
   if (result === 'win') {
     const nextStreak = streakWins + 1
     streakToSync = nextStreak
     setStreakWins(nextStreak); localStorage.setItem(streakKey(currentUser), String(nextStreak))
     const nextPity = Math.max(0, pityBonus - 10); setPityBonus(nextPity); localStorage.setItem(pityKey(currentUser), String(nextPity))
     // Badges
     if (!badges.includes('First Win')) newBadges.push('First Win')
     if (nextStreak >= 5 && !badges.includes('Streak 5')) newBadges.push('Streak 5')
     if (nextStreak >= 10 && !badges.includes('Streak 10')) newBadges.push('Streak 10')
     if (difficulty === 'Insane' && !badges.includes('Insane Victor')) newBadges.push('Insane Victor')
   } else {
     streakToSync = 0
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
   // Sinkron ke backend (fire-and-forget)
   try {
     void api.applyReward(currentUser, { coinsGain, xpGain, pid, itemDrop, weaponDrop, newBadges, newAch, result, metrics, streakWins: streakToSync }).then((res) => {
       const u = res?.user
       if (u?.weapons) setWeapons(u.weapons)
     }).catch((e) => {
       console.warn('Apply reward gagal:', e?.message || e)
     })
   } catch (e) { /* ignore */ }
}

// Tambah handler register & login untuk LoginModal
async function handleRegister(u, p) {
  try {
    await api.register(u, p)
    await api.login(u, p)
    setUsers(prev => { const set = new Set(prev); set.add(u); const arr = Array.from(set); localStorage.setItem('users', JSON.stringify(arr)); return arr })
    setCurrentUser(u); localStorage.setItem('user', u)
    setIsAuthenticated(true)
    setLoginOpen(false)
    setToast({ type: 'success', message: 'Berhasil daftar & login' })
    setTimeout(() => setToast(null), 2000)
  } catch (e) {
    setToast({ type: 'error', message: e?.message || 'Gagal daftar' })
    setTimeout(() => setToast(null), 2000)
  }
}
async function handleLogin(u, p) {
  try {
    await api.login(u, p)
    setUsers(prev => { const set = new Set(prev); set.add(u); const arr = Array.from(set); localStorage.setItem('users', JSON.stringify(arr)); return arr })
    setCurrentUser(u); localStorage.setItem('user', u)
    setIsAuthenticated(true)
    setLoginOpen(false)
    setToast({ type: 'success', message: 'Berhasil login' })
    setTimeout(() => setToast(null), 2000)
  } catch (e) {
    setToast({ type: 'error', message: e?.message || 'Gagal login' })
    setTimeout(() => setToast(null), 2000)
  }
}

  return (
    <div className="app">
      {isAuthenticated ? (
        <>
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
            onOpenLogin={() => setLoginOpen(true)}
            onOpenBag={() => setBagOpen(true)}
            isAuthenticated={isAuthenticated}
            onLogout={() => handleLogout('manual')}
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
          <CapturesModal open={capturesOpen} onClose={() => setCapturesOpen(false)} capturedList={captures} onRelease={releaseCapture} pokemonMap={pokemonMap} onEvolve={evolvePokemon} xpMap={xpMap} xpToLevel={xpToLevel} />
         
          <CaptureOverlay
            open={captureOpen}
            pokemon={captureTarget}
            onClose={() => { setCaptureOpen(false); setCaptureTarget(null) }}
            onFinalize={(p, success, rate) => finalizeCapture(p, success, rate)}
          />
         
          <BagModal
            open={bagOpen}
            onClose={() => setBagOpen(false)}
            coins={coins}
            inventory={inventory}
            weapons={weapons}
            badges={badges}
            achievements={achievements}
          />
         
          <>
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
            />
          </>
        </>
      ) : (
        <>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <h2>Silakan login atau daftar untuk melanjutkan</h2>
            <p>Autentikasi diperlukan sebelum mengakses Pokédex.</p>
            <button className="login-btn" onClick={() => setLoginOpen(true)}>Buka Login</button>
          </div>
        </>
      )}
     
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        users={users}
      />
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  )
}

// Utility: hitung level dari XP (linear sederhana agar mudah dipahami)
function xpToLevel(xp) {
  const base = 150 // XP per level
  return Math.max(1, Math.floor((xp || 0) / base) + 1)
}
// Ambil informasi evolusi dari PokeAPI
async function getEvolutionInfo(pid) {
  try {
    const species = await fetchJSON(`https://pokeapi.co/api/v2/pokemon-species/${pid}/`)
    const chainUrl = species?.evolution_chain?.url
    if (!chainUrl) return null
    const chain = await fetchJSON(chainUrl)
    const myName = species?.name
    function findNode(node) {
      if (!node) return null
      if (node.species?.name === myName) return node
      for (const child of (node.evolves_to || [])) {
        const found = findNode(child)
        if (found) return found
      }
      return null
    }
    const node = findNode(chain?.chain)
    if (!node) return null
    const next = (node.evolves_to || [])[0]
    if (!next) return null
    const details = (next.evolution_details || [])[0] || {}
    const minLevel = details.min_level || null
    const targetName = next.species?.name
    if (!targetName) return null
    return { targetName, minLevel }
  } catch (e) {
    return null
  }
}
// Evolusi Pokemon jika level memenuhi
async function evolvePokemon(pid) {
  try {
    const info = await getEvolutionInfo(pid)
    if (!info) {
      setToast({ type: 'error', message: 'Pokemon ini tidak memiliki evolusi.' })
      setTimeout(() => setToast(null), 2000)
      return
    }
    const currentXP = (xpMap && xpMap[pid]) || 0
    const currentLevel = xpToLevel(currentXP)
    if (info.minLevel && currentLevel < info.minLevel) {
      setToast({ type: 'error', message: `Level belum memenuhi (butuh Lv ${info.minLevel}).` })
      setTimeout(() => setToast(null), 2000)
      return
    }
    // Ambil detail pokemon hasil evolusi
    const evolvedDetail = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${info.targetName}`)
    const evolved = {
      id: evolvedDetail.id,
      name: evolvedDetail.name,
      sprite: evolvedDetail.sprites?.other?.['official-artwork']?.front_default || evolvedDetail.sprites?.front_default,
      types: (evolvedDetail.types || []).map(t => t.type?.name).filter(Boolean),
      abilities: (evolvedDetail.abilities || []).map(a => a.ability?.name).filter(Boolean),
      stats: (evolvedDetail.stats || []).map(s => ({ name: s.stat?.name, value: s.base_stat }))
    }
    // Upsert ke daftar pokemon supaya sprite/nama tersedia
    setPokemon(prev => {
      const map = new Map(prev.map(x => [x.id, x]))
      map.set(evolved.id, evolved)
      return Array.from(map.values())
    })
    // Update captures: ganti id lama dengan id evolusi
    setCaptures(prev => {
      const set = new Set(prev)
      set.delete(pid)
      set.add(evolved.id)
      const arr = Array.from(set)
      try { localStorage.setItem(capKey(currentUser), JSON.stringify(arr)) } catch {}
      return arr
    })
    // Transfer XP dari id lama ke id baru
    setXpMap(prev => {
      const next = { ...(prev || {}) }
      const carry = next[pid] || 0
      delete next[pid]
      next[evolved.id] = (next[evolved.id] || 0) + carry
      try { localStorage.setItem(xpKey(currentUser), JSON.stringify(next)) } catch {}
      return next
    })
    setToast({ type: 'success', message: `Berhasil evolve ke ${evolved.name}!` })
    setTimeout(() => setToast(null), 2000)
  } catch (e) {
    setToast({ type: 'error', message: 'Gagal melakukan evolusi.' })
    setTimeout(() => setToast(null), 2000)
  }
}
