const mongoose = require('mongoose');

const DimensaoSchema = new mongoose.Schema({
  altura: Number, // metros
  largura: Number,
  profundidade: Number
}, { _id: false });

const VarianteSchema = new mongoose.Schema({
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produto' },
  modelo: String,
  tamanho: String,
  unidade: String, // ex: '01un','05un','10un'
  cor: String,
  valor: { type: Number, default: 0 },
  valorFormatado: String,
  estoque: { type: Number, default: 0 },
  peso: { type: Number, default: 0 }, // peso em kg
  dimensoes: DimensaoSchema,
  volume: { type: Number, default: 0 } // m^3 calculado quando necessario
}, { timestamps: true });

module.exports = mongoose.model('Variante', VarianteSchema);
