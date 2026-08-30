import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { FronteiraErro } from './components/FronteiraErro';
import { ProvedorToast, relatarErro } from './components/Toast';
import { pt } from './i18n/pt';
import { ErroApi } from './lib/api';
import { ProvedorSessao } from './lib/auth';
import './styles.css';

function mensagemConsulta(erro: unknown): string | null {
  if (erro instanceof ErroApi) {
    if (erro.codigo === 'SESSAO_EXPIRADA' || erro.status === 401) return null;
    return erro.message;
  }
  return pt.erros.consulta;
}

const cliente = new QueryClient({
  queryCache: new QueryCache({
    onError: (erro) => {
      const mensagem = mensagemConsulta(erro);
      if (mensagem) relatarErro(mensagem);
    },
  }),
  defaultOptions: {
    queries: {
      // Os dados de uma carteira nao mudam ao segundo; refazer o pedido a cada foco de janela
      // so faria a pagina piscar.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root em falta no index.html');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <BrowserRouter>
        <ProvedorSessao>
          <ProvedorToast>
            <FronteiraErro>
              <App />
            </FronteiraErro>
          </ProvedorToast>
        </ProvedorSessao>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
