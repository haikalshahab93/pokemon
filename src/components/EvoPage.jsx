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
  const [selectedInfo, setSelectedInfo] = React.useState(null) // detailed info for first/current species
  const [typeEff, setTypeEff] = React.useState({ weak: [], resist: [], immune: [] })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loadingCards, setLoadingCards] = React.useState(false)
  // tambahan: selector bahasa dan cache species raw
  const [selectedLang, setSelectedLang] = React.useState('en')
  const [speciesLangs, setSpeciesLangs] = React.useState([])
  const [selectedSpeciesRaw, setSelectedSpeciesRaw] = React.useState(null)

  // TTL cache wrapper
  const fetchCachedJSONWithTTL = async (url, ttlMs = 6 * 60 * 60 * 1000) => {
    const key = `evo_cache:${url}`
    try {
      const s = sessionStorage.getItem(key)
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed && parsed._ts && (Date.now() - parsed._ts) < ttlMs) {
          return parsed.data
        }
      }
    } catch {}
    const res = await fetch(url)
    if (!res.ok) throw new Error('network')
    const json = await res.json()
    try { sessionStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data: json })) } catch {}
    return json
  }

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
          const json = await fetchCachedJSONWithTTL('https://pokeapi.co/api/v2/pokemon?limit=120&offset=0')
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

  const TYPE_ICONS = {
    normal: '⚪', fire: '🔥', water: '💧', grass: '🍃', electric: '⚡', ice: '❄️', fighting: '🥊', poison: '☠️', ground: '🥾', flying: '🪽', psychic: '🔮', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉', dark: '🌑', steel: '🔩', fairy: '✨'
  }
  const getTypeLabel = (t) => `${TYPE_ICONS[t] || ''} ${t}`
  
  const statClass = (name) => {
    switch (name) {
      case 'hp': return 'hp'
      case 'attack': return 'attack'
      case 'defense': return 'defense'
      case 'special-attack': return 'spa'
      case 'special-defense': return 'spd'
      case 'speed': return 'spe'
      default: return ''
    }
  }
  
  // compute type effectiveness multipliers using PokeAPI type damage_relations
  const computeTypeEffectiveness = async (types, fetcher) => {
    const multipliers = {} // targetType -> multiplier
    for (const t of types) {
      const data = await fetcher(`https://pokeapi.co/api/v2/type/${t}`)
      const dr = data.damage_relations || {}
      const inc = (list, factor) => {
        for (const it of (list || [])) {
          const name = it.name
          multipliers[name] = (multipliers[name] ?? 1) * factor
        }
      }
      inc(dr.double_damage_from, 2)
      inc(dr.half_damage_from, 0.5)
      inc(dr.no_damage_from, 0)
    }
    // Normalize: ensure any missing types are 1
    const allTypes = Object.keys(TYPE_ICONS)
    for (const tt of allTypes) multipliers[tt] = multipliers[tt] ?? 1
    const weak = Object.entries(multipliers).filter(([, m]) => m > 1).sort((a,b)=>b[1]-a[1])
    const resist = Object.entries(multipliers).filter(([, m]) => m > 0 && m < 1).sort((a,b)=>a[1]-b[1])
    const immune = Object.entries(multipliers).filter(([, m]) => m === 0)
    return { weak, resist, immune }
  }

  const loadDexInfo = async (name) => {
    try {
      const d = await fetchCachedJSONWithTTL(`https://pokeapi.co/api/v2/pokemon/${name}`)
      const s = await fetchCachedJSONWithTTL(`https://pokeapi.co/api/v2/pokemon-species/${name}`)
      const types = (d.types || []).map(t => t.type?.name)
      const abilities = (d.abilities || []).map(a => a.ability?.name)
      const stats = (d.stats || []).map(st => ({ name: st.stat?.name, value: st.base_stat }))
      const height = d.height
      const weight = d.weight
      const egg_groups = (s.egg_groups || []).map(e => e.name)
      const habitat = s.habitat?.name || null
      const growth_rate = s.growth_rate?.name || null
      const color = s.color?.name || null

      // bahasa tersedia
      const langSet = new Set()
      ;(s.genera || []).forEach(g => { if (g.language?.name) langSet.add(g.language.name) })
      ;(s.flavor_text_entries || []).forEach(ft => { if (ft.language?.name) langSet.add(ft.language.name) })
      const langs = Array.from(langSet)
      setSpeciesLangs(langs)
      if (!langs.includes(selectedLang)) setSelectedLang(langs.includes('en') ? 'en' : (langs[0] || 'en'))
      setSelectedSpeciesRaw(s)

      // genus & flavor sesuai selectedLang (fallback ke en/pertama)
      const findGenus = (lang) => (s.genera || []).find(g => g.language?.name === lang)?.genus
      const findFlavor = (lang) => (s.flavor_text_entries || []).find(ft => ft.language?.name === lang)?.flavor_text
      const genus = findGenus(selectedLang) || findGenus('en') || (s.genera || [])[0]?.genus || null
      const flavor = findFlavor(selectedLang) || findFlavor('en') || null

      // ringkasan moves: level-up & egg
      const levelMap = new Map() // name -> min level
      const eggSet = new Set()
      for (const mv of (d.moves || [])) {
        const nameMv = mv.move?.name
        if (!nameMv) continue
        for (const det of (mv.version_group_details || [])) {
          const method = det.move_learn_method?.name
          if (method === 'level-up') {
            const lvl = det.level_learned_at ?? 0
            const prev = levelMap.get(nameMv)
            if (prev == null || (lvl > 0 && lvl < prev)) levelMap.set(nameMv, lvl)
          } else if (method === 'egg') {
            eggSet.add(nameMv)
          }
        }
      }
      const level_moves = Array.from(levelMap.entries()).map(([nm, lvl]) => ({ name: nm, level: lvl })).sort((a,b) => (a.level || 999) - (b.level || 999))
      const egg_moves = Array.from(eggSet).sort()

      const id = d.id
      const sprite = d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default
      setSelectedInfo({ name, id, sprite, types, abilities, stats, height, weight, egg_groups, habitat, growth_rate, color, genus, flavor, level_moves, egg_moves })
      // type effectiveness
      try {
        const eff = await computeTypeEffectiveness(types, fetchCachedJSONWithTTL)
        setTypeEff(eff)
      } catch {}
    } catch {
      setSelectedInfo(null)
      setTypeEff({ weak: [], resist: [], immune: [] })
    }
  }

  const loadChainFor = async (nameOrId) => {
    if (!nameOrId) return
    const normalized = String(nameOrId).trim().toLowerCase()
    setLoading(true); setError(''); setLoadingCards(true)
    try {
      const species = await fetchCachedJSONWithTTL(`https://pokeapi.co/api/v2/pokemon-species/${normalized}/`)
      const chainUrl = species?.evolution_chain?.url
      if (!chainUrl) throw new Error('no_chain')
      const chain = await fetchCachedJSONWithTTL(chainUrl)
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
          const d = await fetchCachedJSONWithTTL(`https://pokeapi.co/api/v2/pokemon/${nm}`)
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
      await loadDexInfo(normalized)
      setSearchParams({ q: normalized, full: showFullChain ? '1' : '0' }, { replace: true })
    } catch (e) {
      const msg = e?.message === 'no_chain' ? 'Tidak ada evolution chain.' : (e?.message === 'no_node' ? 'Spesies tidak ditemukan dalam chain.' : 'Gagal memuat data evolusi.')
      setError(msg)
      setLevels([])
      setSprites({})
      setSelectedInfo(null)
    } finally {
      setLoading(false)
      setLoadingCards(false)
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

  // recompute genus/flavor saat bahasa berubah
  React.useEffect(() => {
    if (!selectedSpeciesRaw || !selectedInfo) return
    const genus = (selectedSpeciesRaw.genera || []).find(g => g.language?.name === selectedLang)?.genus || selectedInfo.genus
    const flavor = (selectedSpeciesRaw.flavor_text_entries || []).find(ft => ft.language?.name === selectedLang)?.flavor_text || selectedInfo.flavor
    setSelectedInfo(prev => prev ? { ...prev, genus, flavor } : prev)
  }, [selectedLang, selectedSpeciesRaw])

  // Sync URL when toggle changes and reload
  React.useEffect(() => {
    const qParam = (searchParams.get('q') || '').trim().toLowerCase()
    const fullParam = searchParams.get('full')
    const currentFull = fullParam === '1' || fullParam === 'true'
    if (qParam && currentFull !== showFullChain) {
      setSearchParams({ q: qParam, full: showFullChain ? '1' : '0' }, { replace: true })
      // reload chain for current query
      loadChainFor(qParam)
    }
  }, [showFullChain])

  return (
    <div className="evo-page" style={{ padding: '24px 20px' }}>
      <div className="evo-page-header">
        <button className="captures-menu" onClick={() => { try { if (window.history.length > 1) navigate(-1); else navigate('/') } catch { navigate('/') } }} title="Kembali">← Back</button>
        <img className="auth-logo" src="/pokeball.svg" alt="Evo" />
        <div>
          <h2 style={{ margin: 0 }}>Panduan Evolusi</h2>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>Telusuri tahapan dari awal hingga evolusi terakhir, termasuk syarat level.</div>
        </div>
      </div>
      <div className="evo-controls">
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

      {/* Info panel: show selected species info */}
      {selectedInfo && (
        <div className="dex-panel" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--card)', marginBottom: 16 }}>
          <div>
            {selectedInfo.sprite ? (
              <img src={selectedInfo.sprite} alt={selectedInfo.name} style={{ width: 120, height: 120, objectFit: 'contain' }} />
            ) : (
              <div className="evo-art placeholder" style={{ width: 120, height: 120 }}>?</div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{selectedInfo.name}</h3>
              <span style={{ opacity: 0.8 }}>#{selectedInfo.id}</span>
              {speciesLangs.length > 0 && (
                <div style={{ marginLeft: 'auto' }}>
                  <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)} style={{ padding: '4px 8px', fontSize: 12 }}>
                    {speciesLangs.map(l => (<option key={l} value={l}>{l}</option>))}
                  </select>
                </div>
              )}
            </div>
            {selectedInfo.genus && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{selectedInfo.genus}</div>}
            {selectedInfo.flavor && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, whiteSpace: 'pre-wrap' }}>{selectedInfo.flavor.replace(/\s+/g, ' ')}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {(selectedInfo.types || []).map(t => (
                <span key={t} className={`type-chip type-${t}`}>{getTypeLabel(t)}</span>
              ))}
            </div>

            {(selectedInfo.height != null || selectedInfo.weight != null) && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                {selectedInfo.height != null && <div>Height: {selectedInfo.height}</div>}
                {selectedInfo.weight != null && <div>Weight: {selectedInfo.weight}</div>}
              </div>
            )}

            {(selectedInfo.egg_groups?.length || selectedInfo.habitat || selectedInfo.growth_rate || selectedInfo.color) ? (
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, flexWrap: 'wrap' }}>
                {selectedInfo.egg_groups?.length ? <div>Egg: {selectedInfo.egg_groups.join(', ')}</div> : null}
                {selectedInfo.habitat ? <div>Habitat: {selectedInfo.habitat}</div> : null}
                {selectedInfo.growth_rate ? <div>Growth: {selectedInfo.growth_rate}</div> : null}
                {selectedInfo.color ? <div>Color: {selectedInfo.color}</div> : null}
              </div>
            ) : null}

            {(selectedInfo.abilities || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Abilities</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedInfo.abilities.map(ab => (
                    <span key={ab} className="chip" style={{ fontSize: 12 }}>{ab}</span>
                  ))}
                </div>
              </div>
            )}

            {(selectedInfo.level_moves || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Level-up Moves (ringkas)</div>
                <div className="chips" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {(selectedInfo.level_moves || []).slice(0, 10).map(mv => (
                    <span key={mv.name} className="chip" title={`Lv ${mv.level || '-'}`} style={{ fontSize: 12, textTransform: 'none' }}>
                      {mv.name} {mv.level ? `(Lv ${mv.level})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(selectedInfo.egg_moves || []).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Egg Moves</div>
                <div className="chips" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {(selectedInfo.egg_moves || []).slice(0, 12).map(name => (
                    <span key={name} className="chip" style={{ fontSize: 12, textTransform: 'none' }}>{name}</span>
                  ))}
                </div>
              </div>
            )}

            {(selectedInfo.stats || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Base Stats</div>
                {(() => { const max = Math.max(...(selectedInfo.stats || []).map(st => st.value), 1); return (
                  <div className="stats">
                    {selectedInfo.stats.map(st => (
                      <div className="stat" key={`${st.name}-${st.value}`}>
                        <span className="stat-name">{st.name}</span>
                        <div className="stat-bar">
                          <div className={`stat-fill ${statClass(st.name)}`} style={{ width: `${Math.round((st.value / max) * 100)}%` }} />
                        </div>
                        <span className="stat-value">{st.value}</span>
                      </div>
                    ))}
                  </div>
                ) })()}
              </div>
            )}

            {/* Type effectiveness */}
            {typeEff && ((typeEff.weak.length + typeEff.resist.length + typeEff.immune.length) > 0) && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Type Effectiveness</div>
                {typeEff.weak.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Weakness</div>
                    <div className="chips" style={{ gap: 6 }}>
                      {typeEff.weak.slice(0, 8).map(([tt, m]) => (
                        <span key={`w-${tt}`} className={`chip type-chip type-${tt}`} title={`x${m}`}>{getTypeLabel(tt)} x{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {typeEff.resist.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Resistance</div>
                    <div className="chips" style={{ gap: 6 }}>
                      {typeEff.resist.slice(0, 8).map(([tt, m]) => (
                        <span key={`r-${tt}`} className={`chip type-chip type-${tt}`} title={`x${m}`}>{getTypeLabel(tt)} x{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {typeEff.immune.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Immunity</div>
                    <div className="chips" style={{ gap: 6 }}>
                      {typeEff.immune.slice(0, 8).map(([tt]) => (
                        <span key={`i-${tt}`} className={`chip type-chip type-${tt}`} title="x0">{getTypeLabel(tt)} x0</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="chips evo-suggest" style={{ marginBottom: 12 }}>
          {suggestions.map(p => (
            <button key={p.id} className="chip" onClick={() => { setQuery(p.name); setSearchParams({ q: p.name, full: showFullChain ? '1' : '0' }); loadChainFor(p.name) }} title={`Pilih ${p.name}`}>{p.name}</button>
          ))}
        </div>
      )}

      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}

      {loadingCards ? (
        <div className="evo-stages" style={{ marginTop: 12 }}>
          <div className="evo-stage">
            <div className="stage-title">Memuat Tahapan…</div>
            <div className="stage-list skeletons">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
        </div>
      ) : (!error && levels.length > 0 && (
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
                    <div className="evo-card" key={it.name} onClick={() => loadDexInfo(it.name)} title="Klik untuk lihat info spesies ini">
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
      ))}
    </div>
  )
}