

import React, { useState, useEffect } from 'react';
import './App.css';
import { catalogo } from './catalogo';
import { mensagensLojista } from './mensagensReceber';


function App() {
  // Estrutura: { [nomeProduto]: { [tipo]: quantidade } }
  const [selecoes, setSelecoes] = useState({});
  const [etapa, setEtapa] = useState('catalogo'); // catalogo | resumo | confirmado | receber
  const [resumo, setResumo] = useState(null);
  const [mensagemLojista, setMensagemLojista] = useState('');
  const [camposMsg, setCamposMsg] = useState({});

  // Troca o favicon conforme a 'etapa': fornecedor (receber) usa azul, compradores usam amarelo
  useEffect(() => {
    const setFavicon = (href) => {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = href;
    };

    const fornecedorIcon = '/img/favicon.png';
    const compradorIcon = '/img/favicon.png';

    if (etapa === 'receber') {
      setFavicon(fornecedorIcon);
    } else {
      setFavicon(compradorIcon);
    }
  }, [etapa]);

  // garantir que o favicon padrão seja o único usado (favicon.ico)
  useEffect(() => {
    try {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
      link.rel = 'icon';
      link.href = '/img/favicon.png';
      if (!document.head.contains(link)) document.head.appendChild(link);
    } catch (e) {}
  }, []);

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
    // Monta resumo do pedido
    let itens = [];
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
    setEtapa('receber');
  };

  const handleMensagemLojista = (msg) => {
    let texto = msg.texto;
    if (msg.campos) {
      msg.campos.forEach(campo => {
        texto = texto.replace(`{${campo}}`, camposMsg[campo] || '');
      });
    }
    setMensagemLojista(texto);
  };

  const handleReset = () => {
    setSelecoes({});
    setResumo(null);
    setEtapa('catalogo');
  };

  return (
    <div className="receber-container">
      <div className="receber-header">
        <h1>PEDIDOS</h1>
        <span>WEB de Produtos</span>
      </div>
      <div className="receber-messages" style={{overflowY: 'auto'}}>
        {etapa === 'catalogo' && (
          <>
            <div className="message bot">
              <b>Bem-vindo(a)!</b> Selecione os ítens e quantidades desejados:
            </div>
            {catalogo.map((prod, idx) => (
              <div key={prod.nome} className="catalogo-produto">
                <b>{prod.nome.toUpperCase()}</b>
                {(prod.opcoes || []).map((op, i) => (
                  <div key={op.tipo} className="catalogo-opcao">
                    <div>
                      <div>{op.modelo ? `${op.modelo} • ` : ''}{op.tamanho} • {op.cor || ''}</div>
                      <div style={{ fontWeight: 'bold' }}>{op.valorFormatado || (parseValor(op) ? `R$ ${parseValor(op).toFixed(2).replace('.', ',')}` : '')}</div>
                      <div style={{ color: '#666' }}>{padUnidade(op.unidade)}</div>
                    </div>
                    <div className="radio-group">
                      {[1,2,3].map(qtd => (
                        <label key={qtd} className="radio-label">
                          <input
                            type="radio"
                            name={`${prod.nome}-${op.tipo}`}
                            checked={(selecoes[prod.nome]?.[op.tipo] || 0) === qtd}
                            onChange={() => handleSelect(prod.nome, op.tipo, qtd)}
                          />
                          <span className="radio-custom" />
                          {qtd}un
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <button className="enviar-btn" onClick={handleEnviar} style={{marginTop: 16}}>ENVIAR</button>
          </>
        )}
        {etapa === 'resumo' && (
          <div className="message bot">
            <b>Resumo do Pedido:</b>
            <ul>
              {resumo?.itens.map((item, idx) => (
                <li key={idx}>
                  {item.produtoNome} - {item.modelo ? `${item.modelo} • ` : ''}{item.tamanho} • {item.cor} - {item.quantidade}x {item.valorFormatado || `R$ ${item.valor.toFixed(2).replace('.', ',')}`} = <b>R$ {item.subtotal.toFixed(2).replace('.', ',')}</b>
                </li>
              ))}
            </ul>
            <div><b>Total: R$ {resumo?.total.toFixed(2).replace('.', ',')}</b></div>
            <button className="enviar-btn" onClick={handleConfirmar} style={{marginTop: 16, marginRight: 8}}>CONFIRMAR</button>
            <button className="enviar-btn" onClick={handleReset} style={{marginTop: 16}}>Cancelar</button>
          </div>
        )}
        {etapa === 'confirmado' && (
          <div className="message bot">
            <b>Pedido enviado para a receber!</b><br/>
            Aguarde a confirmação do atendente.
            <button className="enviar-btn" onClick={handleReset} style={{marginTop: 16}}>Novo Pedido</button>
          </div>
        )}
        {etapa === 'receber' && (
          <div className="message bot" style={{background:'#d6c4b6'}}>
            <b>Painel do Lojista</b>
            <div style={{margin:'10px 0'}}>Mensagens prontas:</div>
            {mensagensLojista.map((msg, idx) => (
              <div key={msg.titulo} style={{marginBottom:8}}>
                <button className="enviar-btn" style={{fontSize:14,padding:'6px 12px'}}
                  onClick={() => handleMensagemLojista(msg)}>{msg.titulo}</button>
                {msg.campos && msg.campos.filter(c => c !== 'valor').map(campo => (
                  <input
                    key={campo}
                    placeholder={campo}
                    style={{marginLeft:8,marginRight:4,padding:'2px 6px',fontSize:14}}
                    value={camposMsg[campo]||''}
                    onChange={e=>setCamposMsg({...camposMsg,[campo]:e.target.value})}
                  />
                ))}
              </div>
            ))}
            {mensagemLojista && (
              <div style={{marginTop:12,padding:8,background:'#fff',borderRadius:6,border:'1px solid #eee'}}>
                <b>Mensagem para pedir:</b><br/>
                <span style={{whiteSpace:'pre-line'}}>{mensagemLojista}</span>
              </div>
            )}
            <button className="enviar-btn" onClick={handleReset} style={{marginTop: 16}}>Novo Pedido</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
