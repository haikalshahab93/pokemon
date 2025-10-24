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
      captureAdd, captureRemove } = req.body || {}
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
    // xp map per pokemon id
    const pidStr = (pid !== undefined && pid !== null) ? String(pid) : null
    if (pidStr) {
      const prev = user.xpMap.get(pidStr) || 0
      user.xpMap.set(pidStr, prev + (xpGain || 0))
    }
    // inventory item
    if (itemDrop) user.inventoryItems.push(itemDrop)
    // weapon
    if (weaponDrop) {
      const base = await Weapon.findOne({ name: weaponDrop })
      user.weapons.push({ name: weaponDrop, rarity: base?.rarity || 'common', power: base?.power || 0, effect: base?.effect || '', obtainedAt: new Date() })
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

// Basic weapon list
app.get('/weapons', async (req, res) => {
  try {
    const weapons = await Weapon.find().limit(100)
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