const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('./models/User')
const Weapon = require('./models/Weapon')
const Capture = require('./models/Capture')

const app = express()
app.use(cors())
app.use(express.json())

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pokemon'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

let memServer = null
async function connectMongo() {
  if (process.env.USE_MEM === '1') {
    memServer = await MongoMemoryServer.create()
    const uri = memServer.getUri()
    await mongoose.connect(uri)
  } else {
    await mongoose.connect(MONGO_URI)
  }
}
void connectMongo()

app.get('/health', (req, res) => { res.json({ ok: true }) })

// Auth: register
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'username dan password diperlukan' })
    let existing = await User.findOne({ username })
    if (existing && existing.passwordHash) return res.status(400).json({ error: 'username sudah terdaftar' })
    const passwordHash = await bcrypt.hash(password, 10)
    if (existing) {
      existing.passwordHash = passwordHash
      await existing.save()
      return res.json({ ok: true })
    }
    await User.create({ username, passwordHash })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Auth: login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'username dan password diperlukan' })
    const user = await User.findOne({ username })
    if (!user || !user.passwordHash) return res.status(400).json({ error: 'user belum terdaftar atau tidak memiliki password' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'password salah' })
    const token = jwt.sign({ sub: user._id, username }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Middleware auth
function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const m = header.match(/^Bearer\s+(.+)$/)
  if (!m) return res.status(401).json({ error: 'unauthorized' })
  try {
    const payload = jwt.verify(m[1], JWT_SECRET)
    req.user = payload
    next()
  } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
}

// Upsert user (tanpa password, legacy)
app.post('/users', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ error: 'username diperlukan' })
    let user = await User.findOne({ username })
    if (!user) {
      user = await User.create({ username })
    }
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get user (opsional auth, jika ada token bisa akses by token, jika tidak fallback username)
app.get('/users/:username', async (req, res) => {
  try {
    const { username } = req.params
    let user = await User.findOne({ username })
    if (!user) {
      user = await User.create({ username })
    }
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Apply battle reward & sync (proteksi auth, tapi tetap izinkan legacy tanpa token)
app.post('/users/:username/reward', async (req, res) => {
  try {
    const { username } = req.params
    const { coinsGain = 0, xpGain = 0, pid, itemDrop, weaponDrop, newBadges = [], newAch = [], result, metrics, streakWins,
      captureAdd, captureRemove, captureOid } = req.body || {}
    let user = await User.findOne({ username })
    if (!user) user = await User.create({ username })

    // jika user sudah terdaftar (memiliki passwordHash), maka wajib token dan harus cocok dengan username
    if (user.passwordHash) {
      const header = req.headers.authorization || ''
      const m = header.match(/^Bearer\s+(.+)$/)
      if (!m) return res.status(401).json({ error: 'unauthorized' })
      try {
        const payload = jwt.verify(m[1], JWT_SECRET)
        if (payload?.username !== username) return res.status(403).json({ error: 'forbidden' })
      } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
    }

    // coins
    user.coins = (user.coins || 0) + (coinsGain || 0)

    // XP & Level Bonus: jika captureOid diberikan, update XP spesifik dan bonus level per-OID
    if (captureOid) {
      const cap = await Capture.findOne({ _id: captureOid, username })
      if (cap) {
        const prevXP = cap.xpAtCapture || 0
        const newXP = prevXP + (xpGain || 0)
        cap.xpAtCapture = newXP
        // Hitung level (cap ke maksimal 100)
        const xpToLevel = (xp) => Math.max(1, Math.min(100, Math.floor((xp || 0) / 150) + 1))
        const prevLvl = xpToLevel(prevXP)
        const newLvl = xpToLevel(newXP)
        const gained = Math.max(0, newLvl - prevLvl)
        if (gained > 0) {
          let addedPct = 0
          for (let i = 0; i < gained; i++) {
            addedPct += 0.01 + Math.random() * 0.04 // +1%..+5% per level naik
          }
          cap.levelBonusPct = (cap.levelBonusPct || 0) + addedPct
        }
        await cap.save()
      }
    } else {
      // Legacy: xp map per pokemon id
      const pidStr = (pid !== undefined && pid !== null) ? String(pid) : null
      if (pidStr) {
        const prev = user.xpMap.get(pidStr) || 0
        const newXP = prev + (xpGain || 0)
        user.xpMap.set(pidStr, newXP)
        // Level bonus untuk path legacy (agar konsisten)
        const xpToLevel = (xp) => Math.max(1, Math.min(100, Math.floor((xp || 0) / 150) + 1))
        const prevLvl = xpToLevel(prev)
        const newLvl = xpToLevel(newXP)
        const gained = Math.max(0, newLvl - prevLvl)
        if (gained > 0) {
          // Simpan di user.statBonusMap? Model User belum punya, jadi dilewati untuk legacy DB; tetap dikelola di frontend localStorage.
        }
      }
    }

    // inventory item
    if (itemDrop) user.inventoryItems.push(itemDrop)
    // weapon
    if (weaponDrop) {
      // Enforce max 20 weapons in bag
      if ((user.weapons || []).length >= 20) {
        // skip adding new weapon if capacity reached
      } else {
        const base = await Weapon.findOne({ name: weaponDrop })
        let final = { name: weaponDrop, rarity: base?.rarity || 'common', power: base?.power, effect: base?.effect || '', obtainedAt: new Date() }
        if (final.power === undefined || final.power === null) {
          const defaults = {
            'Wooden Sword': { rarity: 'common', power: 20, effect: 'Simple blade' },
            'Iron Sword': { rarity: 'uncommon', power: 40, effect: 'Solid strike' },
            'Crystal Blade': { rarity: 'rare', power: 70, effect: 'Sharp and mystical' },
            'Flame Saber': { rarity: 'rare', power: 65, effect: 'Burn chance' },
            'Thunder Pike': { rarity: 'rare', power: 60, effect: 'Shock chance' },
            'Aqua Trident': { rarity: 'uncommon', power: 45, effect: 'Splash' },
            'Shadow Dagger': { rarity: 'epic', power: 80, effect: 'Bleed' },
            'Wind Bow': { rarity: 'uncommon', power: 42, effect: 'Piercing' },
            'Earth Hammer': { rarity: 'rare', power: 68, effect: 'Stun' },
            'Light Staff': { rarity: 'epic', power: 85, effect: 'Heal burst' }
          }
          const d = defaults[weaponDrop]
          if (d) { final.rarity = d.rarity; final.power = d.power; final.effect = d.effect }
          else { final.power = Math.floor(20 + Math.random() * 60) }
        }
        user.weapons.push(final)
      }
    }
    // badges & achievements
    for (const b of (newBadges || [])) if (!user.badges.includes(b)) user.badges.push(b)
    for (const a of (newAch || [])) if (!user.achievements.includes(a)) user.achievements.push(a)
    // streak
    if (typeof streakWins === 'number' && streakWins >= 0) user.streakWins = streakWins

    // capturedIds sync
    if (typeof captureRemove === 'number') {
      user.capturedIds = (user.capturedIds || []).filter(id => id !== captureRemove)
    }
    if (typeof captureAdd === 'number') {
      const set = new Set(user.capturedIds || [])
      set.add(captureAdd)
      user.capturedIds = Array.from(set)
    }

    await user.save()
    res.json({ ok: true, user })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Endpoint: equip weapon untuk user
app.post('/users/:username/equip', async (req, res) => {
  try {
    const { username } = req.params
    const { name } = req.body || {}
    if (!name) return res.status(400).json({ error: 'nama senjata diperlukan' })
    let user = await User.findOne({ username })
    if (!user) user = await User.create({ username })
    // jika user sudah terdaftar (memiliki passwordHash), maka wajib token dan harus cocok dengan username
    if (user.passwordHash) {
      const header = req.headers.authorization || ''
      const m = header.match(/^Bearer\s+(.+)$/)
      if (!m) return res.status(401).json({ error: 'unauthorized' })
      try {
        const payload = jwt.verify(m[1], JWT_SECRET)
        if (payload?.username !== username) return res.status(403).json({ error: 'forbidden' })
      } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
    }
    // cari detail weapon dari koleksi Weapon
    const base = await Weapon.findOne({ name })
    let final = { name, rarity: base?.rarity || 'common', power: base?.power, effect: base?.effect || '' }
    if (final.power === undefined || final.power === null) {
      const defaults = {
        'Wooden Sword': { rarity: 'common', power: 20, effect: 'Simple blade' },
        'Iron Sword': { rarity: 'uncommon', power: 40, effect: 'Solid strike' },
        'Crystal Blade': { rarity: 'rare', power: 70, effect: 'Sharp and mystical' },
        'Flame Saber': { rarity: 'rare', power: 65, effect: 'Burn chance' },
        'Thunder Pike': { rarity: 'rare', power: 60, effect: 'Shock chance' },
        'Aqua Trident': { rarity: 'uncommon', power: 45, effect: 'Splash' },
        'Shadow Dagger': { rarity: 'epic', power: 80, effect: 'Bleed' },
        'Wind Bow': { rarity: 'uncommon', power: 42, effect: 'Piercing' },
        'Earth Hammer': { rarity: 'rare', power: 68, effect: 'Stun' },
        'Light Staff': { rarity: 'epic', power: 85, effect: 'Heal burst' }
      }
      const d = defaults[name]
      if (d) { final.rarity = d.rarity; final.power = d.power; final.effect = d.effect }
      else { final.power = Math.floor(20 + Math.random() * 60) }
    }
    user.equippedWeapon = final
    await user.save()
    res.json({ ok: true, user })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Basic weapon list
app.get('/weapons', async (req, res) => {
  try {
    let weapons = await Weapon.find().limit(100)
    if (!weapons.length) {
      const seed = [
        { name: 'Wooden Sword', rarity: 'common', power: 20, effect: 'Simple blade' },
        { name: 'Iron Sword', rarity: 'uncommon', power: 40, effect: 'Solid strike' },
        { name: 'Crystal Blade', rarity: 'rare', power: 70, effect: 'Sharp and mystical' },
        { name: 'Flame Saber', rarity: 'rare', power: 65, effect: 'Burn chance' },
        { name: 'Thunder Pike', rarity: 'rare', power: 60, effect: 'Shock chance' },
        { name: 'Aqua Trident', rarity: 'uncommon', power: 45, effect: 'Splash' },
        { name: 'Shadow Dagger', rarity: 'epic', power: 80, effect: 'Bleed' },
        { name: 'Wind Bow', rarity: 'uncommon', power: 42, effect: 'Piercing' },
        { name: 'Earth Hammer', rarity: 'rare', power: 68, effect: 'Stun' },
        { name: 'Light Staff', rarity: 'epic', power: 85, effect: 'Heal burst' }
      ]
      try { await Weapon.insertMany(seed, { ordered: false }) } catch {}
      weapons = await Weapon.find().limit(100)
    }
    res.json(weapons)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get capture history for a user
app.get('/users/:username/captures', async (req, res) => {
  try {
    const { username } = req.params
    let user = await User.findOne({ username })
    if (!user) user = await User.create({ username })
    if (user.passwordHash) {
      const header = req.headers.authorization || ''
      const m = header.match(/^Bearer\s+(.+)$/)
      if (!m) return res.status(401).json({ error: 'unauthorized' })
      try {
        const payload = jwt.verify(m[1], JWT_SECRET)
        if (payload?.username !== username) return res.status(403).json({ error: 'forbidden' })
      } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
    }
    const list = await Capture.find({ username }).sort({ createdAt: -1 }).limit(500)
    res.json(list)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Add a capture record for a user and sync capturedIds
app.post('/users/:username/captures', async (req, res) => {
  try {
    const { username } = req.params
    const { pokemonId, method = 'overlay', rate, xpAtCapture = 0, notes, origin = 'capture', isLucky, variationPct, evolveBonusPct, finalStats } = req.body || {}
    if (typeof pokemonId !== 'number') return res.status(400).json({ error: 'pokemonId diperlukan (number)' })
    let user = await User.findOne({ username })
    if (!user) user = await User.create({ username })
    if (user.passwordHash) {
      const header = req.headers.authorization || ''
      const m = header.match(/^Bearer\s+(.+)$/)
      if (!m) return res.status(401).json({ error: 'unauthorized' })
      try {
        const payload = jwt.verify(m[1], JWT_SECRET)
        if (payload?.username !== username) return res.status(403).json({ error: 'forbidden' })
      } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
    }
    const capture = await Capture.create({ username, pokemonId, method, rate, xpAtCapture, notes, origin, isLucky: !!isLucky, variationPct: Number(variationPct) || 0, evolveBonusPct: Number(evolveBonusPct) || 0, finalStats: Array.isArray(finalStats) ? finalStats : [] })
    const set = new Set(user.capturedIds || [])
    set.add(pokemonId)
    user.capturedIds = Array.from(set)
    await user.save()
    res.json({ ok: true, capture, user })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete capture records for a specific pokemon of a user (history cleanup)
app.delete('/users/:username/captures/by-pokemon/:pokemonId', async (req, res) => {
  try {
    const { username, pokemonId } = { username: req.params.username, pokemonId: parseInt(req.params.pokemonId, 10) }
    let user = await User.findOne({ username })
    if (!user) user = await User.create({ username })
    if (user.passwordHash) {
      const header = req.headers.authorization || ''
      const m = header.match(/^Bearer\s+(.+)$/)
      if (!m) return res.status(401).json({ error: 'unauthorized' })
      try {
        const payload = jwt.verify(m[1], JWT_SECRET)
        if (payload?.username !== username) return res.status(403).json({ error: 'forbidden' })
      } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
    }
    const pid = pokemonId
    const resDel = await Capture.deleteMany({ username, pokemonId: pid })
    const set = new Set(user.capturedIds || [])
    set.delete(pid)
    user.capturedIds = Array.from(set)
    await user.save()
    res.json({ ok: true, deleted: resDel?.deletedCount || 0, user })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete a single capture record by its OID (one-by-one release)
app.delete('/users/:username/captures/:oid', async (req, res) => {
  try {
    const { username, oid } = { username: req.params.username, oid: req.params.oid }
    let user = await User.findOne({ username })
    if (!user) user = await User.create({ username })
    if (user.passwordHash) {
      const header = req.headers.authorization || ''
      const m = header.match(/^Bearer\s+(.+)$/)
      if (!m) return res.status(401).json({ error: 'unauthorized' })
      try {
        const payload = jwt.verify(m[1], JWT_SECRET)
        if (payload?.username !== username) return res.status(403).json({ error: 'forbidden' })
      } catch (e) { return res.status(401).json({ error: 'invalid token' }) }
    }
    const doc = await Capture.findOne({ _id: oid, username })
    if (!doc) return res.status(404).json({ error: 'not_found' })
    const pid = doc.pokemonId
    await Capture.deleteOne({ _id: oid, username })
    const remaining = await Capture.countDocuments({ username, pokemonId: pid })
    const set = new Set(user.capturedIds || [])
    if (remaining > 0) {
      set.add(pid)
    } else {
      set.delete(pid)
    }
    user.capturedIds = Array.from(set)
    await user.save()
    res.json({ ok: true, deleted: 1, user })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const http = require('http')
const PORT = parseInt(process.env.PORT || '4000', 10)
const server = http.createServer(app)
function start(port) {
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })
}
server.on('error', (err) => {
  console.error('Server error:', err)
})
start(PORT)