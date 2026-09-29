const mongoose = require('mongoose');

const ProdutoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: String,
  categoria: String,
  modelos: [String],
  variantes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Variante' }]
}, { timestamps: true });

module.exports = mongoose.model('Produto', ProdutoSchema);
