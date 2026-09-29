// Mensagens prontas para o receber usar no atendimento
export const mensagensLojista = [
  {
    titulo: 'Pedido Confirmado',
    texto: 'Pedido Confirmado!',
    campos: [],
    requerResposta: false
  },
  {
    titulo: 'Chave Pix',
    texto: 'Chave Pix para pagamento:\n{chavePix}',
    campos: ['chavePix']
  },
  {
    titulo: 'Aguardando comprovante',
    texto: 'Por favor, envie o comprovante\ndo pagamento para prosseguir.'
  },
  {
    titulo: 'Tempo de preparo',
    texto: 'Tempo estimado para\nretirada/entrega: {tempo}',
    campos: ['tempo']
  },
  {
    titulo: 'Pedido pronto',
    texto: 'Seu pedido está pronto!\nPode retirar na loja ou aguardar a entrega.\nObrigado!'
  }
];
