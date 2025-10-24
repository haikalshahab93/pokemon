const mongoose = require('mongoose')

const CaptureSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  pokemonId: { type: Number, required: true },
  method: { type: String, default: 'overlay' },
  xpAtCapture: { type: Number, default: 0 },
  rate: { type: Number },
  notes: { type: String },
  // tambahan atribut untuk status dan asal
  origin: { type: String, enum: ['capture', 'evolved'], default: 'capture' },
  isLucky: { type: Boolean, default: false },
  variationPct: { type: Number, default: 0 },
  evolveBonusPct: { type: Number, default: 0 },
  levelBonusPct: { type: Number, default: 0 },
  finalStats: { type: [{ name: String, value: Number }], default: [] },
}, { timestamps: { createdAt: true, updatedAt: true } })

// One user can capture same pokemon multiple times (history),
// but capturedIds in User represents the set of owned species.
CaptureSchema.index({ username: 1, pokemonId: 1 })

module.exports = mongoose.model('Capture', CaptureSchema)