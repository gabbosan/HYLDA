const mongoose = require('mongoose');

const FornecedorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  tipo: { type: String },
  telefone: { type: String },
  email: { type: String },
  cnpj: { type: String },
  mei: { type: Boolean, default: false },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  pushToken: String
}, { timestamps: true });

module.exports = mongoose.model('Fornecedor', FornecedorSchema);
