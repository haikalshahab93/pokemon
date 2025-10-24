import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function EvoPage({ pokemonList = [] }) {
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [levels, setLevels] = React.useState([]) // array of stages; each stage: [{ name, details }]
  const [sprites, setSprites] = React.useState({}) // name -> { id, sprite }
  const [showFullChain, setShowFullChain] = React.useState(true)
  const [suggestionsSource, setSuggestionsSource] = React.useState(pokemonList)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // If no external list provided, fetch a small list for suggestions (with caching)
  React.useEffect(() => {
    if (!pokemonList || pokemonList.length === 0) {
      (async () => {
        try {
          const cached = (() => { try { const s = sessionStorage.getItem('evo_suggestions'); return s ? JSON.parse(s) : null } catch { return null } })()
          if (cached && Array.isArray(cached) && cached.length > 0) {
            setSuggestionsSource(cached)
            return
          }
          const json = await fetchCachedJSON('https://pokeapi.co/api/v2/pokemon?limit=120&offset=0')
          const arr = (json.results || []).map((r, idx) => {
            const idMatch = r.url.match(/\/pokemon\/(\d+)\//)
            const id = idMatch ? Number(idMatch[1]) : idx + 1
            return { id, name: r.name }
          })
          setSuggestionsSource(arr)
          try { sessionStorage.setItem('evo_suggestions', JSON.stringify(arr)) } catch {}
        } catch {
          setSuggestionsSource([])
        }
      })()
    } else {
      setSuggestionsSource(pokemonList)
    }
  }, [pokemonList])

  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return suggestionsSource.slice(0, 20)
    return suggestionsSource.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20)
  }, [query, suggestionsSource])

  const fetchJSON = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('network')
    return res.json()
  }

  const traverseChain = (node, level, acc, incomingDetails) => {
    if (!node) return
    if (!acc[level]) acc[level] = []
    acc[level].push({ name: node.species?.name, details: incomingDetails || null })
    const children = Array.isArray(node.evolves_to) ? node.evolves_to : []
    for (const child of children) {
      const det = (child.evolution_details || [])[0] || null
      traverseChain(child, level + 1, acc, det)
    }
  }

  const findNodeByName = (node, targetName) => {
    if (!node) return null
    if (node.species?.name === targetName) return node
    for (const child of (node.evolves_to || [])) {
      const found = findNodeByName(child, targetName)
      if (found) return found
    }
    return null
  }

  // Cached JSON fetcher for PokeAPI responses
  const fetchCachedJSON = async (url) => {
    const key = `evo_cache:${url}`
    try {
      const s = sessionStorage.getItem(key)
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed) return parsed
      }
    } catch {}
    const res = await fetch(url)
    if (!res.ok) throw new Error('network')
    const json = await res.json()
    try { sessionStorage.setItem(key, JSON.stringify(json)) } catch {}
    return json
  }

  const loadChainFor = async (nameOrId) => {
    if (!nameOrId) return
    const normalized = String(nameOrId).trim().toLowerCase()
    setLoading(true); setError('')
    try {
      const species = await fetchCachedJSON(`https://pokeapi.co/api/v2/pokemon-species/${normalized}/`)
      const chainUrl = species?.evolution_chain?.url
      if (!chainUrl) throw new Error('no_chain')
      const chain = await fetchCachedJSON(chainUrl)
      const base = chain?.chain
      if (!base) throw new Error('no_chain')
      const acc = []
      if (showFullChain) {
        traverseChain(base, 0, acc, null)
      } else {
        const node = findNodeByName(base, species?.name)
        if (!node) throw new Error('no_node')
        traverseChain(node, 0, acc, null)
      }
      const names = Array.from(new Set(acc.flat().map(x => x.name).filter(Boolean)))
      const details = await Promise.all(names.map(async (nm) => {
        try {
          const d = await fetchCachedJSON(`https://pokeapi.co/api/v2/pokemon/${nm}`)
          const sprite = d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default
          return { name: nm, id: d.id, sprite }
        } catch {
          return { name: nm, id: null, sprite: null }
        }
      }))
      const map = {}
      for (const it of details) map[it.name] = { id: it.id, sprite: it.sprite }
      setSprites(map)
      setLevels(acc)
      // sync URL params
      setSearchParams({ q: normalized, full: showFullChain ? '1' : '0' }, { replace: true })
    } catch (e) {
      const msg = e?.message === 'no_chain' ? 'Tidak ada evolution chain.' : (e?.message === 'no_node' ? 'Spesies tidak ditemukan dalam chain.' : 'Gagal memuat data evolusi.')
      setError(msg)
      setLevels([])
      setSprites({})
    } finally {
      setLoading(false)
    }
  }

  // Read query params and preload if present
  React.useEffect(() => {
    const qParam = (searchParams.get('q') || '').trim().toLowerCase()
    const fullParam = searchParams.get('full')
    if (fullParam != null) {
      const full = fullParam === '1' || fullParam === 'true'
      setShowFullChain(full)
    }
    if (qParam) {
      setQuery(qParam)
      if (!loading && (!levels || levels.length === 0)) {
        loadChainFor(qParam)
      }
    }
  }, [searchParams])

  return (
    <div className="evo-page" style={{ padding: '24px 20px' }}>
      <div className="evo-page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="captures-menu" onClick={() => { try { if (window.history.length > 1) navigate(-1); else navigate('/') } catch { navigate('/') } }} title="Kembali">← Back</button>
        <img className="auth-logo" src="/pokeball.svg" alt="Evo" />
        <div>
          <h2 style={{ margin: 0 }}>Panduan Evolusi</h2>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>Telusuri tahapan dari awal hingga evolusi terakhir, termasuk syarat level.</div>
        </div>
      </div>
      <div className="evo-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari atau pilih Pokémon awal…"
            className="input"
          />
        </div>
        <label className="cap-toggle" title="Tampilkan seluruh chain dari base" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showFullChain} onChange={(e) => setShowFullChain(e.target.checked)} />
          Full chain
        </label>
        <button className="captures-menu" disabled={!query} onClick={() => { const q = query.trim().toLowerCase(); if (!q) return; setSearchParams({ q, full: showFullChain ? '1' : '0' }); loadChainFor(q); }}>{loading ? 'Memuat…' : 'Lihat Evo'}</button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="chips evo-suggest" style={{ marginBottom: 12 }}>
          {suggestions.map(p => (
            <button key={p.id} className="chip" onClick={() => { setQuery(p.name); setSearchParams({ q: p.name, full: showFullChain ? '1' : '0' }); loadChainFor(p.name) }} title={`Pilih ${p.name}`}>{p.name}</button>
          ))}
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}

      {!error && levels.length > 0 && (
        <div className="evo-stages">
          {levels.map((stage, idx) => (
            <div className="evo-stage" key={`stage-${idx}`}>
              <div className="stage-title">Tahap {idx + 1}</div>
              <div className="stage-list">
                {stage.map((it) => {
                  const sp = sprites[it.name] || {}
                  const det = it.details || {}
                  const reqs = []
                  if (det.min_level) reqs.push(`Lv ≥ ${det.min_level}`)
                  if (det.trigger?.name && det.trigger.name !== 'level-up') reqs.push(`${det.trigger.name}`)
                  if (det.item?.name) reqs.push(`Item: ${det.item.name}`)
                  if (det.held_item?.name) reqs.push(`Held: ${det.held_item.name}`)
                  if (det.time_of_day) reqs.push(`Waktu: ${det.time_of_day}`)
                  return (
                    <div className="evo-card" key={it.name}>
                      <div className="evo-art">
                        {sp.sprite ? (
                          <img src={sp.sprite} alt={it.name} />
                        ) : (
                          <div className="evo-art placeholder">?</div>
                        )}
                      </div>
                      <div className="evo-name">{it.name}</div>
                      {reqs.length > 0 && (
                        <div className="evo-reqs" title="Syarat evolusi">
                          {reqs.join(' • ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}