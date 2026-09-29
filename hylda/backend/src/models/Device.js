const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId },
  plataforma: String,
  pushToken: String
}, { timestamps: true });

module.exports = mongoose.model('Device', DeviceSchema);
