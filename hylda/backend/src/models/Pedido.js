const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  varianteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variante' },
  quantidade: { type: Number, default: 1 },
  valorUnitario: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 }
}, { _id: false });

const PedidoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  fornecedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' },
  itens: [ItemSchema],
  total: { type: Number, default: 0 },
  status: { type: String, default: 'PENDENTE' },
  plataforma: String
}, { timestamps: true });

module.exports = mongoose.model('Pedido', PedidoSchema);
