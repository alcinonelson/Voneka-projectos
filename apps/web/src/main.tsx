import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProvedorToast } from './components/Toast';
import { ProvedorSessao } from './lib/auth';
import './styles.css';

const cliente = new QueryClient({
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
            <App />
          </ProvedorToast>
        </ProvedorSessao>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
