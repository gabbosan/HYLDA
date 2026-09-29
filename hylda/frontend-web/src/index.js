import React from 'react';
import ReactDOM from 'react-dom/client';
import AppComprador from './AppComprador';
import AppFornecedor from './AppFornecedor';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Use ?fornecedor na URL para testar o painel do fornecedor.
const url = window.location.search;
const isFornecedor = url.includes('fornecedor');

root.render(
  <React.StrictMode>
    {isFornecedor ? <AppFornecedor /> : <AppComprador />}
  </React.StrictMode>
);
