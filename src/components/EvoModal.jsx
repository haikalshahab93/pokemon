import React from 'react'

export default function EvoModal({ open, onClose, pokemonList = [] }) {
  const [query, setQuery] = React.useState('')
  const [selectedName, setSelectedName] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [levels, setLevels] = React.useState([]) // array of stages; each stage: [{ name, details }]
  const [sprites, setSprites] = React.useState({}) // name -> { id, sprite }
  const [showFullChain, setShowFullChain] = React.useState(true)

  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pokemonList.slice(0, 20)
    return pokemonList.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20)
  }, [query, pokemonList])

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

  const loadChainFor = async (nameOrId) => {
    if (!nameOrId) return
    setLoading(true); setError('')
    try {
      const species = await fetchJSON(`https://pokeapi.co/api/v2/pokemon-species/${nameOrId}/`)
      const chainUrl = species?.evolution_chain?.url
      if (!chainUrl) throw new Error('no_chain')
      const chain = await fetchJSON(chainUrl)
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
      // Fetch sprites for each name
      const names = Array.from(new Set(acc.flat().map(x => x.name).filter(Boolean)))
      const details = await Promise.all(names.map(async (nm) => {
        try {
          const d = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${nm}`)
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
    } catch (e) {
      const msg = e?.message === 'no_chain' ? 'Tidak ada evolution chain.' : (e?.message === 'no_node' ? 'Spesies tidak ditemukan dalam chain.' : 'Gagal memuat data evolusi.')
      setError(msg)
      setLevels([])
      setSprites({})
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!open) {
      setQuery(''); setSelectedName(''); setLevels([]); setSprites({}); setError(''); setShowFullChain(true)
    }
  }, [open])

  const handleSelect = (p) => {
    setSelectedName(p.name)
    setQuery(p.name)
    void loadChainFor(p.name)
  }

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal evo-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <div className="modal-header">
          <img className="auth-logo" src="/pokeball.svg" alt="Evo" />
          <div>
            <h2>Panduan Evolusi</h2>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Lihat tahapan dari awal hingga evolusi terakhir, termasuk syarat level.</div>
          </div>
        </div>
        <div className="modal-content evo-content">
          <div className="evo-controls">
            <div className="field" style={{ flex: 1 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari atau pilih Pokémon awal…"
                className="input"
              />
            </div>
            <label className="cap-toggle" title="Tampilkan seluruh chain dari base">
              <input type="checkbox" checked={showFullChain} onChange={(e) => setShowFullChain(e.target.checked)} />
              Full chain
            </label>
            <button className="captures-menu" disabled={!query} onClick={() => loadChainFor(query.trim().toLowerCase())}>{loading ? 'Memuat…' : 'Lihat Evo'}</button>
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="chips evo-suggest">
              {suggestions.map(p => (
                <button key={p.id} className="chip" onClick={() => handleSelect(p)} title={`Pilih ${p.name}`}>{p.name}</button>
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
      </div>
    </div>
  )
}