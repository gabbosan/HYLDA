import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { catalogo } from './catalogo';
import { useNotification } from './useNotification';
import io from 'socket.io-client';

const defaultUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || defaultUrl;
const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

function AppComprador() {
  useEffect(() => {
    document.body.classList.remove('receber');
    document.body.classList.add('pedir');
    return () => document.body.classList.remove('pedir');
  }, []);

  useEffect(() => {
    document.title = 'HYLDA - GRIMÓRIO';
  }, []);

  const { toasts, notificar } = useNotification();
  const [copiedToast, setCopiedToast] = useState(null);

  const [selecoes, setSelecoes] = useState({});
  const [etapa, setEtapa] = useState('catalogo');
  const [resumo, setResumo] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemTexto, setMensagemTexto] = useState('');
  const messagesRef = useRef(null);

  useEffect(() => {
    if (etapa === 'aguardando') {
      messagesRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [mensagens, etapa]);

  const handleSelect = (produto, tipo, quantidade) => {
    setSelecoes((prev) => ({
      ...prev,
      [produto]: {
        ...prev[produto],
        [tipo]: quantidade
      }
    }));
  };

  const parseValor = (op) => {
    if (op.valor != null) return Number(op.valor);
    if (op.valorFormatado) return Number(String(op.valorFormatado).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    return 0;
  };

  const padUnidade = (u) => {
    if (!u) return '';
    const num = String(u).padStart(2, '0');
    return `${num}un`;
  };

  const handleEnviar = () => {
    const itens = [];
    let total = 0;

    catalogo.forEach(prod => {
      (prod.opcoes || []).forEach(op => {
        const qtd = selecoes[prod.nome]?.[op.tipo] || 0;
        if (qtd > 0) {
          const valorNum = parseValor(op);
          itens.push({
            produtoNome: prod.nome,
            varianteTipo: op.tipo,
            modelo: op.modelo || '',
            tamanho: op.tamanho || '',
            cor: op.cor || '',
            unidade: op.unidade || '',
            valor: valorNum,
            valorFormatado: op.valorFormatado || null,
            quantidade: qtd,
            subtotal: valorNum * qtd
          });
          total += valorNum * qtd;
        }
      });
    });

    setResumo({ itens, total });
    setEtapa('resumo');
  };

  const handleConfirmar = () => {
    if (!resumo || !resumo.itens || resumo.itens.length === 0) return;
    const orderId = `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pedido = { ...resumo, id: orderId, ts: Date.now() };
    setActiveOrderId(orderId);
    socket.emit('novo_pedido', pedido);
    setEtapa('aguardando');
  };

  const handleEnviarMensagem = () => {
    const texto = (mensagemTexto || '').trim();
    if (!texto || !activeOrderId) return;
    socket.emit('mensagem_comprador', { texto, requerResposta: false, tipo: 'chat', pedidoId: activeOrderId });
    setMensagens((prev) => [...prev, { from: 'comprador', text: texto, ts: Date.now(), kind: 'chat' }]);
    setMensagemTexto('');
  };

  useEffect(() => {
    socket.on('mensagem_fornecedor', (msg) => {
      const pedidoId = msg && msg.pedidoId;
      if (pedidoId && pedidoId !== activeOrderId) return;
      const texto = typeof msg === 'string' ? msg : (msg.texto || msg.text);
      const kind = typeof msg === 'string' ? 'chat' : (msg.tipo || 'chat');
      setMensagens((prev) => [...prev, { from: 'fornecedor', text: texto, ts: Date.now(), kind }]);
      notificar();
    });
    return () => { socket.off('mensagem_fornecedor'); };
  }, [notificar, activeOrderId]);

  const KEY_EMOJI = '🗝️';
  const showCopied = () => {
    const id = Date.now();
    setCopiedToast(id);
    setTimeout(() => setCopiedToast((prev) => prev === id ? null : prev), 1800);
  };
  const copyKeyText = async (text) => {
    const clean = (text || '').replace(new RegExp(`^${KEY_EMOJI}\\s*`), '').trim();
    try {
      await navigator.clipboard.writeText(clean);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = clean;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showCopied();
  };

  const renderMensagem = (msg, idx) => {
    if (msg.kind === 'pronta' && (msg.text || '').startsWith(KEY_EMOJI)) {
      return (
        <div
          key={idx}
          className="banner-destaque banner-azul key-banner"
          style={{ width: '100%', whiteSpace: 'pre-wrap' }}
          onClick={() => copyKeyText(msg.text)}
        >
          {msg.text}
        </div>
      );
    }
    if (msg.kind === 'pronta') {
      return (
        <div key={idx} className="banner-destaque banner-azul" style={{ width: '100%', whiteSpace: 'pre-wrap' }}>
          {msg.text}
        </div>
      );
    }
    return (
      <div key={idx} className={`message chat-bolha chat-bolha-wrap ${msg.from === 'comprador' ? 'user' : 'fornecedor'}`}>
        {msg.ts && <div className="msg-ts-top">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
        <div className="msg-text-bold">{msg.text}</div>
      </div>
    );
  };

  return (
    <div className="pedir-container">
      <div className="pedir-header">
        <h1>HYLDA</h1>
        <span>GRIMÓRIO</span>
      </div>

      <div className="pedir-messages">
        {etapa === 'catalogo' && (
          <>
            <div className="message bot"><b>Olá!</b> <p>Selecione seu pedido:</p> </div>
            {catalogo.map((prod) => (
              <div key={prod.nome} className="catalogo-produto">
                <b>{prod.nome.toUpperCase()}</b>
                {(prod.opcoes || []).map((op) => (
                  <div key={op.tipo} className="catalogo-opcao" style={{ marginBottom: 22 }}>
                    <div>
                      <div>{op.modelo ? `${op.modelo} • ` : ''}{op.tamanho} • {op.cor || ''}</div>
                      <div style={{ fontWeight: 'bold' }}>{op.valorFormatado || (parseValor(op) ? `R$ ${parseValor(op).toFixed(2).replace('.', ',')}` : '')}</div>
                    </div>

                    <div style={{ height: 6 }} />
                    <div className="radio-group" style={{ marginBottom: 4, gap: 6 }}>
                      {[1, 2, 3].map(qtd => (
                        <label key={qtd} className="radio-label">
                          <input
                            type="radio"
                            name={`${prod.nome}-${op.tipo}`}
                            checked={(selecoes[prod.nome]?.[op.tipo] || 0) === qtd}
                            onChange={() => handleSelect(prod.nome, op.tipo, qtd)}
                          />
                          <span className="radio-custom" />
                          {qtd}u
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <button className="enviar-btn" onClick={handleEnviar} style={{ marginTop: 16 }}>ENVIAR</button>
          </>
        )}

        {etapa === 'resumo' && (
          <div className="message bot">
            <b>Resumo do Pedido:</b>
            <div style={{ margin: '10px 0' }}>
              {resumo?.itens.map((item, idx) => (
                <div key={idx} style={{ paddingLeft: 16, marginBottom: 8 }}>
                  {item.produtoNome}<br/>
                  {item.modelo && <>{item.modelo} • </>}{item.tamanho} • {item.cor}<br/>
                  {item.quantidade}x {item.valorFormatado || `R$ ${item.valor.toFixed(2).replace('.', ',')}`}<br/>
                  <b>R$ {item.subtotal.toFixed(2).replace('.', ',')}</b><br/>
                </div>
              ))}
            </div>
            <div><b>Total: R$ {resumo?.total.toFixed(2).replace('.', ',')}</b></div>
            <button className="enviar-btn" onClick={handleConfirmar} style={{ marginTop: 16, marginRight: 8 }}>
              CONFIRMAR
            </button>
          </div>
        )}

        {etapa === 'aguardando' && (
          <>
            <div className="banner-destaque banner-laranja">Pedido Enviado!</div>

            {mensagens.length > 0 && (
              <div className="chat-section">
                {mensagens.map((msg, idx) => renderMensagem(msg, idx))}
              </div>
            )}
          </>
        )}

        <div ref={messagesRef} />
      </div>

      {etapa === 'aguardando' && (
       <div className="receber-composer">
       <div className="composer composer-simples" style={{ marginTop: 12 }}>
          <input
            className="composer-input"
            value={mensagemTexto}
            onChange={(e) => setMensagemTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnviarMensagem()}
            placeholder="Escreva uma mensagem..."
          />
          <button className="send-arrow-btn laranja" onClick={handleEnviarMensagem} disabled={!mensagemTexto.trim()} aria-label="Enviar">➤</button>
        </div>
        </div>
      )}

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
              background: 'linear-gradient(135deg, #ff0000 0%, #ffe600 100%)',
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

      {/* Toast de chave copiada */}
      {copiedToast !== null && (
        <div style={{
          position: 'fixed',
          top: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'linear-gradient(135deg, #0e1038 0%, #1c2070 100%)',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          animation: 'fadeInDown 0.3s ease'
        }}>
          Chave copiada!
        </div>
      )}
    </div>
  );
}

export default AppComprador;