import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header({
  search, setSearch,
  types, selectedType, setSelectedType,
  favoritesOnly, setFavoritesOnly,
  capturedOnly, setCapturedOnly,
  totalCount,
  users, currentUser, onUserChange, onAddUser,
  onOpenCaptures,
  onOpenLogin,
  onOpenBag,
  isAuthenticated,
  onLogout,
  animationsEnabled,
  onToggleAnimations,
}) {
  const [newUser, setNewUser] = useState('')
  return (
    <header className="header">
      <div className="brand">
        <img className="brand-logo" src="/vite.svg" alt="Pokédex" />
        <h1>Pokédex</h1>
        <span className="count">{totalCount} Pokémon</span>
      </div>
      <div className="controls">
        {/* User management hidden on home as requested */}
        {/*
        <div className="user-select">
          <label>User</label>
          <select value={currentUser} onChange={(e) => onUserChange(e.target.value)}>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="user-add">
          <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Tambah user" />
          <button onClick={() => { if (newUser.trim()) { onAddUser(newUser.trim()); setNewUser('') } }} title="Tambah user">＋</button>
        </div>
        */}
        <div className="field">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
            placeholder="Cari nama Pokémon…"
            className="input"
          />
          {search && (
            <button className="clear" onClick={() => setSearch('')} title="Clear">✖</button>
          )}
        </div>
        <select
          className="select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          title="Filter tipe"
        >
          <option value="">Semua Tipe</option>
          {types.map((t) => (
            <option value={t} key={t}>{t}</option>
          ))}
        </select>
        <label className="fav-toggle">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Favorit ❤️
        </label>
        <label className="cap-toggle">
          <input type="checkbox" checked={capturedOnly} onChange={(e) => setCapturedOnly(e.target.checked)} />
          Tangkapan 🎯
        </label>
        <label className="anim-toggle">
          <input type="checkbox" checked={!!animationsEnabled} onChange={(e) => onToggleAnimations && onToggleAnimations(e.target.checked)} />
          Animasi ✨
        </label>
        <button className="captures-menu" onClick={onOpenCaptures}>Tangkapan Saya</button>
        {/* Auth actions */}
        {isAuthenticated ? (
          <button className="logout-btn" onClick={onLogout} title="Logout">Logout</button>
        ) : (
          <button className="login-btn" onClick={onOpenLogin} title="Login">Login</button>
        )}
        {onOpenBag && (
          <button className="bag-btn" onClick={onOpenBag}>Bag</button>
        )}
        <Link className="bag-btn" to="/evo" title="Panduan Evolusi">Evo</Link>
      </div>
    </header>
  )
}