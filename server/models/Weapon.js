const mongoose = require('mongoose')

const WeaponSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  rarity: { type: String, default: 'common' },
  power: { type: Number, default: 0 },
  effect: { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('Weapon', WeaponSchema)