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
// import EvoModal from './components/EvoModal'

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
  const statBonusKey = (user) => `statBonus:${user}`
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
  // Guard agar finalizeCapture hanya dieksekusi sekali per sesi capture
  const captureFinalizedRef = useRef(false)
  // Tambahkan overlay evolusi (animasi singkat saat evolve)
  const [evolveOpen, setEvolveOpen] = useState(false)
  const [evolveData, setEvolveData] = useState(null) // { from: {name, sprite}, to: {name, sprite} }
  // Evo guide modal state
  // const [evoOpen, setEvoOpen] = useState(false)
  const [xpMap, setXpMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem(xpKey(currentUser)) || '{}') } catch { return {} }
  })
  const [statBonusMap, setStatBonusMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem(statBonusKey(currentUser)) || '{}') } catch { return {} }
  })
  // Tambahan: cache info evolusi per Pokémon yang ditangkap
  const [evoInfoMap, setEvoInfoMap] = useState({})
  // duplicate captureTarget state removed
  // Tambahan: riwayat capture dari backend
  const [captureHistory, setCaptureHistory] = useState([])
  
  // State: mode pilih petarung dari tangkapan untuk battle
  const [selectForBattleMode, setSelectForBattleMode] = useState(false)
  const [pendingOpponent, setPendingOpponent] = useState(null)
  // XP per capture OID (live, dari DB dan pertarungan)
  const [xpByOidMap, setXpByOidMap] = useState({})
  useEffect(() => {
    if (!capturesOpen) return
    let cancelled = false
    api.getCaptures(currentUser)
      .then(list => { 
        if (!cancelled) {
          const arr = Array.isArray(list) ? list : []
          setCaptureHistory(arr)
          // sinkronkan xp per OID dari DB
          const next = {}
          for (const rec of arr) {
            if (rec && rec._id) next[rec._id] = rec.xpAtCapture || 0
          }
          setXpByOidMap(next)
        }
      })
      .catch(() => { if (!cancelled) { setCaptureHistory([]); setXpByOidMap({}) } })
    return () => { cancelled = true }
  }, [capturesOpen, currentUser])
  async function releaseCapture(idOrOid) {
    // Jika idOrOid string -> itu OID record; jika number -> pokemonId
    if (typeof idOrOid === 'string') {
      // delete satu record
      try { await api.deleteCaptureByOid(currentUser, idOrOid) } catch {}
      // refresh riwayat setelah delete selesai
      try {
        const list = await api.getCaptures(currentUser)
        setCaptureHistory(Array.isArray(list) ? list : [])
      } catch {
        setCaptureHistory([])
      }
      return
    }
    const id = idOrOid
    setCaptures(prev => {
      const arr = prev.filter(x => x !== id)
      try { localStorage.setItem(capKey(currentUser), JSON.stringify(arr)) } catch {}
      return arr
    })
    // sinkronkan ke backend (persist) dan hapus riwayat, lalu refresh
    try { await api.applyReward(currentUser, { captureRemove: id }) } catch {}
    try { await api.deleteCaptureByPokemon(currentUser, id) } catch {}
    try {
      const list = await api.getCaptures(currentUser)
      setCaptureHistory(Array.isArray(list) ? list : [])
    } catch {
      setCaptureHistory([])
    }
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
    // sinkronkan statBonusMap saat user berganti
    try { setStatBonusMap(JSON.parse(localStorage.getItem(statBonusKey(currentUser)) || '{}')) } catch { setStatBonusMap({}) }
    // pull captures dari backend untuk user ini (override local jika ada)
    try {
      void api.getUser(currentUser).then(u => {
        const srv = Array.isArray(u?.capturedIds) ? u.capturedIds : []
        if (srv.length) {
          setCaptures(Array.from(new Set(srv)))
          try { localStorage.setItem(capKey(currentUser), JSON.stringify(srv)) } catch {}
        }
      }).catch(() => {})
    } catch {}
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
     // Jika ada tangkapan, buka modal Captures dalam mode pemilihan petarung
     const hasLocalCaptures = captures && captures.length > 0
     const hasDbHistory = captureHistory && captureHistory.length > 0
     if (hasLocalCaptures || hasDbHistory) {
       setPendingOpponent(opponentPokemon)
       setSelectForBattleMode(true)
       setCapturesOpen(true)
       setToast({ type: 'success', message: 'Pilih petarung dari tangkapan Anda' })
       setTimeout(() => setToast(null), 1500)
       return
     }
     // Jika tidak ada tangkapan sama sekali, gunakan fallback lama
     const playerId = captures[0]
     const playerFromCapture = playerId ? pokemonMap.get(playerId) : null
     const fallbackPlayer = playerFromCapture || (pokemon.length ? pokemon[0] : opponentPokemon)
     setBattlePair({ player: fallbackPlayer, opponent: opponentPokemon })
     setLastOpponent(opponentPokemon)
     setBattleOpen(true)
   }

  // Handler ketika user memilih petarung dari modal tangkapan
  function handlePickForBattle(p) {
    if (!p) return
    const opp = pendingOpponent || lastOpponent || p
    setBattlePair({ player: p, opponent: opp })
    setLastOpponent(opp)
    setBattleOpen(true)
    setCapturesOpen(false)
    setSelectForBattleMode(false)
    setPendingOpponent(null)
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
    // XP per Pokemon (store map by id) atau per capture OID jika tersedia
    const pid = typeof payload === 'object' ? payload?.player?.id : battlePair.player?.id
    const captureOid = typeof payload === 'object' ? payload?.player?.captureOid : battlePair.player?.captureOid
    try {
      if (captureOid) {
        // Update XP per-capture OID secara lokal (UI live)
        setXpByOidMap(prev => {
          const next = { ...(prev || {}) }
          const prevXP = parseInt(next[captureOid] || '0') || 0
          next[captureOid] = prevXP + xpGain
          return next
        })
      } else {
        // Legacy: XP per species (pid)
        const map = JSON.parse(localStorage.getItem(xpKey(currentUser)) || '{}')
        const prevXP = parseInt(map[pid] || '0') || 0
        map[pid] = prevXP + xpGain
        localStorage.setItem(xpKey(currentUser), JSON.stringify(map))
        // sinkronkan state xpMap
        setXpMap(map)
        // cek kenaikan level dan terapkan bonus status +1%..+5% per level naik
        const prevLevel = xpToLevel(prevXP)
        const newLevel = xpToLevel(map[pid])
        const levelsGained = Math.max(0, newLevel - prevLevel)
        if (levelsGained > 0) {
          let addedPct = 0
          for (let i = 0; i < levelsGained; i++) {
            addedPct += 0.01 + Math.random() * 0.04
          }
          setStatBonusMap(prev => {
            const next = { ...(prev || {}) }
            const cur = parseFloat(next[pid] || '0') || 0
            next[pid] = cur + addedPct
            try { localStorage.setItem(statBonusKey(currentUser), JSON.stringify(next)) } catch {}
            return next
          })
        }
      }
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
      const payloadReward = { coinsGain, xpGain, itemDrop, weaponDrop, newBadges, newAch, result, metrics, streakWins: streakToSync }
      if (captureOid) payloadReward.captureOid = captureOid; else payloadReward.pid = pid
      void api.applyReward(currentUser, payloadReward).then((res) => {
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

  // Toggle favorit untuk Pokemon (menerima id atau objek Pokemon)
  function toggleFavorite(arg) {
    const id = typeof arg === 'object' ? arg?.id : arg
    if (!id) return
    setFavorites(prev => {
      const set = new Set(prev)
      const wasFav = set.has(id)
      if (wasFav) set.delete(id); else set.add(id)
      const arr = Array.from(set)
      try { localStorage.setItem('favorites', JSON.stringify(arr)) } catch {}
      setToast({ type: wasFav ? 'error' : 'success', message: wasFav ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit' })
      setTimeout(() => setToast(null), 1500)
      return arr
    })
  }

  // Mulai proses capture: buka overlay capture untuk pokemon yang dipilih
  function startCapture(p) {
    if (!p) return
    captureFinalizedRef.current = false
    setCaptureTarget(p)
    setCaptureOpen(true)
    setModalOpen(false)
  }

  // Finalize proses capture dari overlay
  function finalizeCapture(p, success, rate) {
    if (!p) return
    if (captureFinalizedRef.current) return
    captureFinalizedRef.current = true
    // tutup overlay
    setCaptureOpen(false)
    setCaptureTarget(null)
    if (success) {
      // tambah ke daftar captures secara unik
      setCaptures(prev => {
        const set = new Set(prev)
        set.add(p.id)
        const arr = Array.from(set)
        try { localStorage.setItem(capKey(currentUser), JSON.stringify(arr)) } catch {}
        // hitung variasi stat dan lucky
        const baseStats = Array.isArray(p.stats) ? p.stats : []
        const lucky = Math.random() < 0.00002 // 0.002%
        const bonusPct = lucky ? (0.45 + Math.random() * 0.15) : (0.02 + Math.random() * 0.13) // lucky: +45%..+60%, normal: +2%..+15%
        const finalStats = baseStats.map(s => ({ name: s.name, value: Math.round(s.value * (1 + bonusPct)) }))
        const xpAtCapture = (xpMap && xpMap[p.id]) || 0
        void api.addCapture(currentUser, {
          pokemonId: p.id,
          method: 'pokeball',
          rate,
          xpAtCapture,
          origin: 'capture',
          isLucky: lucky,
          variationPct: bonusPct,
          evolveBonusPct: 0,
          finalStats,
        })
        return arr
      })
      setToast({ type: 'success', message: `${p.name} tertangkap!` })
      setTimeout(() => setToast(null), 2000)
    } else {
      setToast({ type: 'error', message: `Gagal menangkap ${p.name}` })
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
            // onOpenEvo={() => setEvoOpen(true)}
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
          <CapturesModal open={capturesOpen} onClose={() => setCapturesOpen(false)} capturedList={captures} onRelease={releaseCapture} pokemonMap={pokemonMap} onEvolve={(arg) => evolvePokemon(arg, { setToast, xpMap, currentUser, setPokemon, setCaptures, setXpMap, statBonusMap, setStatBonusMap, xpByOidMap, setCaptureHistory, setEvolveOpen, setEvolveData })} xpMap={xpMap} xpToLevel={xpToLevel} evoInfoMap={evoInfoMap} captureHistory={captureHistory} setToast={setToast} selectForBattleMode={selectForBattleMode} onPickForBattle={(p) => {
            setBattlePair({ player: p, opponent: pendingOpponent })
            setSelectForBattleMode(false)
            setCapturesOpen(false)
            setBattleOpen(true)
          }} xpByOidMap={xpByOidMap} xpProgress={xpProgress} />
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
          <EvoModal
            open={evoOpen}
            onClose={() => setEvoOpen(false)}
            pokemonList={pokemon}
          />
          {/* Evolution animation overlay */}
          <EvolutionOverlay
            open={evolveOpen}
            data={evolveData}
            onClose={() => { setEvolveOpen(false); setEvolveData(null) }}
          />
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
  const lvl = Math.max(1, Math.floor((xp || 0) / base) + 1)
  return Math.min(100, lvl) // cap Lv 100
}
// Tambahan: progress (%) menuju level berikutnya
function xpProgress(xp) {
  const base = 150
  const lvl = xpToLevel(xp)
  if (lvl >= 100) return 100
  const rem = (xp || 0) % base
  return Math.round((rem / base) * 100)
}
// Ambil informasi evolusi dari PokeAPI
async function getEvolutionInfo(pid) {
  try {
    const species = await fetchJSON(`https://pokeapi.co/api/v2/pokemon-species/${pid}/`)
    const chainUrl = species?.evolution_chain?.url
    if (!chainUrl) return { error: 'no_chain' }
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
    if (!node) return { error: 'no_chain' }
    const next = (node.evolves_to || [])[0]
    if (!next) return { error: 'no_next' }
    const details = (next.evolution_details || [])[0] || {}
    const minLevel = details.min_level || null
    const targetName = next.species?.name
    if (!targetName) return { error: 'no_next' }
    return { targetName, minLevel }
  } catch (e) {
    return { error: 'network' }
  }
}
// Evolusi Pokemon jika level memenuhi
async function evolvePokemon(arg, ctx) {
  const { setToast, xpMap, currentUser, setPokemon, setCaptures, setXpMap, statBonusMap, setStatBonusMap, xpByOidMap, setCaptureHistory, setEvolveOpen, setEvolveData } = ctx || {}
  const pid = typeof arg === 'object' && arg !== null ? arg.pid : arg
  const captureOid = typeof arg === 'object' && arg !== null ? arg.captureOid : null
  const liveXPArg = typeof arg === 'object' && arg !== null ? arg.liveXP : null
  try {
    const info = await getEvolutionInfo(pid)
    if (!info || info.error) {
      if (info && info.error === 'network') {
        setToast({ type: 'error', message: 'Gagal mengambil data evolusi dari PokeAPI. Coba lagi.' })
      } else {
        setToast({ type: 'error', message: 'Pokemon ini tidak memiliki evolusi atau data chain tidak ditemukan.' })
      }
      setTimeout(() => setToast(null), 2000)
      return
    }
    // Tentukan XP saat ini: prioritaskan liveXP dari UI/DB per OID, lalu fallback ke xpMap per species
    let currentXP = 0
    if (liveXPArg != null) {
      currentXP = liveXPArg
    } else if (captureOid && xpByOidMap && xpByOidMap[captureOid] != null) {
      currentXP = xpByOidMap[captureOid]
    } else {
      currentXP = (xpMap && xpMap[pid]) || 0
    }
    const currentLevel = xpToLevel(currentXP)
    if (info.minLevel && currentLevel < info.minLevel) {
      setToast({ type: 'error', message: `Level belum memenuhi (butuh Lv ${info.minLevel}).` })
      setTimeout(() => setToast(null), 2000)
      return
    }
    // Ambil detail pokemon sebelum evolusi untuk basis peningkatan
    const preDetail = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${pid}`)
    const preStats = (preDetail.stats || []).map(s => ({ name: s.stat?.name, value: s.base_stat }))
    const preSprite = preDetail.sprites?.other?.['official-artwork']?.front_default || preDetail.sprites?.front_default
    const preBonus = (statBonusMap && statBonusMap[pid]) || 0
    const currentStatsBeforeEvolve = preStats.map(s => ({ name: s.name, value: Math.round(s.value * (1 + preBonus)) }))
    // Ambil detail pokemon hasil evolusi
    const evolvedDetail = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${info.targetName}`)
    const evolvedSprite = evolvedDetail.sprites?.other?.['official-artwork']?.front_default || evolvedDetail.sprites?.front_default
    const evolved = {
      id: evolvedDetail.id,
      name: evolvedDetail.name,
      sprite: evolvedSprite,
      types: (evolvedDetail.types || []).map(t => t.type?.name).filter(Boolean),
      abilities: (evolvedDetail.abilities || []).map(a => a.ability?.name).filter(Boolean),
      stats: (evolvedDetail.stats || []).map(s => ({ name: s.stat?.name, value: s.base_stat }))
    }
    // Tampilkan overlay animasi evolusi singkat
    if (typeof setEvolveOpen === 'function' && typeof setEvolveData === 'function') {
      setEvolveData({ from: { name: preDetail?.name, sprite: preSprite }, to: { name: evolved.name, sprite: evolvedSprite } })
      setEvolveOpen(true)
      // Tunggu animasi singkat sebelum menerapkan perubahan
      await new Promise((resolve) => setTimeout(resolve, 1400))
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
      // sinkronkan ke backend (persist perubahan evolusi)
      try { void api.applyReward(currentUser, { captureRemove: pid, captureAdd: evolved.id }) } catch {}
      return arr
    })
    // Reset XP dari id lama ke id baru
    setXpMap(prev => {
      const next = { ...(prev || {}) }
      delete next[pid]
      next[evolved.id] = 0
      try { localStorage.setItem(xpKey(currentUser), JSON.stringify(next)) } catch {}
      return next
    })
    // Reset bonus level ke ID evolusi
    setStatBonusMap(prev => {
      const next = { ...(prev || {}) }
      delete next[pid]
      next[evolved.id] = 0
      try { localStorage.setItem(statBonusKey(currentUser), JSON.stringify(next)) } catch {}
      return next
    })
    // Catat riwayat evolve dengan bonus status acak 50%..70% berbasis base stat evolusi
    try {
      const EVOLVE_BONUS_PCT = 0.50 + Math.random() * 0.20 // +50%..+70%
      const finalStats = (evolved.stats || []).map(s => ({ name: s.name, value: Math.round(s.value * (1 + EVOLVE_BONUS_PCT)) }))
      void api.addCapture(currentUser, {
        pokemonId: evolved.id,
        method: 'evolve',
        xpAtCapture: 0,
        origin: 'evolved',
        isLucky: false,
        variationPct: 0,
        evolveBonusPct: EVOLVE_BONUS_PCT,
        finalStats,
      })
    } catch {}
    // Hapus catatan lama dari database sesuai permintaan pengguna
    try {
      if (captureOid) {
        await api.deleteCaptureByOid(currentUser, captureOid)
      } else {
        await api.deleteCaptureByPokemon(currentUser, pid)
      }
      // Refresh riwayat setelah penghapusan supaya UI langsung ter-update
      if (typeof setCaptureHistory === 'function') {
        const list = await api.getCaptures(currentUser)
        setCaptureHistory(Array.isArray(list) ? list : [])
      }
    } catch {}
    setToast({ type: 'success', message: `Berhasil evolve ke ${evolved.name}!` })
    setTimeout(() => setToast(null), 2000)
  } catch (e) {
    setToast({ type: 'error', message: 'Gagal melakukan evolusi.' })
    setTimeout(() => setToast(null), 2000)
  }
}

// Overlay animasi evolusi sederhana
function EvolutionOverlay({ open, data, onClose }) {
  const [stage, setStage] = useState('start') // start | glow | transform | done
  useEffect(() => {
    if (!open || !data) return
    const timers = []
    setStage('glow')
    timers.push(setTimeout(() => setStage('transform'), 600))
    timers.push(setTimeout(() => setStage('done'), 1200))
    timers.push(setTimeout(() => { if (typeof onClose === 'function') onClose() }, 1600))
    return () => { timers.forEach(t => clearTimeout(t)) }
  }, [open, data])
  if (!open || !data) return null
  return (
    <div className="evolve-backdrop" onClick={onClose}>
      <div className="evolve-arena" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <div className={`evolve-energy ${stage}`}></div>
        <div className="evolve-entities">
          <div className={`old-form ${stage}`}>
            <img src={data.from?.sprite} alt={data.from?.name || 'old'} />
            <div className="label">{data.from?.name}</div>
          </div>
          <div className={`new-form ${stage}`}>
            <img src={data.to?.sprite} alt={data.to?.name || 'new'} />
            <div className="label">{data.to?.name}</div>
          </div>
        </div>
        <div className="evolve-info">
          <h3>Meng-evolve {data.from?.name} → {data.to?.name}</h3>
          <p>Transformasi berlangsung…</p>
        </div>
      </div>
    </div>
  )
}
