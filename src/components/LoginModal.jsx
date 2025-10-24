import { useState } from 'react'

export default function LoginModal({ open, onClose, onLogin, users = [], onRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const canSubmit = username && password
  if (!open) return null
  const handleSubmitLogin = () => { if (canSubmit) onLogin?.(username, password) }
  const handleSubmitRegister = () => { if (canSubmit) onRegister?.(username, password) }
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmitLogin() }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✖</button>
        <div className="modal-header auth-header">
          <img className="auth-logo" src="/pokeball.svg" alt="Login" />
          <div>
            <h2>Selamat Datang</h2>
            <p>Masuk untuk mengakses Pokédex dan fitur lengkap.</p>
          </div>
        </div>
        <div className="modal-content auth-content">
          <div className="auth-form" onKeyDown={handleKeyDown}>
            <div className="field-group">
              <label>Username</label>
              <input
                className="input"
                placeholder="Nama pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
              />
            </div>
            <div className="field-group">
              <label>Password</label>
              <div className="password-field">
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="clear toggle-pass" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">{showPass ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <label className="remember-toggle">
              <span>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ingat saya
              </span>
              <a href="#" onClick={(e)=>e.preventDefault()} style={{ color: '#888' }}>Lupa password?</a>
            </label>
            <div className="auth-actions">
              <button className="primary-btn" disabled={!canSubmit} title={!canSubmit ? 'Isi username & password' : 'Masuk'} onClick={handleSubmitLogin}>Masuk</button>
              <button className="secondary-btn" disabled={!canSubmit} title={!canSubmit ? 'Isi username & password' : 'Daftar'} onClick={handleSubmitRegister}>Daftar</button>
            </div>
            <small style={{ color: '#888' }}>Tekan Enter untuk cepat masuk.</small>
          </div>
        </div>
      </div>
    </div>
  )
}