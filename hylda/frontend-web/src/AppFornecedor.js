import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { mensagensLojista } from './mensagensReceber';
import { useNotification } from './useNotification';
import io from 'socket.io-client';

const defaultUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || defaultUrl;
const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
const SENHA_FORNECEDOR = 'rumJux-3fezm';

function ClipButton({ onPaste, onShowHistory, label = '👉' }) {
  const timerRef = useRef(null);
  const [longTriggered, setLongTriggered] = useState(false);

  const start = () => {
    setLongTriggered(false);
    timerRef.current = setTimeout(() => {
      setLongTriggered(true);
      onShowHistory();
    }, 600);
  };

  const end = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!longTriggered) onPaste();
    setLongTriggered(false);
  };

  return (
    <button
      type="button"
      className="send-arrow-btn azul"
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } setLongTriggered(false); }}
      onTouchStart={start}
      onTouchEnd={end}
      onDoubleClick={onShowHistory}
      aria-label="Colar último texto"
    >
      {label}
    </button>
  );
}

function AppFornecedor() {
  useEffect(() => {
    document.body.classList.remove('pedir');
    document.body.classList.add('receber');
    return () => document.body.classList.remove('receber');
  }, []);

  useEffect(() => {
    document.title = 'FRIDA - GRIMÓRIO';
  }, []);

  const { toasts, notificar } = useNotification();

  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [senha, setSenha] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [camposMsg, setCamposMsg] = useState({});
  const [mensagens, setMensagens] = useState([]);
  const [mensagemTexto, setMensagemTexto] = useState('');
  const [orderInputs, setOrderInputs] = useState({});
  const [orderHistory, setOrderHistory] = useState({});
  const [orderState, setOrderState] = useState({});
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setOrderState((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const s = next[id];
          if (s.status !== 'ativo') return;
          const last = s.lastActivity || 0;
          if (now - last > 5 * 60 * 1000) {
            next[id] = { ...s, standby: true };
          }
        });
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on('novo_pedido', (pedido) => {
      const p = pedido && pedido.id ? pedido : { ...pedido, id: `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ts: Date.now() };
      setPedidos((prev) => [...prev, { ...p, mensagens: [] }]);
      setOrderState((prev) => ({
        ...prev,
        [p.id]: { status: 'ativo', collapsed: false, lastActivity: Date.now(), standby: false }
      }));
      notificar();
    });
    return () => { socket.off('novo_pedido'); };
  }, [notificar]);

  useEffect(() => {
    socket.on('mensagem_comprador', (msg) => {
      const payload = typeof msg === 'string' ? { text: msg } : msg;
      const text = payload.text || payload.texto || String(payload);
      const pedidoId = payload.pedidoId;
      if (pedidoId) {
        setPedidos((prev) => prev.map((p) =>
          p.id === pedidoId
            ? { ...p, mensagens: [...p.mensagens, { from: 'comprador', text, ts: Date.now(), kind: 'chat' }] }
            : p
        ));
        setOrderState((prev) => {
          const s = prev[pedidoId];
          if (!s) return prev;
          return {
            ...prev,
            [pedidoId]: { ...s, lastActivity: Date.now(), standby: false }
          };
        });
      } else {
        setMensagens((prev) => [...prev, { from: 'comprador', text, ts: Date.now(), kind: 'chat' }]);
      }
      notificar();
      try {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = '/img/favicon.ico';
        if (!document.head.contains(link)) document.head.appendChild(link);
      } catch (e) {}
    });
    return () => { socket.off('mensagem_comprador'); };
  }, [notificar]);

  const getOrderInput = (id) => orderInputs[id] || {
    customA: '', keyText: '', chatText: '', address: '', showHistory: false
  };

  const setOrderField = (id, field, value) => {
    setOrderInputs((prev) => ({ ...prev, [id]: { ...getOrderInput(id), [field]: value } }));
  };

  const addOrderMessage = (id, message) => {
    setPedidos((prev) => prev.map((p) =>
      p.id === id ? { ...p, mensagens: [...p.mensagens, message] } : p
    ));
  };

  const sendOrderMessage = (id, text, kind = 'pronta') => {
    if (!text) return;
    socket.emit('mensagem_fornecedor', { texto: text, tipo: kind, pedidoId: id, requerResposta: false });
    addOrderMessage(id, { from: 'fornecedor', text, ts: Date.now(), kind });
    setOrderState((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, lastActivity: Date.now(), standby: false } };
    });
  };

  const sendOrderChat = (id) => {
    const texto = (getOrderInput(id).chatText || '').trim();
    if (!texto) return;
    socket.emit('mensagem_fornecedor', { texto, tipo: 'chat', pedidoId: id, requerResposta: false });
    addOrderMessage(id, { from: 'fornecedor', text: texto, ts: Date.now(), kind: 'chat' });
    setOrderField(id, 'chatText', '');
    setOrderState((prev) => {
      const s = prev[id];
      if (!s) return prev;
      return { ...prev, [id]: { ...s, lastActivity: Date.now(), standby: false } };
    });
  };

  const handleMensagemLojista = (msg) => {
    let texto = msg.texto;
    const lastPedido = pedidos && pedidos.length ? pedidos[pedidos.length - 1] : null;
    if (msg.campos && msg.campos.length) {
      for (const campo of msg.campos) {
        let valor = (camposMsg[campo] || '').toString();
        if (campo === 'valor') {
          valor = valor.replace(/^\s*(?:valor\s+total|total|valor)\s*:\s*/i, '').replace(/^R\$\s*/i, '');
          if (!valor && lastPedido) valor = String(Number(lastPedido.total) || 0);
        }
        if (!valor) return;
        if (campo === 'valor') {
          const num = Number(String(valor).replace(/\./g, '').replace(',', '.')) || 0;
          valor = `R$ ${num.toFixed(2).replace('.', ',')}`;
        }
        texto = texto.replace(`{${campo}}`, valor);
      }
    }
    socket.emit('mensagem_fornecedor', { texto, requerResposta: Boolean(msg.requerResposta), tipo: 'pronta' });
    setMensagens((prev) => [...prev, { from: 'fornecedor', text: texto, ts: Date.now(), kind: 'pronta' }]);
  };

  const handleEnviarMensagem = () => {
    const texto = (mensagemTexto || '').trim();
    if (!texto) return;
    socket.emit('mensagem_fornecedor', { texto, requerResposta: false, tipo: 'chat' });
    setMensagens((prev) => [...prev, { from: 'fornecedor', text: texto, ts: Date.now(), kind: 'chat' }]);
    setMensagemTexto('');
  };

  const handleAcesso = () => {
    if ((senha || '').trim() === SENHA_FORNECEDOR) {
      setAcessoLiberado(true);
      setSenha('');
      return;
    }
    setSenha('');
  };

  const handleCurrentLocation = (id) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);
        setOrderField(id, 'address', `${lat}, ${lon}`);
      },
      () => alert('Não foi possível obter a localização atual.')
    );
  };

  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const itemKey = (item) => `${normalizar(item.produtoNome)}:${normalizar(item.modelo || item.varianteTipo || '')}:${Number(item.quantidade) || 0}`;

  const validarRegras = (itens) => {
    const lista = itens.map(itemKey);
    const igual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

    const cmbBase = [
      `${normalizar('Produto01')}:${normalizar('A')}:1`,
      `${normalizar('Produto01')}:${normalizar('B')}:3`,
      `${normalizar('Produto01')}:${normalizar('C')}:2`
    ];
    const glBase = [
      `${normalizar('Produto02')}:${normalizar('A')}:2`,
      `${normalizar('Produto02')}:${normalizar('B')}:3`
    ];

    if (igual(lista, cmbBase)) return { valido: true, descricao: 'CMB 150\nTotal: R$ 150,00' };
    if (igual(lista, [...cmbBase, `${normalizar('Produto03')}:${normalizar('A')}:1`])) return { valido: true, descricao: 'CMB 2x 150\nTotal: R$ 300,00' };
    if (igual(lista, [...cmbBase, `${normalizar('Produto03')}:${normalizar('A')}:2`])) return { valido: true, descricao: 'CMB 3x 150\nTotal: R$ 450,00' };
    if (igual(lista, [...cmbBase, `${normalizar('Produto03')}:${normalizar('A')}:3`])) return { valido: true, descricao: 'CMB 4x 150\nTotal: R$ 600,00' };

    if (igual(lista, glBase)) return { valido: true, descricao: 'GL 50\nTotal: R$ 50,00' };
    if (igual(lista, [...glBase, `${normalizar('Produto03')}:${normalizar('A')}:1`])) return { valido: true, descricao: 'GL 2x 50\nTotal: R$ 100,00' };
    if (igual(lista, [...glBase, `${normalizar('Produto03')}:${normalizar('A')}:2`])) return { valido: true, descricao: 'GL 3x 50\nTotal: R$ 150,00' };
    if (igual(lista, [...glBase, `${normalizar('Produto03')}:${normalizar('A')}:3`])) return { valido: true, descricao: 'GL 4x 50\nTotal: R$ 200,00' };

    return { valido: false, descricao: null };
  };

  const renderMensagem = (msg, idx) => {
    if (msg.kind === 'pronta') {
      return (
        <div key={idx} className="banner-destaque banner-azul" style={{ width: '100%', whiteSpace: 'pre-wrap' }}>
          {msg.text}
        </div>
      );
    }
    return (
      <div key={idx} className={`message chat-bolha chat-bolha-wrap ${msg.from === 'fornecedor' ? 'user' : 'fornecedor'}`}>
        {msg.ts && <div className="msg-ts-top">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
        <div className="msg-text-bold">{msg.text}</div>
      </div>
    );
  };

  const mensagensProntas = mensagens.filter(m => m.kind === 'pronta');
  const mensagensChat = mensagens.filter(m => m.kind === 'chat');

  if (!acessoLiberado) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          width: 'min(90vw, 320px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)'
        }}>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAcesso()}
            autoFocus
            placeholder=""
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '12px 10px',
              fontSize: 16,
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleAcesso}
            style={{
              width: '100%',
              marginTop: 10,
              border: 'none',
              borderRadius: 8,
              background: '#2d34ac',
              color: '#fff',
              padding: '10px 14px',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            ➤
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="receber-container">
      <div className="receber-header">
        <h1>FRIDA</h1>
        <span>CALDEIRÃO</span>
      </div>
      <div className="receber-messages painel-branco">

        {pedidos.length === 0 && (
          <div className="caixa-pedido-dados">Nenhum pedido ainda.</div>
        )}

        {pedidos.map((pedido, idx) => {
          const inp = getOrderInput(pedido.id);
          const regra = validarRegras(pedido.itens || []);
          const st = orderState[pedido.id] || { status: 'ativo', collapsed: !regra.valido, standby: false };
          const isCollapsed = st.collapsed || st.status === 'cancelado';
          const isCancelled = st.status === 'cancelado';
          const isStandby = !isCancelled && st.standby;
          const bannerClass = isCancelled ? 'banner-destaque banner-cinza' : (isStandby ? 'banner-destaque banner-standby' : 'banner-destaque banner-laranja');
          const mostrarBotoes = regra.valido;
          return (
            <div key={pedido.id || idx} className={`pedido-card ${isCancelled ? 'cancelado' : ''} ${isStandby ? 'standby' : ''}`}>
              <div
                className={bannerClass}
                onClick={() => setOrderState((prev) => ({ ...prev, [pedido.id]: { ...st, collapsed: !st.collapsed } }))}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              >
                <span>Pedido #{idx + 1}</span>
                <span style={{ fontSize: 14 }}>{isCollapsed ? '▸' : '▾'}</span>
              </div>
              {!isCollapsed && (
                <>
                  <div className="caixa-pedido-dados">
                    {regra.descricao ? (
                      <div style={{ paddingLeft: 4, marginBottom: 10, fontWeight: 'bold', fontSize: 18, whiteSpace: 'pre-wrap' }}>{regra.descricao}</div>
                    ) : (
                      <>
                        {pedido.itens.map((item, i) => (
                          <div key={i} style={{ paddingLeft: 4, marginBottom: 10 }}>
                            {item.produtoNome}<br/>
                            {item.tamanho}<br/>
                            {item.quantidade}x {item.valorFormatado || `R$ ${Number(item.valor).toFixed(2).replace('.', ',')}`}<br/>
                            <b>R$ {Number(item.subtotal).toFixed(2).replace('.', ',')}</b>
                          </div>
                        ))}
                        <div><b>Total: R$ {Number(pedido.total).toFixed(2).replace('.', ',')}</b></div>
                      </>
                    )}
                  </div>

                  <div className="pedido-acoes">
                    {mostrarBotoes && (
                      <>
                        <div className="acao-row">
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => sendOrderMessage(pedido.id, '👍', 'pronta')}
                            aria-label="Curtir"
                          >👍</button>
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => {
                              socket.emit('mensagem_fornecedor', { texto: '✅ Pedido confirmado!', tipo: 'pronta', pedidoId: pedido.id, requerResposta: false });
                              addOrderMessage(pedido.id, { from: 'fornecedor', text: '✅ Pedido confirmado!', ts: Date.now(), kind: 'pronta' });
                            }}
                            aria-label="Confirmar pedido"
                          >L</button>
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => {
                              setOrderState((prev) => ({ ...prev, [pedido.id]: { ...st, status: 'cancelado', collapsed: true } }));
                            }}
                            aria-label="Cancelar pedido"
                          >+</button>
                        </div>

                        <div className="acao-row" style={{ position: 'relative' }}>
                          <ClipButton
                            label="👉"
                            onPaste={() => {
                              const hist = orderHistory[pedido.id] || [];
                              if (hist.length) setOrderField(pedido.id, 'keyText', hist[0]);
                            }}
                            onShowHistory={() => setOrderField(pedido.id, 'showHistory', true)}
                          />
                          <input
                            className="composer-input"
                            style={{ flex: 1, color: '#222', background: '#fff' }}
                            value={inp.keyText}
                            onChange={(e) => setOrderField(pedido.id, 'keyText', e.target.value)}
                            placeholder="texto rápido..."
                          />
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => {
                              const texto = (inp.keyText || '').trim();
                              if (!texto) return;
                              sendOrderMessage(pedido.id, `🗝️ ${texto}`, 'pronta');
                              setOrderHistory((prev) => {
                                const list = prev[pedido.id] || [];
                                const next = [texto, ...list.filter((x) => x !== texto)].slice(0, 5);
                                return { ...prev, [pedido.id]: next };
                              });
                              setOrderField(pedido.id, 'keyText', '');
                            }}
                            disabled={!inp.keyText.trim()}
                            aria-label="Enviar texto"
                          >🗝️</button>
                          {inp.showHistory && (
                            <div className="history-dropdown">
                              {(orderHistory[pedido.id] || []).map((h, i) => (
                                <div key={i} className="history-item" onClick={() => {
                                  setOrderField(pedido.id, 'keyText', h);
                                  setOrderField(pedido.id, 'showHistory', false);
                                }}>{h}</div>
                              ))}
                              <div className="history-item close" onClick={() => setOrderField(pedido.id, 'showHistory', false)}>Fechar</div>
                            </div>
                          )}
                        </div>

                        <div className="acao-row tempo-row">
                          <button className="receber-btn" onClick={() => sendOrderMessage(pedido.id, '⏱️ 10 min', 'pronta')}>10min</button>
                          <button className="receber-btn" onClick={() => sendOrderMessage(pedido.id, '⏱️ 30 min', 'pronta')}>30min</button>
                          <span>Em</span>
                          <input
                            className="acao-input"
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={inp.customA}
                            onChange={(e) => setOrderField(pedido.id, 'customA', e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder=""
                          />
                          <span>min.</span>
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => {
                              if (!inp.customA) return;
                              sendOrderMessage(pedido.id, `⏱️ ${inp.customA} min`, 'pronta');
                              setOrderField(pedido.id, 'customA', '');
                            }}
                            disabled={!inp.customA}
                            aria-label="Enviar tempo"
                          >➤</button>
                        </div>

                        <div className="acao-row">
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => handleCurrentLocation(pedido.id)}
                            aria-label="Usar localização atual"
                          >📍</button>
                          <input
                            className="composer-input"
                            style={{ flex: 1, color: '#222', background: '#fff' }}
                            value={inp.address}
                            onChange={(e) => setOrderField(pedido.id, 'address', e.target.value)}
                            placeholder="Endereço ou localização..."
                          />
                          <button
                            className="send-arrow-btn azul"
                            onClick={() => {
                              const texto = (inp.address || '').trim();
                              if (!texto) return;
                              sendOrderMessage(pedido.id, `📍 ${texto}`, 'pronta');
                              setOrderField(pedido.id, 'address', '');
                            }}
                            disabled={!inp.address.trim()}
                            aria-label="Enviar localização"
                          >➤</button>
                        </div>
                      </>
                    )}

                    {pedido.mensagens.length > 0 && (
                      <div className="pedido-chat">
                        {pedido.mensagens.map((msg, i) => renderMensagem(msg, i))}
                      </div>
                    )}

                    <div className="acao-row" style={{ marginTop: 8 }}>
                      <input
                        className="composer-input"
                        style={{ flex: 1, color: '#222', background: '#fff' }}
                        value={inp.chatText || ''}
                        onChange={(e) => setOrderField(pedido.id, 'chatText', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendOrderChat(pedido.id)}
                        placeholder="Escreva no chat do pedido..."
                      />
                      <button
                        className="send-arrow-btn azul"
                        onClick={() => sendOrderChat(pedido.id)}
                        disabled={!(inp.chatText || '').trim()}
                        aria-label="Enviar mensagem do pedido"
                      >➤</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div ref={messagesRef} />

        <div className="quadro-prontas">
          <b style={{ color: '#222', display: 'block', marginBottom: 10 }}>Mensagens prontas:</b>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mensagensLojista.map((m) => (
              <div key={m.titulo} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button className="receber-btn" style={{ fontSize: 14, padding: '6px 12px' }} onClick={() => handleMensagemLojista(m)}>{m.titulo}</button>
                {m.campos && m.campos.filter(c => c !== 'valor').map(campo => (
                  <input
                    key={campo + '_' + m.titulo}
                    name={campo}
                    placeholder={campo}
                    style={{ padding: '6px 8px', fontSize: 14 }}
                    value={camposMsg[campo] || ''}
                    onChange={e => setCamposMsg({ ...camposMsg, [campo]: e.target.value })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {mensagensProntas.length > 0 && (
            <div className="prontas-enviadas">
              {mensagensProntas.map((msg, idx) => (
                <div key={idx} className="banner-destaque banner-azul" style={{width: '100%'}}>
                  {msg.text}
                </div>
              ))}
            </div>
        )}

        {mensagensChat.length > 0 && (
          <div className="chat-section">
            {mensagensChat.map((msg, idx) => (
              <div key={idx} className={`message chat-bolha chat-bolha-wrap ${msg.from === 'fornecedor' ? 'user' : 'fornecedor'}`}>
                {msg.ts && <div className="msg-ts-top">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                <div className="msg-text-bold">{msg.text}</div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesRef} />
      </div>
      <div className="receber-composer">
        <div className="composer composer-simples" style={{ marginTop: 12 }}>
          <input
            className="composer-input"
            value={mensagemTexto}
            onChange={e => setMensagemTexto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEnviarMensagem()}
            placeholder="Escreva uma mensagem..."
          />
          <button className="send-arrow-btn azul" onClick={handleEnviarMensagem} disabled={!mensagemTexto.trim()} aria-label="Enviar">➤</button>
        </div>
      </div>

      {/* Toast de notificação */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center'
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: 'linear-gradient(135deg, #111446 0%, #00cfff 100%)',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 8,
              fontWeight: 'bold',
              fontSize: 14,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              animation: 'fadeInDown 0.3s ease'
            }}>
              Mensagem Recebida
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppFornecedor;