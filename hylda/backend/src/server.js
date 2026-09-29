
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const http = require('http');
const { Server } = require('socket.io');
const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : (process.env.NODE_ENV === 'production' ? ['http://localhost:3001'] : ['*']);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn('CORS origin denied:', origin);
      callback(new Error('CORS origin denied'));
    }
  },
  credentials: true,
};

// Trabalhar atrás de proxy reverso (Heroku, Nginx, Cloudflare etc.)
app.enable('trust proxy');

// Ative FORCE_HTTPS somente quando houver proxy TLS na frente do Node.
app.use((req, res, next) => {
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  if (!isSecure && process.env.FORCE_HTTPS === 'true') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Serve frontend build if present (build do React/CRA)
const path = require('path');
const fs = require('fs');

// Procura o build do frontend em alguns lugares comuns.
// Pode ser sobrescrito com FRONTEND_BUILD_PATH no .env se sua pasta tiver outro nome/local.
const candidatos = [
  process.env.FRONTEND_BUILD_PATH,
  path.join(__dirname, '..', '..', 'frontend-web', 'build'),
  path.join(__dirname, '..', 'public'),           // back/public (fallback)
].filter(Boolean);

const publicPath = candidatos.find((p) => fs.existsSync(path.join(p, 'index.html'))) || candidatos[0];

if (!fs.existsSync(path.join(publicPath || '', 'index.html'))) {
  console.warn('⚠️  Build do frontend não encontrado em nenhum caminho conhecido. Rode "npm run build" no projeto do front e copie a pasta build/ para back/public, ou defina FRONTEND_BUILD_PATH no .env.');
} else {
  console.log('Servindo frontend a partir de:', publicPath);
}

app.use(express.static(publicPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexFile = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile, (err) => { if (err) next(); });
  } else {
    next();
  }
});

// Rota raiz para status
app.get('/', (req, res) => {
  res.send('BACKEND HYLDA RODANDO!');
});

// API simples para integrar fornecedor <-> comprador
const pedidos = [];

// Listar pedidos
app.get('/api/pedidos', (req, res) => {
  res.json(pedidos);
});

// Criar novo pedido (comprador envia)
app.post('/api/pedidos', (req, res) => {
  const pedido = req.body;
  if (!pedido || !pedido.id) {
    return res.status(400).json({ error: 'Pedido inválido, precisa de id' });
  }
  pedidos.push(pedido);
  // Notifica fornecedores via socket
  io.emit('novo_pedido', pedido);
  res.status(201).json({ ok: true, pedido });
});

// Fornecedor envia mensagem relacionada a um pedido
app.post('/api/fornecedor/:id/mensagem', (req, res) => {
  const pedidoId = req.params.id;
  const msg = req.body;
  if (!msg || !msg.text) return res.status(400).json({ error: 'Mensagem vazia' });
  const payload = { pedidoId, ...msg };
  // compatibilidade: aceitar { text } e { texto } e expor ambos
  if (payload.text && !payload.texto) payload.texto = payload.text;
  if (payload.texto && !payload.text) payload.text = payload.texto;
  // Emite para compradores conectados
  io.emit('mensagem_fornecedor', payload);
  res.json({ ok: true, payload });
});

// Comprador envia mensagem (opcional)
app.post('/api/comprador/:id/mensagem', (req, res) => {
  const pedidoId = req.params.id;
  const msg = req.body;
  if (!msg || !msg.text) return res.status(400).json({ error: 'Mensagem vazia' });
  const payload = { pedidoId, ...msg };
  // compatibilidade: aceitar { text } e { texto } e expor ambos
  if (payload.text && !payload.texto) payload.texto = payload.text;
  if (payload.texto && !payload.text) payload.text = payload.texto;
  // Emite para fornecedores conectados
  io.emit('mensagem_comprador', payload);
  res.json({ ok: true, payload });
});

// Dashboard da receber (simplificado)
app.get('/dashboard', (req, res) => {
  res.json({ message: 'Dashboard HYLDA - Em desenvolvimento' });
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Comunicação pedir-receber
io.on('connection', (socket) => {
  const origin = socket.handshake.headers.origin || socket.handshake.headers.referer || 'unknown';
  console.log(`socket connected: id=${socket.id} origin=${origin}`);
  socket.on('novo_pedido', (pedido) => {
    console.log('socket novo_pedido recebido:', pedido);
    // Envia para todos os recebers conectados
    io.emit('novo_pedido', pedido);
  });
  const encaminharMensagemFornecedor = (msg) => {
    // Envia a resposta da loja para os compradores conectados.
    io.emit('mensagem_fornecedor', msg);
  };
  socket.on('mensagem_fornecedor', encaminharMensagemFornecedor);
  socket.on('mensagem_receber', encaminharMensagemFornecedor);
  socket.on('mensagem_comprador', (msg) => {
    socket.broadcast.emit('mensagem_comprador', msg);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 SERVIDOR RODANDO PORTA ${PORT}`);
});
