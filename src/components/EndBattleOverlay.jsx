import React, { useEffect, useState } from 'react'
import './EndBattleOverlay.css'
import coinIcon from '../assets/icons/coin.svg'
import starIcon from '../assets/icons/star.svg'
import giftIcon from '../assets/icons/gift.svg'
import swordIcon from '../assets/icons/sword.svg'
import trophyIcon from '../assets/icons/trophy.svg'
import badgeIcon from '../assets/icons/badge.svg'

export default function EndBattleOverlay({ open, data, onClose, onRematch }) {
  if (!open || !data) return null
  const { result, metrics, rewards } = data
  const isWin = result === 'win'
  const [confetti, setConfetti] = useState([])
  const [phase, setPhase] = useState('in')

  useEffect(() => {
    if (!open) return
    setPhase('in')
    if (isWin) {
      const themeColors = ['#7c3aed', '#6366f1', '#3b82f6', '#06b6d4', '#a78bfa']
      const pieces = Array.from({ length: 40 }).map(() => ({
        left: Math.round(Math.random() * 100),
        size: Math.round(6 + Math.random() * 10),
        duration: (6 + Math.random() * 4).toFixed(2),
        delay: (Math.random() * 1.5).toFixed(2),
        color: themeColors[Math.floor(Math.random() * themeColors.length)],
        rotateSpeed: (1 + Math.random() * 2).toFixed(2)
      }))
      setConfetti(pieces)
    } else {
      setConfetti([])
    }
  }, [open, isWin])

  const handleClose = () => {
    setPhase('out')
    setTimeout(() => {
      onClose?.()
    }, 180)
  }
  const handleRematch = () => {
    setPhase('out')
    setTimeout(() => {
      onRematch?.()
    }, 180)
  }

  return (
    <div className={`end-backdrop ${phase === 'out' ? 'anim-out' : 'anim-in'}`} onClick={handleClose}>
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
      <div className={`end-arena ${isWin ? 'victory' : 'defeat'} ${phase === 'out' ? 'anim-out' : 'anim-in'}`} onClick={e=>e.stopPropagation()}>
        <h2 className="end-title">{isWin ? 'Victory!' : 'Defeat'}</h2>
        <div className="end-summary">
          <div className="sum-item">Turns: <b>{metrics?.turns ?? '-'}</b></div>
          <div className="sum-item">Damage dealt: <b>{metrics?.damageDealt ?? '-'}</b></div>
          <div className="sum-item">Damage taken: <b>{metrics?.damageTaken ?? '-'}</b></div>
          <div className="sum-item">Super effective: <b>{metrics?.superEffective ?? 0}</b></div>
          <div className="sum-item">Critical hits: <b>{metrics?.critical ?? 0}</b></div>
        </div>
        <div className="end-reward">
          <div className="reward-item coins">
            <img className="ri-icon" src={coinIcon} alt="" aria-hidden />
            <span className="ri-label">Coins</span><span className="ri-value">+{rewards.coinsGain}</span>
          </div>
          <div className="reward-item xp">
            <img className="ri-icon" src={starIcon} alt="" aria-hidden />
            <span className="ri-label">XP</span><span className="ri-value">+{rewards.xpGain}</span>
          </div>
          {rewards.itemDrop ? (
            <div className="reward-item item">
              <img className="ri-icon" src={giftIcon} alt="" aria-hidden />
              <span className="ri-label">Item</span><span className="ri-value">{rewards.itemDrop}</span>
            </div>
          ) : (
            <div className="reward-item item none">
              <img className="ri-icon" src={giftIcon} alt="" aria-hidden />
              <span className="ri-label">Item</span><span className="ri-value">Tidak ada</span>
            </div>
          )}
          {rewards.weaponDrop ? (
            <div className="reward-item weapon">
              <img className="ri-icon" src={swordIcon} alt="" aria-hidden />
              <span className="ri-label">Weapon</span><span className="ri-value">{rewards.weaponDrop}</span>
            </div>
          ) : null}
          {rewards.newAch?.length ? (
            <div className="reward-item ach">
              <img className="ri-icon" src={trophyIcon} alt="" aria-hidden />
              <span className="ri-label">Achievement</span><span className="ri-list">{rewards.newAch.join(', ')}</span>
            </div>
          ) : null}
          {rewards.newBadges?.length ? (
            <div className="reward-item badge">
              <img className="ri-icon" src={badgeIcon} alt="" aria-hidden />
              <span className="ri-label">Badge</span><span className="ri-list">{rewards.newBadges.join(', ')}</span>
            </div>
          ) : null}
        </div>
        <div className="end-actions">
          <button className="battle-btn" onClick={handleClose}>Lanjut</button>
          <button className="battle-btn" onClick={handleRematch}>Ulang</button>
        </div>
      </div>
    </div>
  )
}