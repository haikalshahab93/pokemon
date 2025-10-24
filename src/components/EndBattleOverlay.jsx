import React, { useEffect, useState } from 'react'

export default function EndBattleOverlay({ open, data, onClose, onRematch }) {
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