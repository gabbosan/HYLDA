# HYLDA

Projeto web para compra/venda em tempo real com frontend React e backend Node.js + Socket.IO.

## Estrutura

- `hylda/backend` — API e servidor de sockets
- `hylda/frontend-web` — interface em React

## Requisitos

- Node.js LTS
- npm

## Execução local

Backend:

```powershell
cd C:\Users\HAYDEE\ReactN\HYLDA\hylda\backend
node src/server.js
```

Frontend:

```powershell
cd C:\Users\HAYDEE\ReactN\HYLDA\hylda\frontend-web
npm start
```

Para expor publicamente via ngrok (backend na porta 3000):

```powershell
cd C:\Users\HAYDEE\ReactN\HYLDA\
ngrok http 3000 --url https://unify-creamer-draw.ngrok-free.dev
```

> Importante: ao usar o ngrok, o backend serve o frontend a partir da pasta `build/`. Antes de iniciar o backend, gere o build atualizado:
>
> ```powershell
> cd C:\Users\HAYDEE\ReactN\HYLDA\hylda\frontend-web
> npm run build
> ```

## Variáveis de ambiente

Use valores locais e não versionados. Exemplos:

Backend:

```env
PORT=3000
CORS_ORIGIN=http://localhost:3001
FORCE_HTTPS=false
```

Frontend:

```env
PORT=3001
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Observações

- Mantenha arquivos de ambiente no local de desenvolvimento e ignore-os no Git.
- O projeto usa sockets em tempo real entre backend e frontend.
- Os assets e imagens locais ficam na pasta do frontend e não devem ser confundidos com artefatos de build antigos.