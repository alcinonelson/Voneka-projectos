import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Carregando } from './components/base';
import { useSessao } from './lib/auth';
import { useEstadoArranque } from './lib/queries';
import { AceitarConvite } from './screens/AceitarConvite';
import { Arranque } from './screens/Arranque';
import { CriarEmpresa } from './screens/CriarEmpresa';
import { Empresa } from './screens/Empresa';
import { Equipa } from './screens/Equipa';
import { Landing } from './screens/Landing';
import { Login } from './screens/Login';
import { MeusProjectos } from './screens/MeusProjectos';
import { MeusRelatorios } from './screens/MeusRelatorios';
import { MinhasTarefas } from './screens/MinhasTarefas';
import { Painel } from './screens/Painel';
import { Projectos } from './screens/Projectos';
import { Relatorios } from './screens/Relatorios';
import { Roteiro } from './screens/Roteiro';
import { Tarefas } from './screens/Tarefas';
import { Vocabulario } from './screens/Vocabulario';
import { VistaTerreno, useEcraEstreito } from './screens/VistaTerreno';

/**
 * Encaminhamento.
 *
 * Tres conjuntos de rotas, e nao um so com itens escondidos: o que e publico, o que a Direccao
 * faz, e o que um colaborador faz. Quem tenta uma rota que nao e do seu nivel e reenviado para o
 * seu inicio - o servidor recusaria na mesma, mas ser reenviado e mais util do que ver um erro.
 *
 * Uma empresa recem-criada e enviada para o assistente ate ter vocabulario com que classificar um
 * projecto. Sem isso o painel abriria vazio e sem accao possivel, que e a pior primeira
 * impressao que um produto pode dar.
 */
export function App() {
  const { utilizador, aCarregar, ehDireccao, ehAdministrador } = useSessao();
  const estreito = useEcraEstreito();

  if (aCarregar) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Carregando>A retomar a sessão…</Carregando>
      </div>
    );
  }

  if (!utilizador) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/criar-empresa" element={<CriarEmpresa />} />
        <Route path="/convite" element={<AceitarConvite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Em ecra estreito a aplicacao passa para a vista de terreno, sem router: o que interessa de
  // pe, no local de trabalho, e ver a tarefa e reportar.
  if (estreito) return <VistaTerreno />;

  return <PortalAutenticado ehDireccao={ehDireccao} ehAdministrador={ehAdministrador} />;
}

function PortalAutenticado({
  ehDireccao,
  ehAdministrador,
}: {
  ehDireccao: boolean;
  ehAdministrador: boolean;
}) {
  // O estado do arranque so e consultado com sessao aberta, por isso vive neste componente e nao
  // em App: chamar o hook la em cima obrigaria a corre-lo tambem para quem nem entrou.
  const { data: arranque, isLoading } = useEstadoArranque();

  const inicio = ehDireccao ? '/painel' : '/minhas-tarefas';
  const precisaArrancar = ehAdministrador && arranque && !arranque.vocabularioPronto;

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Carregando>A abrir o portal…</Carregando>
      </div>
    );
  }

  return (
    <Routes>
      {/* O assistente vive fora do Layout: ainda nao ha menu que faca sentido mostrar. */}
      <Route path="/arranque" element={<Arranque />} />

      {precisaArrancar ? <Route path="*" element={<Navigate to="/arranque" replace />} /> : null}

      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to={inicio} replace />} />

        {ehDireccao ? (
          <>
            <Route path="/painel" element={<Painel />} />
            <Route path="/projectos" element={<Projectos />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </>
        ) : (
          <>
            <Route path="/minhas-tarefas" element={<MinhasTarefas />} />
            <Route path="/meus-projectos" element={<MeusProjectos />} />
            <Route path="/meus-relatorios" element={<MeusRelatorios />} />
          </>
        )}

        {/* A empresa - quem entra, com que palavras, e os seus dados - e so do Administrador. */}
        {ehAdministrador ? (
          <>
            <Route path="/equipa" element={<Equipa />} />
            <Route path="/vocabulario" element={<Vocabulario />} />
            <Route path="/empresa" element={<Empresa />} />
          </>
        ) : null}

        {/* O roteiro e o unico ecra comum aos dois perfis. */}
        <Route path="/roteiro" element={<Roteiro />} />

        <Route path="*" element={<Navigate to={inicio} replace />} />
      </Route>
    </Routes>
  );
}
