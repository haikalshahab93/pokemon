import React, { useEffect, useRef, useState } from 'react'

function getHPColor(pct) { return pct >= 60 ? '#43a047' : pct >= 30 ? '#f1c40f' : '#e53935' }

export default function BattleOverlay({ open, player, opponent, onClose, onEnd }) {
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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (turn !== 'player') return
      if (['1','2','3','4'].includes(e.key)) {
        const map = { '1':'quick', '2':'thunderbolt', '3':'tackle', '4':'heal' }
        playerMove(map[e.key])
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, turn])

  const MOVE_DATA = {
    quick: { power: 12, accuracy: 1.0, type: 'normal' },
    thunderbolt: { power: 20, accuracy: 0.9, type: 'electric' },
    tackle: { power: 10, accuracy: 0.95, type: 'normal' },
    // enemy moves
    hit: { power: 10, accuracy: 0.95, type: 'normal' },
    slam: { power: 12, accuracy: 0.9, type: 'normal' },
    bite: { power: 14, accuracy: 0.85, type: 'dark' },
  }

  function playSFX(freq = 400, time = 0.15) {
    if (!audioEnabled) return
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.value = freq
      g.gain.value = 0.05
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      setTimeout(() => o.stop(), time * 1000)
    } catch {}
  }

  function typeEffectiveness(typeA, typeB) {
    const chart = { electric: { water: 2, flying: 2 }, dark: { psychic: 2 }, normal: {} }
    return chart[typeA]?.[typeB] || 1
  }

  function playerMove(move) {
    if (move === 'heal') {
      const heal = Math.min(12, maxHP - playerHP)
      setPlayerHP(h => Math.min(maxHP, h + heal))
      setLog(l => [...l, `You heal ${heal} HP`])
      playSFX(300, 0.12)
      setTurn('enemy');
      setTimeout(enemyTurn, 700)
      return
    }

    const md = MOVE_DATA[move]
    const hit = Math.random() < md.accuracy
    const eff = typeEffectiveness(md.type, opponent.type || 'normal')
    const crit = Math.random() < 0.1
    const dmg = hit ? Math.round(md.power * eff * (crit ? 1.5 : 1)) : 0
    if (hit) {
      setEnemyHP(h => Math.max(0, h - dmg))
      setDamageDealt(d => d + dmg)
      setSuperEffective(s => s + (eff === 2 ? 1 : 0))
      setCritical(c => c + (crit ? 1 : 0))
      setProj({ from: 'player' }); setTimeout(() => setProj(null), 220)
      setPlayerAnim('attack'); setTimeout(() => setPlayerAnim(''), 400)
      playSFX(700, 0.1)
    } else {
      setLog(l => [...l, 'Your attack missed!'])
      playSFX(200, 0.06)
    }

    setTurns(t => t + 1)
    if (hit && enemyHP - dmg <= 0) {
      const result = { dmg, eff, crit }
      const metrics = { turns, damageDealt: damageDealt + result.dmg, damageTaken, superEffective: superEffective + (result.eff===2?1:0), critical: critical + (result.crit?1:0) }
      setTimeout(() => { onEnd({ result: 'win', metrics, player }); onClose() }, 800)
      return
    }
    setTurn('enemy')
    setTimeout(enemyTurn, 700)
  }

  function enemyTurn() {
    const choices = ['hit', 'slam', 'bite']
    const move = choices[Math.floor(Math.random() * choices.length)]
    const md = MOVE_DATA[move]
    const hit = Math.random() < md.accuracy
    const eff = typeEffectiveness(md.type, player.type || 'normal')
    const crit = Math.random() < 0.05
    const dmg = hit ? Math.round(md.power * eff * (crit ? 1.4 : 1)) : 0

    if (hit) {
      setPlayerHP(h => Math.max(0, h - dmg))
      setDamageTaken(d => d + dmg)
      setProj({ from: 'enemy' }); setTimeout(() => setProj(null), 220)
      setEnemyAnim('attack'); setTimeout(() => setEnemyAnim(''), 400)
      playSFX(500, 0.08)
    } else {
      setLog(l => [...l, 'Enemy missed!'])
      playSFX(180, 0.06)
    }

    if (playerHP - dmg <= 0) {
      const metrics = { turns, damageDealt, damageTaken: damageTaken + dmg, superEffective, critical }
      setTimeout(() => { onEnd({ result: 'lose', metrics, player }); onClose() }, 800)
      return
    }

    setTurn('player')
  }

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