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
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ block: 'end' });
  }, [mensagens]);

  useEffect(() => {
    socket.on('novo_pedido', (pedido) => {
      setPedidos((prev) => [...prev, pedido]);
      notificar();
    });
    return () => { socket.off('novo_pedido'); };
  }, [notificar]);

  useEffect(() => {
    socket.on('mensagem_comprador', (msg) => {
      const text = typeof msg === 'string' ? msg : (msg.text || msg.texto || String(msg));
      setMensagens((prev) => [...prev, { from: 'comprador', text, ts: Date.now(), kind: 'chat' }]);
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
        {pedidos.map((pedido, idx) => (
          <div key={idx} style={{ marginBottom: 22 }}>
            <div className="banner-destaque banner-laranja">
              Pedido Recebido! <span style={{ opacity: 0.9 }}>#{idx + 1}</span>
            </div>
            <div className="caixa-pedido-dados">
              {pedido.itens.map((item, i) => (
                <div key={i} style={{ paddingLeft: 4, marginBottom: 10 }}>
                  {item.produtoNome}<br/>
                  {item.tamanho}<br/>
                  {item.quantidade}x {item.valorFormatado || `R$ ${Number(item.valor).toFixed(2).replace('.', ',')}`}<br/>
                  <b>R$ {Number(item.subtotal).toFixed(2).replace('.', ',')}</b>
                </div>
              ))}
              <div><b>Total: R$ {Number(pedido.total).toFixed(2).replace('.', ',')}</b></div>
            </div>
          </div>
        ))}

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