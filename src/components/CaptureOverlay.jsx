import { useEffect, useState, useRef } from 'react'
import './CaptureOverlay.css'

export default function CaptureOverlay({ open, pokemon, onClose, onFinalize }) {
  const [stage, setStage] = useState('idle') // idle | throw | shake1 | shake2 | shake3 | result
  const [result, setResult] = useState(null) // null | 'success' | 'fail'
  const [rate, setRate] = useState(() => Math.floor(30 + Math.random() * 50))
  const finalizedRef = useRef(false)

  useEffect(() => {
    if (!open || !pokemon) return
    // reset flag for each open cycle
    finalizedRef.current = false
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
        if (finalizedRef.current) return
        finalizedRef.current = true
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
          <button className="skip" onClick={() => { if (!finalizedRef.current) { finalizedRef.current = true; onFinalize(pokemon, false, rate) } onClose() }}>Lewati</button>
        </div>
      </div>
    </div>
  );
}