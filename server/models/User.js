const mongoose = require('mongoose')

const WeaponInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rarity: { type: String, default: 'common' },
  power: { type: Number, default: 0 },
  effect: { type: String, default: '' },
  obtainedAt: { type: Date, default: Date.now },
}, { _id: false })

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  // tambah field passwordHash untuk auth
  passwordHash: { type: String, default: '' },
  coins: { type: Number, default: 0 },
  xpMap: { type: Map, of: Number, default: {} },
  streakWins: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  achievements: { type: [String], default: [] },
  inventoryItems: { type: [String], default: [] },
  weapons: { type: [WeaponInfoSchema], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)