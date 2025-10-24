import { useState } from 'react'

export default function LoginModal({ open, onClose, onLogin, users = [], onRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const canSubmit = username.trim() && password
  if (!open) return null

  const handleSubmitLogin = () => {
    const u = (username || '').trim()
    if (u && password) onLogin?.(u, password)
  }
  const handleSubmitRegister = () => {
    const u = (username || '').trim()
    if (u && password) onRegister?.(u, password)
  }
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
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                className="input"
                placeholder="Nama pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                name="username"
              />
            </div>
            <div className="field-group">
              <label htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  id="login-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  name="password"
                />
                <button type="button" className="toggle-pass" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPass}>
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" opacity="0.5"/>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <label className="remember-toggle">
              <span>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ingat saya
              </span>
              <a href="#" onClick={(e)=>e.preventDefault()} className="forgot-link">Lupa password?</a>
            </label>
            <div className="auth-actions">
              <button className="primary-btn" disabled={!canSubmit} title={!canSubmit ? 'Isi username & password' : 'Masuk'} onClick={handleSubmitLogin}>Masuk</button>
              <button className="secondary-btn" disabled={!canSubmit} title={!canSubmit ? 'Isi username & password' : 'Daftar'} onClick={handleSubmitRegister}>Daftar</button>
            </div>
            <small className="hint">Tekan Enter untuk cepat masuk.</small>
          </div>
        </div>
      </div>
    </div>
  )
}