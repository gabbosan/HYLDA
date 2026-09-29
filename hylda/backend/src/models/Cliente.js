const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  cpf: { type: String },
  telefone: { type: String },
  email: { type: String },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Cliente', ClienteSchema);
